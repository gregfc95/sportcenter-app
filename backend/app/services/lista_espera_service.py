import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from .. import db
from ..models.reserva import EstadoEspera, MotivoCancelacion, Reserva, ReservaTipo
from ..models.turno import Turno
from .email_service import send_lista_espera_email

logger = logging.getLogger(__name__)

# La `hora` del turno es hora de pared local de Argentina. Se define acá (en vez
# de importarla de reserva_service) para no crear un import circular: este
# servicio es hoja y reserva_service lo importa a él.
AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")

# La oferta dura una hora: si el cliente no paga ni cancela, el lugar pasa al
# siguiente y él conserva su posición para la próxima cancelación real.
OFERTA_VENTANA = timedelta(hours=1)


class ListaEsperaService:
    """Mecánica de la cola de espera: demanda, promoción, oferta y vencimiento.

    Un lugar libre se ofrece al primero de la cola (abonos mensuales primero,
    luego FIFO). La oferta retiene el cupo por una hora; si vence, pasa al
    siguiente y el cliente conserva su posición. Trabaja sobre filas `Reserva`
    con `estado_espera`; no crea reservas (eso lo hace `ReservaService`).
    """

    def hay_lugar(self, turno: Turno, fecha) -> bool:
        """True si queda cupo firme (reservas normales + ofertadas) en la sesión."""
        return self._cupo_libre(turno, fecha) > 0

    def hay_demanda(self, turno_id: int, fecha) -> bool:
        """True si hay alguien en espera (elegible) para ese turno y fecha."""
        stmt = (
            select(Reserva.id)
            .where(
                Reserva.turno_id == turno_id,
                Reserva.fecha == fecha,
                Reserva.estado_espera == EstadoEspera.ESPERANDO,
            )
            .limit(1)
        )
        return db.session.execute(stmt).first() is not None

    def promover(self, turno_id: int, fecha, *, motivo: str) -> None:
        """Ofrece el/los lugar(es) libres de una sesión al frente de la cola.

        `motivo="cancelacion"` (se abrió un lugar real) re-arma los vencidos de
        esa fecha: vuelven a ser elegibles. `motivo="vencimiento"` (venció una
        oferta o se soltó un hold) NO re-arma, así la cascada baja una sola vez
        por episodio de vacante y no hay ping-pong de re-ofertas.

        Prioridad estricta: si el frente es un abono mensual que todavía no entra
        completo (alguna de sus clases sigue llena), el lugar espera y nadie de
        más abajo lo toma.
        """
        turno = db.session.get(Turno, turno_id)
        if turno is None:
            return

        if motivo == "cancelacion":
            self._rearmar_vencidos(turno_id, fecha)

        while self._cupo_libre(turno, fecha) > 0:
            cola = self._cola(turno_id, fecha)
            if not cola:
                return
            head = cola[0]

            if head.tipo != ReservaTipo.MENSUAL:
                if self._pasada(head.fecha, turno):
                    self._cancelar(head)
                    continue
                self._ofertar([head], turno)
                continue

            # Abono mensual: se descartan las clases ya pasadas (para no cobrar
            # lo que no se puede usar) y solo se ofrece si TODAS las restantes
            # tienen lugar; si no, el lugar espera (prioridad estricta).
            self._purgar_pasadas(self._filas_grupo(head.grupo_id), turno)
            futuras = self._filas_grupo(head.grupo_id)
            if not futuras:
                continue
            if all(self._cupo_libre(turno, f.fecha) > 0 for f in futuras):
                self._ofertar(futuras, turno)
                continue
            return

    def expirar_ofertas(self) -> None:
        """Vence las ofertas fuera de plazo y pasa el lugar al siguiente.

        Cuerpo del barrido del scheduler. Las filas ofertadas cuyo plazo pasó
        quedan VENCIDO (liberan el hold) y se promueve al siguiente por cada
        (turno, fecha) afectada. Además purga filas en espera cuya fecha/hora ya
        pasó: dejaron de tener sentido y no deben seguir contando como demanda.
        """
        ahora = datetime.now(timezone.utc)
        stmt = select(Reserva).where(
            Reserva.estado_espera == EstadoEspera.OFERTADO,
            Reserva.oferta_expira_at < ahora,
        )
        vencidas = db.session.execute(stmt).scalars().all()

        afectadas = set()
        for fila in vencidas:
            afectadas.add((fila.turno_id, fila.fecha))
            fila.estado_espera = EstadoEspera.VENCIDO
            fila.oferta_expira_at = None

        self._purgar_espera_pasadas()
        db.session.commit()

        for turno_id, fecha in sorted(afectadas):
            self.promover(turno_id, fecha, motivo="vencimiento")

    def confirmar_lugar(self, reserva: Reserva) -> None:
        """Saca de la lista a la reserva (o al grupo) al registrarse su pago.

        Limpia `estado_espera`/`oferta_expira_at` sea cual sea el estado actual
        (ofertado, vencido o incluso esperando: un vencido puede re-armarse a
        esperando mientras el cliente está en Mercado Pago). Se completa igual
        porque el dinero ya se cobró y la app no reembolsa del lado de MP; el
        peor caso es un sobrecupo transitorio de 1, que exige una triple
        coincidencia. No hace commit: se asienta en la transacción del pago.
        """
        if reserva.estado_espera is None:
            return
        if reserva.tipo == ReservaTipo.MENSUAL and reserva.grupo_id:
            filas = self._filas_grupo(reserva.grupo_id)
        else:
            filas = [reserva]
        for fila in filas:
            fila.estado_espera = None
            fila.oferta_expira_at = None

    def posicion(self, reserva: Reserva) -> int | None:
        """Posición 1-based en la cola de su fecha; None si no está esperando."""
        if reserva.estado_espera != EstadoEspera.ESPERANDO:
            return None
        cola = self._cola(reserva.turno_id, reserva.fecha)
        objetivo = self._clave_unidad(reserva)
        for i, r in enumerate(cola, start=1):
            if self._clave_unidad(r) == objetivo:
                return i
        return None

    # --- Internos ---

    def _cupo_libre(self, turno: Turno, fecha) -> int:
        """Lugares libres contando solo reservas firmes (normales y ofertadas)."""
        stmt = select(func.count(Reserva.id)).where(
            Reserva.turno_id == turno.id,
            Reserva.fecha == fecha,
            or_(
                Reserva.estado_espera.is_(None),
                Reserva.estado_espera == EstadoEspera.OFERTADO,
            ),
        )
        ocupados = db.session.execute(stmt).scalar()
        return turno.cupo - ocupados

    def _cola(self, turno_id: int, fecha) -> list[Reserva]:
        """Unidades en espera para esa fecha, mensual primero y luego FIFO.

        Cada unidad se representa con una fila: la eventual es su propia fila; el
        abono mensual, la fila de esa fecha (una por grupo y fecha). El orden
        pone los abonos mensuales antes que las eventuales y, dentro de cada
        tipo, respeta el orden de llegada (`created_at`).
        """
        stmt = select(Reserva).where(
            Reserva.turno_id == turno_id,
            Reserva.fecha == fecha,
            Reserva.estado_espera == EstadoEspera.ESPERANDO,
        )
        filas = db.session.execute(stmt).scalars().all()
        return sorted(
            filas, key=lambda r: (r.tipo != ReservaTipo.MENSUAL, r.created_at)
        )

    def _clave_unidad(self, reserva: Reserva):
        if reserva.tipo == ReservaTipo.MENSUAL:
            return ("grupo", reserva.grupo_id)
        return ("reserva", reserva.id)

    def _filas_grupo(self, grupo_id: str) -> list[Reserva]:
        """Filas vivas del abono (grupo), ordenadas por fecha."""
        stmt = (
            select(Reserva)
            .where(Reserva.grupo_id == grupo_id)
            .order_by(Reserva.fecha.asc())
        )
        return db.session.execute(stmt).scalars().all()

    def _rearmar_vencidos(self, turno_id: int, fecha) -> None:
        stmt = select(Reserva).where(
            Reserva.turno_id == turno_id,
            Reserva.fecha == fecha,
            Reserva.estado_espera == EstadoEspera.VENCIDO,
        )
        vencidos = db.session.execute(stmt).scalars().all()
        if not vencidos:
            return
        for fila in vencidos:
            if fila.tipo == ReservaTipo.MENSUAL and fila.grupo_id:
                for f in self._filas_grupo(fila.grupo_id):
                    f.estado_espera = EstadoEspera.ESPERANDO
            else:
                fila.estado_espera = EstadoEspera.ESPERANDO
        db.session.commit()

    def _ofertar(self, filas: list[Reserva], turno: Turno) -> None:
        """Marca las filas como OFERTADO con su plazo y avisa por email.

        El plazo es una hora, pero nunca pasa del inicio del turno (para un
        abono, su primera clase futura). El email va dentro de try/except: la
        oferta debe persistir aunque el transporte de mail falle (p. ej. Mailtrap
        sin configurar en dev); el barrido la pasará al siguiente igual.
        """
        limite = datetime.now(timezone.utc) + OFERTA_VENTANA
        inicio_turno = min(
            datetime.combine(f.fecha, turno.hora, tzinfo=AR_TZ).astimezone(timezone.utc)
            for f in filas
        )
        expira = min(limite, inicio_turno)
        for fila in filas:
            fila.estado_espera = EstadoEspera.OFERTADO
            fila.oferta_expira_at = expira
        db.session.commit()

        self._enviar_email(filas, turno, expira)

    def _enviar_email(self, filas: list[Reserva], turno: Turno, expira) -> None:
        user = filas[0].user
        actividad = turno.actividad
        turno_label = f"{turno.dia_semana.value} {turno.hora.strftime('%H:%M')}"
        fechas = sorted(f.fecha for f in filas)
        clases_label = ", ".join(f.strftime("%d/%m") for f in fechas)
        expira_label = expira.astimezone(AR_TZ).strftime("%H:%M")
        try:
            send_lista_espera_email(
                user.email,
                nombre=user.first_name,
                actividad=actividad.nombre,
                turno_label=turno_label,
                clases_label=clases_label,
                expira_label=expira_label,
            )
        except Exception:
            logger.exception(
                "No se pudo enviar el aviso de lista de espera a %s", user.email
            )

    def _purgar_pasadas(self, filas: list[Reserva], turno: Turno) -> None:
        """Da de baja las filas del grupo cuya fecha/hora ya pasó."""
        cambio = False
        for fila in filas:
            if self._pasada(fila.fecha, turno):
                fila.motivo_cancelacion = MotivoCancelacion.CANCELADO
                fila.soft_delete()
                cambio = True
        if cambio:
            db.session.commit()

    def _purgar_espera_pasadas(self) -> None:
        """Da de baja filas en espera (cualquier estado) cuya fecha/hora ya pasó.

        Sin commit: lo asienta `expirar_ofertas`.
        """
        hoy = datetime.now(tz=AR_TZ).date()
        stmt = (
            select(Reserva)
            .where(Reserva.estado_espera.isnot(None), Reserva.fecha <= hoy)
            .options(joinedload(Reserva.turno))
        )
        for fila in db.session.execute(stmt).scalars().all():
            if self._pasada(fila.fecha, fila.turno):
                fila.motivo_cancelacion = MotivoCancelacion.CANCELADO
                fila.soft_delete()

    def _cancelar(self, reserva: Reserva) -> None:
        reserva.motivo_cancelacion = MotivoCancelacion.CANCELADO
        reserva.soft_delete()
        db.session.commit()

    def _pasada(self, fecha, turno: Turno) -> bool:
        inicio = datetime.combine(fecha, turno.hora, tzinfo=AR_TZ)
        return inicio <= datetime.now(tz=AR_TZ)
