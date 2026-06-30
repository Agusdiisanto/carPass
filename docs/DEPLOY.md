# Deploy Sepolia

Guia operativa para dejar CarPass listo para demo publica.

## Precondiciones

- Node `22.13.0+`.
- `.env` local creado desde `.env.example`.
- Wallet deployer con fondos Sepolia.
- `SEPOLIA_RPC_URL` configurado.
- `DEPLOYER_PRIVATE_KEY` configurado sin comillas.
- `ETHERSCAN_API_KEY` opcional si se verifica en explorador.

No commitear `.env` ni claves privadas.

## Flujo

```bash
npm run compile
npm run deploy:check
npm run deploy:sepolia
npm run deploy:vehicleparts:sepolia
npm run deploy:oracle:sepolia
npm run export:frontend
npm run registry:sepolia
npm run health:sepolia
npm run seed:sepolia
npm run seed:oracle:sepolia
npm run sync:public-snapshot
```

Los deploys escriben archivos bajo `deployments/sepolia/` con address, chain
id, hash de transaccion y bloque. `registry:sepolia` consolida esas addresses
y hashes de ABI en `deployments/sepolia/registry.json`. El export copia la
address y ABI al frontend en:

- `frontend/src/contracts/carpassAbi.ts`
- `frontend/src/contracts/carpassDeployment.ts`
- `frontend/src/contracts/vehiclePartsAbi.ts`
- `frontend/src/contracts/vehiclePartsDeployment.ts`
- `frontend/src/contracts/carPassOracleAbi.ts`
- `frontend/src/contracts/carPassOracleDeployment.ts`

## Verificacion en Etherscan

`npm run verify:deployment` (ver arriba) **no verifica el source code en
Etherscan**: solo chequea que haya bytecode en la address, el chain id y que
los VINs demo devuelvan el sello esperado. Para verificar el source real:

```bash
npm run verify:etherscan -- <address desplegada>
```

Requiere `ETHERSCAN_API_KEY` en `.env` (ver `.env.example`). `CarPass` no
tiene argumentos de constructor. `VehicleParts` si (`address carPass_`):

```bash
npm run verify:etherscan -- <address de VehicleParts> <address de CarPass>
```

`CarPassOracle` tambien tiene constructor con `address carPass_`:

```bash
npm run verify:etherscan -- <address de CarPassOracle> <address de CarPass>
```

## VehicleParts (autopartes grabadas)

`VehicleParts` (EPIC-22) es un contrato independiente que se vincula al
`CarPass` ya desplegado por direccion inmutable. No requiere redeploy de
`CarPass`:

```bash
npm run deploy:vehicleparts:sepolia
npm run export:frontend
```

El deploy escribe `deployments/sepolia/VehicleParts.json` (address, chain id,
`carPassAddress` enlazado, hash de transaccion y bloque). El export copia ABI
y address al frontend en:

- `frontend/src/contracts/vehiclePartsAbi.ts`
- `frontend/src/contracts/vehiclePartsDeployment.ts`

`VehicleParts` reusa `REGISTRADOR_ROLE` y `MECANICO_ROLE` de `CarPass` via
`hasRole` cross-contract: no hace falta otorgar roles nuevos, solo los mismos
que ya administra `CarPass`.

Deployment actual: `0x3d13C42B7a7755Df78189553f2a194c9D289B446`, enlazado a
`CarPass` `0x0b6115F7a462DAcf74B9aE4B68Cb9934Ba1DBe7D`.

> Nota: el primer deploy (`0xAfBcC113...`) quedo inutilizable porque dependia
> de una funcion `vehiculoExiste` agregada solo en el codigo fuente de
> `CarPass`, nunca desplegada on-chain. Se redeployo `VehicleParts` validando
> existencia con `ownerOf` (ya presente en el `CarPass` real), sin tocar
> `CarPass`. Ver `docs/sdd/EPIC-22-token-autopartes-grabadas.md`.

## CarPassOracle (oraculos / atestaciones externas)

`CarPassOracle` (EPIC-26) es un contrato independiente para registrar evidencia
externa vinculada al NFT vehicular. Sirve para demostrar integracion tipo
oracle sin depender de un proveedor externo complejo para la defensa.

```bash
npm run deploy:oracle:sepolia
npm run export:frontend
npm run registry:sepolia
npm run health:sepolia
```

El deploy escribe `deployments/sepolia/CarPassOracle.json` y actualiza
`deployments/sepolia/registry.json`. El contrato:

