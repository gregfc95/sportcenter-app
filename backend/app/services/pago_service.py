from decimal import Decimal

from flask import current_app
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from .. import db
from ..models.pago import Pago, PagoEstado
from ..models.reserva import Reserva
from ..models.turno import Turno
from .mercadopago_client import get_sdk


class PagoService:

    # --- Checkout Pro (Mercado Pago) ---

    def crear_preferencia(self, reserva_id: int) -> dict:
        """Crea una preferencia de Checkout Pro para la seña de una reserva.

        Devuelve los datos que necesita el frontend para redirigir al checkout
        (init_point) sin persistir nada todavía; el alta del Pago se hace en
        otro paso del flujo.
        """
        reserva = db.session.get(Reserva, reserva_id)
        if reserva is None:
            raise ValueError("La reserva indicada no existe.")

        actividad = reserva.turno.actividad
        sena = actividad.precio / Decimal("2")
        return self._crear_preferencia(
            reserva_id,
            title=f"Seña - {actividad.nombre}",
            monto=sena,
            success_path="/pago/exito",
        )

    def crear_preferencia_saldo(self, reserva_id: int) -> dict:
        """Crea una preferencia de Checkout Pro para el saldo restante.

        Requiere que la reserva ya tenga la seña registrada y que el pago no esté
        completo. El monto es el precio de la actividad menos lo ya cobrado (la
        seña). El `success_path` lleva `accion=completar` para que el retorno de
        Mercado Pago registre el saldo y no una seña nueva.
        """
        reserva = db.session.get(Reserva, reserva_id)
        if reserva is None:
            raise ValueError("La reserva indicada no existe.")

        sena = self._pago_por_estado(reserva_id, PagoEstado.SENADO)
        if sena is None:
            raise ValueError("La reserva no tiene una seña registrada.")
        if self._pago_por_estado(reserva_id, PagoEstado.PAGADO) is not None:
            raise ValueError("El pago ya está completo.")

        actividad = reserva.turno.actividad
        saldo = actividad.precio - sena.monto
        return self._crear_preferencia(
            reserva_id,
            title=f"Saldo - {actividad.nombre}",
            monto=saldo,
            success_path="/pago/exito?accion=completar",
        )

    def _crear_preferencia(
        self, reserva_id: int, *, title: str, monto: Decimal, success_path: str
    ) -> dict:
        base_url = current_app.config["APP_BASE_URL"]

        preference_data = {
            "items": [
                {
                    "title": title,
                    "quantity": 1,
                    "unit_price": float(monto),
                    "currency_id": "ARS",
                }
            ],
            "back_urls": {
                "success": f"{base_url}{success_path}",
                "failure": f"{base_url}/pago/error",
                "pending": f"{base_url}/pago/pendiente",
            },
            # Vincula la preferencia con la reserva para conciliar el webhook.
            "external_reference": str(reserva_id),
        }

        # Mercado Pago exige back_urls https para auto_return (incluido
        # https://localhost). Con http las descarta y rechaza el auto_return.
        if base_url.startswith("https://"):
            preference_data["auto_return"] = "approved"

        result = get_sdk().preference().create(preference_data)
        if result.get("status") not in (200, 201):
            raise RuntimeError(
                f"Mercado Pago rechazó la preferencia: {result.get('response')}"
            )

        preference = result["response"]
        return {
            "preference_id": preference["id"],
            "init_point": preference["init_point"],
            "sandbox_init_point": preference.get("sandbox_init_point"),
        }

    # --- Creación y avance del pago ---

    def iniciar_pago(self, reserva_id: int) -> Pago:
        reserva = db.session.get(Reserva, reserva_id)
        if reserva is None:
            raise ValueError("La reserva indicada no existe.")

        if self._pago_existente(reserva_id) is not None:
            raise ValueError("Ya existe un pago para esta reserva.")

        precio = reserva.turno.actividad.precio
        monto = precio / Decimal("2")

        pago = Pago(
            user_id=reserva.user_id,
            reserva_id=reserva_id,
            monto=monto,
            estado=PagoEstado.SENADO,
        )
        db.session.add(pago)
        db.session.commit()
        return pago

    def registrar_sena_si_falta(self, reserva_id: int) -> Pago:
        """Asegura que exista el pago de la seña (idempotente).

        Se llama al volver con éxito de Mercado Pago. Si ya hay un pago para la
        reserva lo devuelve sin crear otro; si no, lo crea en estado SENADO.
        """
        pago = self._pago_existente(reserva_id)
        if pago is not None:
            return pago
        return self.iniciar_pago(reserva_id)

    def completar_pago(self, reserva_id: int) -> Pago:
        """Registra el pago del saldo como un segundo Pago inmutable.

        No muta la seña: inserta una fila nueva en estado PAGADO cuyo `monto` es
        el saldo realmente cobrado (precio - seña). El historial queda con dos
        transacciones (seña + saldo) que suman el precio completo.

        Idempotente: si ya existe un pago PAGADO para la reserva lo devuelve, así
        el doble retorno de Mercado Pago (o StrictMode) no duplica el cobro.
        """
        reserva = db.session.get(Reserva, reserva_id)
        if reserva is None:
            raise ValueError("La reserva indicada no existe.")

        pagado = self._pago_por_estado(reserva_id, PagoEstado.PAGADO)
        if pagado is not None:
            return pagado

        sena = self._pago_por_estado(reserva_id, PagoEstado.SENADO)
        if sena is None:
            raise ValueError("No existe una seña para esta reserva.")

        saldo = reserva.turno.actividad.precio - sena.monto
        pago = Pago(
            user_id=reserva.user_id,
            reserva_id=reserva_id,
            monto=saldo,
            estado=PagoEstado.PAGADO,
        )
        db.session.add(pago)
        db.session.commit()
        return pago

    def registrar_cancelacion(self, reserva_id: int, *, reembolsar: bool) -> Pago | None:
        """Cierra el historial de pagos de una reserva cancelada.

        Suma lo efectivamente cobrado (la seña, o seña + saldo si estaba pagada)
        y agrega una fila inmutable al historial: REEMBOLSADO cuando se devuelve
        el dinero (cancelación con más de 24 h de anticipación) o CANCELADO
        cuando se retiene (dentro de las 24 h). No interactúa con Mercado Pago:
        es solo el asiento contable.

        Si la reserva no tiene pagos cobrados (estaba pendiente), no hay nada que
        registrar y devuelve None. Idempotente: si ya existe la fila de cierre la
        devuelve sin duplicarla.
        """
        cierre = self._pago_por_estado(
            reserva_id, PagoEstado.REEMBOLSADO
        ) or self._pago_por_estado(reserva_id, PagoEstado.CANCELADO)
        if cierre is not None:
            return cierre

        cobrados = self._pagos_cobrados(reserva_id)
        if not cobrados:
            return None

        total = sum((p.monto for p in cobrados), Decimal("0"))
        estado = PagoEstado.REEMBOLSADO if reembolsar else PagoEstado.CANCELADO
        registro = Pago(
            user_id=cobrados[0].user_id,
            reserva_id=reserva_id,
            monto=total,
            estado=estado,
        )
        db.session.add(registro)
        db.session.commit()
        return registro

    # --- Queries ---

    def listar_por_usuario(self, user_id: int) -> list[Pago]:
        """Historial de pagos del usuario, más recientes primero.

        Carga la reserva → turno → actividad de cada pago. Usa `include_deleted`
        para resolver esas relaciones aunque la reserva haya sido cancelada o
        reembolsada (soft-delete): un pago reembolsado sigue siendo parte del
        historial. El propio pago se sigue filtrando por `deleted_at IS NULL`.
        """
        stmt = (
            select(Pago)
            .where(Pago.user_id == user_id, Pago.deleted_at.is_(None))
            .options(
                joinedload(Pago.reserva)
                .joinedload(Reserva.turno)
                .joinedload(Turno.actividad)
            )
            .order_by(Pago.created_at.desc())
            .execution_options(include_deleted=True)
        )
        return db.session.execute(stmt).scalars().all()

    def listar_todos(self) -> list[Pago]:
        """Historial de pagos de todos los usuarios, más recientes primero.

        Variante de `listar_por_usuario` para la vista de administración: no
        filtra por usuario y además carga el `user` de cada pago para mostrar a
        quién pertenece la transacción. Igual que aquella, usa `include_deleted`
        para resolver la reserva → turno → actividad aunque la reserva haya sido
        cancelada o reembolsada (soft-delete).
        """
        stmt = (
            select(Pago)
            .where(Pago.deleted_at.is_(None))
            .options(
                joinedload(Pago.user),
                joinedload(Pago.reserva)
                .joinedload(Reserva.turno)
                .joinedload(Turno.actividad),
            )
            .order_by(Pago.created_at.desc())
            .execution_options(include_deleted=True)
        )
        return db.session.execute(stmt).scalars().all()

    def tiene_pago(self, reserva_id: int) -> bool:
        """True si la reserva ya tiene un pago (seña o total) registrado."""
        return self._pago_existente(reserva_id) is not None

    def _pago_existente(self, reserva_id: int) -> Pago | None:
        stmt = select(Pago).where(Pago.reserva_id == reserva_id)
        return db.session.execute(stmt).scalars().first()

    def _pagos_cobrados(self, reserva_id: int) -> list[Pago]:
        """Pagos efectivamente cobrados de la reserva (seña y/o saldo)."""
        stmt = select(Pago).where(
            Pago.reserva_id == reserva_id,
            Pago.estado.in_([PagoEstado.SENADO, PagoEstado.PAGADO]),
        )
        return db.session.execute(stmt).scalars().all()

    def _pago_por_estado(self, reserva_id: int, estado: PagoEstado) -> Pago | None:
        stmt = select(Pago).where(
            Pago.reserva_id == reserva_id, Pago.estado == estado
        )
        return db.session.execute(stmt).scalars().first()
