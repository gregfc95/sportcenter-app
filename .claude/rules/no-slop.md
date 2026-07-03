---
paths:
  - "backend/**/*.py"
  - "frontend/src/**/*.{js,jsx}"
---

# Evitar slop de IA

Al escribir o editar código, NO introducir estos patrones:

## Comentarios

- Nada de comentarios obvios/redundantes (`// incrementa el contador`, `# recorre los items`)
- Nada de comentarios changelog (`// Agregado para la feature X`)
- Nada de placeholders `// TODO: implementar` (implementalo o no lo agregues)
- Igualar el estilo y la densidad de comentarios del código circundante

## Código defensivo

- Nada de null checks innecesarios cuando los callers son confiables
- Nada de try/catch que solo re-lanzan o loguean
- Nada de validaciones que duplican la validación de capas anteriores (los
  schemas de Marshmallow ya validan la entrada de las rutas)
- Confiar en las APIs internas y en los inputs ya validados

## Supresiones de linter

- Nada de `// eslint-disable` sin una explicación al lado (ESLint es el único
  linter del proyecto)
- No agregar comentarios de supresión para herramientas que este proyecto no
  corre (`@ts-ignore`, `# noqa`, `# pylint: disable`, `# type: ignore`)

## Consistencia de estilo

- Seguir los patrones existentes del archivo
- No agregar docstrings/comentarios a código que no se modificó
- No "mejorar" código circundante ajeno al cambio
- Mantener la organización de imports del archivo

## Python

- Imports al inicio del archivo (nada de imports inline)
- Nada de `pass` en un `except` sin un comentario que lo justifique

## React

- Nada de `console.log` en el código final
- Nada de JSX comentado
- No introducir TypeScript: el frontend es JS/JSX plano

Ante la duda de si algo es slop, mirá el código cercano en busca de patrones
similares. Si la duda persiste, mantenelo mínimo.
