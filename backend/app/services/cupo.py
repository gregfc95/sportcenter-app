"""Fuente única del conteo de ocupación por sesión (turno + fecha).

La ocupación son las reservas firmes (normales u ofertadas) más los *holds
virtuales*: un cliente con suscripción mensual activa tiene su lugar
garantizado en el turno para todos los meses futuros, aunque las clases de
esos meses todavía no estén materializadas (la renovación del día 1 las crea).

Módulo hoja (importa solo modelos) para que `reserva_service`,
`turno_service`, `lista_espera_service` y `mensualidad_service` lo compartan
sin ciclos de import.
"""

from datetime import date

from sqlalchemy import or_, select

from .. import db
from ..models.pago import Pago, PagoEstado
from ..models.reserva import EstadoEspera, Reserva, ReservaTipo
from ..models.turno import Turno


def suscripcion_activa(user_id: int, turno_id: int) -> tuple[str, date] | None:
    """Abono mensual vigente del usuario en el turno: (grupo_id, mes) o None.

    Mira el *tip* de la cadena de abonos (el grupo más reciente, incluso si
    fue cancelado: una renovación declinada o un abono dado de baja no revive
    el hold del grupo pago anterior, igual que `_ya_renovado` no lo regenera).
    El tip está vivo si conserva alguna clase activa y además tiene cobros o
    es una renovación pendiente (garantizada durante la gracia del 1 al 10).
    """
    stmt = (
        select(Reserva)
        .where(
            Reserva.user_id == user_id,
            Reserva.turno_id == turno_id,
            *_FILTROS_ABONO,
        )
        .execution_options(include_deleted=True)
    )
    filas = db.session.execute(stmt).scalars().all()
    if not filas:
        return None
    filas_tip = _filas_del_tip(filas)
    grupo_id = filas_tip[0].grupo_id
    if not _tip_vivo(filas_tip, con_cobros=grupo_tiene_cobros(grupo_id)):
        return None
    return grupo_id, _mes(filas_tip[0].fecha)


def ocupados(turno: Turno, fecha: date) -> int:
    """Ocupación de la sesión: filas firmes más holds virtuales.

    Firmes son las reservas con `estado_espera` NULL u OFERTADO (las filas
    `esperando`/`vencido` no consumen cupo). Un hold virtual cuenta solo para
    fechas de meses posteriores al mes del tip del titular: dentro de su
    propio mes mandan las filas concretas (cancelar una clase libera esa
    fecha puntual), y al materializarse la renovación el tip avanza de mes,
    así el hold nunca se suma dos veces con la fila real.
    """
    firmes = set(
        db.session.execute(
            select(Reserva.user_id).where(
                Reserva.turno_id == turno.id,
                Reserva.fecha == fecha,
                or_(
                    Reserva.estado_espera.is_(None),
                    Reserva.estado_espera == EstadoEspera.OFERTADO,
                ),
            )
        ).scalars()
    )
    mes_fecha = _mes(fecha)
    # El titular con una fila firme en la sesión (ej. una eventual previa a
    # esta regla) no suma dos veces.
    virtuales = sum(
        1
        for user_id, mes_tip in _titulares_hold(turno.id).items()
        if mes_tip < mes_fecha and user_id not in firmes
    )
    return len(firmes) + virtuales


def grupo_tiene_cobros(grupo_id: str) -> bool:
    """True si alguna clase del grupo tiene un pago comprometido (seña o pago)."""
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


# Qué cuenta como clase de un abono confirmado: las filas que solo existieron
# en lista de espera (esperando/ofertado/vencido) nunca fueron un abono.
_FILTROS_ABONO = (
    Reserva.tipo == ReservaTipo.MENSUAL,
    Reserva.grupo_id.isnot(None),
    Reserva.estado_espera.is_(None),
)


def _titulares_hold(turno_id: int) -> dict[int, date]:
    """Usuarios con hold vivo en el turno, con el mes del tip de cada uno."""
    stmt = (
        select(Reserva)
        .where(Reserva.turno_id == turno_id, *_FILTROS_ABONO)
        .execution_options(include_deleted=True)
    )
    por_usuario: dict[int, list[Reserva]] = {}
    for fila in db.session.execute(stmt).scalars().all():
        por_usuario.setdefault(fila.user_id, []).append(fila)
    if not por_usuario:
        return {}

    tips = {
        user_id: _filas_del_tip(filas) for user_id, filas in por_usuario.items()
    }
    con_cobros = _grupos_con_cobros({t[0].grupo_id for t in tips.values()})
    return {
        user_id: _mes(filas_tip[0].fecha)
        for user_id, filas_tip in tips.items()
        if _tip_vivo(filas_tip, con_cobros=filas_tip[0].grupo_id in con_cobros)
    }


def _filas_del_tip(filas: list[Reserva]) -> list[Reserva]:
    """Filas del grupo más reciente: mayor (fecha, created_at).

    El `created_at` desempata dos grupos del mismo mes (cancelar todo y
    recomprar crea otro grupo: gana la compra más nueva).
    """
    tip = max(filas, key=lambda r: (r.fecha, r.created_at))
    return [r for r in filas if r.grupo_id == tip.grupo_id]


def _tip_vivo(filas_tip: list[Reserva], *, con_cobros: bool) -> bool:
    if not any(r.deleted_at is None for r in filas_tip):
        return False
    return con_cobros or filas_tip[0].renovacion_de_grupo_id is not None


def _grupos_con_cobros(grupo_ids: set[str]) -> set[str]:
    stmt = (
        select(Reserva.grupo_id)
        .join(Pago, Pago.reserva_id == Reserva.id)
        .where(
            Reserva.grupo_id.in_(grupo_ids),
            Pago.estado.in_([PagoEstado.SENADO, PagoEstado.PAGADO]),
        )
        .distinct()
    )
    return set(db.session.execute(stmt).scalars())


def _mes(fecha: date) -> date:
    return fecha.replace(day=1)
