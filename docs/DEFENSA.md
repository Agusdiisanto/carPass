# CarPass - Guia de defensa

## Resumen

CarPass es un pasaporte vehicular on-chain. Cada vehiculo se registra como NFT ERC-721 asociado a un VIN y conserva historial tecnico append-only: services, VTV, siniestros y transferencias owner-only. El contrato valida reglas de consistencia y calcula un sello de calidad consultable publicamente.

## Que demuestra el contrato

- VIN unico por `tokenId = keccak256(vin)`.
- Roles con `AccessControl`: admin, registrador, mecanico, aseguradora e inspector VTV.
- Services con kilometraje estrictamente creciente.
- Autoria on-chain por `msg.sender`.
- Revocacion de wallets sin borrar historial previo.
- Sello de calidad:
  - `ACTIVO`: VTV vigente, service al dia y sin bloqueantes.
  - `VENCIDO`: faltan condiciones, por ejemplo sin VTV o VTV con observaciones.
  - `REVOCADO`: VTV rechazada o siniestro grave sin reparar.

## Comandos de verificacion

```bash
npm run compile
npm run test:contracts
npm run export:frontend
npm audit --audit-level=high
```

Antes de desplegar:

```bash
npm run deploy:check
```

Deploy y seed, con `.env` local configurado:

```bash
npm run deploy:sepolia
npm run export:frontend
npm run seed:sepolia
```

## VINs demo

| VIN | Vehiculo | Sello esperado | Motivo |
| --- | --- | --- | --- |
| `1HGBH41JXMN109186` | Honda Civic 2022 | ACTIVO | Services + VTV aprobada vigente |
| `3FADP4EJ8FM123456` | Ford Focus 2020 | VENCIDO | Sin VTV registrada |
| `1G1BE5SM1H7123456` | Chevrolet Cruze 2019 | VENCIDO | VTV con observaciones |
| `2T1BURHE0JC043821` | Toyota Corolla 2021 | REVOCADO | Siniestro grave sin reparar |
| `8A1FB1AB2JT123456` | Renault Logan 2018 | REVOCADO | VTV rechazada |
| `WAUZZZ8V5KA123456` | Volkswagen Amarok 2021 | ACTIVO | Transferida, motor y capot reemplazados, 3 services |
| `9BWZZZ377VT004251` | Volkswagen Vento 2017 | ACTIVO | Transferido, puerta/caja reemplazadas, 4 services |
| `JHMFA16586S012345` | Peugeot 208 2020 | VENCIDO | Transferido, baul reemplazado, VTV con observaciones |

## Rechazos para mostrar

- Cargar service con km menor o igual al ultimo registrado.
- Registrar dos veces el mismo VIN.
- Cargar service desde una wallet sin `MECANICO_ROLE`.
- Transferir un NFT desde una wallet que no es propietaria.
- Revocar un taller y mostrar que el historial previo sigue intacto.

## Estado de Epic 08

El flujo de deploy esta preparado. Para cerrar el despliegue real se necesita `.env` local con:

- `SEPOLIA_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- fondos Sepolia para el deployer

El repositorio no debe versionar secretos.
