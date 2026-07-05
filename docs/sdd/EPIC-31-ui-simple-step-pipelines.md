# SDD - EPIC-31: UI simple con pasos y spinners para altas y reemplazos

## Problema que resuelve

CarPass lo usa gente que no necesariamente entiende blockchain. Dos flujos disparan una o mas transacciones on-chain encadenadas y hoy solo muestran un boton cuyo texto cambia ("Registrando...", "Reemplazando..."):

- Alta de vehiculo (`RegistradorView`): `registrarVehiculo` y despues `registrarPartes`.
- Carga de service con cambio de autoparte (`TallerView`): `agregarService` y, si corresponde, `reemplazarParte`.

Sin una guia visual, el usuario no entiende que son dos operaciones separadas ni por que tarda. El objetivo es mostrar cada flujo como una lista de pasos simple (timeline), con un spinner real en el paso que esta corriendo, sin exponer conceptos tecnicos (gas, bloques, tx hash) en el paso mismo.

## Alcance

- Generalizar el componente ya existente `VehicleRegistrationPipeline` (creado para `RegistradorView`, sin usar todavia en otras vistas) a un componente reutilizable `StepPipeline`, ya que el mismo patron de pasos aplica a mas de un flujo.
- Agregar un spinner visual real (CSS, sin dependencias nuevas) para el paso en estado `active`. Hoy `active` y `pending` se ven iguales (ambos muestran el numero de paso).
- Reusar `StepPipeline` en `TallerView` para el flujo de "Registrar service" + "Reemplazar autoparte" cuando el mecanico tilda el checkbox de cambio de autoparte.
- No se toca ningun contrato ni ABI. No se agregan transacciones nuevas: se visualizan las mismas dos llamadas que ya hace `TallerView.handleService` (`agregarService` y `reemplazarParte`).
- No se agregan tests.

## Interfaces publicas

Sin cambios de contrato. Cambios de frontend:

- `frontend/src/components/StepPipeline.tsx` (reemplaza a `VehicleRegistrationPipeline.tsx`): exporta `StepPipeline` y el tipo `PipelineStep` (`label`, `description`, `status: 'pending' | 'active' | 'done' | 'error'`).
- `RegistradorView.tsx`: actualiza el import al nuevo nombre, sin cambios de comportamiento.
- `TallerView.tsx`: agrega estado local `serviceStatus` / `parteStatus` (mismos cuatro valores) para pintar el pipeline de dos pasos (el segundo paso solo aparece si el checkbox de cambio de autoparte esta o estuvo tildado en el envio en curso).

## Roles autorizados

Sin cambios: `REGISTRADOR_ROLE` para alta de vehiculo/autopartes, `MECANICO_ROLE` para service y reemplazo de autoparte.

## Eventos emitidos

Sin cambios: `VehicleMinted`, `PartesRegistradas`, `ServiceAgregado`, `ParteReemplazada`.

## Errores esperados

Sin cambios de contrato. En UI, si `agregarService` falla el paso "Registrar service" queda en `error` y no se intenta `reemplazarParte` (ya es el comportamiento actual). Si `reemplazarParte` falla despues de un service exitoso, el paso "Registrar service" queda `done` y "Reemplazar autoparte" queda `error`; el service no se revierte.

## Casos felices y rechazos / Criterios de aceptacion

- `RegistradorView` sigue mostrando el pipeline de 3 pasos (Crear vehiculo, Crear autopartes, Ver vehiculo) y ahora el paso `active` muestra un spinner en vez del numero de paso.
- `TallerView` muestra un pipeline de 1 paso ("Registrar service") cuando el checkbox de cambio de autoparte esta destildado, y de 2 pasos cuando esta tildado.
- Al enviar el formulario de service con el checkbox tildado, el paso 1 pasa a `active` con spinner, luego `done`; el paso 2 pasa a `active` con spinner apenas termina el paso 1, luego `done`.
- Si el checkbox se destilda automaticamente al terminar (comportamiento ya existente), el paso 2 se mantiene visible en `done` hasta el proximo envio.
- El pipeline no reemplaza los avisos de transaccion existentes (`CarPassOperationNotice`, `VehiclePartsOperationNotice`); conviven, el pipeline es la guia simple y el aviso de operacion sigue siendo la fuente de detalle (tx hash, bloque).

## Impacto en ABI y frontend

- Sin impacto en ABI ni en contratos.
- Archivos nuevos/renombrados: `frontend/src/components/StepPipeline.tsx` (renombra `VehicleRegistrationPipeline.tsx`, que no estaba commiteado todavia).
- `frontend/src/App.css`: renombra las clases `.reg-pipeline*` a `.step-pipeline*` y agrega la animacion del spinner.
- `RegistradorView.tsx` y `TallerView.tsx` actualizan imports/uso.

## Verificacion

No agregar tests. No ejecutar validaciones frontend (build/lint/e2e) salvo pedido explicito del usuario.

```bash
npm run compile
```

## Riesgos de seguridad o privacidad

Ninguno: es un cambio puramente visual/presentacional en frontend, no cambia logica de negocio, roles ni datos on-chain.
