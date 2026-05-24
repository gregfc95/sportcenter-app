from flask import Blueprint, request, jsonify
from ..services import TurnoService
from ..schemas import TurnoCreateSchema 

turno_bp = Blueprint("turnos", __name__, url_prefix="/turnos")

turno_service = TurnoService()
turno_schema = TurnoCreateSchema()

@turno_bp.route("/create", methods=["POST"])
def create_turno():

    data = request.get_json()
    
    # Validar datos
    errors = turno_schema.validate(data)
    if errors:
        return jsonify(errors), 400

    try:
        # Llamar al servicio que ya tenés armado
        turno = turno_service.crear_turno(data)
        return jsonify(turno_schema.dump(turno)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400