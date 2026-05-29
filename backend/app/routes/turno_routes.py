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
    
@turno_bp.route("/<int:turno_id>", methods=["GET"])
def get_appointment(turno_id):
    try:
        turno = turno_service.turno_repository.find_by_id(turno_id)
        if turno is None:
            return jsonify({"error": "Turno no encontrado."}), 404
        disponibles = turno_service.lugares_disponibles(turno)
        return jsonify(turno.to_dict(disponibles=disponibles)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
 
 
@turno_bp.route("/<int:turno_id>/update", methods=["PATCH"])
def update_appointment(turno_id):
    data = request.get_json()
 
    if data is None:
        return jsonify({"error": "No se recibieron datos."}), 400
 
    try:
        turno = turno_service.modificar_turno(turno_id, data.get("cupo"), data.get("descripcion"))
        return jsonify(turno), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400
 
 
@turno_bp.route("/", methods=["GET"])
def get_all_appointments():
    try:
        turnos = turno_service.obtener_todos()
        return jsonify(turnos), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400