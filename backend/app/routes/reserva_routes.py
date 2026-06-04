from flask import Blueprint, Response, jsonify, request
from marshmallow import ValidationError

from ..auth import current_user_id
from ..schemas import ReservaSchema
from ..services import ReservaService, TurnoService

reserva_bp = Blueprint("reservas", __name__)
reserva_service = ReservaService()
turno_service = TurnoService()
reserva_schema = ReservaSchema()


@reserva_bp.route("/api/turnos/<int:turno_id>/reservas", methods=["POST"])
def create_reserva(turno_id: int) -> Response:
    user_id = current_user_id()

    if turno_service.obtener_por_id(turno_id) is None:
        return jsonify({"error": "Turno no encontrado"}), 404

    try:
        data = reserva_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    try:
        reserva = reserva_service.crear_reserva(
            user_id=user_id,
            turno_id=turno_id,
            fecha=data["fecha"],
            tipo=data["tipo"],
        )
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
            "fecha": r.fecha.isoformat(),
            "hora": r.turno.hora.strftime("%H:%M"),
            "dia_semana": r.turno.dia_semana.value,
            "actividad": r.turno.actividad.nombre,
        }
        for r in reservas
    ]), 200