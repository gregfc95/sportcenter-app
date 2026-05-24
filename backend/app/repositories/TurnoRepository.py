from .. import db
from ..models.Turno import Turno
from datetime import time

class TurnoRepository:

    def encontrar_actividad_en_horario(self, actividad_id, dia_semana, hora):
        # Convertimos la hora a minutos totales para poder hacer aritmética
        if hasattr(hora, 'hour'):
            minutos = hora.hour * 60 + hora.minute
        else:
            # Si llega como string "HH:MM:SS"
            partes = str(hora).split(":")
            minutos = int(partes[0]) * 60 + int(partes[1])

        limite_inf = max(0, minutos - 59)   # 1 hora antes
        limite_sup = minutos + 59           # 1 hora después

        # Traemos todos los turnos de esa actividad ese día y filtramos en Python
        turnos_del_dia = Turno.query.filter_by(
            actividad_id=actividad_id,
            dia_semana=dia_semana
        ).all()

        for turno in turnos_del_dia:
            t = turno.hora
            mins_turno = t.hour * 60 + t.minute
            if limite_inf < mins_turno < limite_sup:
                return turno

        return None

    def save(self, turno):
        db.session.add(turno)
        db.session.commit()
        return turno