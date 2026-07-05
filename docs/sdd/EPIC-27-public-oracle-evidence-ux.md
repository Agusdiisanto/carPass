# EPIC-27 - Public Oracle Evidence UX

## Problema

`CarPassOracle` agrega una capa blockchain de atestaciones externas, pero si esa evidencia no aparece en el pasaporte publico queda escondida en el contrato. Para la defensa y para el usuario, la consulta por VIN debe mostrar si existen evidencias oracle asociadas al vehiculo y explicar claramente que tipo de oracle sirve para CarPass.

## Alcance

- Lectura publica walletless de `CarPassOracle`.
- Panel de evidencia dentro de `PublicView`.
- Estado degradado si `CarPassOracle` no esta desplegado/configurado.
- Estado vacio si esta desplegado pero el vehiculo no tiene atestaciones.
- Listado de atestaciones con tipo, estado, oracle, fecha, vigencia y hashes.

Fuera de alcance:

- Formularios para crear atestaciones.
- Cambios de contrato.
- Deploy real en Sepolia.
- Tests nuevos o validaciones frontend.

## Fuente de datos

El frontend usa:

- `VITE_CARPASS_ORACLE_CONTRACT_ADDRESS`, si esta configurada.
- `frontend/src/contracts/carPassOracleDeployment.ts`, si existe address exportada.
- `getVehicleAttestationIds(tokenId)`.
- `attestations(attestationId)`.

## UX

El panel se muestra en resultados de consulta publica:

- **No configurado**: "Oracle listo localmente, pendiente de deploy Sepolia".
- **Cargando**: "Leyendo evidencias oracle".
- **Sin evidencias**: "Sin atestaciones externas para este VIN".
- **Con evidencias**: lista de atestaciones.

Cada atestacion muestra:

- Tipo: VTV, service, siniestro, kilometraje, autopartes o documento.
- Estado: vigente, observada o revocada.
- Wallet oracle con link a Etherscan.
- Fecha reportada.
- Vigencia, si aplica.
- Hash externo e hash de payload acortados.

## Criterio de oracle util

El oracle que sirve para CarPass no es un feed de precio. Sirve una fuente externa del dominio:

- planta VTV;
- taller;
- aseguradora;
- autoridad registral;
- proveedor de autopartes grabadas;
- auditor documental.

Esas fuentes aportan evidencia externa al historial on-chain sin subir documentos completos.

## Seguridad

- La lectura no pide wallet.
- No se exponen claves ni secretos.
- La UI trata al oracle como evidencia complementaria, no como reemplazo del historial principal.
- Si el oracle no esta desplegado, el pasaporte sigue funcionando.

## Verificacion permitida

- `npm run compile`
- `npm run export:frontend`
- `git diff --check`

No correr build, lint, e2e, Playwright ni audit del paquete frontend salvo pedido explicito.
