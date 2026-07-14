from flask import Blueprint, Response, jsonify, request

from .. import db
from ..auth import current_user_id
from ..models.reserva import Reserva
from ..services import CreditoService


credito_bp = Blueprint("creditos", __name__, url_prefix="/api/creditos")

credito_service = CreditoService()


@credito_bp.route("", methods=["GET"])
def list_mis_creditos() -> Response:
    """Créditos a favor vigentes del usuario actual, para el dashboard.

    Cada crédito indica la actividad en la que se puede canjear, el saldo que
    queda y cuándo vence.
    """
    user_id = current_user_id()
    creditos = credito_service.listar_vigentes_por_usuario(user_id)

    payload = [
        {
            "id": c.id,
            "actividad": {"id": c.actividad.id, "nombre": c.actividad.nombre},
            "monto_inicial": float(c.monto_inicial),
            "saldo": float(c.saldo),
            "expira_at": c.expira_at.isoformat() if c.expira_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in creditos
    ]
    return jsonify(payload), 200


@credito_bp.route("/aplicables", methods=["GET"])
def creditos_aplicables() -> Response:
    """Saldo de crédito canjeable del usuario para una actividad.

    Acepta `actividad_id` directo (checkout de nueva reserva) o `reserva_id`
    (los diálogos de pago pendiente solo conocen la reserva); en ese caso
    resuelve la actividad y valida que la reserva sea del usuario.
    """
    user_id = current_user_id()

    reserva_id = request.args.get("reserva_id", type=int)
    actividad_id = request.args.get("actividad_id", type=int)

    if reserva_id is not None:
        reserva = db.session.get(Reserva, reserva_id)
        if reserva is None:
            return jsonify({"error": "La reserva indicada no existe."}), 404
        if reserva.user_id != user_id:
            return jsonify({"error": "La reserva no pertenece al usuario."}), 403
        actividad_id = reserva.turno.actividad.id
    elif actividad_id is None:
        return jsonify({"error": "actividad_id o reserva_id es requerido."}), 400

    saldo = credito_service.saldo_disponible(user_id, actividad_id)
    return (
        jsonify({"actividad_id": actividad_id, "saldo_disponible": float(saldo)}),
        200,
    )
