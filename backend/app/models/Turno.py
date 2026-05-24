from datetime import datetime, timezone
from .. import db

DIAS_VALIDOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

class Turno(db.Model):
    __tablename__ = 'turnos'

    id = db.Column(db.Integer, primary_key=True)
    actividad_id = db.Column(db.Integer, db.ForeignKey('actividades.actividad_id'), nullable=False)
    dia_semana = db.Column(db.String(20), nullable=False)   # Ej: "Miércoles"
    hora = db.Column(db.Time, nullable=False)               # Ej: 18:00:00
    cupo = db.Column(db.Integer, nullable=False)
    descripcion = db.Column(db.String(200), nullable=True)

    inscriptos = db.relationship('Inscripcion', backref='turno', lazy=True)

    # Constraint: no puede haber dos turnos de la misma actividad el mismo día y hora
    __table_args__ = (
        db.UniqueConstraint('actividad_id', 'dia_semana', 'hora', name='uq_actividad_dia_hora'),
    )

    def __init__(self, actividad_id, dia_semana, hora, cupo, descripcion=None):
        self.actividad_id = actividad_id
        self.dia_semana = dia_semana
        self.hora = hora
        self.cupo = max(1, cupo)
        self.descripcion = descripcion

    def __repr__(self):
        return f"<Turno actividad_id={self.actividad_id} - {self.dia_semana} {self.hora}>"

    def cantidad_inscriptos(self):
        return len(self.inscriptos)

    def hay_cupo(self):
        return self.cantidad_inscriptos() < self.cupo

    def lugares_disponibles(self):
        return self.cupo - self.cantidad_inscriptos()

    def to_dict(self):
        return {
            "id": self.id,
            "actividad": self.actividad_rel.nombre,
            "dia_semana": self.dia_semana,
            "hora": self.hora.strftime("%H:%M"),
            "cupo": self.cupo,
            "disponibles": self.lugares_disponibles(),
            "descripcion": self.descripcion
        }