- valida que el vehiculo exista en `CarPass`;
- permite atestaciones directas de wallets con `ORACLE_ROLE`;
- permite atestaciones firmadas EIP-712 con nonce y deadline;
- permite lotes Merkle para agrupar muchas evidencias en un solo root, calculado
  on-chain a partir de las hojas recibidas (el oracle no puede declarar un root
  arbitrario sin evidencia detras);
- expone `verifyEvidenceLeaf` (lectura publica, sin gas) para probar que una
  evidencia puntual pertenece a un batch publicado;
- guarda hashes (`externalIdHash`, `payloadHash`) en vez de documentos o datos
  privados completos;
- permite marcar atestaciones como `VIGENTE`, `OBSERVADA` o `REVOCADA`; solo el
  admin o el oracle original mientras siga activo (rol no revocado) puede hacerlo.

El deployer recibe `DEFAULT_ADMIN_ROLE` y `ORACLE_ROLE` inicialmente. Para dar de
alta una wallet real de VTV, taller o aseguradora como oracle:

```bash
ORACLE_TARGET_WALLET=0x... npm run grant:oracle:sepolia
```

Para cargar evidencia demo:

```bash
npm run seed:oracle:sepolia
```

Ese seed es idempotente. Agrega atestaciones demo de VTV/autopartes y un batch
Merkle de autopartes (mandando las hojas, no un root pre-calculado) para que el
panel publico muestre evidencia externa real. El seed tambien genera una proof de
ejemplo y llama `verifyEvidenceLeaf` on-chain para confirmar que la verificacion
funciona antes de darlo por terminado.

## Health operativo

`npm run health:sepolia` revisa integracion blockchain sin usar claves privadas:

- RPC y chain id Sepolia;
- bytecode de `CarPass`, `VehicleParts` y `CarPassOracle`;
- enlace `VehicleParts -> CarPass`;
- enlace `CarPassOracle -> CarPass`;
- rol oracle inicial del deployer si el artifact de deploy lo informa;
- existencia y hashes de ABI en `deployments/sepolia/registry.json`.

Este comando no reemplaza `npm run verify:deployment`: `health:sepolia` valida
infraestructura y registry; `verify:deployment` valida datos demo, sellos y
autopartes.

## Datos demo

`npm run seed:sepolia` es idempotente para la demo: si los VINs, hitos o autopartes ya
existen, los saltea en vez de duplicarlos o fallar por kilometraje.

El seed registra las **6 autopartes grabadas** de cada VIN demo cuando `VehicleParts`
esta desplegado y configurado (`deployments/sepolia/VehicleParts.json` o
`VEHICLEPARTS_CONTRACT_ADDRESS`).

Para defensa online, despues del seed correr:

```bash
npm run defense:prepare
```

Ese comando verifica readiness, valida CarPass + VehicleParts + VINs demo con
autopartes (`npm run verify:deployment`) y exporta
`frontend/src/data/publicVehicleSnapshot.json`. La DApp consulta Sepolia live
primero; si el RPC falla, usa ese snapshot y marca la fuente como
`Snapshot Sepolia`.

VINs esperados:

| VIN | Vehiculo | Sello esperado |
| --- | --- | --- |
| `1HGBH41JXMN109186` | Honda Civic 2022 | ACTIVO |
| `3FADP4EJ8FM123456` | Ford Focus 2020 | VENCIDO, sin VTV |
| `1G1BE5SM1H7123456` | Chevrolet Cruze 2019 | VENCIDO, VTV con observaciones |
| `2T1BURHE0JC043821` | Toyota Corolla 2021 | REVOCADO, siniestro grave |
| `8A1FB1AB2JT123456` | Renault Logan 2018 | REVOCADO, VTV rechazada |

## Problemas comunes

- `deploy:check` falla por `.env`: crear `.env` desde `.env.example`.
- `deploy:check` falla por balance: fondear el deployer con Sepolia ETH.
- Frontend apunta a otra address: correr `npm run export:frontend` o revisar
  `VITE_CARPASS_CONTRACT_ADDRESS` en `frontend/.env`.
- Snapshot desactualizado: correr `npm run sync:public-snapshot` o el flujo
  completo `npm run defense:prepare`.
- Autopartes demo faltantes: correr `npm run seed:sepolia` (idempotente; solo
  completa las partes pendientes).
- Garaje lento al detectar transferencias: setear `VITE_CARPASS_DEPLOY_BLOCK` en
  `frontend/.env` con el bloque de deploy de CarPass o VehicleParts.
- Seed falla por permisos: verificar que el deployer tenga admin y que el seed
  pueda otorgarse roles demo.
