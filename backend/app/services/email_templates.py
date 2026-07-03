"""Email body templates. Kept separate from the send logic so copy/markup can
change without touching the transport. Brand color matches the app primary
(#9A2A46)."""

BRAND = "#9A2A46"
BRAND_TEXT = "#FFFFFF"
SURFACE = "#FDFDF2"
TEXT = "#1A1A1A"
MUTED = "#7F8C8D"
BORDER = "#EAEAEA"


def password_email_bodies(email: str, password: str, login_url: str) -> tuple[str, str]:
    """Return (text, html) bodies for the welcome / credentials email."""
    text = (
        "¡Bienvenido a Sportify!\n\n"
        "Tu cuenta fue creada con éxito. Estos son tus datos de acceso:\n\n"
        f"    Usuario (email): {email}\n"
        f"    Contraseña: {password}\n\n"
        f"Ingresá desde: {login_url}\n\n"
        "Por tu seguridad, te recomendamos cambiar la contraseña luego de tu primer ingreso."
    )

    html = f"""\
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:{SURFACE};font-family:Arial,Helvetica,sans-serif;color:{TEXT};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid {BORDER};">
          <tr><td style="background:{BRAND};padding:24px 32px;">
            <h1 style="margin:0;color:{BRAND_TEXT};font-size:20px;">Sportify</h1>
          </td></tr>
          <tr><td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:18px;color:{TEXT};">¡Bienvenido a Sportify!</h2>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:{TEXT};">
              Tu cuenta fue creada con éxito. Estos son tus datos de acceso:
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{SURFACE};border:1px solid {BORDER};border-radius:8px;margin-bottom:20px;">
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:{MUTED};">Usuario (email)</td>
                <td style="padding:12px 16px;font-size:14px;color:{TEXT};font-weight:bold;text-align:right;">{email}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:{MUTED};border-top:1px solid {BORDER};">Contraseña</td>
                <td style="padding:12px 16px;font-size:14px;color:{TEXT};font-weight:bold;text-align:right;border-top:1px solid {BORDER};font-family:monospace;">{password}</td>
              </tr>
            </table>
            <a href="{login_url}" style="display:inline-block;background:{BRAND};color:{BRAND_TEXT};text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;">
              Iniciar sesión
            </a>
            <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:{MUTED};">
              Por tu seguridad, te recomendamos cambiar la contraseña luego de tu primer ingreso.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""

    return text, html


def lista_espera_email_bodies(
    nombre: str,
    actividad: str,
    turno_label: str,
    clases_label: str,
    expira_label: str,
    mis_turnos_url: str,
) -> tuple[str, str]:
    """Return (text, html) bodies for the "se liberó un lugar" waitlist email.

    `expira_label` es la hora límite en hora de pared argentina; no se habla de
    "1 hora" porque la ventana puede ser más corta si el turno arranca antes.
    """
    text = (
        f"¡Hola {nombre}!\n\n"
        f"¡Se liberó un lugar en {actividad}!\n\n"
        f"    Turno: {turno_label}\n"
        f"    Clases: {clases_label}\n\n"
        f"Tenés hasta las {expira_label} para pagarlo desde Mis Turnos. "
        "Si no lo pagás, el lugar pasa al siguiente de la lista, pero conservás "
        "tu posición.\n\n"
        f"Pagá desde: {mis_turnos_url}"
    )

    html = f"""\
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:{SURFACE};font-family:Arial,Helvetica,sans-serif;color:{TEXT};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid {BORDER};">
          <tr><td style="background:{BRAND};padding:24px 32px;">
            <h1 style="margin:0;color:{BRAND_TEXT};font-size:20px;">Sportify</h1>
          </td></tr>
          <tr><td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:18px;color:{TEXT};">¡Se liberó un lugar en {actividad}!</h2>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:{TEXT};">
              Hola {nombre}, se liberó un lugar del turno que estabas esperando.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{SURFACE};border:1px solid {BORDER};border-radius:8px;margin-bottom:20px;">
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:{MUTED};">Turno</td>
                <td style="padding:12px 16px;font-size:14px;color:{TEXT};font-weight:bold;text-align:right;">{turno_label}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:{MUTED};border-top:1px solid {BORDER};">Clases</td>
                <td style="padding:12px 16px;font-size:14px;color:{TEXT};font-weight:bold;text-align:right;border-top:1px solid {BORDER};">{clases_label}</td>
              </tr>
            </table>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:{TEXT};">
              Tenés tiempo <strong>hasta las {expira_label}</strong> para pagarlo desde Mis Turnos.
              Si no lo pagás, el lugar pasa al siguiente de la lista, pero conservás tu posición.
            </p>
            <a href="{mis_turnos_url}" style="display:inline-block;background:{BRAND};color:{BRAND_TEXT};text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;">
              Ir a Mis Turnos
            </a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""

    return text, html


def renovacion_recordatorio_email_bodies(
    nombre: str,
    actividad: str,
    turno_label: str,
    clases_label: str,
    fecha_limite_label: str,
    mis_turnos_url: str,
) -> tuple[str, str]:
    """Return (text, html) bodies for the unpaid-renewal payment reminder.

    Se manda el día 10: la renovación garantizada del abono debe pagarse antes
    del 11 o el cliente pierde el lugar y queda suspendido.
    """
    text = (
        f"¡Hola {nombre}!\n\n"
        f"Todavía no pagaste la renovación de tu abono de {actividad}.\n\n"
        f"    Turno: {turno_label}\n"
        f"    Clases: {clases_label}\n\n"
        f"Tenés tiempo hasta el {fecha_limite_label} para pagarla desde Mis "
        "Turnos y no perder tu lugar. Si no la pagás, se cancela el abono y tu "
        "cuenta queda suspendida.\n\n"
        f"Pagá desde: {mis_turnos_url}"
    )

    html = f"""\
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:{SURFACE};font-family:Arial,Helvetica,sans-serif;color:{TEXT};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid {BORDER};">
          <tr><td style="background:{BRAND};padding:24px 32px;">
            <h1 style="margin:0;color:{BRAND_TEXT};font-size:20px;">Sportify</h1>
          </td></tr>
          <tr><td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:18px;color:{TEXT};">Renová tu abono de {actividad}</h2>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:{TEXT};">
              Hola {nombre}, todavía no pagaste la renovación de tu abono.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{SURFACE};border:1px solid {BORDER};border-radius:8px;margin-bottom:20px;">
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:{MUTED};">Turno</td>
                <td style="padding:12px 16px;font-size:14px;color:{TEXT};font-weight:bold;text-align:right;">{turno_label}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:{MUTED};border-top:1px solid {BORDER};">Clases</td>
                <td style="padding:12px 16px;font-size:14px;color:{TEXT};font-weight:bold;text-align:right;border-top:1px solid {BORDER};">{clases_label}</td>
              </tr>
            </table>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:{TEXT};">
              Tenés tiempo <strong>hasta el {fecha_limite_label}</strong> para pagarla desde Mis Turnos y no perder tu lugar.
              Si no la pagás, se cancela el abono y tu cuenta queda suspendida.
            </p>
            <a href="{mis_turnos_url}" style="display:inline-block;background:{BRAND};color:{BRAND_TEXT};text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;">
              Pagar mi renovación
            </a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""

    return text, html
