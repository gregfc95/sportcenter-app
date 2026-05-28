from .. import db

class Actividad(db.Model):
    __tablename__ = 'actividades'
    
    actividad_id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), unique=True, nullable=False)
    costo_individual = db.Column(db.Float, nullable=False)
    costo_mensual = db.Column(db.Float, nullable=False)

    # Relación uno a muchos: Una actividad tiene muchos turnos
    turnos = db.relationship('Turno', backref='actividad_rel', lazy=True)

    