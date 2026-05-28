from datetime import datetime, timezone
from .. import db

class Inscripcion(db.Model):
    __tablename__ = 'inscripciones'

    id_usuario = db.Column(db.Integer, db.ForeignKey('usuarios.id'), primary_key=True)
    id_turno = db.Column(db.Integer, db.ForeignKey('turnos.id'), primary_key=True)
    fecha = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def __init__(self, id_usuario, id_turno):
        self.id_usuario = id_usuario
        self.id_turno = id_turno

    def __repr__(self):
        return f"<Inscripcion Usuario {self.id_usuario} - Turno {self.id_turno}>"
    
    def to_dict(self):
        return {
            "id_usuario": self.id_usuario,
            "id_turno": self.id_turno,
            "fecha": self.fecha.strftime("%Y-%m-%d %H:%M") # Formatea la fecha a texto
        }