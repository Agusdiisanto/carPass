# Vehicle NFT ERC-721

## Problema que resuelve

Las concesionarias necesitan emitir el pasaporte digital de un vehiculo como NFT ERC-721 para iniciar su historial on-chain. Cada pasaporte queda vinculado a un VIN unico y puede transferirse junto con la compraventa del vehiculo, sin reemplazar la titularidad legal.

## Interfaces publicas

### `registrarVehiculo(VehiculoInfo calldata info, address propietarioInicial) returns (uint256 tokenId)`

Mintea el NFT del vehiculo y guarda sus datos tecnicos on-chain. Solo puede llamarla una cuenta con `REGISTRADOR_ROLE`.

Reglas:

- `info.vin` debe tener 17 bytes.
- `tokenId` se calcula como `uint256(keccak256(abi.encodePacked(info.vin)))`.
- El mismo VIN no puede registrarse dos veces.
- El propietario inicial se recibe separado de `VehiculoInfo` para mantener ownership ERC-721 como fuente de verdad.

### `vinToTokenId(string calldata vin) returns (uint256)`

Convierte un VIN en el `tokenId` deterministico correspondiente, sin consultar estado.

### `transferFrom(address from, address to, uint256 tokenId)`

Transfiere el pasaporte digital usando el evento estandar ERC-721 `Transfer`. A diferencia del ERC-721 abierto, en CarPass la llamada debe iniciarla el propietario directo (`msg.sender == from`).

### `safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data)`

Transferencia segura owner-only. El overload ERC-721 de 3 parametros delega en este flujo.

## Roles autorizados

- `REGISTRADOR_ROLE`: concesionarias/importadores autorizados para mintear pasaportes.
- Propietario ERC-721: unica cuenta autorizada a iniciar la transferencia de su token.

## Eventos emitidos

```solidity
event VehicleMinted(
    uint256 indexed tokenId,
    string vin,
    address indexed owner,
    address indexed registrar
);
```

Tambien se usa el evento estandar ERC-721:

```solidity
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
```

No se agrega `VehicleTransferred`: la transferencia se indexa exclusivamente por `Transfer` para evitar duplicar informacion y ahorrar gas.

## Errores esperados

- `VinInvalido()`: VIN con longitud distinta de 17 bytes.
- `VehiculoYaRegistrado(string vin)`: VIN ya minteado.
- `TransferenciaSoloPropietario(address caller, uint256 tokenId)`: intento de transferencia iniciado por una cuenta distinta de `from`.
- `AccessControlUnauthorizedAccount`: alta de vehiculo desde cuenta sin `REGISTRADOR_ROLE`.
- Errores ERC-721 de OpenZeppelin para receiver invalido, token inexistente o owner incorrecto.

## Criterios de aceptacion

- Una cuenta con `REGISTRADOR_ROLE` registra un VIN valido y se mintea el NFT al propietario inicial.
- El mint emite `VehicleMinted` y `Transfer(address(0), propietarioInicial, tokenId)`.
- Un VIN duplicado revierte con `VehiculoYaRegistrado`.
- Un VIN con longitud distinta de 17 bytes revierte con `VinInvalido`.
- Una cuenta sin `REGISTRADOR_ROLE` no puede mintear.
- El propietario puede transferir con `transferFrom` o `safeTransferFrom`.
- Un aprobado u operador no propietario no puede transferir.
- La transferencia emite solo el evento ERC-721 `Transfer`.

## Impacto en ABI y frontend futuro

- La DApp debe escuchar `VehicleMinted` para altas de vehiculo.
- La DApp debe usar `ownerOf(tokenId)` como fuente de propietario actual.
- La DApp no debe asumir que approvals ERC-721 habilitan transferencias del pasaporte: solo el propietario directo puede iniciar la transferencia.

## Verificacion

No agregar tests. No ejecutar validaciones frontend.

```bash
npm run compile
```

## Riesgos y decisiones

- El VIN queda publico on-chain por diseno de trazabilidad.
- La validacion de VIN solo controla longitud para mantener eficiencia; normalizacion o validacion ISO caracter por caracter queda fuera de EPIC-03.
- La transferencia del NFT acompana la compraventa, pero no reemplaza titularidad legal ni documentacion registral fuera de la blockchain.
