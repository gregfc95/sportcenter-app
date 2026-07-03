import logging

import mailtrap as mt
from flask import current_app

from .email_templates import (
    lista_espera_email_bodies,
    password_email_bodies,
    renovacion_recordatorio_email_bodies,
)

logger = logging.getLogger(__name__)


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

    _client(cfg).send(mail)
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

    _client(cfg).send(mail)
    logger.info("send_lista_espera_email -> %s (sent)", email)


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

    _client(cfg).send(mail)
    logger.info("send_recordatorio_renovacion_email -> %s (sent)", email)
