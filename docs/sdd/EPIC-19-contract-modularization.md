# Contract Modularization

## Problema que resuelve

`contracts/CarPass.sol` concentra responsabilidades que ya pertenecen a
dominios distintos: identidad ERC-721, VIN, roles, historial tecnico,
transferencias owner-only, revocacion trazable y sello de calidad. El contrato
funciona, pero es mas dificil de explicar, auditar y extender porque todo vive
en un solo archivo.

este modulo modulariza el contrato sin cambiar el comportamiento externo.

## Alcance

- Mantener un solo contrato final desplegable: `CarPass`.
- Separar responsabilidades en contratos abstractos internos bajo `contracts/core/`.
- Preservar la ABI publica actual para no romper frontend ni scripts.
- Preservar eventos, errores, roles, reglas de rechazo y storage efectivo.
- Mantener el deploy actual apuntando a `contracts/CarPass.sol`.

No incluye:

- Nuevas reglas de negocio.
- Nuevos roles.
- Nuevos eventos.
- Deploy Sepolia.
- Cambios frontend.
- Tests nuevos.

## Arquitectura

```text
contracts/
  CarPass.sol
  core/
    CarPassTypes.sol
    CarPassErrors.sol
    CarPassStorage.sol
    CarPassRoles.sol
    CarPassVehicleRegistry.sol
    CarPassHistory.sol
    CarPassSeal.sol
    CarPassTransfers.sol
```

`CarPass.sol` compone los modulos y sigue heredando `ERC721`.

`CarPassStorage.sol` centraliza los mappings compartidos para evitar duplicar
estado entre modulos.

Los modulos que necesitan primitivas ERC-721 usan hooks internos abstractos:

- `_carPassOwnerOf(tokenId)`
- `_carPassSafeMint(to, tokenId)`
- `_carPassTransfer(from, to, tokenId)`
- `_carPassSafeTransfer(from, to, tokenId, data)`

El contrato final implementa esos hooks usando OpenZeppelin ERC-721.

## Interfaces publicas

La ABI publica esperada se mantiene equivalente:

- `registrarVehiculo`
- `agregarService`
- `agregarSiniestro`
- `agregarVTV`
- `getVehiculoInfo`
- `getHistorialService`
- `getHistorialSiniestros`
- `getHistorialVTV`
- `getSelloEstado`
- `getSelloCalidad`
- `calcularSello`
- `vinToTokenId`
- `revokeRole`
- `estaRevocado`
- `transferFrom`
- `safeTransferFrom`
- funciones heredadas de ERC-721 y AccessControl

## Roles autorizados

- `REGISTRADOR_ROLE`: `registrarVehiculo`.
- `MECANICO_ROLE`: `agregarService`.
- `ASEGURADORA_ROLE`: `agregarSiniestro`.
- `INSPECTOR_VTV_ROLE`: `agregarVTV`.
- `DEFAULT_ADMIN_ROLE`: administracion de roles heredada y `revokeRole`.

## Eventos emitidos

Se preservan:

- `VehicleMinted`
- `ServiceAgregado`
- `SiniestroAgregado`
- `VTVAgregada`
- `SelloActualizado`
- `WalletRevocada`
- eventos heredados de ERC-721 y AccessControl

## Errores esperados

Se preservan:

- `VehiculoYaRegistrado`
- `VehiculoNoEncontrado`
- `VinInvalido`
- `KilometrajeNoMonotonico`
- `TransferenciaSoloPropietario`
- errores heredados de ERC-721 y AccessControl

## Casos felices y rechazos

Casos felices:

- Registrar un vehiculo con VIN valido.
- Cargar service con kilometraje creciente.
- Cargar siniestro desde aseguradora.
- Cargar VTV desde inspector.
- Consultar historial y sello por `tokenId`.
- Transferir NFT desde el propietario.
- Revocar rol y conservar trazabilidad.

Rechazos:

- VIN invalido.
- VIN duplicado.
- Token inexistente.
- Kilometraje menor o igual al ultimo registrado.
- Wallet sin rol para mutar historial.
- Transferencia iniciada por no propietario.

## Impacto en frontend y ABI

No se espera cambio funcional de ABI. Como el orden interno del ABI generado
puede variar por herencia, si la compilacion actualiza artifacts se debe correr
`npm run export:frontend` antes de depender de un nuevo deploy.

No se modifica ninguna pantalla ni hook frontend.

## Riesgos de seguridad o privacidad

- El VIN y los hitos siguen siendo datos publicos on-chain.
- Las escrituras siguen protegidas por `AccessControl`.
- Los hooks ERC-721 internos deben preservar exactamente las llamadas de
  OpenZeppelin para no debilitar mint o transferencias.
- No se agregan llamadas externas nuevas.

## Comandos de verificacion

```bash
npm run compile
npm audit --audit-level=high
```

No se ejecutan validaciones frontend por restriccion del repo.
