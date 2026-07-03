from datetime import date, datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from .. import db
from ..models.reserva import MotivoCancelacion, Reserva, ReservaTipo
from ..models.turno import Turno, DiaSemana
from ..models.turno_fecha_bloqueada import TurnoFechaBloqueada


CANCELACION_VENTANA = timedelta(hours=24)

# Una clase de un abono mensual se cancela con beneficio (reembolso o crédito a
# favor, a elección del cliente) solo con más de 48 h de anticipación.
CANCELACION_VENTANA_MENSUAL = timedelta(hours=48)

# Cada turno ocupa un bloque fijo de 1 h. Dos turnos se solapan (y por lo tanto
# el usuario no puede tener ambos) cuando sus horas de inicio distan menos de
# esto, sin importar la actividad. Ej: con un turno a las 16:00 ocupado, 16:30
# choca pero 17:00 ya está libre.
DURACION_TURNO = timedelta(hours=1)

# La `hora` del turno es hora de pared local de Argentina (así se agenda y se
# muestra), no UTC. Para medir la anticipación real hay que interpretarla en
# esta zona.
AR_TZ = ZoneInfo("America/Argentina/Buenos_Aires")


WEEKDAY_TO_DIA_SEMANA = {
    0: DiaSemana.LUNES,
    1: DiaSemana.MARTES,
    2: DiaSemana.MIERCOLES,
    3: DiaSemana.JUEVES,
    4: DiaSemana.VIERNES,
    5: DiaSemana.SABADO,
    6: DiaSemana.DOMINGO,
}


def fechas_mensuales(fecha_inicio: date) -> list[date]:
    """Ocurrencias del mismo día de semana desde `fecha_inicio` hasta fin de mes.

    Un día de semana ocurre a lo sumo 5 veces en un mes, así que el abono
    mensual nunca supera las 5 clases.
    """
    fechas = []
    f = fecha_inicio
    while f.month == fecha_inicio.month and f.year == fecha_inicio.year:
        fechas.append(f)
        f += timedelta(days=7)
    return fechas


