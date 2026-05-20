from datetime import datetime, timezone
from .. import db

class Turno(db.Model):
    __tablename__ = 'turnos'

    id = db.Column(db.Integer, primary_key=True)
    actividad = db.Column(db.String(50), nullable=False)
    horario = db.Column(db.DateTime, nullable=False)
    cupo = db.Column(db.Integer, nullable=False)
    inscriptos = db.relationship('Inscripcion', backref='turno', lazy=True)
    descripcion = db.Column(db.String(200), nullable=True)

    def __init__(self, actividad, horario, cupo, descripcion=None):
        self.actividad = actividad
        self.horario = horario
        self.cupo = max(1, cupo)
        self.descripcion = descripcion

    def __repr__(self):
        return f"<Turno {self.actividad} - {self.horario}>"
    
    def cantidad_inscriptos(self):
        return len(self.inscriptos)
    
    def hay_cupo(self):
        return self.cantidad_inscriptos() < self.cupo
    
    def lugares_disponibles(self):
        return self.cupo - self.cantidad_inscriptos()
    
    def to_dict(self):
        return {
            "id": self.id,
            "actividad": self.actividad,
            "horario": self.horario.strftime("%Y-%m-%d %H:%M"), # Formatea la fecha a texto
            "cupo": self.cupo,
            "disponibles": self.lugares_disponibles(),
            "descripcion": self.descripcion
        }