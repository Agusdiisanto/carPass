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
npm run export:frontend
npm run seed:sepolia
npm run sync:public-snapshot
```

El deploy escribe `deployments/sepolia/CarPass.json` con address, chain id,
hash de transaccion y bloque. El export copia la address y ABI al frontend en:

- `frontend/src/contracts/carpassAbi.ts`
- `frontend/src/contracts/carpassDeployment.ts`

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

Deployment actual: `0xAfBcC113fB1305efEAf9D8DA26f499dC0b589e15`, enlazado a
`CarPass` `0x0b6115F7a462DAcf74B9aE4B68Cb9934Ba1DBe7D`.

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
