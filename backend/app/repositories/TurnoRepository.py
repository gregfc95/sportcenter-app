from .. import db
from ..models.Turno import Turno

class TurnoRepository:

    def encontrar_turnos_por_actividad_y_dia(self, actividad_id, dia_semana):
        return Turno.query.filter_by(
            actividad_id=actividad_id,
            dia_semana=dia_semana
        ).all()

    def save(self, turno):
        db.session.add(turno)
        db.session.commit()
        return turno