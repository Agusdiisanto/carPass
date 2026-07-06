# Optimizacion de Gas en Contratos

## Problema que resuelve

`VehicleParts` registra seis autopartes en una sola transaccion y guarda una
estructura completa por token de parte. Ese flujo es el mas caro del dominio
nuevo porque combina seis mints ERC-721 con escrituras de storage por cada
pieza. Se necesita reducir gas sin cambiar permisos, reglas de negocio ni la
ABI publica que consume el frontend.

## Alcance

- Optimizar storage interno de `VehicleParts.sol`.
- Mantener la ABI publica de consultas: `Parte` sigue exponiendo
  `vehicleTokenId`, `tipo`, `numeroGrabado`, `timestamp`, `instalador` y
  `reemplazada` en el mismo orden.
- Mantener eventos, errores, roles y reglas de rechazo existentes.
- Mantener `CarPass.sol` sin cambios funcionales en esta pasada.
- Documentar que los ahorros on-chain requieren redeploy de `VehicleParts`.

No incluye:

- Tests nuevos.
- Validaciones frontend.
- Cambio de modelo de negocio a autopartes no ERC-721.
- Migracion automatica de datos Sepolia previos.

## Interfaces publicas

No se agregan funciones publicas.

Se preservan:

- `registrarPartes(uint256,string[6])`
- `reemplazarParte(uint256,TipoParte,string)`
- `getParteActual(uint256,TipoParte)`
- `getPartesVehiculo(uint256)`
- `getHistorialParte(uint256,TipoParte)`
- `transferFrom` y `safeTransferFrom` revertiendo con
  `TransferenciaNoPermitida`.

## Roles autorizados

No cambian:

- `REGISTRADOR_ROLE`: alta inicial de seis autopartes.
- `MECANICO_ROLE`: reemplazo de una autoparte.

Los roles se siguen leyendo desde `CarPass` con `hasRole`.

## Eventos emitidos

No cambian:

- `PartesRegistradas`
- `ParteReemplazada`

## Errores esperados

No cambian:

- `VehiculoInexistente`
- `PartesYaRegistradas`
- `PartesNoRegistradas`
- `NumeroGrabadoInvalido`
- `RolInsuficiente`
- `TransferenciaNoPermitida`

## Diseno de optimizacion

`VehicleParts` separa la estructura publica `Parte` de una estructura interna
mas compacta:

- La estructura publica queda igual para no romper ABI/frontend.
- La estructura interna no guarda `vehicleTokenId`, porque se deriva desde la
  consulta por vehiculo.
- `timestamp`, `instalador`, `tipo` y `reemplazada` se ordenan para compartir
  menos slots de storage.
- Las consultas reconstruyen `Parte` en memoria antes de responder.

Este cambio reduce escrituras por instalacion/reemplazo de parte sin cambiar
la forma en que el frontend lee los datos.

## Criterios de aceptacion

- `npm run compile` pasa.
- `npm audit --audit-level=high` pasa o reporta un bloqueo externo exacto.
- La ABI generada conserva los metodos publicos esperados de `VehicleParts`.
- No se agregan tests ni validaciones frontend.
- La documentacion advierte que Sepolia necesita redeploy para reflejar el gas
  optimizado.

## Impacto en frontend y ABI

La ABI de lectura de `Parte` se mantiene estable. Si se recompilan artifacts,
se debe correr `npm run export:frontend` para mantener `frontend/src/contracts`
sincronizado, pero no se requiere cambio manual en hooks o componentes.

## Riesgos de seguridad o privacidad

- No se cambian permisos ni roles.
- El numero de grabado sigue siendo publico on-chain.
- No se agregan llamadas externas nuevas.
- Los tokens de autoparte siguen siendo no transferibles.

## Verificacion

```bash
npm run compile
npm audit --audit-level=high
```

No ejecutar validaciones frontend salvo pedido explicito.
