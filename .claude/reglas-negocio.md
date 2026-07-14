# Reglas de negocio — Reservas, Lista de Espera y Suscripción Mensual

Referencia de las reglas de dominio de reservas: cupos, lista de espera,
suscripción mensual (renovación garantizada, penalizaciones, suspensión,
descuento) y notificaciones. Es el *qué* y el *por qué*; el código las
implementa en los archivos citados. Consultá esto antes de tocar
`reserva_service`, `pago_service`, `lista_espera_service`, `mensualidad_service`
o el scheduler.

Zona horaria: la `hora` del turno es **hora de pared de Argentina**
(`AR_TZ = America/Argentina/Buenos_Aires`), no UTC. Todo "hoy"/"ahora" y las
ventanas se anclan ahí.

## Reservas y cupo

- **Eventual**: una clase (turno + fecha). Se paga una **seña del 50%** del
  precio de la actividad; el resto se abona en el mostrador. `PagoEstado`:
  `senado` (seña) → `pagado` (saldo).
- **Mensual (abono)**: todas las clases del mismo día de semana desde la fecha
  elegida hasta fin de mes (≤5). Es **todo-o-nada** y se agrupa por `grupo_id`
  (`uuid4().hex` por compra). Se paga **100% por adelantado, sin seña**: un
  `Pago` PAGADO por clase.
- **Cupo por sesión** (turno + fecha). Cuenta las reservas con
  `estado_espera IS NULL` (normales) **o** `ofertado` (ver lista de espera). Las
  filas `esperando`/`vencido` no ocupan cupo.
  Archivos: `reserva_service._validar_cupo_disponible`,
  `turno_service.cantidad_reservas`.
- **Cancelación por el cliente** (`reserva_routes.cancelar_mi_reserva`, no toca
  Mercado Pago):
  - Eventual: con >24 h (`CANCELACION_VENTANA`) es reembolsable; dentro de la
    ventana se retiene (`cancelado`).
  - Mensual (una clase): con >48 h (`CANCELACION_VENTANA_MENSUAL`) el cliente
    elige reembolso o **crédito a favor**; dentro de la ventana se retiene.
  - La ventana decide **solo** reembolso/crédito, **no** la penalización (ver
    penalizaciones).
- **Baja del centro** (eliminar actividad/turno/fecha): siempre reembolsa y
  **nunca penaliza** (`pago_service.cancelar_reserva_por_baja`).
- **Crédito a favor**: divisible, vive 30 días, atado a la actividad. Se
  autoaplica en cada checkout de esa actividad (el que vence antes primero); si
  cubre el total se saltea Mercado Pago. Cancelar una reserva pagada con crédito
  restaura el crédito a su origen (misma vigencia), no lo reembolsa.
  Archivo: `credito_service.py`.

## Lista de espera

Cuando un turno está lleno, el cliente se anota en la lista en vez de quedar
afuera. Las entradas son **filas `Reserva`** con `estado_espera`
(`esperando` → `ofertado` → `vencido`) y `oferta_expira_at`. No se cobra nada
hasta que se libera un lugar y el cliente paga.
Archivo principal: `lista_espera_service.py`.

- **Anotarse** (`reserva_service.unirse_lista_espera`, `POST
  /api/reservas/lista-espera`): eventual = una fila; mensual = el grupo completo
  del mes, y se permite anotarse si **al menos una** fecha del mes está llena.
  Solo se puede si el turno **no** es reservable directo (lleno o con demanda).
- **Prioridad estricta**: los abonos **mensuales tienen prioridad** sobre los
  eventuales; dentro del mismo tipo, FIFO por `created_at`. Si el primero de la
  cola es un mensual que **todavía no entra completo** (alguna de sus clases
  sigue llena), el lugar **espera** y nadie de más abajo lo toma.
- **Oferta**: al liberarse un lugar se ofrece al primero (`promover`), que pasa
  a `ofertado` y **retiene el cupo**. Ventana = **1 h**
  (`OFERTA_VENTANA`), **nunca más allá del inicio del turno**. Se avisa por
  email (`send_lista_espera_email`). El fallo de mail no cancela la oferta.
- **Vencimiento** (barrido cada 60 s, `expirar_ofertas`): oferta sin pagar →
  `vencido`, el lugar pasa al siguiente (`promover(motivo="vencimiento")`). El
  cliente **conserva su posición**.
- **Re-armado**: los `vencido` vuelven a ser elegibles solo ante una
  **cancelación real** (`promover(motivo="cancelacion")`), no en la cascada de
  un vencimiento (evita ping-pong de re-ofertas).
- **Los walk-ins no saltan la cola**: si hay demanda `esperando` para una fecha,
  reservar directo devuelve **409** (`CupoLlenoError`), aunque por prioridad
  estricta figure cupo libre. Si toda la demanda está `vencido`, se vuelve a
  permitir reservar directo.
- **Salir de la lista**: sin penalización (reusa `POST /api/pagos/cancelar`).
- **Pagar la oferta**: al registrarse el pago se limpia el estado de espera
  (`confirmar_lugar`), **incluso si la oferta ya venció** (se completa igual: la
  plata ya se cobró y no hay reembolsos del lado de Mercado Pago).
- Las filas en espera **no** aparecen en asistencias, sesiones de staff ni
  historial, y **no** cuentan como demanda una vez que su fecha/hora pasó.

## Suscripción mensual

Archivo principal: `mensualidad_service.py`. Constantes: `RENOVACION_DIA_LIMITE = 11`,
`DESCUENTO_FIDELIDAD = 0.20`, `PENALIZACIONES_MAX = 3`.

### Renovación garantizada

