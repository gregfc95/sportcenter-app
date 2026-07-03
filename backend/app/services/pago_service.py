from decimal import Decimal

from flask import current_app
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from .. import db
from ..models.pago import Pago, PagoEstado, PagoMedio
from ..models.reserva import MotivoCancelacion, Reserva, ReservaTipo
from ..models.turno import Turno
from .mercadopago_client import get_sdk
from .reserva_service import ReservaService


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
        if reserva.tipo == ReservaTipo.MENSUAL:
            # El abono mensual no admite seña: se paga completo por adelantado.
            raise ValueError("Un abono mensual se paga completo, sin seña.")

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

        saldo = self.resumen_pago(reserva)["saldo"]
        if saldo <= 0:
            raise ValueError("La reserva no tiene saldo pendiente.")

        actividad = reserva.turno.actividad
        return self._crear_preferencia(
            reserva_id,
            title=f"Saldo - {actividad.nombre}",
            monto=saldo,
            success_path="/pago/exito?accion=completar",
        )

    def crear_preferencia_mensualidad(self, reserva_id: int) -> dict:
        """Crea una preferencia de Checkout Pro por el total del abono mensual.

        El abono se paga completo (precio de la clase × clases restantes del
        mes), sin seña. `reserva_id` puede ser cualquier reserva del grupo; la
        preferencia queda referenciada a la primera (la de fecha más temprana).
        El `success_path` lleva `accion=mensualidad` para que el retorno de
        Mercado Pago registre el pago del abono completo.
        """
        reserva = db.session.get(Reserva, reserva_id)
        if reserva is None:
            raise ValueError("La reserva indicada no existe.")
        if reserva.tipo != ReservaTipo.MENSUAL:
            raise ValueError("La reserva no es de un abono mensual.")

        grupo = ReservaService().grupo_mensual(reserva)
        if any(self._pagos_cobrados(r.id) for r in grupo):
            raise ValueError("La mensualidad ya tiene un pago registrado.")

        actividad = reserva.turno.actividad
        monto = actividad.precio * len(grupo)
        pref = self._crear_preferencia(
            grupo[0].id,
            title=f"Mensualidad - {actividad.nombre}",
            monto=monto,
            success_path="/pago/exito?accion=mensualidad",
        )
        return {
            **pref,
            "reserva_id": grupo[0].id,
            "fechas": [r.fecha.isoformat() for r in grupo],
            "clases": len(grupo),
            "monto": float(monto),
        }

    def registrar_mensualidad(self, reserva_id: int) -> list[Pago]:
        """Registra el pago completo del abono mensual (idempotente).

        Se llama al volver con éxito de Mercado Pago. Crea un Pago PAGADO por
        clase (monto = precio vigente de la actividad) para cada reserva del
        grupo que aún no tenga pago; las que ya lo tienen se devuelven tal
        cual, así el doble retorno (o StrictMode) no duplica cobros.
        """
        reserva = db.session.get(Reserva, reserva_id)
        if reserva is None:
            raise ValueError("La reserva indicada no existe.")
        if reserva.tipo != ReservaTipo.MENSUAL:
            raise ValueError("La reserva no es de un abono mensual.")

        grupo = ReservaService().grupo_mensual(reserva)
        precio = reserva.turno.actividad.precio

        pagos = []
        nuevos = False
        for r in grupo:
            pago = self._pago_existente(r.id)
            if pago is None:
                pago = Pago(
                    user_id=r.user_id,
                    reserva_id=r.id,
                    monto=precio,
                    estado=PagoEstado.PAGADO,
                )
                db.session.add(pago)
                nuevos = True
            pagos.append(pago)
        if nuevos:
            db.session.commit()
        return pagos

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

        saldo = self.resumen_pago(reserva)["saldo"]
        if saldo <= 0:
            raise ValueError("La reserva no tiene saldo pendiente.")

        pago = Pago(
            user_id=reserva.user_id,
            reserva_id=reserva_id,
            monto=saldo,
            estado=PagoEstado.PAGADO,
        )
        db.session.add(pago)
        db.session.commit()
        return pago

    def registrar_pago_manual(self, reserva_id: int, registrado_por_id: int) -> Pago:
        """Registra en efectivo el saldo restante de una reserva (cobro en mostrador).

        Pensado para que un empleado/admin asiente un pago hecho fuera de Mercado
        Pago. Crea un Pago PAGADO por lo que falta cobrar (precio - lo ya cobrado),
        con medio EFECTIVO y el id del staff que lo registró. Falla si la reserva
        ya está paga o no tiene saldo pendiente.
        """
        reserva = db.session.get(Reserva, reserva_id)
        if reserva is None:
            raise ValueError("La reserva indicada no existe.")

        if self._pago_por_estado(reserva_id, PagoEstado.PAGADO) is not None:
            raise ValueError("La reserva ya está paga.")

        # Saldo sobre el precio bloqueado al momento de la seña (no el actual),
        # para no cobrar de menos/de más si la actividad cambió de precio después.
        restante = self.resumen_pago(reserva)["saldo"]
        if restante <= 0:
            raise ValueError("La reserva no tiene saldo pendiente.")

        pago = Pago(
            user_id=reserva.user_id,
            reserva_id=reserva_id,
            monto=restante,
            estado=PagoEstado.PAGADO,
            metodo=PagoMedio.EFECTIVO,
            registrado_por_id=registrado_por_id,
        )
        db.session.add(pago)
        db.session.commit()
        return pago

    def registrar_cancelacion(
        self, reserva_id: int, *, resolucion: PagoEstado
    ) -> Pago | None:
        """Cierra el historial de pagos de una reserva cancelada.

        Suma lo efectivamente cobrado y agrega una fila inmutable al historial
        según la `resolucion`: REEMBOLSADO cuando se devuelve el dinero,
        CREDITO cuando queda como crédito a favor de esa actividad (clases
        mensuales, a elección del cliente) o CANCELADO cuando se retiene
        (dentro de la ventana de anticipación). No interactúa con Mercado
        Pago: es solo el asiento contable.

        Si la reserva no tiene pagos cobrados (estaba pendiente), no hay nada que
        registrar y devuelve None. Idempotente: si ya existe la fila de cierre la
        devuelve sin duplicarla.
        """
        if resolucion not in (
            PagoEstado.REEMBOLSADO,
            PagoEstado.CANCELADO,
            PagoEstado.CREDITO,
        ):
            raise ValueError("Resolución de cancelación inválida.")

        cierre = (
            self._pago_por_estado(reserva_id, PagoEstado.REEMBOLSADO)
            or self._pago_por_estado(reserva_id, PagoEstado.CANCELADO)
            or self._pago_por_estado(reserva_id, PagoEstado.CREDITO)
        )
        if cierre is not None:
            return cierre

        cobrados = self._pagos_cobrados(reserva_id)
        if not cobrados:
            return None

        total = sum((p.monto for p in cobrados), Decimal("0"))
        estado = resolucion
        registro = Pago(
            user_id=cobrados[0].user_id,
            reserva_id=reserva_id,
            monto=total,
            estado=estado,
        )
        db.session.add(registro)
        db.session.commit()
        return registro

    def cancelar_reserva_por_baja(self, reserva_id: int) -> None:
        """Cancela una reserva por baja forzada del centro, reembolsando lo cobrado.

        La baja es decisión del centro (eliminar la actividad, el turno o una
        fecha puntual), no del cliente: corresponde devolver lo abonado sin
        importar la antelación. `registrar_cancelacion` asienta el reembolso y
        devuelve None si no había nada cobrado (reserva pendiente), en cuyo
        caso la reserva se cancela sin reembolso.
        """
        registro = self.registrar_cancelacion(
            reserva_id, resolucion=PagoEstado.REEMBOLSADO
        )
        motivo = (
            MotivoCancelacion.REEMBOLSADO
            if registro is not None
            else MotivoCancelacion.CANCELADO
        )
        ReservaService().cancelar_reserva(reserva_id, motivo=motivo)

    # --- Resumen económico ---

    def resumen_pago(self, reserva: Reserva) -> dict:
        """Total adeudado, seña abonada y saldo restante de una reserva.

        El precio queda *bloqueado al momento de reservar*: la seña es un snapshot
        inmutable del 50% del precio vigente cuando se señó, así que mientras esa
        seña exista el total es `seña × 2` y no se ve afectado por cambios
        posteriores del precio de la actividad. Si todavía no hay seña (reserva
        pendiente) no hay nada bloqueado y se usa el precio actual.

        El saldo es el total menos lo efectivamente cobrado (seña y/o saldo), con
        piso en cero por seguridad. Opera sobre `reserva.pagos` en memoria para no
        agregar consultas cuando la relación ya está cargada.

        Una clase mensual no tiene seña: se abona completa con el resto del
        abono. Su total es el monto del pago registrado (snapshot del precio al
        pagar) o el precio vigente si el abono sigue pendiente.
        """
        if reserva.tipo == ReservaTipo.MENSUAL:
            pagado = next(
                (p for p in reserva.pagos if p.estado == PagoEstado.PAGADO), None
            )
            total = pagado.monto if pagado is not None else (
                reserva.turno.actividad.precio
            )
            cobrado = sum(
                (
                    p.monto
                    for p in reserva.pagos
                    if p.estado in (PagoEstado.SENADO, PagoEstado.PAGADO)
                ),
                Decimal("0"),
            )
            return {
                "total": total,
                "sena": Decimal("0"),
                "cobrado": cobrado,
                "saldo": max(total - cobrado, Decimal("0")),
            }

        sena = next(
            (p for p in reserva.pagos if p.estado == PagoEstado.SENADO), None
        )
        if sena is not None:
            sena_monto = sena.monto
            total = sena_monto * 2
        else:
            total = reserva.turno.actividad.precio
            sena_monto = total / Decimal("2")

        cobrado = sum(
            (
                p.monto
                for p in reserva.pagos
                if p.estado in (PagoEstado.SENADO, PagoEstado.PAGADO)
            ),
            Decimal("0"),
        )
        saldo = max(total - cobrado, Decimal("0"))
        return {
            "total": total,
            "sena": sena_monto,
            "cobrado": cobrado,
            "saldo": saldo,
        }

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
                joinedload(Pago.registrado_por),
                joinedload(Pago.reserva)
                .joinedload(Reserva.turno)
                .joinedload(Turno.actividad),
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
                joinedload(Pago.registrado_por),
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
