from flask import Blueprint, Response, jsonify, request
from marshmallow import ValidationError

from ..auth import current_user_id
from ..schemas import ClaseSchema
from ..services import ClaseService, TurnoService
from .. import db

clase_bp = Blueprint("clases", __name__)
clase_service = ClaseService()
turno_service = TurnoService()
clase_schema = ClaseSchema()


@clase_bp.route("/api/turnos/<int:turno_id>/clases", methods=["POST"])
def obtener_o_crear_clase(turno_id: int) -> Response:
    current_user_id()

    if turno_service.obtener_por_id(turno_id) is None:
        return jsonify({"error": "Turno no encontrado"}), 404
    
    data = request.get_json() or {}
    data["turno_id"] = turno_id

    try:
        data = clase_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400
    

    try:
        clase = clase_service.obtener_o_crear(turno_id, data["fecha"])
        db.session.commit()
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    

    return jsonify(clase_schema.dump(clase)), 200