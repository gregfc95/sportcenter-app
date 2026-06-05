from app import db


def register_commands(app):
    """Registra todos los comandos CLI custom de la app."""

    @app.cli.command("seed-db")
    def seed_db():
        """Carga los datos iniciales necesarios para que la app funcione."""
        from datetime import date, time
        from decimal import Decimal

        from werkzeug.security import generate_password_hash

        from app.models import Actividad, Pago, Reserva, Turno, User
        from app.models.pago import PagoEstado, PagoMedio
        from app.models.reserva import ReservaTipo
        from app.models.turno import DiaSemana
        from app.models.user import UserRole

        # --- Limpieza (respetando las FKs: pagos -> reservas -> turnos /
        # actividades / users) ---
        db.session.query(Pago).delete()
        db.session.query(Reserva).delete()
        db.session.query(Turno).delete()
        db.session.query(Actividad).delete()
        db.session.query(User).delete()
        db.session.commit()

        # --- Actividades ---
        deportes = [
            {"nombre": "Futbol", "precio": Decimal("1500.00")},
            {"nombre": "Voley", "precio": Decimal("1000.00")},
            {"nombre": "Basket", "precio": Decimal("50.00")},
        ]

        actividades = {}
        for d in deportes:
            actividad = Actividad(**d)
            db.session.add(actividad)
            actividades[d["nombre"]] = actividad

        db.session.commit()
        print(f"✅ {len(actividades)} actividad(es) cargada(s).")

        # --- Turnos (algunos por actividad) ---
        # Los últimos corresponden a las fechas que se reservan más abajo:
        #   2026-06-05 (viernes) 20:00  -> Futbol
        #   2026-06-08 (lunes)   09:00  -> Voley
        #   2026-06-06 (sábado)  16:00  -> Basket (cupo 1)
        turnos_data = [
            ("Futbol", DiaSemana.LUNES, time(18, 0), 10),
            ("Futbol", DiaSemana.MIERCOLES, time(20, 0), 10),
            ("Voley", DiaSemana.SABADO, time(10, 0), 12),
            ("Futbol", DiaSemana.VIERNES, time(20, 0), 10),
            ("Voley", DiaSemana.LUNES, time(9, 0), 12),
            ("Basket", DiaSemana.SABADO, time(16, 0), 1),
        ]

        turnos = {}
        for nombre, dia, hora, cupo in turnos_data:
            turno = Turno(
                actividad_id=actividades[nombre].id,
                dia_semana=dia,
                hora=hora,
                cupo=cupo,
            )
            db.session.add(turno)
            turnos[(nombre, dia, hora)] = turno

        db.session.commit()
        print(f"✅ {len(turnos)} turno(s) cargado(s).")

        # --- Usuarios ---
        users = {
            "cliente": User(
                first_name="Cliente",
                last_name="Demo",
                dni="11111111",
                email="cliente@gmail.com",
                phone="1122334455",
                birth_date=date(1995, 6, 15),
                password_hash=generate_password_hash("Cliente1234!"),
                role=UserRole.CLIENT,
            ),
            "cliente2": User(
                first_name="Cliente",
                last_name="Dos",
                dni="44444444",
                email="cliente2@gmail.com",
                phone="1155667788",
                birth_date=date(1998, 9, 12),
                password_hash=generate_password_hash("Cliente1234!"),
                role=UserRole.CLIENT,
            ),
            "cliente3": User(
                first_name="Cliente",
                last_name="Tres",
                dni="55555555",
                email="cliente3@gmail.com",
                phone="1166778899",
                birth_date=date(2000, 1, 20),
                password_hash=generate_password_hash("Cliente1234!"),
                role=UserRole.CLIENT,
            ),
            "empleado": User(
                first_name="Empleado",
                last_name="Demo",
                dni="22222222",
                email="empleado@gmail.com",
                phone="1133445566",
                birth_date=date(1990, 3, 22),
                password_hash=generate_password_hash("Cliente1234!"),
                role=UserRole.EMPLOYEE,
            ),
            "admin": User(
                first_name="Admin",
                last_name="Demo",
                dni="33333333",
                email="admin@gmail.com",
                phone="1144556677",
                birth_date=date(1985, 11, 5),
                password_hash=generate_password_hash("Cliente1234!"),
                role=UserRole.ADMIN,
            ),
        }

        db.session.add_all(users.values())
        db.session.commit()
        print(f"✅ {len(users)} usuario(s) creado(s).")

        # --- Reservas (sobre los turnos de las fechas pedidas) ---
        turno_viernes = turnos[("Futbol", DiaSemana.VIERNES, time(20, 0))]  # 2026-06-05
        turno_lunes = turnos[("Voley", DiaSemana.LUNES, time(9, 0))]  # 2026-06-08
        turno_miercoles = turnos[
            ("Futbol", DiaSemana.MIERCOLES, time(20, 0))
        ]  # 2026-06-03
        turno_basket = turnos[("Basket", DiaSemana.SABADO, time(16, 0))]  # 2026-06-06

        reservas_data = [
            # (key, user, turno, fecha)
            ("r1", users["cliente2"], turno_viernes, date(2026, 6, 5)),
            ("r2", users["cliente2"], turno_lunes, date(2026, 6, 8)),
            ("r3", users["cliente"], turno_viernes, date(2026, 6, 5)),
            ("r4", users["cliente"], turno_miercoles, date(2026, 6, 3)),
            ("r5", users["cliente3"], turno_basket, date(2026, 6, 6)),
        ]

        reservas = {}
        for key, user, turno, fecha in reservas_data:
            reserva = Reserva(
                user_id=user.id,
                turno_id=turno.id,
                fecha=fecha,
                tipo=ReservaTipo.EVENTUAL,
            )
            db.session.add(reserva)
            reservas[key] = reserva

        db.session.commit()
        print(f"✅ {len(reservas)} reserva(s) cargada(s).")

        # --- Pagos ---
        # Precios por actividad: Futbol 1500, Voley 1000. La seña es el 50%.
        pagos_data = [
            # cliente2 señó en efectivo y lo registró el empleado
            {
                "reserva": reservas["r1"],
                "user": users["cliente2"],
                "monto": Decimal("750.00"),
                "estado": PagoEstado.SENADO,
                "metodo": PagoMedio.EFECTIVO,
                "registrado_por": users["empleado"],
            },
            # cliente2 fue reembolsado; el reembolso lo registró el admin
            {
                "reserva": reservas["r2"],
                "user": users["cliente2"],
                "monto": Decimal("1000.00"),
                "estado": PagoEstado.REEMBOLSADO,
                "metodo": PagoMedio.EFECTIVO,
                "registrado_por": users["admin"],
            },
            # cliente pagó online por Mercado Pago (cobro automático)
            {
                "reserva": reservas["r3"],
                "user": users["cliente"],
                "monto": Decimal("1500.00"),
                "estado": PagoEstado.PAGADO,
                "metodo": PagoMedio.MERCADO_PAGO,
                "registrado_por": None,
            },
            {
                "reserva": reservas["r4"],
                "user": users["cliente"],
                "monto": Decimal("750.00"),
                "estado": PagoEstado.SENADO,
                "metodo": PagoMedio.MERCADO_PAGO,
                "registrado_por": None,
            },
        ]

        pagos = []
        for p in pagos_data:
            registrado_por = p["registrado_por"]
            pago = Pago(
                user_id=p["user"].id,
                reserva_id=p["reserva"].id,
                monto=p["monto"],
                estado=p["estado"],
                metodo=p["metodo"],
                registrado_por_id=registrado_por.id if registrado_por else None,
            )
            db.session.add(pago)
            pagos.append(pago)

        db.session.commit()
        print(f"✅ {len(pagos)} pago(s) cargado(s).")

        print("🌱 Seed completado.")
