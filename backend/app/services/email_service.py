import logging
import threading
import time

import mailtrap as mt
from flask import current_app

from .email_templates import (
    lista_espera_email_bodies,
    lista_espera_llena_admin_email_bodies,
    password_email_bodies,
    renovacion_recordatorio_email_bodies,
)

logger = logging.getLogger(__name__)

# El plan gratuito de Mailtrap admite un envío cada 10 segundos: se espacian
# los emails a 11 s para que los flujos que mandan varios seguidos (subir el
# cupo, cancelar un abono con varias fechas, el aviso por admin) no pierdan
# avisos por rate limit. El costo es que quien promueve N lugares espera
# ~11×(N-1) s dentro de su request. El lock cubre también los jobs del
# scheduler, que envían desde otro hilo.
_ESPACIADO_ENVIO = 11.0
_envio_lock = threading.Lock()
_proximo_envio = 0.0


def _send_espaciado(cfg, mail) -> None:
    global _proximo_envio
    with _envio_lock:
        espera = _proximo_envio - time.monotonic()
        if espera > 0:
            time.sleep(espera)
        # El sello va en finally: un envío fallido también cuenta para el rate
        # limit de Mailtrap, así el siguiente igual respeta la ventana.
        try:
            _client(cfg).send(mail)
        finally:
            _proximo_envio = time.monotonic() + _ESPACIADO_ENVIO


def _client(cfg):
    """Cliente de Mailtrap según el modo sandbox de la config."""
    token = cfg.get("MAILTRAP_TOKEN")
    if cfg.get("MAILTRAP_SANDBOX"):
        return mt.MailtrapClient(
            token=token,
            sandbox=True,
            inbox_id=cfg.get("MAILTRAP_INBOX_ID"),
        )
    return mt.MailtrapClient(token=token)


def send_password_email(email: str, password: str) -> None:
    """Send the generated credentials to the user's inbox via the Mailtrap SDK."""
    cfg = current_app.config
    token = cfg.get("MAILTRAP_TOKEN")
    sender = cfg.get("MAIL_FROM")
    if not token or not sender:
        raise RuntimeError(
            "Mailtrap no está configurado (faltan MAILTRIP_TOKEN o MAIL_FROM)"
        )

    login_url = f"{cfg.get('APP_BASE_URL', '').rstrip('/')}/login"
    text, html = password_email_bodies(email, password, login_url)

    mail = mt.Mail(
        sender=mt.Address(email=sender, name=cfg.get("MAIL_FROM_NAME", "Sportify")),
        to=[mt.Address(email=email)],
        subject="Tus datos de acceso a Sportify",
        text=text,
        html=html,
        category="Password Delivery",
    )

    _send_espaciado(cfg, mail)
    logger.info("send_password_email -> %s (sent)", email)


def send_lista_espera_email(
    email: str,
    *,
    nombre: str,
    actividad: str,
    turno_label: str,
    clases_label: str,
    expira_label: str,
) -> None:
    """Avisa a un cliente de la lista de espera que se liberó su lugar.

    El link lleva a Mis Turnos, donde el "Pagar" queda habilitado durante la
    ventana de la oferta. `expira_label` es la hora límite en hora de pared AR.
    """
    cfg = current_app.config
    token = cfg.get("MAILTRAP_TOKEN")
    sender = cfg.get("MAIL_FROM")
    if not token or not sender:
        raise RuntimeError(
            "Mailtrap no está configurado (faltan MAILTRIP_TOKEN o MAIL_FROM)"
        )

    mis_turnos_url = f"{cfg.get('APP_BASE_URL', '').rstrip('/')}/mis-turnos"
    text, html = lista_espera_email_bodies(
        nombre, actividad, turno_label, clases_label, expira_label, mis_turnos_url
    )

    mail = mt.Mail(
        sender=mt.Address(email=sender, name=cfg.get("MAIL_FROM_NAME", "Sportify")),
        to=[mt.Address(email=email)],
        subject=f"¡Se liberó un lugar en {actividad}!",
        text=text,
        html=html,
        category="Lista de Espera",
    )

    _send_espaciado(cfg, mail)
    logger.info("send_lista_espera_email -> %s (sent)", email)


def send_lista_espera_admin_email(
    email: str,
    *,
    actividad: str,
    turno_label: str,
    fecha_label: str,
    cantidad: int,
) -> None:
    """Avisa a un administrador que una clase juntó `cantidad` en lista de espera.

    Es un aviso interno de demanda (no va al cliente); el link lleva al dashboard
    de staff para decidir si abrir otro turno o subir el cupo.
    """
    cfg = current_app.config
    token = cfg.get("MAILTRAP_TOKEN")
    sender = cfg.get("MAIL_FROM")
    if not token or not sender:
        raise RuntimeError(
            "Mailtrap no está configurado (faltan MAILTRIP_TOKEN o MAIL_FROM)"
        )

    dashboard_url = f"{cfg.get('APP_BASE_URL', '').rstrip('/')}/"
    text, html = lista_espera_llena_admin_email_bodies(
        actividad, turno_label, fecha_label, cantidad, dashboard_url
    )

    mail = mt.Mail(
        sender=mt.Address(email=sender, name=cfg.get("MAIL_FROM_NAME", "Sportify")),
        to=[mt.Address(email=email)],
        subject=f"Lista de espera llena: {actividad}",
        text=text,
        html=html,
        category="Lista de Espera Admin",
    )

    _send_espaciado(cfg, mail)
    logger.info("send_lista_espera_admin_email -> %s (sent)", email)


def send_recordatorio_renovacion_email(
    email: str,
    *,
    nombre: str,
    actividad: str,
    turno_label: str,
    clases_label: str,
    fecha_limite_label: str,
) -> None:
    """Recuerda al cliente pagar la renovación impaga de su abono (el día 10).

    El link lleva a Mis Turnos; `fecha_limite_label` es el día 11 en formato
    dd/mm, hasta cuando puede pagar antes de perder el lugar.
    """
    cfg = current_app.config
    token = cfg.get("MAILTRAP_TOKEN")
    sender = cfg.get("MAIL_FROM")
    if not token or not sender:
        raise RuntimeError(
            "Mailtrap no está configurado (faltan MAILTRIP_TOKEN o MAIL_FROM)"
        )

    mis_turnos_url = f"{cfg.get('APP_BASE_URL', '').rstrip('/')}/mis-turnos"
    text, html = renovacion_recordatorio_email_bodies(
        nombre, actividad, turno_label, clases_label, fecha_limite_label, mis_turnos_url
    )

    mail = mt.Mail(
        sender=mt.Address(email=sender, name=cfg.get("MAIL_FROM_NAME", "Sportify")),
        to=[mt.Address(email=email)],
        subject=f"Recordatorio: renová tu abono de {actividad}",
        text=text,
        html=html,
        category="Recordatorio Renovación",
    )

    _send_espaciado(cfg, mail)
    logger.info("send_recordatorio_renovacion_email -> %s (sent)", email)
