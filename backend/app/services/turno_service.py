from ..models.Turno import Turno
from ..repositories.TurnoRepository import TurnoRepository
from datetime import datetime

class TurnoService:
    def __init__(self):
        # Cuando arranca el servicio, preparamos el repositorio para usarlo
        self.turno_repository = TurnoRepository()

    def crear_turno(self, data):
        # 1. Extraemos los datos (el Schema ya los va a mandar validados y limpios)
        actividad_id = data.get('actividad_id')
        horario_raw = data.get('horario')
        if isinstance(horario_raw, str):
            horario = datetime.strptime(horario_raw, "%Y-%m-%d %H:%M:%S")  # Convertimos el string a datetime
        else:
            horario = horario_raw  # Si ya viene como datetime, lo usamos directamente
        cupo = data.get('cupo', 10)  # Por ejemplo, si no viene el cupo, le ponemos 10 por defecto
        descripcion = data.get('descripcion', '')  # Descripción opcional

        # 2. Regla de Negocio: verificamos que no choque con otro turno
        turno_existente = self.turno_repository.encontrar_actividad_en_horario(actividad_id, horario)
        
        if turno_existente:
            # Si encuentra uno, frena todo y tira un error que después la Ruta le va a mostrar al usuario
            raise ValueError(f"Ya existe un turno de {actividad_id} que se superpone con este horario.")

        # 3. Si está todo libre, creamos el objeto Turno
        nuevo_turno = Turno(
            actividad_id=actividad_id,
            horario=horario,
            cupo=cupo,
            descripcion=descripcion
        )

        # 4. Lo mandamos a guardar a la base de datos a través del cadete (el repositorio)
        return self.turno_repository.save(nuevo_turno)