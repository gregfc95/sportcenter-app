import atexit
import logging
import os
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from .services.lista_espera_service import AR_TZ, ListaEsperaService
from .services.mensualidad_service import MensualidadService

logger = logging.getLogger(__name__)


def init_scheduler(app) -> None:
    """Arranca los jobs de fondo: barrido de ofertas y reglas mensuales.

    El reloader de `flask run --debug` levanta dos procesos; solo el hijo real
    (WERKZEUG_RUN_MAIN=true) corre el scheduler, para no duplicar los jobs. En
    tests no arranca (el barrido se prueba llamando a los servicios directo).
    """
    if app.testing:
        return
    if app.debug and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        return

    scheduler = BackgroundScheduler(timezone="UTC")

    def _barrido_lista_espera():
        with app.app_context():
            try:
                ListaEsperaService().expirar_ofertas()
            except Exception:
                logger.exception("Falló el barrido de la lista de espera")

    def _mensualidades_diarias():
        with app.app_context():
            try:
                service = MensualidadService()
                # El orden importa el 1 y el 11: primero se penaliza/aplica el
                # deadline, después se generan las renovaciones del mes nuevo.
                service.procesar_vencimientos()
                service.generar_renovaciones()
            except Exception:
                logger.exception("Falló el job diario de mensualidades")

    def _recordatorio_renovaciones():
        with app.app_context():
            try:
                MensualidadService().recordar_renovaciones_impagas()
            except Exception:
                logger.exception("Falló el recordatorio de renovaciones")

    scheduler.add_job(
        _barrido_lista_espera,
        "interval",
        seconds=60,
        id="lista_espera_expirar",
    )
    # Reglas de mensualidades a la medianoche AR. next_run_time=ahora hace de
    # catch-up: si el contenedor estuvo caído el 1 o el 11, la lógica
    # (idempotente y fechada en `hoy`) se pone al día en el primer arranque.
    scheduler.add_job(
        _mensualidades_diarias,
        CronTrigger(hour=0, minute=5, timezone=AR_TZ),
        id="mensualidades_diarias",
        next_run_time=datetime.now(timezone.utc),
    )
    # Recordatorio de pago el día 10 (un día antes del deadline del 11). Sin
    # catch-up (next_run_time): perder un recordatorio no es crítico —el
    # enforcement del 11 sí recupera días caídos—; `coalesce` evita doble envío.
    scheduler.add_job(
        _recordatorio_renovaciones,
        CronTrigger(day=10, hour=9, minute=0, timezone=AR_TZ),
        id="recordatorio_renovaciones",
    )

    scheduler.start()
    atexit.register(lambda: scheduler.shutdown(wait=False))
    logger.info("Scheduler iniciado (lista de espera + mensualidades)")
