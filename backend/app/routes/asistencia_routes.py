from flask import Blueprint, Response, jsonify, request

from .. import db
from ..auth import current_user_id, require_role
from ..models.reserva import Reserva
from ..models.user import UserRole
from ..services import AsistenciaService
from ..services.asistencia_service import (
    QrInvalido,
    QrYaUtilizado,
    estado_asistencia,
)


asistencia_bp = Blueprint("asistencias", __name__, url_prefix="/api/asistencias")

asistencia_service = AsistenciaService()


@asistencia_bp.route("/reservas/<int:reserva_id>/qr", methods=["GET"])
def get_reserva_qr(reserva_id: int) -> Response:
    """QR de asistencia de una reserva del usuario actual (solo el día del turno).

    El error de negocio (no paga, ya utilizado, fuera de fecha) llega con el
    texto exacto del toast que muestra el frontend.
    """
    user_id = current_user_id()

    reserva = db.session.get(Reserva, reserva_id)
    if reserva is None or reserva.is_deleted:
        return jsonify({"error": "La reserva indicada no existe."}), 404
    if reserva.user_id != user_id:
        return jsonify({"error": "La reserva no pertenece al usuario."}), 403

    try:
        qr = asistencia_service.obtener_qr(reserva)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    turno = reserva.turno
    actividad = turno.actividad if turno else None
    return (
        jsonify(
            {
                "reserva_id": reserva.id,
                "qr": qr,
                "actividad": actividad.nombre if actividad else None,
                "fecha": reserva.fecha.isoformat(),
                "hora": turno.hora.strftime("%H:%M") if turno else None,
            }
        ),
        200,
    )


@asistencia_bp.route("/escanear", methods=["POST"])
def escanear() -> Response:
    """Registra la asistencia a partir del código escaneado. Sólo admin/empleado.

    404 = QR ajeno al sistema, 409 = ya registrado, 400 = otra regla (p. ej.
    el turno no es de hoy). Los mensajes son los toasts del scanner.
    """
    staff = require_role(UserRole.ADMIN, UserRole.EMPLOYEE)
    data = request.get_json(silent=True) or {}
    codigo = data.get("codigo")
    if not isinstance(codigo, str) or not codigo:
        return jsonify({"error": "codigo es requerido."}), 400

    try:
        reserva = asistencia_service.registrar_asistencia(codigo, staff.id)
    except QrYaUtilizado as e:
        return jsonify({"error": str(e)}), 409
    except QrInvalido as e:
        return jsonify({"error": str(e)}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    turno = reserva.turno
    actividad = turno.actividad if turno else None
    cliente = reserva.user
    return (
        jsonify(
            {
                "ok": True,
                "reserva_id": reserva.id,
                "cliente": (
                    {
                        "nombre": cliente.first_name,
                        "apellido": cliente.last_name,
                        "email": cliente.email,
                    }
                    if cliente
                    else None
                ),
                "actividad": actividad.nombre if actividad else None,
                "hora": turno.hora.strftime("%H:%M") if turno else None,
            }
        ),
        200,
    )


@asistencia_bp.route("/historial", methods=["GET"])
def list_mi_historial() -> Response:
    """Historial de reservas resueltas del usuario para la tabla de Mi Historial.

    Reservas pasadas y canceladas, más recientes primero, con el estado
    calculado acá: cancelado / asistio / ausente. Las pendientes/futuras no van.
    """
    user_id = current_user_id()
    reservas = asistencia_service.historial_usuario(user_id)

    payload = []
    for reserva in reservas:
        # `historial_usuario` usa include_deleted, así que un turno/actividad
        # dado de baja después también carga y la fila conserva su nombre real;
        # el guard cubre el caso límite de una reserva sin turno.
        turno = reserva.turno
        actividad = turno.actividad if turno else None
        payload.append(
            {
                "reserva_id": reserva.id,
                "actividad": actividad.nombre if actividad else None,
                "fecha": reserva.fecha.isoformat(),
                "dia_semana": turno.dia_semana.value if turno else None,
                "hora": turno.hora.strftime("%H:%M") if turno else None,
                "tipo": reserva.tipo.value,
                "estado": estado_asistencia(reserva),
            }
        )

    return jsonify(payload), 200
