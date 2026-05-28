from .. import db

DIAS_VALIDOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

class Turno(db.Model):
    __tablename__ = 'turnos'

    id = db.Column(db.Integer, primary_key=True)
    actividad_id = db.Column(db.Integer, db.ForeignKey('actividades.actividad_id'), nullable=False)
    dia_semana = db.Column(db.String(20), nullable=False)
    hora = db.Column(db.Time, nullable=False)
    cupo = db.Column(db.Integer, nullable=False)
    descripcion = db.Column(db.String(200), nullable=True)

    inscriptos = db.relationship('Inscripcion', backref='turno', lazy=True)

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

    def to_dict(self, disponibles=None):
        return {
            "id": self.id,
            "actividad": self.actividad_rel.nombre,
            "dia_semana": self.dia_semana,
            "hora": self.hora.strftime("%H:%M"),
            "cupo": self.cupo,
            "disponibles": disponibles,
            "descripcion": self.descripcion
        }