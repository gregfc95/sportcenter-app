from flask import Blueprint, Response, jsonify

from ..auth import current_user_id
from ..services import MensualidadService


mensualidad_bp = Blueprint("mensualidad", __name__, url_prefix="/api/mensualidad")

mensualidad_service = MensualidadService()


@mensualidad_bp.route("/estado", methods=["GET"])
def estado_mensual() -> Response:
    """Estado de suscripción mensual del usuario actual, para la UI del cliente.

    Devuelve si está suspendido, las penalizaciones del mes en curso (con su
    tope) y si le corresponde el descuento de fidelidad.
    """
    user_id = current_user_id()
    return jsonify(mensualidad_service.estado_cliente(user_id)), 200
