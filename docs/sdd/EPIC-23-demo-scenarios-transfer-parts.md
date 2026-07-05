# SDD - EPIC-23: Escenarios Demo con Transferencias y Autopartes

## Problema que resuelve

La demo actual cubre sellos de calidad y autopartes iniciales, pero no deja casos listos para mostrar tres flujos operativos juntos: vehiculos con multiples services, autopartes reemplazadas y cambio de dueno del NFT.

## Alcance

- Ampliar `scripts/seed.ts` con VINs demo adicionales.
- Mantener el seed idempotente: re-ejecutar el comando no duplica services, siniestros, VTV, reemplazos ni transferencias.
- Usar el contrato `VehicleParts` ya desplegado cuando este configurado.
- Transferir los vehiculos nuevos a wallets publicas de ejemplo para que el historial ERC-721 muestre cambio de dueno.
- No cambiar ABI de `CarPass` ni `VehicleParts`.
- No agregar tests.

## Interfaces publicas

- `npm run seed:sepolia`: registra o completa los datos demo contra Sepolia.
- `npm run sync:public-snapshot`: incluye los VINs nuevos en el snapshot publico.

## Datos agregados

| VIN | Vehiculo | Services | Autopartes reemplazadas | Transferencia demo | Sello esperado |
| --- | --- | ---: | --- | --- | --- |
| `WAUZZZ8V5KA123456` | Volkswagen Amarok 2021 | 3 | Motor, capot | `0x1111111111111111111111111111111111111111` | ACTIVO |
| `9BWZZZ377VT004251` | Volkswagen Vento 2017 | 4 | Puerta delantera derecha, caja | `0x2222222222222222222222222222222222222222` | ACTIVO |
| `JHMFA16586S012345` | Peugeot 208 2020 | 3 | Baul | `0x3333333333333333333333333333333333333333` | VENCIDO |

## Roles autorizados

- `REGISTRADOR_ROLE`: alta del vehiculo y alta inicial de autopartes.
- `MECANICO_ROLE`: carga de services y reemplazo de autopartes.
- `ASEGURADORA_ROLE`: siniestros reparados de contexto.
- `INSPECTOR_VTV_ROLE`: VTV.
- Propietario ERC-721 actual: transferencia del pasaporte. En el seed, el deployer solo transfiere si todavia es el owner.

## Eventos esperados

- `VehicleMinted` y `Transfer` al registrar cada vehiculo.
- `PartesRegistradas` al grabar las seis autopartes iniciales.
- `ServiceAgregado` por cada service.
- `SiniestroAgregado` para los casos con reparacion.
- `ParteReemplazada` por cada autoparte cambiada.
- `VTVAgregada` para el estado del sello.
- `Transfer` al transferir el NFT a la wallet demo.

## Reglas y rechazos

- Si el VIN ya existe, el seed reutiliza el `tokenId`.
- Si un service ya existe por kilometraje y tipo, se saltea.
- Si el ultimo kilometraje on-chain es mayor o igual al nuevo, se saltea para no romper la regla monotonicamente creciente.
- Si una autoparte nueva ya figura en el historial de ese tipo, se saltea.
- Si el vehiculo ya fue transferido a la wallet demo, se saltea.
- Si el owner actual no es el deployer ni la wallet demo esperada, el seed no fuerza la transferencia.

## Impacto en frontend y ABI

- No hay cambios de ABI.
- El catalogo demo y el snapshot publico pueden listar los VINs nuevos para consulta por VIN.
- Las lecturas live siguen dependiendo de Sepolia; el snapshot se actualiza con `npm run sync:public-snapshot`.

## Verificacion

```bash
npm run compile
npm run seed:sepolia
```

No ejecutar validaciones frontend salvo pedido explicito.

## Riesgos de seguridad o privacidad

- Las wallets de destino son direcciones publicas de ejemplo y no deben recibir fondos.
- VIN, services, siniestros, VTV, transferencias y numeros de autopartes quedan publicos on-chain por diseno.
- No se agregan ni se versionan secretos.
