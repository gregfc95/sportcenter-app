from ..models.Turno import Turno
from ..repositories.TurnoRepository import TurnoRepository

class TurnoService:
    def __init__(self):
        self.turno_repository = TurnoRepository()

    def crear_turno(self, data):
        actividad_id = data.get('actividad_id')
        dia_semana = data.get('dia_semana')
        hora = data.get('hora')          # Marshmallow ya lo convierte a datetime.time
        cupo = data.get('cupo', 10)
        descripcion = data.get('descripcion', '')

        # Regla de negocio: no puede existir el mismo turno
        turno_existente = self.turno_repository.encontrar_actividad_en_horario(
            actividad_id, dia_semana, hora
        )

        if turno_existente:
            hora_str = hora.strftime('%H:%M') if hasattr(hora, 'strftime') else hora
            raise ValueError(
                f"Ya existe un turno de esta actividad el {dia_semana} que se superpondria con este."
            )

        nuevo_turno = Turno(
            actividad_id=actividad_id,
            dia_semana=dia_semana,
            hora=hora,
            cupo=cupo,
            descripcion=descripcion
        )

        return self.turno_repository.save(nuevo_turno)