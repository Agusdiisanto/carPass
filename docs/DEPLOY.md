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
```

El deploy escribe `deployments/sepolia/CarPass.json` con address, chain id,
hash de transaccion y bloque. El export copia la address y ABI al frontend en:

- `frontend/src/contracts/carpassAbi.ts`
- `frontend/src/contracts/carpassDeployment.ts`

## Datos demo

`npm run seed:sepolia` es idempotente para la demo: si los VINs o hitos ya
existen, los saltea en vez de duplicarlos o fallar por kilometraje.

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
- Seed falla por permisos: verificar que el deployer tenga admin y que el seed
  pueda otorgarse roles demo.
