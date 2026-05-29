from ..models.Turno import Turno
from ..repositories.TurnoRepository import TurnoRepository

class TurnoService:
    def __init__(self):
        self.turno_repository = TurnoRepository()

    # --- Lógica de negocio de inscriptos y cupo ---

    def cantidad_inscriptos(self, turno):
        return len(turno.inscriptos)

    def hay_cupo(self, turno):
        return self.cantidad_inscriptos(turno) < turno.cupo

    def lugares_disponibles(self, turno):
        return turno.cupo - self.cantidad_inscriptos(turno)

    # --- Lógica de superposición de horarios ---

    def _hay_superposicion(self, turnos_existentes, hora_nueva):
        if hasattr(hora_nueva, 'hour'):
            mins_nueva = hora_nueva.hour * 60 + hora_nueva.minute
        else:
            partes = str(hora_nueva).split(":")
            mins_nueva = int(partes[0]) * 60 + int(partes[1])

        for turno in turnos_existentes:
            t = turno.hora
            mins_turno = t.hour * 60 + t.minute
            if abs(mins_nueva - mins_turno) < 60:
                return True
        return False

    # --- Creación de turno ---

    def crear_turno(self, data):
        actividad_id = data.get('actividad_id')
        dia_semana = data.get('dia_semana')
        hora = data.get('hora')
        cupo = data.get('cupo', 10)
        descripcion = data.get('descripcion', '')

        turnos_existentes = self.turno_repository.encontrar_turnos_por_actividad_y_dia(
            actividad_id, dia_semana
        )

        if self._hay_superposicion(turnos_existentes, hora):
            hora_str = str(hora)[:5]
            raise ValueError(
                f"Ya existe un turno de esta actividad el {dia_semana} a las {hora_str}."
            )

        nuevo_turno = Turno(
            actividad_id=actividad_id,
            dia_semana=dia_semana,
            hora=hora,
            cupo=cupo,
            descripcion=descripcion
        )

        turno_guardado = self.turno_repository.save(nuevo_turno)
        disponibles = self.lugares_disponibles(turno_guardado)
        return turno_guardado.to_dict(disponibles=disponibles)
    
    def appointment_modification(self, turno_id, nuevo_cupo, nueva_descripcion):
        turno = self.turno_repository.find_by_id(turno_id)
 
        if turno is None:
            raise ValueError("El turno no existe.")
 
        if nuevo_cupo is None or not isinstance(nuevo_cupo, int) or nuevo_cupo < 1:
            raise ValueError("El cupo debe ser un número entero mayor a 0.")
 
        inscriptos_actuales = self.cantidad_inscriptos(turno)
        if nuevo_cupo < inscriptos_actuales:
            raise ValueError(
                f"No podés reducir el cupo a {nuevo_cupo}. "
                f"Ya hay {inscriptos_actuales} persona{'s' if inscriptos_actuales != 1 else ''} "
                f"inscripta{'s' if inscriptos_actuales != 1 else ''}."
            )
 
        turno.cupo = nuevo_cupo
 
        # None significa que no se envió el campo → no se toca
        # "" significa que se quiere limpiar → se acepta
        if nueva_descripcion is not None:
            turno.descripcion = nueva_descripcion
 
        turno_actualizado = self.turno_repository.update(turno)
        disponibles = self.lugares_disponibles(turno_actualizado)
        return turno_actualizado.to_dict(disponibles=disponibles)
 
    def obtener_todos(self):
        turnos = self.turno_repository.find_all()
        return [t.to_dict(disponibles=self.lugares_disponibles(t)) for t in turnos]