"""Disparo manual de avisos para demos.

El aviso "se liberó un lugar" lo manda solo `ListaEsperaService` al promover la
cola, pero en una demo no hay cancelaciones reales que lo gatillen. Este módulo
permite dispararlo a mano desde el dashboard de staff; borrarlo cuando la demo
deje de necesitarlo.
"""

from datetime import date, datetime, timedelta

from .. import db
from ..models.turno import DiaSemana, Turno
from ..models.user import User, UserRole
from .email_service import send_lista_espera_email
from .lista_espera_service import (
    AR_TZ,
    LISTA_ESPERA_TOPE_AVISO,
    OFERTA_VENTANA,
    ListaEsperaService,
)


def notificar_cupo_disponible(cliente_id: int, turno_id: int) -> str:
    """Envía a un cliente el aviso de lugar liberado para un turno; devuelve su email.

    Usa el mismo email del flujo real con la próxima ocurrencia del turno como
    clase ofrecida. El error de envío sube al caller: acá el staff dispara el
    mail a propósito y necesita saber si salió (el flujo automático, en cambio,
    lo traga para que la oferta persista).
    """
    cliente = db.session.get(User, cliente_id)
    if cliente is None or cliente.role != UserRole.CLIENT:
        raise ValueError("El cliente indicado no existe.")

    turno = db.session.get(Turno, turno_id)
    if turno is None:
        raise ValueError("El turno indicado no existe.")

    ahora = datetime.now(tz=AR_TZ)
    # El flujo real además acota el plazo al inicio del turno; para la demo
    # alcanza con la ventana estándar.
    expira = ahora + OFERTA_VENTANA

    send_lista_espera_email(
        cliente.email,
        nombre=cliente.first_name,
        actividad=turno.actividad.nombre,
        turno_label=f"{turno.dia_semana.value} {turno.hora.strftime('%H:%M')}",
        clases_label=_proxima_ocurrencia(turno, ahora).strftime("%d/%m"),
        expira_label=expira.strftime("%H:%M"),
    )
    return cliente.email


def notificar_lista_espera_llena(turno_id: int) -> list[str]:
    """Dispara a mano el aviso "lista de espera llena" a los admins; devuelve los emails.

    Espejo manual del aviso que se manda solo cuando la cola de una clase llega al
    tope. Para la demo usa la próxima ocurrencia del turno como fecha y el tope
    como cantidad; el error de envío lo traga el servicio por admin.
    """
    turno = db.session.get(Turno, turno_id)
    if turno is None:
        raise ValueError("El turno indicado no existe.")

    fecha = _proxima_ocurrencia(turno, datetime.now(tz=AR_TZ))
    return ListaEsperaService().avisar_admins_lista_llena(
        turno, fecha, LISTA_ESPERA_TOPE_AVISO
    )


def _proxima_ocurrencia(turno: Turno, ahora: datetime) -> date:
    """Fecha de la próxima clase del turno (hoy incluido si aún no empezó)."""
    delta = (list(DiaSemana).index(turno.dia_semana) - ahora.weekday()) % 7
    fecha = ahora.date() + timedelta(days=delta)
    if delta == 0 and ahora.time() >= turno.hora:
        fecha += timedelta(days=7)
    return fecha
