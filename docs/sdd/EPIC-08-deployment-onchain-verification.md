# Deployment & On-chain Verification

## Problema que resuelve

CarPass necesita una direccion de contrato estable en Sepolia y un ABI versionado para que la DApp consuma el contrato sin duplicar ni desincronizar interfaces.

## Alcance

- Mantener un script de deploy reproducible.
- Documentar la direccion desplegada en un artefacto versionable cuando exista deploy final.
- Exportar ABI para frontend desde el artifact de Hardhat.
- Permitir seed de datos demo usando la misma fuente de address/ABI.
- Dejar la verificacion en explorador preparada/documentada.

No incluye QR ni IPFS.

## Entradas

- `SEPOLIA_RPC_URL`: RPC Sepolia.
- `DEPLOYER_PRIVATE_KEY`: clave privada local del deployer.
- `ETHERSCAN_API_KEY`: clave opcional para verificacion.
- Artifact Hardhat: `artifacts/contracts/CarPass.sol/CarPass.json`.

## Salidas

- Contrato `CarPass` desplegado en Sepolia.
- Address impresa por consola.
- Archivo de despliegue por red cuando el deploy se ejecute.
- ABI consumible por frontend.

## Interfaces y artefactos

- `scripts/deploy.ts`: despliega `CarPass`.
- `scripts/check-deploy-readiness.mjs`: valida Node, artifact, env, red Sepolia y balance sin imprimir secretos.
- `scripts/seed.ts`: carga datos demo idempotentes contra una address configurada.
- `scripts/export-frontend-artifacts.mjs`: exporta ABI/address para frontend.
- `frontend/src/contracts/carpassAbi.ts`: ABI versionado para la DApp.
- `frontend/src/contracts/carpassDeployment.ts`: address fallback versionada si existe deploy confirmado.

## Reglas

- Ninguna clave privada puede commitearse.
- La address puede estar versionada porque es publica.
- El seed no debe tener una address hardcodeada: debe leer env o artefacto.
- El frontend puede aceptar override por `VITE_CARPASS_CONTRACT_ADDRESS` para pruebas.

## Criterios de aceptacion

- `npm run deploy:sepolia` despliega y muestra address.
- `npm run deploy:check` informa si faltan credenciales, artifact o fondos antes de desplegar.
- El deploy deja una fuente clara para configurar frontend.
- `npm run export:frontend` actualiza ABI/address del frontend desde artifacts.
- El seed usa la misma address configurada que el deploy documentado.
- El seed puede re-ejecutarse para demo sin duplicar VINs ni hitos ya cargados.
- README explica el flujo.

## Verificacion

```bash
npm run compile
npm run deploy:check
npm run export:frontend
```

Si se hace deploy real:

```bash
npm run deploy:sepolia
npm run seed:sepolia
```

## Riesgos

- Hardhat 3 requiere Node `22.13.0+`.
- Sepolia y Etherscan requieren red externa y credenciales locales.
- El ABI manual en frontend debe evitarse para que no diverja del contrato.

## Actualizacion (2026-07-03): verificacion real en Etherscan

`npm run verify:deployment` (`scripts/verify-deployment.mjs`) nunca verifico
source code en Etherscan: solo confirma bytecode presente, chain id y sello
esperado de los VINs demo. Se agrego `@nomicfoundation/hardhat-verify` como
plugin (`hardhat.config.ts`, seccion `verify.etherscan.apiKey` via
`configVariable("ETHERSCAN_API_KEY")`) y el script `npm run verify:etherscan
-- <address>` que corre `hardhat verify --network sepolia`. Sigue
requiriendo `ETHERSCAN_API_KEY` y una address ya desplegada; no se ejecuto
en esta pasada porque no hay deploy final confirmado.
