from flask import Blueprint, jsonify
from ..services import ActividadService
from ..schemas import ActividadSchema  # El esquema para transformar los modelos a JSON

# Definimos el blueprint con el prefijo /actividades
actividad_bp = Blueprint("actividades", __name__, url_prefix="/api/actividades")

actividad_service = ActividadService()
# many=True le dice a Marshmallow que va a serializar una LISTA de actividades
actividades_schema = ActividadSchema(many=True)

@actividad_bp.route("", methods=["GET"])
def get_actividades():
    try:
        # 1. Traemos todas las actividades usando el servicio
        actividades = actividad_service.obtener_todas()
        
        # 2. Las pasamos por el schema para convertirlas en un diccionario/lista de Python
        data = actividades_schema.dump(actividades)
        
        # 3. Respondemos con el JSON y un estado 200 OK
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500