class ReservaService:

    def crear_reserva(
        self,
        user_id: int,
        turno_id: int,
        fecha: date,
        tipo: ReservaTipo = ReservaTipo.EVENTUAL,
    ) -> Reserva:
        turno = db.session.get(Turno, turno_id)
        if turno is None:
            raise ValueError("El turno indicado no existe.")

        self._validar_dia_semana(turno, fecha)
        self._validar_turno_no_pasado(turno, fecha)
        self._validar_fecha_no_bloqueada(turno, fecha)
        self._validar_sin_conflicto_horario(user_id, fecha, turno)
        self._validar_cupo_disponible(turno, fecha)

        reserva = Reserva(
            user_id=user_id,
            turno_id=turno_id,
            fecha=fecha,
            tipo=tipo,
        )
        db.session.add(reserva)
        db.session.commit()
        return reserva

    def crear_reserva_mensual(
        self, user_id: int, turno_id: int, fecha_inicio: date
    ) -> list[Reserva]:
        """Abona al usuario a todas las clases restantes del mes de ese turno.

        Crea una reserva MENSUAL por cada ocurrencia del turno desde
        `fecha_inicio` hasta fin de mes. Es todo-o-nada: si alguna fecha falla
        una validación (superposición o cupo), no se crea ninguna.
        """
        turno = db.session.get(Turno, turno_id)
        if turno is None:
            raise ValueError("El turno indicado no existe.")

        # Las fechas siguientes son la misma semana +7d: comparten día de
        # semana, y al ser posteriores nunca están en el pasado.
        self._validar_dia_semana(turno, fecha_inicio)
        self._validar_turno_no_pasado(turno, fecha_inicio)

        # Las fechas dadas de baja por el centro se saltean: el abono cubre
        # las clases que sí se dictan (y el precio se calcula por clase).
        fechas = self._sin_fechas_bloqueadas(turno, fechas_mensuales(fecha_inicio))
        if not fechas:
            raise ValueError(
                "El turno no tiene clases disponibles en lo que queda del mes."
            )
        for fecha in fechas:
            self._validar_sin_conflicto_horario(user_id, fecha, turno)
            self._validar_cupo_disponible(turno, fecha)

        # Un grupo_id por compra: identifica al abono sin depender de inferir
        # (usuario, turno, mes), que colisiona con generaciones ya canceladas.
        grupo_id = uuid4().hex
        reservas = [
            Reserva(
                user_id=user_id,
                turno_id=turno_id,
                fecha=fecha,
                tipo=ReservaTipo.MENSUAL,
                grupo_id=grupo_id,
            )
            for fecha in fechas
        ]
        db.session.add_all(reservas)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueError(
                "Ya tienes una reserva para alguna de las fechas del mes."
            )
        return reservas

    def grupo_mensual(
        self, reserva: Reserva, include_canceladas: bool = False
    ) -> list[Reserva]:
        """Reservas mensuales del mismo abono, ordenadas por fecha.

        El abono se identifica por `grupo_id`: todas las clases de una compra lo
        comparten, así una generación cancelada del mismo mes (con otro
        grupo_id) no se mezcla. Para filas sin grupo_id (eventuales no llegan
        acá; solo abonos viejos previos al backfill) se cae al criterio
        histórico inferido por (usuario, turno, mes).

        Con `include_canceladas` también trae las clases canceladas
        (soft-deleted, distinguibles por `is_deleted`), para que la card pueda
        mostrarlas tachadas.
        """
        if reserva.tipo != ReservaTipo.MENSUAL:
            return [reserva]
        stmt = select(Reserva).order_by(Reserva.fecha.asc())
        if reserva.grupo_id:
            stmt = stmt.where(Reserva.grupo_id == reserva.grupo_id)
        else:
            # Fallback histórico: sin grupo_id, se infiere por mes.
            primero = reserva.fecha.replace(day=1)
            siguiente_mes = (primero + timedelta(days=32)).replace(day=1)
            stmt = stmt.where(
                Reserva.user_id == reserva.user_id,
                Reserva.turno_id == reserva.turno_id,
                Reserva.tipo == ReservaTipo.MENSUAL,
                Reserva.fecha >= primero,
                Reserva.fecha < siguiente_mes,
            )
        if include_canceladas:
            stmt = stmt.execution_options(include_deleted=True)
        return db.session.execute(stmt).scalars().all()

    def listar_por_usuario(self, user_id: int) -> list[Reserva]:
        """Reservas activas del usuario de hoy en adelante, próximas primero.

        Excluye turnos pasados (fecha anterior a hoy). Los de hoy se siguen
        mostrando aunque el horario ya haya pasado.

        "Hoy" se ancla a la hora local de Argentina (no a la del servidor), igual
        que el resto del servicio: si no, con el servidor adelantado respecto a AR
        los turnos de hoy se filtran de más y la card desaparece antes de tiempo.
        """
        hoy = datetime.now(tz=AR_TZ).date()
        stmt = (
            select(Reserva)
            .where(Reserva.user_id == user_id, Reserva.fecha >= hoy)
            .order_by(Reserva.fecha.asc())
        )
        return db.session.execute(stmt).scalars().all()

    def listar_sesiones_reservadas(self) -> list[tuple[Turno, date]]:
        """Sesiones (turno + fecha) con al menos una reserva activa, sin recortar por fecha.

        Una "sesión" es la instancia de un turno semanal en una fecha concreta. Para
        la vista de administración de turnos reservados: agrupa las reservas activas
        por (turno, fecha) —el filtro de soft-delete descarta las canceladas— y
        devuelve cada sesión, incluidas las de días pasados (ahí "Registrar Pago"
        queda deshabilitado), ordenadas por fecha y horario. No incluye sesiones
        sin reservas.
        """
        stmt = (
            select(Reserva.turno_id, Reserva.fecha)
            .join(Reserva.turno)
            .group_by(Reserva.turno_id, Reserva.fecha, Turno.hora)
            .order_by(Reserva.fecha.asc(), Turno.hora.asc())
        )
        rows = db.session.execute(stmt).all()

        sesiones = []
        for turno_id, fecha in rows:
            turno = db.session.get(Turno, turno_id)
            if turno is not None:
                sesiones.append((turno, fecha))
        return sesiones

    def listar_por_turno_fecha(self, turno_id: int, fecha: date) -> list[Reserva]:
        """Reservas activas de una sesión (turno + fecha) con su cliente y pagos.

        Para el detalle de una sesión en la vista de administración: carga el usuario
        y los pagos de cada reserva para mostrar quién reservó y en qué estado de pago
        está. El filtro de soft-delete excluye las reservas canceladas.
        """
        stmt = (
            select(Reserva)
            .where(Reserva.turno_id == turno_id, Reserva.fecha == fecha)
            .options(joinedload(Reserva.user), joinedload(Reserva.pagos))
            .order_by(Reserva.created_at.asc())
        )
        return db.session.execute(stmt).unique().scalars().all()

    def _validar_dia_semana(self, turno: Turno, fecha: date) -> None:
        esperado = WEEKDAY_TO_DIA_SEMANA[fecha.weekday()]
        if turno.dia_semana != esperado:
            raise ValueError(
                f"La fecha {fecha.isoformat()} cae en {esperado.value}, "
                f"pero el turno es de {turno.dia_semana.value}."
            )

    def _validar_fecha_no_bloqueada(self, turno: Turno, fecha: date) -> None:
        """Impide reservar una fecha que el centro dio de baja para ese turno.

        El filtro global de soft-delete descarta los bloqueos restaurados.
        """
        if self._fechas_bloqueadas(turno, [fecha]):
            raise ValueError(
                f"El turno no está disponible para el {fecha.isoformat()}."
            )

    def _sin_fechas_bloqueadas(
        self, turno: Turno, fechas: list[date]
    ) -> list[date]:
        bloqueadas = self._fechas_bloqueadas(turno, fechas)
        return [f for f in fechas if f not in bloqueadas]

    def _fechas_bloqueadas(self, turno: Turno, fechas: list[date]) -> set[date]:
        stmt = select(TurnoFechaBloqueada.fecha).where(
            TurnoFechaBloqueada.turno_id == turno.id,
            TurnoFechaBloqueada.fecha.in_(fechas),
        )
        return set(db.session.execute(stmt).scalars().all())

    def _validar_turno_no_pasado(self, turno: Turno, fecha: date) -> None:
        """Impide reservar un turno cuya hora de inicio ya pasó.

        La `hora` del turno es hora de pared local (AR), así que el inicio se
        interpreta en esa zona y se compara contra el ahora local. Cubre el caso
        de hoy con un horario ya transcurrido, que el filtro por fecha no atrapa.
        """
        inicio = datetime.combine(fecha, turno.hora, tzinfo=AR_TZ)
        if inicio <= datetime.now(tz=AR_TZ):
            raise ValueError("El turno ya pasó y no puede reservarse.")

    def _validar_sin_conflicto_horario(
        self, user_id: int, fecha: date, turno: Turno
    ) -> None:
        """Impide reservar un turno que se solape con otro del usuario ese día.

        El choque es por horario, no por actividad: dos turnos de actividades
        distintas que arrancan dentro de la misma hora se pisan igual. Se comparan
        las horas de inicio en esa fecha y se considera conflicto si distan menos
        que `DURACION_TURNO`.
        """
        stmt = (
            select(Turno.hora)
            .select_from(Reserva)
            .join(Reserva.turno)
            .where(
                Reserva.user_id == user_id,
                Reserva.fecha == fecha,
            )
        )
        nuevo_inicio = datetime.combine(fecha, turno.hora)
        for hora in db.session.execute(stmt).scalars():
            if abs(datetime.combine(fecha, hora) - nuevo_inicio) < DURACION_TURNO:
                raise ValueError("Ya tienes un turno reservado para el mismo horario")

    # --- Cancelación ---

    def cancelar_reserva(
        self, reserva_id: int, motivo: MotivoCancelacion | None = None
    ) -> Reserva:
        """Cancela (soft-delete) una reserva.

        Si se pasa `motivo` se usa tal cual (p. ej. una baja forzada por el centro
        al eliminar la actividad, que siempre reembolsa, o el crédito a favor
        elegido por el cliente al cancelar una clase mensual). Si no, se deduce
        de la antelación: reembolsable fuera de la ventana del tipo (24 h
        eventual, 48 h mensual), retenido dentro de ella.
        """
        reserva = db.session.get(Reserva, reserva_id)
        if reserva is None:
            raise ValueError("La reserva indicada no existe.")

        reserva.motivo_cancelacion = (
            motivo or self._motivo_segun_anticipacion(reserva)
        )

        reserva.soft_delete()
        db.session.commit()
        return reserva

    def es_reembolsable(self, reserva: Reserva) -> bool:
        """True si la cancelación llega con la anticipación que exige el tipo.

        Eventual: más de 24 h da derecho a reembolso. Mensual: más de 48 h da
        derecho al beneficio que elija el cliente (reembolso o crédito a favor).
        Dentro de la ventana, lo abonado se retiene.
        """
        ventana = (
            CANCELACION_VENTANA_MENSUAL
            if reserva.tipo == ReservaTipo.MENSUAL
            else CANCELACION_VENTANA
        )
        inicio_reserva = datetime.combine(
            reserva.fecha, reserva.turno.hora, tzinfo=AR_TZ
        )
        anticipacion = inicio_reserva - datetime.now(tz=AR_TZ)
        return anticipacion > ventana

    def _motivo_segun_anticipacion(self, reserva: Reserva) -> MotivoCancelacion:
        if self.es_reembolsable(reserva):
            return MotivoCancelacion.REEMBOLSADO
        return MotivoCancelacion.CANCELADO

    # --- Validaciones internas ---

    def _validar_cupo_disponible(self, turno: Turno, fecha: date) -> None:
        stmt = (
            select(func.count(Reserva.id))
            .where(
                Reserva.turno_id == turno.id,
                Reserva.fecha == fecha,
            )
        )
        ocupados = db.session.execute(stmt).scalar()
        if ocupados >= turno.cupo:
            raise ValueError(
                f"El turno no tiene cupo disponible para el {fecha.isoformat()}."
            )
