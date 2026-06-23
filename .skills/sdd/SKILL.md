# SDD Skill - CarPass

Use esta skill cuando una epica de CarPass pase de backlog a implementacion.

## Flujo

1. Leer `AGENTS.md`, `.agents/context-map.md` y `.agents/backlog.md`.
2. Escribir spec en `docs/sdd/EPIC-XX-slug.md`.
3. Definir entradas, salidas, eventos, errores, roles y criterios de aceptacion.
4. Definir el ABI esperado si toca contrato.
5. Implementar contra la spec, manteniendo el alcance chico.
6. Actualizar README o docs si cambia el setup.

## Checklist de spec

- Problema que resuelve.
- Interfaces publicas.
- Roles autorizados.
- Eventos emitidos.
- Errores esperados.
- Casos felices y rechazos.
- Comandos de verificacion.
- Impacto en frontend y ABI.
- Riesgos de seguridad o privacidad.

## Regla principal

Si una pantalla depende del contrato, primero estabilizar ABI y eventos.

## Restriccion del usuario

- No agregar, adjuntar ni sugerir tests.
- No pedir ni ejecutar validaciones frontend.
- No usar build, lint, e2e, Playwright ni audit de `frontend` como cierre de tarea salvo pedido explicito del usuario.
- Si se hacen commits, no incluir `Co-authored-by:` ni ningun trailer de coautoria.
