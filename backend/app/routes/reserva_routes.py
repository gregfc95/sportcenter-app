from flask import Blueprint, Response, jsonify, request
from marshmallow import ValidationError

from ..auth import current_user_id
from ..schemas import ReservaSchema
from ..services import ClaseService, ReservaService

reserva_bp = Blueprint("reservas", __name__)
reserva_service = ReservaService()
clase_service = ClaseService()
reserva_schema = ReservaSchema()

@reserva_bp.route("/api/clases/<int:clase_id>/reservas", methods=["POST"])
def create_reserva(clase_id: int) -> Response:
    user_id = current_user_id()

    if clase_service.obtener_por_id(clase_id) is None:
        return jsonify({"error": "Clase no encontrada"}), 404

    try:
        data = reserva_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    try:
        reserva = reserva_service.crear_reserva(user_id, clase_id, data["tipo"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(reserva_schema.dump(reserva)), 201

@reserva_bp.route("/api/reservas/mis-reservas", methods=["GET"])
def list_mis_reservas() -> Response:
    user_id = current_user_id()
    reservas = reserva_service.obtener_por_usuario(user_id)
    return jsonify([
        {
            "id": r.id,
            "tipo": r.tipo.value,
            "fecha": r.clase.fecha.isoformat(),
            "hora": r.clase.turno.hora.strftime("%H:%M"),
            "dia_semana": r.clase.turno.dia_semana.value,
            "actividad": r.clase.turno.actividad.nombre,
        }
        for r in reservas
    ]), 200