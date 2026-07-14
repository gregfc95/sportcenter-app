# Estándar de comentarios

Cómo escribir comentarios y docstrings en todo el código (Python y JavaScript).
Este archivo es el *porqué*; `python-style.md`, `javascript-style.md` y
`no-slop.md` tienen el formato por lenguaje y los patrones a evitar.

**Los comentarios, docstrings y JSDoc se escriben en español**, como todo el
código existente.

## Principio central: explicar el *porqué*, no el *qué*

El código ya muestra lo que hace. Un comentario se gana su lugar solo si aporta
lo que el código no puede: la razón, la restricción, el trade-off o una
consecuencia no obvia. Si un comentario narra la línea siguiente, borralo.

```python
# Malo — repite el código
CANCELACION_VENTANA_MENSUAL = timedelta(hours=48)  # ventana de 48 horas

# Bueno — la regla de negocio que el código no puede mostrar
# Una clase de un abono mensual se cancela con beneficio (reembolso o crédito a
# favor, a elección del cliente) solo con más de 48 h de anticipación.
CANCELACION_VENTANA_MENSUAL = timedelta(hours=48)
```

## Reglas

1. **No duplicar el código.** Un comentario que parafrasea la línea de abajo es
   ruido, y queda obsoleto apenas el código cambia. Si hace falta un comentario
   para entender un nombre, renombrá la cosa.

2. **Un comentario no arregla código confuso.** Antes de explicar con un
   comentario: un nombre más claro, una función más chica o una constante con
   nombre. Si la lógica es difícil de resumir, la señal es refactorizar, no
   anotar.

3. **Explicar lo no obvio.** Comentá reglas de negocio, casos borde, supuestos,
   workarounds y código poco idiomático — todo lo que un lector competente no
   pueda inferir del código solo (ej.: las ventanas de cancelación, el manejo
   de hora de pared argentina en `reserva_service.py`).

4. **Dejar registro del código sorprendente.** Al arreglar un bug o rodear una
   rareza, explicá por qué existe esa línea rara para que nadie la "limpie" y
   reintroduzca el problema.

5. **Linkear el contexto externo.** Citá la fuente del código copiado y linkeá
   la spec o doc externa donde aclare la intención, ubicado donde el lector lo
   va a necesitar.

6. **Mantener los comentarios verdaderos.** Un comentario desactualizado es
   peor que ninguno porque engaña. Actualizalo en el mismo cambio que el código
   que describe.

## No hacer

- **Nada de comentarios changelog o de estado** — ni `# Agregado para X`, ni
  `// Cambiado 2026-05-…`, ni `# NUEVO`. El changelog es el control de versiones.
- **Nada de código comentado.** Borralo; git lo recuerda.
- **Nada de `TODO` como placeholder.** Implementalo, creá el ticket o no lo
  agregues (ver `no-slop.md`).
- **Ningún comentario cuyo único fin sea silenciar al linter.** Arreglá el
  problema de fondo; si la supresión es genuinamente necesaria, explicá por qué.

## Mecánica

- Breve: ~una oración inline; dos o tres para una función o clase.
- Voz activa, oraciones completas, buena ortografía.
- Los comentarios inline arrancan al menos dos espacios después del código.
- Igualar la densidad y el estilo de comentarios del archivo.
- Prefijar notas críticas de seguridad con `SECURITY:` para poder grepearlas.

## Docstrings

Reservar docstrings para la superficie pública (servicios, modelos, rutas) y
para funciones no triviales. Formato del proyecto: línea de resumen y, si hace
falta, un párrafo explicativo — **sin** secciones Args/Returns (ver
`fechas_mensuales` en `backend/app/services/reserva_service.py` como modelo).
No agregar docstrings a código trivial o no modificado para rellenar.
