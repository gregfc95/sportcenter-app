from datetime import date

from flask import Blueprint, Response, jsonify, request
from marshmallow import ValidationError

from ..auth import current_user_id, require_role
from ..models.user import UserRole
from ..schemas import TurnoSchema
from ..services import ActividadService, ListaEsperaService, TurnoService


turno_bp = Blueprint("turnos", __name__)

turno_service = TurnoService()
actividad_service = ActividadService()
lista_espera_service = ListaEsperaService()
turno_schema = TurnoSchema()
turnos_schema = TurnoSchema(many=True)


@turno_bp.route("/api/actividades/<int:actividad_id>/turnos", methods=["GET"])
def list_turnos_por_actividad(actividad_id: int) -> Response:
    current_user_id()

    if actividad_service.obtener_por_id(actividad_id) is None:
        return jsonify({"error": "Actividad no encontrada"}), 404

    fecha_param = request.args.get("fecha")
    fecha: date | None = None
    if fecha_param is not None:
        try:
            fecha = date.fromisoformat(fecha_param)
        except ValueError:
            return jsonify({"error": "fecha debe tener formato YYYY-MM-DD"}), 400

    turnos = turno_service.obtener_por_actividad(actividad_id)
    dumped = turnos_schema.dump(turnos)

    # Fechas dadas de baja por el centro: el front las usa para marcar el
    # calendario y para excluirlas del preview del abono mensual.
    bloqueos = turno_service.fechas_bloqueadas_futuras([t.id for t in turnos])
    for turno_dict, turno in zip(dumped, turnos):
        turno_dict["fechas_bloqueadas"] = [
            f.isoformat() for f in bloqueos.get(turno.id, [])
        ]

    if fecha is not None:
        for turno_dict, turno in zip(dumped, turnos):
            bloqueado = fecha in bloqueos.get(turno.id, [])
            turno_dict["bloqueado"] = bloqueado
            turno_dict["disponibles"] = (
                0 if bloqueado else turno_service.lugares_disponibles(turno, fecha)
            )
            # Con prioridad estricta un lugar libre puede estar reservado a la
            # espera de un abono; el front lo muestra como "lista de espera" y no
            # como reservable directo.
            turno_dict["lista_espera"] = (
                not bloqueado and lista_espera_service.hay_demanda(turno.id, fecha)
            )

    return jsonify(dumped), 200


@turno_bp.route("/api/turnos/<int:turno_id>", methods=["GET"])
def get_turno(turno_id: int) -> Response:
    current_user_id()
    turno = turno_service.obtener_por_id(turno_id)
    if turno is None:
        return jsonify({"error": "Turno no encontrado"}), 404
    return jsonify(turno_schema.dump(turno)), 200


@turno_bp.route("/api/actividades/<int:actividad_id>/turnos", methods=["POST"])
def create_turno(actividad_id: int) -> Response:
    require_role(UserRole.ADMIN)

    if actividad_service.obtener_por_id(actividad_id) is None:
        return jsonify({"error": "Actividad no encontrada"}), 404

    try:
        data = turno_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    data["actividad_id"] = actividad_id

    try:
        turno = turno_service.crear_turno(data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(turno_schema.dump(turno)), 201


@turno_bp.route("/api/turnos/<int:turno_id>", methods=["PUT"])
def update_turno(turno_id: int) -> Response:
    require_role(UserRole.ADMIN)

    if turno_service.obtener_por_id(turno_id) is None:
        return jsonify({"error": "Turno no encontrado"}), 404

    try:
        data = turno_schema.load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({"errors": err.messages}), 400

    try:
        turno = turno_service.actualizar(turno_id, data)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(turno_schema.dump(turno)), 200


@turno_bp.route("/api/turnos/<int:turno_id>", methods=["DELETE"])
def delete_turno(turno_id: int) -> Response:
    """Elimina el turno completo o, con `?fecha=YYYY-MM-DD`, solo esa fecha.

    En ambos casos las reservas afectadas se cancelan con reembolso.
    """
    admin = require_role(UserRole.ADMIN)

    fecha_param = request.args.get("fecha")
    fecha: date | None = None
    if fecha_param is not None:
        try:
            fecha = date.fromisoformat(fecha_param)
        except ValueError:
            return jsonify({"error": "fecha debe tener formato YYYY-MM-DD"}), 400

    try:
        if fecha is not None:
            eliminado = turno_service.eliminar_fecha(turno_id, fecha, admin.id)
        else:
            eliminado = turno_service.eliminar(turno_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if eliminado is None:
        return jsonify({"error": "Turno no encontrado"}), 404
    return "", 204
