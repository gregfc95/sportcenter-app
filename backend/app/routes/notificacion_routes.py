from flask import Blueprint, Response, jsonify, request

from ..auth import require_role
from ..models.user import UserRole
from ..services.mensualidad_service import MensualidadService
from ..services.notificacion_service import (
    notificar_cupo_disponible,
    notificar_lista_espera_llena,
    notificar_recordatorio_renovacion,
)


notificacion_bp = Blueprint(
    "notificaciones", __name__, url_prefix="/api/notificaciones"
)

mensualidad_service = MensualidadService()


@notificacion_bp.route("/cupo-disponible", methods=["POST"])
def notificar_cupo() -> Response:
    """Dispara a mano el aviso "se liberó un lugar" (demo de staff).

    El aviso real lo manda la lista de espera al promover la cola; este endpoint
    existe para mostrarlo en una demo sin armar una cancelación real.
    """
    require_role(UserRole.ADMIN, UserRole.EMPLOYEE)
    data = request.get_json() or {}

    cliente_id = data.get("cliente_id")
    if not isinstance(cliente_id, int):
        return jsonify({"error": "cliente_id es requerido y debe ser un entero."}), 400

    turno_id = data.get("turno_id")
    if not isinstance(turno_id, int):
        return jsonify({"error": "turno_id es requerido y debe ser un entero."}), 400

    try:
        email = notificar_cupo_disponible(cliente_id, turno_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except RuntimeError:
        return (
            jsonify({"error": "El envío de emails no está configurado en este entorno."}),
            503,
        )

    return jsonify({"ok": True, "email": email}), 200


@notificacion_bp.route("/recordatorio-renovacion", methods=["POST"])
def recordar_renovacion() -> Response:
    """Dispara a mano el recordatorio de renovación a un cliente y turno (demo).

    El aviso real lo manda el scheduler el día 10 a los abonos impagos; este
    endpoint lo muestra en una demo apuntado a un cliente elegido, sin depender
    de que tenga una renovación impaga de verdad.
    """
    require_role(UserRole.ADMIN, UserRole.EMPLOYEE)
    data = request.get_json() or {}

    cliente_id = data.get("cliente_id")
    if not isinstance(cliente_id, int):
        return jsonify({"error": "cliente_id es requerido y debe ser un entero."}), 400

    turno_id = data.get("turno_id")
    if not isinstance(turno_id, int):
        return jsonify({"error": "turno_id es requerido y debe ser un entero."}), 400

    try:
        email = notificar_recordatorio_renovacion(cliente_id, turno_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except RuntimeError:
        return (
            jsonify({"error": "El envío de emails no está configurado en este entorno."}),
            503,
        )

    return jsonify({"ok": True, "email": email}), 200


@notificacion_bp.route("/lista-espera-llena", methods=["POST"])
def notificar_lista_llena() -> Response:
    """Dispara a mano el aviso "lista de espera llena" al staff (demo).

    El aviso real lo manda el sistema cuando la cola de una clase llega al tope;
    este endpoint lo muestra en una demo sin juntar esa demanda de verdad.
    """
    require_role(UserRole.ADMIN, UserRole.EMPLOYEE)
    data = request.get_json() or {}

    turno_id = data.get("turno_id")
    if not isinstance(turno_id, int):
        return jsonify({"error": "turno_id es requerido y debe ser un entero."}), 400

    # Los fallos de transporte los traga el servicio por admin (igual que
    # recordatorio-renovaciones), así que acá solo se informa cuántos salieron.
    try:
        emails = notificar_lista_espera_llena(turno_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404

    return jsonify({"ok": True, "enviados": len(emails), "emails": emails}), 200


@notificacion_bp.route("/recordatorio-renovaciones", methods=["POST"])
def recordar_renovaciones() -> Response:
    """Dispara a mano el recordatorio de renovaciones impagas (demo de staff).

    Es el mismo aviso que el scheduler manda solo el día 10: un email a cada
    cliente con la renovación del mes sin pagar. Los fallos de transporte los
    traga el servicio por grupo, así que acá solo se informa cuántos salieron.
    """
    require_role(UserRole.ADMIN, UserRole.EMPLOYEE)

    emails = mensualidad_service.recordar_renovaciones_impagas()
    return jsonify({"ok": True, "enviados": len(emails), "emails": emails}), 200


@notificacion_bp.route("/reset-penalizaciones", methods=["POST"])
def reset_penalizaciones() -> Response:
    """Resetea a mano el contador de penalizaciones del mes (demo de staff).

    Espejo del rollover automático del 1°: borra las penalizaciones del mes en
    curso de todos los usuarios. No levanta suspensiones.
    """
    require_role(UserRole.ADMIN, UserRole.EMPLOYEE)
    borradas = mensualidad_service.resetear_penalizaciones_mes()
    return jsonify({"ok": True, "borradas": borradas}), 200
