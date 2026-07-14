import base64
import secrets
from datetime import datetime, timezone
from io import BytesIO

import qrcode
from sqlalchemy import or_, select
from sqlalchemy.orm import joinedload

from .. import db
from ..models.pago import PagoEstado
from ..models.reserva import Reserva
from ..models.turno import Turno
from .reserva_service import AR_TZ

# El QR lleva el token con este prefijo para que tanto el scanner (precheck en
# el navegador) como el backend descarten en seco códigos ajenos al sistema.
QR_PREFIX = "sportcenter:asistencia:"


class QrInvalido(ValueError):
    """El código escaneado no corresponde a ninguna reserva del sistema (404)."""


class QrYaUtilizado(ValueError):
    """El código ya fue usado para registrar asistencia (409)."""


def estado_asistencia(reserva: Reserva) -> str:
    """Estado de una reserva ya resuelta para Mi Historial: cancelado / asistio / ausente.

    La cancelación (soft-delete) va primero: un turno cancelado liberó su lugar,
    así que se muestra "Cancelado" y nunca se cuenta como inasistencia. Solo se
    llama sobre reservas resueltas —`historial_usuario` deja fuera las
    pendientes/futuras—, por eso una reserva activa sin asistencia es siempre una
    inasistencia pasada.
    """
    if reserva.is_deleted:
        return "cancelado"
    if reserva.asistencia_registrada_at is not None:
        return "asistio"
    return "ausente"


class AsistenciaService:

    def obtener_qr(self, reserva: Reserva) -> str:
        """Data-URL PNG del QR de la reserva, disponible solo el día del turno.

        Los mensajes de error son literalmente los toasts que muestra el
        frontend, así la UI no necesita mapearlos. El token se genera acá,
        bajo demanda (la primera vez que el cliente abre su QR), no al crear
        la reserva.
        """
        estados = {p.estado for p in reserva.pagos}
        if PagoEstado.PAGADO not in estados:
            raise ValueError("La reserva no está paga.")
        if reserva.asistencia_registrada_at is not None:
            raise ValueError("Este código QR ya ha sido utilizado.")

        hoy = datetime.now(tz=AR_TZ).date()
        if reserva.fecha > hoy:
            raise ValueError("El QR estará disponible el día del turno.")
        if reserva.fecha < hoy:
            raise ValueError("Este código QR ya ha expirado.")

        if reserva.qr_token is None:
            reserva.qr_token = secrets.token_urlsafe(32)
            db.session.commit()

        imagen = qrcode.make(QR_PREFIX + reserva.qr_token)
        buffer = BytesIO()
        imagen.save(buffer, format="PNG")
        codigo = base64.b64encode(buffer.getvalue()).decode("ascii")
        return f"data:image/png;base64,{codigo}"

    def registrar_asistencia(self, codigo: str, staff_id: int) -> Reserva:
        """Asienta la asistencia a partir del código escaneado por el staff.

        Solo acepta el QR de un turno del día de hoy y una única vez. El filtro
        de soft-delete deja afuera las reservas canceladas: su QR pasa a ser
        inválido.
        """
        if not isinstance(codigo, str) or not codigo.startswith(QR_PREFIX):
            raise QrInvalido("QR inválido o no reconocido")
        token = codigo[len(QR_PREFIX):]

        stmt = select(Reserva).where(Reserva.qr_token == token)
        reserva = db.session.execute(stmt).scalar_one_or_none()
        if reserva is None:
            raise QrInvalido("QR inválido o no reconocido")

        if reserva.asistencia_registrada_at is not None:
            raise QrYaUtilizado("QR asociado fue registrado anteriormente")

        hoy = datetime.now(tz=AR_TZ).date()
        if reserva.fecha != hoy:
            raise ValueError("El QR no corresponde a un turno del día de hoy.")

        reserva.asistencia_registrada_at = datetime.now(timezone.utc)
        reserva.asistencia_registrada_por_id = staff_id
        db.session.commit()
        return reserva

    def historial_usuario(self, user_id: int) -> list[Reserva]:
        """Reservas resueltas del usuario para Mi Historial, más recientes primero.

        Solo estados resueltos —cancelada, con asistencia, o de fecha pasada—; las
        pendientes/futuras quedan fuera (viven en Mis Turnos). Con `include_deleted`
        reaparecen las canceladas para mostrarlas como "Cancelado" de inmediato,
        aunque su fecha sea futura; cancelar es el único soft-delete de una reserva,
        así que solo vuelven esas. Excluye la lista de espera: no son asistencias.
        """
        hoy = datetime.now(tz=AR_TZ).date()
        stmt = (
            select(Reserva)
            .where(
                Reserva.user_id == user_id,
                Reserva.estado_espera.is_(None),
                or_(
                    Reserva.deleted_at.isnot(None),
                    Reserva.asistencia_registrada_at.isnot(None),
                    Reserva.fecha < hoy,
                ),
            )
            .options(joinedload(Reserva.turno).joinedload(Turno.actividad))
            .order_by(Reserva.fecha.desc())
            .execution_options(include_deleted=True)
        )
        return db.session.execute(stmt).scalars().all()
