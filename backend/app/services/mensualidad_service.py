import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError

from .. import db
from ..models.pago import Pago, PagoEstado
from ..models.penalizacion import Penalizacion, PenalizacionMotivo
from ..models.reserva import EstadoEspera, MotivoCancelacion, Reserva, ReservaTipo
from ..models.suspension import Suspension
from ..models.turno import Turno
from .email_service import send_recordatorio_renovacion_email
from .lista_espera_service import ListaEsperaService
from .reserva_service import (
    AR_TZ,
    WEEKDAY_TO_DIA_SEMANA,
    ReservaService,
    fechas_mensuales,
)

logger = logging.getLogger(__name__)


# La renovación garantizada del abono debe pagarse antes del día 11 a las 00:00
# (AR); vencida, se cancela el resto del abono y el cliente queda suspendido.
RENOVACION_DIA_LIMITE = 11

# Descuento de fidelidad sobre la mensualidad. Se pierde con 3 penalizaciones en
# el mes (previo o corriente) o por haber estado suspendido.
DESCUENTO_FIDELIDAD = Decimal("0.20")
PENALIZACIONES_MAX = 3


class MensualidadService:
    """Reglas de suscripción mensual: renovación garantizada, penalizaciones,
    suspensión y descuento de fidelidad.

    Los dos jobs (`generar_renovaciones`, `procesar_vencimientos`) son funciones
    puras de `hoy` e idempotentes, así el scheduler puede re-correrlos y
    recuperar días caídos sin duplicar efectos.
    """

    def __init__(self):
        self.reservas = ReservaService()
        self.lista_espera = ListaEsperaService()

    # --- Jobs diarios ---

    def generar_renovaciones(self, hoy: date | None = None) -> list[Reserva]:
        """Crea el abono del mes en curso para quienes pagaron el mes anterior.

        La garantía manda: la renovación se crea sin validar cupo, demanda de
        lista de espera ni conflicto horario (el cliente ya tenía ese lugar).
        Idempotente y con catch-up: no genera después del día 11, saltea abonos
        impagos, usuarios suspendidos y orígenes ya renovados (aunque se hayan
        declinado), y arma solo las clases que quedan del mes si corre atrasado.
        """
        hoy = hoy or datetime.now(tz=AR_TZ).date()
        if hoy.day >= RENOVACION_DIA_LIMITE:
            return []

        anio_prev, mes_prev = self._mes_anterior(hoy)
        inicio_prev = date(anio_prev, mes_prev, 1)
        fin_prev = hoy.replace(day=1)

        stmt = select(Reserva).where(
            Reserva.tipo == ReservaTipo.MENSUAL,
            Reserva.estado_espera.is_(None),
            Reserva.grupo_id.isnot(None),
            Reserva.fecha >= inicio_prev,
            Reserva.fecha < fin_prev,
        )
        grupos: dict[str, Reserva] = {}
        for r in db.session.execute(stmt).scalars().all():
            grupos.setdefault(r.grupo_id, r)

        creadas = []
        for grupo_origen, rep in grupos.items():
            if not self._grupo_tiene_cobros(grupo_origen):
                continue
            if self.suspendido(rep.user_id):
                continue
            if self._ya_renovado(grupo_origen):
                continue
            turno = db.session.get(Turno, rep.turno_id)
            if turno is None:
                continue
            creadas.extend(
                self._crear_renovacion(rep.user_id, turno, grupo_origen, hoy)
            )
        return creadas

    def procesar_vencimientos(self, hoy: date | None = None) -> None:
        """Penaliza renovaciones impagas y aplica el deadline del día 11.

        Primero (días 1..10) penaliza y cancela cada clase de renovación que ya
        pasó sin pagarse; después, del 11 en adelante, cancela el resto del abono
        impago y suspende al cliente. Se corre a diario a las 00:05 AR; también
        recupera días caídos porque todo se deriva de `hoy` y es idempotente.
        """
        hoy = hoy or datetime.now(tz=AR_TZ).date()
        self._penalizar_renovaciones_pasadas(hoy)
        if hoy.day >= RENOVACION_DIA_LIMITE:
            self._aplicar_deadline(hoy)

    def recordar_renovaciones_impagas(self, hoy: date | None = None) -> list[str]:
        """Envía por email un recordatorio de pago de las renovaciones impagas.

        Pensado para correr el día 10 (un día antes del deadline del 11): busca
        los abonos de renovación del mes en curso todavía sin cobros y avisa una
        vez a cada cliente para que pague desde Mis Turnos antes de perder el
        lugar. El email va en try/except para que un fallo de transporte no corte
        el resto de los avisos. Devuelve los emails avisados con éxito (el
        scheduler lo ignora; el disparo manual de demo lo muestra al staff).
        """
        hoy = hoy or datetime.now(tz=AR_TZ).date()
        inicio_mes = hoy.replace(day=1)
        fin_mes = self._primer_dia_mes_siguiente(hoy)
        stmt = select(Reserva).where(
            Reserva.renovacion_de_grupo_id.isnot(None),
            Reserva.estado_espera.is_(None),
            Reserva.fecha >= inicio_mes,
            Reserva.fecha < fin_mes,
        )
        grupos: dict[str, list[Reserva]] = {}
        for r in db.session.execute(stmt).scalars().all():
            grupos.setdefault(r.grupo_id, []).append(r)

        limite = hoy.replace(day=RENOVACION_DIA_LIMITE)
        avisados: list[str] = []
        for grupo_id, reservas in grupos.items():
            if self._grupo_tiene_cobros(grupo_id):
                continue
            reservas.sort(key=lambda x: x.fecha)
            turno = reservas[0].turno
            user = reservas[0].user
            clases_label = ", ".join(r.fecha.strftime("%d/%m") for r in reservas)
            try:
                send_recordatorio_renovacion_email(
                    user.email,
                    nombre=user.first_name,
                    actividad=turno.actividad.nombre,
                    turno_label=f"{turno.dia_semana.value} {turno.hora.strftime('%H:%M')}",
                    clases_label=clases_label,
                    fecha_limite_label=limite.strftime("%d/%m"),
                )
                avisados.append(user.email)
            except Exception:
                logger.exception(
                    "No se pudo enviar el recordatorio de renovación a %s",
                    user.email,
                )
        return avisados

    def resetear_penalizaciones_mes(self, hoy: date | None = None) -> int:
        """Borra las penalizaciones del mes en curso de todos los usuarios.

        Espejo manual (demo) del rollover del 1°: el conteo "del mes" que ve el
        cliente se hace por `created_at`, así que borrar las filas del mes
        vigente deja el contador de todos en cero. No toca suspensiones ni las
        penalizaciones de meses anteriores. Devuelve cuántas filas borró.
        """
        hoy = hoy or datetime.now(tz=AR_TZ).date()
        inicio, fin = self._rango_mes_utc(hoy.year, hoy.month)
        stmt = delete(Penalizacion).where(
            Penalizacion.created_at >= inicio,
            Penalizacion.created_at < fin,
        )
        borradas = db.session.execute(stmt).rowcount
        db.session.commit()
        return borradas

    # --- Descuento de fidelidad ---

    def descuento_mensualidad(
        self, user_id: int, hoy: date | None = None
    ) -> Decimal:
        """Fracción de descuento (0.20 o 0) para la mensualidad del usuario.

        Se pierde si está suspendido ahora, si lo estuvo en algún momento del
        mes anterior, o si acumuló 3+ penalizaciones en el mes anterior o en el
        corriente. El conteo mensual se ancla a la hora de pared argentina.
        """
        hoy = hoy or datetime.now(tz=AR_TZ).date()
        anio_prev, mes_prev = self._mes_anterior(hoy)

        if self.suspendido(user_id):
            return Decimal("0")
        if self._suspendido_durante_mes(user_id, anio_prev, mes_prev):
            return Decimal("0")
        if self._penalizaciones_mes(user_id, anio_prev, mes_prev) >= PENALIZACIONES_MAX:
            return Decimal("0")
        if self._penalizaciones_mes(user_id, hoy.year, hoy.month) >= PENALIZACIONES_MAX:
            return Decimal("0")
        return DESCUENTO_FIDELIDAD

    def monto_clase_mensualidad(self, precio: Decimal, user_id: int) -> Decimal:
        """Precio por clase del abono con el descuento aplicado, redondeado.

        Se cuantiza por clase para que el total de la preferencia, los `Pago`
        que se asientan y el total de la card coincidan exactamente
        (`monto_clase × clases`)."""
        descuento = self.descuento_mensualidad(user_id)
        return (precio * (Decimal("1") - descuento)).quantize(Decimal("0.01"))

    # --- Penalizaciones ---

    def registrar_penalizaciones_cancelacion(
        self, reservas: list[Reserva]
    ) -> None:
        """Suma una penalización por cada clase mensual cancelada por el cliente.

        La penalización corre siempre, dentro o fuera de la ventana de 48 h (la
        ventana solo decide reembolso/crédito). Idempotente vía la restricción
        única (reserva, motivo).
        """
        for reserva in reservas:
            self._penalizar(
                reserva.user_id, reserva.id, PenalizacionMotivo.CANCELACION_CLASE
            )
        db.session.commit()

    # --- Suspensión ---

    def suspender_usuario(self, user_id: int, grupo_id: str) -> Suspension:
        """Suspende al usuario (idempotente) y lo saca de las listas de espera.

        Si ya tiene una suspensión abierta la devuelve. Al suspender, cancela sus
        filas en espera sin penalizar; las que estaban ofertadas liberan su hold,
        así que se promueve al siguiente de cada sesión afectada.
        """
        abierta = self._suspension_abierta(user_id)
        if abierta is not None:
            return abierta

        suspension = Suspension(user_id=user_id, grupo_id=grupo_id)
        db.session.add(suspension)

        esperas = db.session.execute(
            select(Reserva).where(
                Reserva.user_id == user_id,
                Reserva.estado_espera.isnot(None),
            )
        ).scalars().all()
        holds = set()
        for fila in esperas:
            if fila.estado_espera == EstadoEspera.OFERTADO:
                holds.add((fila.turno_id, fila.fecha))
            fila.motivo_cancelacion = MotivoCancelacion.CANCELADO
            fila.soft_delete()
        db.session.commit()

        for turno_id, fecha in sorted(holds):
            self.lista_espera.promover(turno_id, fecha, motivo="vencimiento")
        return suspension

    def levantar_suspension(self, user_id: int) -> None:
        """Cierra la suspensión abierta del usuario (no-op si no tiene)."""
        abierta = self._suspension_abierta(user_id)
        if abierta is None:
            return
        abierta.fin_at = datetime.now(timezone.utc)
        db.session.commit()

    def suspendido(self, user_id: int) -> bool:
        return self._suspension_abierta(user_id) is not None

    def estado_cliente(self, user_id: int, hoy: date | None = None) -> dict:
        """Estado de suscripción mensual del cliente para mostrar en la UI.

        Reúne lo que hoy solo vive en el backend: si está suspendido, cuántas
        penalizaciones lleva en el mes corriente (con su tope) y si le
        corresponde el descuento de fidelidad.
        """
        hoy = hoy or datetime.now(tz=AR_TZ).date()
        descuento = self.descuento_mensualidad(user_id, hoy)
        return {
            "suspendido": self.suspendido(user_id),
            "penalizaciones_mes": self._penalizaciones_mes(
                user_id, hoy.year, hoy.month
            ),
            "penalizaciones_max": PENALIZACIONES_MAX,
            "tiene_descuento": descuento > 0,
            "descuento_pct": int(descuento * 100),
        }

    # --- Serialización ---

    def renovacion_info(self, reserva: Reserva) -> dict | None:
        """Datos de renovación para la card: la fecha límite de pago, o None.

        Solo para un abono generado como renovación que sigue impago; la fecha
        límite es el día 11 del mes de sus clases.
        """
        if not reserva.renovacion_de_grupo_id:
            return None
        if self._grupo_tiene_cobros(reserva.grupo_id):
            return None
        limite = reserva.fecha.replace(day=RENOVACION_DIA_LIMITE)
        return {"fecha_limite": limite.isoformat()}

    # --- Internos: generación / vencimientos ---

    def _crear_renovacion(
        self, user_id: int, turno: Turno, grupo_origen: str, hoy: date
    ) -> list[Reserva]:
        primera = self._primera_ocurrencia_del_mes(turno, hoy)
        if primera is None:
            return []
        fechas = self.reservas.sin_fechas_bloqueadas(
            turno, fechas_mensuales(primera)
        )
        if not fechas:
            return []
        nuevo_grupo = uuid4().hex
        reservas = [
            Reserva(
                user_id=user_id,
                turno_id=turno.id,
                fecha=fecha,
                tipo=ReservaTipo.MENSUAL,
                grupo_id=nuevo_grupo,
                renovacion_de_grupo_id=grupo_origen,
            )
            for fecha in fechas
        ]
        db.session.add_all(reservas)
        try:
            db.session.commit()
        except IntegrityError:
            # El cliente ya re-reservó a mano alguna de estas fechas (índice
            # único): no se pisa su reserva.
            db.session.rollback()
            return []
        return reservas

    def _penalizar_renovaciones_pasadas(self, hoy: date) -> None:
        stmt = select(Reserva).where(
            Reserva.renovacion_de_grupo_id.isnot(None),
            Reserva.estado_espera.is_(None),
            Reserva.fecha >= hoy.replace(day=1),
            Reserva.fecha < hoy,
        )
        for fila in db.session.execute(stmt).scalars().all():
            if self._grupo_tiene_cobros(fila.grupo_id):
                continue
            self._penalizar(
                fila.user_id, fila.id, PenalizacionMotivo.RENOVACION_IMPAGA
            )
            fila.motivo_cancelacion = MotivoCancelacion.CANCELADO
            fila.soft_delete()
            db.session.commit()
            self.lista_espera.promover(
                fila.turno_id, fila.fecha, motivo="cancelacion"
            )

    def _aplicar_deadline(self, hoy: date) -> None:
        inicio_mes = hoy.replace(day=1)
        fin_mes = self._primer_dia_mes_siguiente(hoy)
        stmt = select(Reserva).where(
            Reserva.renovacion_de_grupo_id.isnot(None),
            Reserva.estado_espera.is_(None),
            Reserva.fecha >= inicio_mes,
            Reserva.fecha < fin_mes,
        )
        grupos: dict[str, list[Reserva]] = {}
        for r in db.session.execute(stmt).scalars().all():
            grupos.setdefault(r.grupo_id, []).append(r)

        for grupo_id, reservas in grupos.items():
            if self._grupo_tiene_cobros(grupo_id):
                continue
            user_id = reservas[0].user_id
            turno_id = reservas[0].turno_id
            fechas_liberadas = [r.fecha for r in reservas]
            # Las clases futuras impagas se cancelan sin penalización: la
            # suspensión es la sanción por dejar vencer la renovación.
            for r in reservas:
                r.motivo_cancelacion = MotivoCancelacion.CANCELADO
                r.soft_delete()
            db.session.commit()
            self.suspender_usuario(user_id, grupo_id)
            for fecha in fechas_liberadas:
                self.lista_espera.promover(turno_id, fecha, motivo="cancelacion")

    def _primera_ocurrencia_del_mes(self, turno: Turno, hoy: date) -> date | None:
        objetivo = next(
            wd for wd, dia in WEEKDAY_TO_DIA_SEMANA.items() if dia == turno.dia_semana
        )
        d = hoy
        while d.month == hoy.month:
            if d.weekday() == objetivo:
                return d
            d += timedelta(days=1)
        return None

    def _ya_renovado(self, grupo_origen: str) -> bool:
        # include_deleted: una renovación declinada (soft-deleted) igual cuenta,
        # para no volver a generarla.
        stmt = (
            select(Reserva.id)
            .where(Reserva.renovacion_de_grupo_id == grupo_origen)
            .limit(1)
            .execution_options(include_deleted=True)
        )
        return db.session.execute(stmt).first() is not None

    def _grupo_tiene_cobros(self, grupo_id: str) -> bool:
        stmt = (
            select(Pago.id)
            .join(Reserva, Pago.reserva_id == Reserva.id)
            .where(
                Reserva.grupo_id == grupo_id,
                Pago.estado.in_([PagoEstado.SENADO, PagoEstado.PAGADO]),
            )
            .limit(1)
        )
        return db.session.execute(stmt).first() is not None

    # --- Internos: penalización / suspensión / conteos ---

    def _penalizar(self, user_id: int, reserva_id: int, motivo) -> None:
        existe = db.session.execute(
            select(Penalizacion.id)
            .where(
                Penalizacion.reserva_id == reserva_id,
                Penalizacion.motivo == motivo,
            )
            .limit(1)
        ).first()
        if existe is not None:
            return
        db.session.add(
            Penalizacion(user_id=user_id, reserva_id=reserva_id, motivo=motivo)
        )

    def _suspension_abierta(self, user_id: int) -> Suspension | None:
        stmt = select(Suspension).where(
            Suspension.user_id == user_id,
            Suspension.fin_at.is_(None),
        )
        return db.session.execute(stmt).scalars().first()

    def _penalizaciones_mes(self, user_id: int, anio: int, mes: int) -> int:
        inicio, fin = self._rango_mes_utc(anio, mes)
        stmt = select(func.count(Penalizacion.id)).where(
            Penalizacion.user_id == user_id,
            Penalizacion.created_at >= inicio,
            Penalizacion.created_at < fin,
        )
        return db.session.execute(stmt).scalar()

    def _suspendido_durante_mes(self, user_id: int, anio: int, mes: int) -> bool:
        inicio, fin = self._rango_mes_utc(anio, mes)
        stmt = (
            select(Suspension.id)
            .where(
                Suspension.user_id == user_id,
                Suspension.inicio_at < fin,
                or_(Suspension.fin_at.is_(None), Suspension.fin_at >= inicio),
            )
            .limit(1)
        )
        return db.session.execute(stmt).first() is not None

    # --- Internos: fechas ---

    def _mes_anterior(self, hoy: date) -> tuple[int, int]:
        primero = hoy.replace(day=1)
        prev = primero - timedelta(days=1)
        return prev.year, prev.month

    def _primer_dia_mes_siguiente(self, hoy: date) -> date:
        if hoy.month == 12:
            return date(hoy.year + 1, 1, 1)
        return date(hoy.year, hoy.month + 1, 1)

    def _rango_mes_utc(self, anio: int, mes: int) -> tuple[datetime, datetime]:
        inicio_ar = datetime(anio, mes, 1, tzinfo=AR_TZ)
        if mes == 12:
            fin_ar = datetime(anio + 1, 1, 1, tzinfo=AR_TZ)
        else:
            fin_ar = datetime(anio, mes + 1, 1, tzinfo=AR_TZ)
        return inicio_ar.astimezone(timezone.utc), fin_ar.astimezone(timezone.utc)
