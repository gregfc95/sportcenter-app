from .. import db
from ..models import Actividad # Asegurate de que tu modelo se llame Actividad

class ActividadService:
    def obtener_todas(self):
        # Trae todas las filas de la tabla actividades
        return Actividad.query.all()