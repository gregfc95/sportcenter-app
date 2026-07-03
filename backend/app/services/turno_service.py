from datetime import date, datetime, time

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .. import db
from ..models.turno import Turno
from ..models.turno_fecha_bloqueada import TurnoFechaBloqueada
from .pago_service import PagoService
from .reserva_service import AR_TZ, WEEKDAY_TO_DIA_SEMANA


SUPERPOSICION_MIN_MINUTOS = 60


class TurnoService:
    def __init__(self):
        self.pago_service = PagoService()

    # --- Lógica de negocio de reservas y cupo ---

    def cantidad_reservas(self, turno: Turno, fecha: date) -> int:
        # Eventuales y mensuales consumen cupo por igual en cada sesión.
        return sum(1 for r in turno.reservas if r.fecha == fecha)

    def hay_cupo(self, turno: Turno, fecha: date) -> bool:
        return self.cantidad_reservas(turno, fecha) < turno.cupo

    def lugares_disponibles(self, turno: Turno, fecha: date) -> int:
        return turno.cupo - self.cantidad_reservas(turno, fecha)

    # --- Lógica de superposición de horarios ---

    def _turno_superpuesto(
        self, turnos_existentes: list[Turno], hora_nueva: time
    ) -> Turno | None:
        """Devuelve el turno existente que se solapa con `hora_nueva`, o None.

        Devuelve el turno en conflicto (no un bool) para que el mensaje de error
        pueda mostrar su horario real, en vez del que se intenta cargar.
        """
        mins_nueva = hora_nueva.hour * 60 + hora_nueva.minute
        for turno in turnos_existentes:
            mins_turno = turno.hora.hour * 60 + turno.hora.minute
            if abs(mins_nueva - mins_turno) < SUPERPOSICION_MIN_MINUTOS:
                return turno
        return None

    # --- Queries ---

    def obtener_todos(self) -> list[Turno]:
        return db.session.execute(select(Turno)).scalars().all()

    def obtener_por_id(self, turno_id: int) -> Turno | None:
        return db.session.get(Turno, turno_id)

    def obtener_por_actividad(self, actividad_id: int) -> list[Turno]:
        stmt = select(Turno).where(Turno.actividad_id == actividad_id)
        return db.session.execute(stmt).scalars().all()

    def fechas_bloqueadas_futuras(
        self, turno_ids: list[int]
    ) -> dict[int, list[date]]:
        """Fechas bloqueadas de hoy en adelante, agrupadas por turno.

        Una sola query para toda la lista de turnos (evita N+1 en el listado).
        El filtro global de soft-delete descarta los bloqueos restaurados.
        """
        hoy = datetime.now(tz=AR_TZ).date()
        stmt = (
            select(TurnoFechaBloqueada.turno_id, TurnoFechaBloqueada.fecha)
            .where(
                TurnoFechaBloqueada.turno_id.in_(turno_ids),
                TurnoFechaBloqueada.fecha >= hoy,
            )
            .order_by(TurnoFechaBloqueada.fecha.asc())
        )
        por_turno: dict[int, list[date]] = {}
        for turno_id, fecha in db.session.execute(stmt).all():
            por_turno.setdefault(turno_id, []).append(fecha)
        return por_turno

    def _turnos_por_actividad_y_dia(
        self, actividad_id: int, dia_semana: str
    ) -> list[Turno]:
        stmt = select(Turno).where(
            Turno.actividad_id == actividad_id,
            Turno.dia_semana == dia_semana,
        )
        return db.session.execute(stmt).scalars().all()

    # --- CRUD ---

    def crear_turno(self, data: dict) -> Turno:
        actividad_id = data["actividad_id"]
        dia_semana = data["dia_semana"]
        hora = data["hora"]
        cupo = data["cupo"]

        turnos_existentes = self._turnos_por_actividad_y_dia(actividad_id, dia_semana)

        conflicto = self._turno_superpuesto(turnos_existentes, hora)
        if conflicto is not None:
            hora_str = conflicto.hora.strftime("%H:%M")
            raise ValueError(
                f"Ya existe un turno de esta actividad el {dia_semana} a las {hora_str}."
            )

        turno = Turno(
            actividad_id=actividad_id,
            dia_semana=dia_semana,
            hora=hora,
            cupo=cupo,
        )
        db.session.add(turno)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Ya existe un turno con esos datos.")
        return turno

    def actualizar(self, turno_id: int, data: dict) -> Turno | None:
        turno = db.session.get(Turno, turno_id)
        if turno is None:
            return None

        nuevo_dia = data["dia_semana"]
        nueva_hora = data["hora"]
        nuevo_cupo = data["cupo"]

        if nuevo_dia != turno.dia_semana or nueva_hora != turno.hora:
            otros = [
                t for t in self._turnos_por_actividad_y_dia(turno.actividad_id, nuevo_dia)
                if t.id != turno.id
            ]
            conflicto = self._turno_superpuesto(otros, nueva_hora)
            if conflicto is not None:
                hora_str = conflicto.hora.strftime("%H:%M")
                raise ValueError(
                    f"Ya existe un turno de esta actividad el {nuevo_dia} a las {hora_str}."
                )

        max_reservas = self._max_reservas_vigentes(turno)
        if nuevo_cupo < max_reservas:
            raise ValueError(
                "No es posible realizar el cambio. "
                f"Este Turno posee una cantidad de {max_reservas} Reservas."
            )

        turno.dia_semana = nuevo_dia
        turno.hora = nueva_hora
        turno.cupo = nuevo_cupo

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Ya existe un turno con esos datos.")
        return turno

    def _max_reservas_vigentes(self, turno: Turno) -> int:
        """Máximo de reservas activas en una misma sesión de hoy en adelante.

        Una "sesión" es el turno en una fecha concreta. El cupo se consume por
        sesión, así que el piso para bajar el cupo es la sesión más reservada que
        todavía no pasó. Las sesiones de días ya pasados no cuentan (el admin puede
        bajar el cupo aunque esos días hayan estado llenos). El filtro global de
        soft-delete descarta las reservas canceladas.
        """
        hoy = date.today()
        por_fecha: dict[date, int] = {}
        for r in turno.reservas:
            if r.fecha >= hoy:
                por_fecha[r.fecha] = por_fecha.get(r.fecha, 0) + 1
        return max(por_fecha.values(), default=0)

    def eliminar(self, turno_id: int) -> Turno | None:
        """Da de baja (soft-delete) el turno completo, todas sus fechas futuras.

        Las reservas vigentes (de hoy en adelante) se cancelan y reembolsan: la
        baja es decisión del centro, no del cliente, así que corresponde
        devolver lo abonado sin importar la antelación (mismo criterio que al
        eliminar la actividad). Las reservas pasadas quedan como historial.
        """
        turno = db.session.get(Turno, turno_id)
        if turno is None:
            return None

        hoy = datetime.now(tz=AR_TZ).date()
        for reserva in [r for r in turno.reservas if r.fecha >= hoy]:
            self.pago_service.cancelar_reserva_por_baja(reserva.id)

        turno.soft_delete()
        db.session.commit()
        return turno

    def eliminar_fecha(
        self, turno_id: int, fecha: date, creado_por_id: int | None = None
    ) -> Turno | None:
        """Da de baja una fecha puntual del turno, sin tocar el resto de semanas.

        Registra la fecha en `turno_fechas_bloqueadas` (impide nuevas reservas
        para ese día) y cancela con reembolso las reservas vigentes de esa
        sesión, igual que la baja del turno completo. Para una clase de un
        abono mensual se reembolsa solo esa clase; el resto del abono sigue.
        """
        turno = db.session.get(Turno, turno_id)
        if turno is None:
            return None

        esperado = WEEKDAY_TO_DIA_SEMANA[fecha.weekday()]
        if turno.dia_semana != esperado:
            raise ValueError(
                f"La fecha {fecha.isoformat()} cae en {esperado.value}, "
                f"pero el turno es de {turno.dia_semana.value}."
            )
        hoy = datetime.now(tz=AR_TZ).date()
        if fecha < hoy:
            raise ValueError("No se puede dar de baja una fecha pasada.")
        # La baja puntual opera sobre el mes corriente (igual que el abono
        # mensual); para más adelante se elimina el turno completo.
        if (fecha.year, fecha.month) != (hoy.year, hoy.month):
            raise ValueError("Solo se pueden dar de baja fechas del mes en curso.")
        if self._fecha_bloqueada(turno_id, fecha):
            raise ValueError("Esa fecha del turno ya fue dada de baja.")

        # Primero se cancelan las reservas (cada cancelación comitea); el
        # bloqueo se agrega al final para que un fallo a mitad de camino no
        # deje la fecha bloqueada con reservas activas.
        reservas = [r for r in turno.reservas if r.fecha == fecha]
        for reserva in reservas:
            self.pago_service.cancelar_reserva_por_baja(reserva.id)

        bloqueo = TurnoFechaBloqueada(
            turno_id=turno_id, fecha=fecha, creado_por_id=creado_por_id
        )
        db.session.add(bloqueo)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ValueError("Esa fecha del turno ya fue dada de baja.")
        return turno

    def _fecha_bloqueada(self, turno_id: int, fecha: date) -> bool:
        stmt = (
            select(TurnoFechaBloqueada.id)
            .where(
                TurnoFechaBloqueada.turno_id == turno_id,
                TurnoFechaBloqueada.fecha == fecha,
            )
            .limit(1)
        )
        return db.session.execute(stmt).first() is not None
