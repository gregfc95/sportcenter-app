from flask import Blueprint, Response, jsonify, request
from marshmallow import ValidationError

from ..services import ActividadService
from ..schemas import ActividadSchema


actividad_bp = Blueprint("actividades", __name__, url_prefix="/api/actividades")

actividad_service = ActividadService()
actividad_schema = ActividadSchema()
actividades_schema = ActividadSchema(many=True)


@actividad_bp.route("", methods=["GET"])
def get_actividades() -> Response:
    actividades = actividad_service.obtener_todas()
    return jsonify(actividades_schema.dump(actividades)), 200


@actividad_bp.route("", methods=["POST"])
def create_actividad() -> Response:
    try:
        data = actividad_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    try:
        actividad = actividad_service.crear(data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 409

    return jsonify(actividad_schema.dump(actividad)), 201


@actividad_bp.route("/<int:actividad_id>", methods=["GET"])
def get_actividad(actividad_id: int) -> Response:
    actividad = actividad_service.obtener_por_id(actividad_id)
    if actividad is None:
        return jsonify({"error": "Actividad no encontrada"}), 404
    return jsonify(actividad_schema.dump(actividad)), 200


@actividad_bp.route("/<int:actividad_id>", methods=["PUT"])
def update_actividad(actividad_id: int) -> Response:
    if actividad_service.obtener_por_id(actividad_id) is None:
        return jsonify({"error": "Actividad no encontrada"}), 404

    schema = ActividadSchema(context={"actividad_id": actividad_id})

    try:
        data = schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    try:
        actividad = actividad_service.actualizar(actividad_id, data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 409

    return jsonify(actividad_schema.dump(actividad)), 200


@actividad_bp.route("/<int:actividad_id>", methods=["DELETE"])
def delete_actividad(actividad_id: int) -> Response:
    if actividad_service.eliminar(actividad_id) is None:
        return jsonify({"error": "Actividad no encontrada"}), 404
    return "", 204
