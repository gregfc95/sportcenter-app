from .. import db
from ..models.Turno import Turno
from datetime import timedelta

class TurnoRepository:

    def encontrar_actividad_en_horario(self, actividad, horario):
        # Calculamos 1 hora antes y 1 hora después del turno que queremos crear
        limite_inferior = horario - timedelta(hours=1)
        limite_superior = horario + timedelta(hours=1)
        
        # Buscamos si hay algún turno en el medio de ese rango peligroso
        return Turno.query.filter(
            Turno.actividad == actividad,
            Turno.horario > limite_inferior,
            Turno.horario < limite_superior
        ).first()
    
    def save(self, turno):
        db.session.add(turno)
        db.session.commit()
        return turno