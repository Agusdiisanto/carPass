# Feed de actividad on-chain (estilo Etherscan)

## Problema que resuelve

Las operaciones CarPass (alta, roles, transferencias, wallet) solo muestran un `status-bar` textual sin enlace a Sepolia ni historial. El usuario necesita ver el impacto en red como en Etherscan: método, tx hash, contrato y estado.

## Alcance

- Store de actividades por wallet (`sessionStorage` + memoria).
- Registro automático en cada tx de `useCarPass` (hash, bloque, tipo).
- Eventos de wallet: conexión, desconexión, cambio de red.
- Hidratación inicial desde logs del contrato CarPass (mints, transfers NFT, roles).
- UI: feed responsive + avisos de operación con icono y link a explorer.
- Link a wallet y contrato en `RuntimeStrip`.

No incluye: API key de Etherscan, historial ETH nativo fuera del contrato CarPass.

## Tipos de actividad

| kind | Icono / label |
|------|----------------|
| wallet_connect | Wallet conectada |
| wallet_disconnect | Wallet desconectada |
| network_warn | Red incorrecta |
| mint_vehicle | Alta vehículo (contrato) |
| transfer_nft | Transfer NFT |
| service | Service on-chain |
| siniestro | Siniestro |
| vtv | VTV |
| grant_role | Rol asignado |
| revoke_role | Rol revocado |
| tx_failed | Error de transacción |

## Criterios de aceptación

- Tras registrar vehículo aparece entrada con link a tx en Sepolia Etherscan.
- Feed visible con wallet conectada; colapsable en mobile.
- Al reconectar wallet se hidratan últimas interacciones con CarPass.
- `OperationNotice` reemplaza mensajes planos en formularios operativos.

## Impacto en ABI

Ninguno.
