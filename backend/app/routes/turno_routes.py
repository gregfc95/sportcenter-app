from flask import Blueprint, request, jsonify
from ..services import TurnoService
from ..schemas import TurnoCreateSchema 
from marshmallow import ValidationError

turno_bp = Blueprint("turnos", __name__, url_prefix="/api/turnos")

turno_service = TurnoService()
turno_schema = TurnoCreateSchema()

@turno_bp.route("/create", methods=["POST"])
def create_turno():

    data = request.get_json()
  
    # Validar datos
    try:
        datos_validos = turno_schema.load(data)
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    try:
        # Llamar al servicio que ya tenés armado
        turno = turno_service.crear_turno(datos_validos)
        return jsonify(turno), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400