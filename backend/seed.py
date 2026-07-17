from app import db


def register_commands(app):
    """Registra todos los comandos CLI custom de la app."""

    @app.cli.command("seed-db")
    def seed_db():
        """Carga los datos iniciales necesarios para que la app funcione."""
        from datetime import date, datetime, time, timedelta, timezone
        from decimal import Decimal
        from uuid import uuid4

        from werkzeug.security import generate_password_hash

        from app.models import (
            Actividad,
            Credito,
            CreditoConsumo,
            Pago,
            Penalizacion,
            Reserva,
            Suspension,
            Turno,
            User,
        )
        from app.models.pago import PagoEstado, PagoMedio
        from app.models.penalizacion import PenalizacionMotivo
        from app.models.reserva import EstadoEspera, MotivoCancelacion, ReservaTipo
        from app.models.turno import DiaSemana
        from app.models.user import UserRole

        # --- Limpieza (respetando las FKs: los créditos referencian reservas y
        # actividades con RESTRICT, así que van primero; después
        # penalizaciones/suspensiones y pagos -> reservas -> turnos /
        # actividades / users) ---
        db.session.query(CreditoConsumo).delete()
        db.session.query(Credito).delete()
        db.session.query(Penalizacion).delete()
        db.session.query(Suspension).delete()
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
            # Cupo 1 a propósito: con una sola reserva queda lleno y la UI pasa
            # a ofrecer la lista de espera (demo del aviso de lista llena).
            ("Futbol", DiaSemana.MIERCOLES, time(10, 0), 1),
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
                first_name="Cliente1",
                last_name="Demo",
                dni="11111111",
                email="cliente@gmail.com",
                phone="1122334455",
                birth_date=date(1995, 6, 15),
                password_hash=generate_password_hash("Cliente1234!"),
                role=UserRole.CLIENT,
            ),
            "cliente2": User(
                first_name="Cliente2",
                last_name="Dos",
                dni="44444444",
                email="cliente2@gmail.com",
                phone="1155667788",
                birth_date=date(1998, 9, 12),
                password_hash=generate_password_hash("Cliente1234!"),
                role=UserRole.CLIENT,
            ),
            "cliente3": User(
                first_name="Cliente3",
                last_name="Tres",
                dni="55555555",
                email="cliente3@gmail.com",
                phone="1166778899",
                birth_date=date(2000, 1, 20),
                password_hash=generate_password_hash("Cliente1234!"),
                role=UserRole.CLIENT,
            ),
            "penalizado": User(
                first_name="Cliente",
                last_name="Penalizado",
                dni="88888888",
                email="penalizado@gmail.com",
                phone="1188990011",
                birth_date=date(1992, 2, 10),
                password_hash=generate_password_hash("Cliente1234!"),
                role=UserRole.CLIENT,
            ),
            "suspendido": User(
                first_name="Cliente",
                last_name="Suspendido",
                dni="77777777",
                email="suspendido@gmail.com",
                phone="1177889900",
                birth_date=date(1993, 8, 30),
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

        # Clientes extra para la demo del aviso de lista llena: hacen falta 9
        # personas en espera más un décimo que se anota a mano desde la UI.
        apellidos_extra = [
            "Cuatro",
            "Cinco",
            "Seis",
            "Siete",
            "Ocho",
            "Nueve",
            "Diez",
            "Once",
            "Doce",
            "Trece",
            "Catorce",
            "Quince",
        ]
        for i, apellido in enumerate(apellidos_extra, start=4):
            users[f"cliente{i}"] = User(
                first_name=f"Cliente{i}",
                last_name=apellido,
                dni=str(60000000 + i),
                email=f"cliente{i}@gmail.com",
                phone=f"11{60000000 + i}",
                birth_date=date(1996, 4, 18),
                password_hash=generate_password_hash("Cliente1234!"),
                role=UserRole.CLIENT,
            )

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

        # --- Lista de espera: una oferta vencida (demo) ---
        # El turno de básquet tiene cupo 1: cliente3 ocupa el lugar y "cliente"
        # quedó en la lista, se le ofreció el lugar y dejó vencer la oferta ->
        # VENCIDO. La fecha es futura a propósito: el barrido de la lista de
        # espera da de baja toda fila en espera cuya fecha/hora ya pasó
        # (_purgar_espera_pasadas) y Mis Turnos solo muestra fecha >= hoy.
        fecha_basket_futura = date(2026, 7, 18)  # sábado
        reservas_espera = [
            Reserva(
                user_id=users["cliente3"].id,
                turno_id=turno_basket.id,
                fecha=fecha_basket_futura,
            ),
            Reserva(
                user_id=users["cliente"].id,
                turno_id=turno_basket.id,
                fecha=fecha_basket_futura,
                estado_espera=EstadoEspera.VENCIDO,
            ),
        ]
        db.session.add_all(reservas_espera)
        db.session.commit()
        print("✅ Escenario de lista de espera (oferta vencida) cargado.")

        # --- Lista de espera casi llena (demo del aviso a admins) ---
        # El aviso de "lista llena" dispara cuando la cola llega exactamente a
        # 10 ESPERANDO al anotarse alguien (avisar_admins_si_lleno), así que se
        # dejan 9: el décimo se anota a mano desde la UI y gatilla el email.
        # cliente4 ocupa el único cupo para que el turno figure lleno. La fecha
        # es el próximo miércoles, siempre futura, para que el barrido no
        # purgue las filas en espera (_purgar_espera_pasadas).
        turno_espera = turnos[("Futbol", DiaSemana.MIERCOLES, time(10, 0))]
        hoy = date.today()
        fecha_espera = hoy + timedelta(days=(2 - hoy.weekday()) % 7 or 7)
        en_espera = [
            Reserva(
                user_id=users[f"cliente{i}"].id,
                turno_id=turno_espera.id,
                fecha=fecha_espera,
                estado_espera=EstadoEspera.ESPERANDO,
            )
            for i in range(5, 14)
        ]
        db.session.add(
            Reserva(
                user_id=users["cliente4"].id,
                turno_id=turno_espera.id,
                fecha=fecha_espera,
            )
        )
        db.session.add_all(en_espera)
        db.session.commit()
        print(
            f"✅ Lista de espera Fútbol miércoles 10:00 ({fecha_espera}): "
            f"{len(en_espera)} en espera, cupo lleno."
        )

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

        # --- Penalización: renovación impaga del mes pasado (demo) ---
        # "penalizado" no pagó la renovación de junio (mes pasado): cada clase
        # que pasó impaga sumó una penalización RENOVACION_IMPAGA y se canceló.
        # Con 3 penalizaciones en el mes anterior pierde el 20% de descuento de
        # fidelidad este mes (descuento_mensualidad), sin estar suspendido. El
        # conteo mensual mira `created_at`, así que las fechamos en junio a mano.
        turno_lunes_futbol = turnos[("Futbol", DiaSemana.LUNES, time(18, 0))]
        grupo_origen = uuid4().hex  # abono de mayo ya pagado, origen de la renovación
        grupo_renovacion = uuid4().hex
        clases_impagas = [date(2026, 6, 1), date(2026, 6, 8), date(2026, 6, 15)]

        renovacion_impaga = [
            Reserva(
                user_id=users["penalizado"].id,
                turno_id=turno_lunes_futbol.id,
                fecha=fecha,
                tipo=ReservaTipo.MENSUAL,
                grupo_id=grupo_renovacion,
                renovacion_de_grupo_id=grupo_origen,
            )
            for fecha in clases_impagas
        ]
        db.session.add_all(renovacion_impaga)
        db.session.commit()

        for reserva in renovacion_impaga:
            penalizacion = Penalizacion(
                user_id=users["penalizado"].id,
                reserva_id=reserva.id,
                motivo=PenalizacionMotivo.RENOVACION_IMPAGA,
            )
            penalizacion.created_at = datetime.combine(
                reserva.fecha, time(12, 0), tzinfo=timezone.utc
            )
            db.session.add(penalizacion)
            # La clase impaga queda cancelada, igual que _penalizar_renovaciones_pasadas.
            reserva.motivo_cancelacion = MotivoCancelacion.CANCELADO
            reserva.soft_delete()

        db.session.commit()
        print(
            "✅ 1 cliente penalizado cargado (penalizado@gmail.com, "
            f"{len(renovacion_impaga)} penalizaciones de junio)."
        )

        # --- Suspensión vigente: renovación impaga al deadline del 11 (demo) ---
        # "suspendido" tenía un abono pago en junio; la renovación de julio se
        # generó el 1 y nunca se pagó. La clase del 6 pasó impaga (+1
        # penalización) y el 11 se canceló el resto del abono y quedó la
        # suspensión abierta (fin_at NULL). En la UI: "Estado de cuenta:
        # Suspendida", sin descuento; se levanta con el primer pago de una
        # reserva nueva.
        grupo_origen_susp = uuid4().hex  # abono de junio pagado, origen de la renovación
        grupo_renovacion_susp = uuid4().hex
        clases_julio = [
            date(2026, 7, 6),
            date(2026, 7, 13),
            date(2026, 7, 20),
            date(2026, 7, 27),
        ]

        renovacion_susp = [
            Reserva(
                user_id=users["suspendido"].id,
                turno_id=turno_lunes_futbol.id,
                fecha=fecha,
                tipo=ReservaTipo.MENSUAL,
                grupo_id=grupo_renovacion_susp,
                renovacion_de_grupo_id=grupo_origen_susp,
            )
            for fecha in clases_julio
        ]
        db.session.add_all(renovacion_susp)
        db.session.commit()

        deadline_11 = datetime.combine(
            date(2026, 7, 11), time(3, 0), tzinfo=timezone.utc
        )  # 00:00 AR del 11

        # Solo la clase del 6 pasó impaga antes del deadline: es la única que
        # penaliza; las futuras se cancelan sin penalización (la sanción ahí es
        # la suspensión misma).
        primera = renovacion_susp[0]
        penalizacion_susp = Penalizacion(
            user_id=users["suspendido"].id,
            reserva_id=primera.id,
            motivo=PenalizacionMotivo.RENOVACION_IMPAGA,
        )
        penalizacion_susp.created_at = deadline_11
        db.session.add(penalizacion_susp)

        for reserva in renovacion_susp:
            reserva.motivo_cancelacion = MotivoCancelacion.CANCELADO
            reserva.soft_delete()

        suspension = Suspension(
            user_id=users["suspendido"].id, grupo_id=grupo_renovacion_susp
        )
        suspension.inicio_at = deadline_11
        db.session.add(suspension)
        db.session.commit()
        print("✅ 1 cliente suspendido cargado (suspendido@gmail.com).")

        print("🌱 Seed completado.")