- Quien pagó un abono en el mes M tiene el lugar **garantizado** en M+1. El día 1
  (job diario) se **auto-generan** las reservas de la renovación (mismo turno,
  todas las clases del mes nuevo, `renovacion_de_grupo_id` = grupo de origen),
  en estado **pendiente de pago**. Consumen cupo y aparecen en Mis Turnos con
  "Pagá antes del 11".
- La renovación **ignora cupo, demanda y conflicto de horario** al crearse (la
  garantía manda; puede haber sobrecupo transitorio).
- **Deadline: 11 a las 00:00 (AR)**. Impaga a esa fecha → se cancela el resto del
  abono y el cliente queda **suspendido**.
- Idempotente y con catch-up: no genera después del 11; no regenera un origen ya
  renovado (aunque se haya declinado); si corre atrasado arma solo las clases que
  quedan del mes. No genera para usuarios suspendidos.

### Penalizaciones (`penalizaciones`, ledger inmutable)

- **+1 por cada clase mensual cancelada por el cliente**, pague o no, dentro o
  fuera de la ventana de 48 h. Incluye: cancelar una clase de un abono pagado,
  declinar/abandonar un abono impago, y **el auto-cancelado tras un fallo de
  pago en Mercado Pago**.
- **+1 por cada clase de renovación que pasa impaga** (días 1–10): se penaliza y
  se cancela esa clase (el pago tardío cubre solo las que quedan).
- **No penaliza**: salir de la lista de espera, bajas del centro, expulsiones por
  suspensión, y la cancelación del 11 de las clases **futuras** de la renovación
  (la suspensión es la sanción ahí; solo penalizan las fechas pasadas impagas).
- Conteo **por mes calendario (AR)**; "se resetea el 1" es una consulta por mes,
  no un job. Motivos: `cancelacion_clase`, `renovacion_impaga`. Restricción única
  `(reserva_id, motivo)` → idempotente ante re-runs.

### Suspensión (`suspensiones`, intervalos `inicio_at`/`fin_at`)

- La dispara **una renovación impaga en el deadline del 11**.
- Al suspender: se **cancelan todas las filas en lista de espera** del cliente
  (sin penalización; una oferta liberada promueve al siguiente).
- Mientras está suspendido: **puede** reservar y anotarse en listas; **no** se le
  generan renovaciones ni le aplica el descuento.
- Se **levanta** con el **primer pago de una reserva nueva** (seña, mensualidad o
  cobro de mostrador). Esa compra que reactiva **paga sin descuento**.

### Descuento de fidelidad (20% sobre mensualidades)

- Aplica **salvo** que el cliente: esté suspendido ahora, haya estado suspendido
  en algún momento del **mes anterior**, o acumule **3+ penalizaciones** en el
  mes anterior **o** en el corriente.
- Es el modelo de precio del abono: un cliente sin historial (incluido el
  primero) **sí** lo recibe; se pierde por mala conducta.
- Se aplica por clase y cuantizado (`monto_clase_mensualidad`) para que el total
  de la preferencia, los `Pago` y la card coincidan exacto. Compone con crédito:
  **primero el descuento**, el crédito sobre el monto ya descontado.
- Edge aceptado: si una penalización cae entre el checkout y el registro del
  pago, el monto podría diferir (mismo modelo de confianza que el flujo sin
  webhook de MP). No hay snapshot.

## Notificaciones (solo email, vía Mailtrap)

No hay centro de notificaciones in-app; todo es email transaccional.

- **"Se liberó un lugar"**: automático al ofrecer una vacante de la lista
  (`ListaEsperaService._ofertar`).
- **Recordatorio de renovación**: el **día 10 a las 09:00 (AR)** se avisa a los
  dueños de renovaciones impagas del mes (`recordar_renovaciones_impagas`), un
  email por abono. Sin catch-up (perder un recordatorio no es crítico; el
  enforcement del 11 sí recupera días caídos).
- `notificacion_routes.py` / `notificacion_service.py` es un disparador **manual
  de demo** del mismo email de cupo; no persiste nada.

## Scheduler (`backend/app/scheduler.py`, APScheduler in-process)

Arranca solo en el proceso real (no en el reloader padre de `flask --debug`) y
nunca en tests.

- `lista_espera_expirar` — cada 60 s → `ListaEsperaService.expirar_ofertas`.
- `mensualidades_diarias` — 00:05 AR, **con catch-up** (`next_run_time`) →
  `procesar_vencimientos()` (penaliza pasadas / aplica deadline del 11) y luego
  `generar_renovaciones()` (genera el mes nuevo). El orden importa el 1 y el 11.
- `recordatorio_renovaciones` — día 10, 09:00 AR, **sin catch-up**.

## Modelos y datos clave

- `Reserva` (`models/reserva.py`): `estado_espera` (`EstadoEspera`),
  `oferta_expira_at`, `renovacion_de_grupo_id`, `grupo_id`. Estado de pago se
  deriva de los `Pago`; activa/cancelada es soft-delete (`deleted_at`).
- `Penalizacion` (`models/penalizacion.py`), `Suspension` (`models/suspension.py`),
  `Credito`/`CreditoConsumo` (`models/credito.py`).
- Serialización de la card (`reserva_routes.list_mis_reservas`): `estado`
  incluye `"en_espera"`; objetos `espera`, `renovacion`, `descuento`.
- Estado del cliente para la UI: `MensualidadService.estado_cliente` →
  `GET /api/mensualidad/estado` (suspendido, penalizaciones del mes, descuento).

## Tests

`backend/tests/services/test_lista_espera_service.py`,
`test_mensualidad_service.py`, `test_pago_service.py`, y
`backend/tests/routes/test_lista_espera_routes.py`,
`test_mensualidad_routes.py`. Usan `freezegun` para las reglas dependientes del
tiempo (ventanas, deadline del 11, conteo mensual, recordatorio del 10).
