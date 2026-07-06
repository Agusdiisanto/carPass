# Wallet & Sepolia Gate

## Problema que resuelve

Las operaciones de escritura de CarPass requieren wallet conectada y red Sepolia.
Hoy la UI muestra avisos de red, pero la proteccion debe estar centralizada para
que cualquier accion operativa siga el mismo flujo: conectar wallet, cambiar o
agregar Sepolia y recien despues firmar.

## Alcance

- Centralizar la preparacion de wallet en `frontend/src/lib/sepoliaGate.ts`.
- Reutilizar esa preparacion desde `useWallet` y desde todas las escrituras de
  `useCarPass`.
- Mantener la consulta publica por VIN sin wallet.
- Mantener el contrato y ABI sin cambios.
- Mejorar mensajes cuando el usuario cancela, falta wallet o la red no queda en
  Sepolia.

No incluye:

- Cambios de contrato.
- Nuevas wallets externas a MetaMask o MetaMask Connect.
- Build/lint/frontend validation.

## Interfaces frontend

### `ensureSepoliaWalletReady(provider?)`

Entrada:

- Provider activo opcional. Si no se pasa, usa `getActiveEthereum()`.

Salida:

- `address`: cuenta conectada.
- `chainId`: chain id decimal.

Comportamiento:

1. Verifica provider activo.
2. Pide cuentas con `eth_requestAccounts`.
3. Lee `eth_chainId`.
4. Si no es Sepolia, ejecuta `wallet_switchEthereumChain`.
5. Si Sepolia no existe, ejecuta `wallet_addEthereumChain`.
6. Vuelve a leer `eth_chainId`.
7. Si no queda en Sepolia, rechaza con mensaje de dominio.

### `switchActiveProviderToSepolia(provider?)`

Hace solo el cambio/agregado de red, sin asumir que se completara una escritura.

## Reglas

- Lecturas publicas no pasan por el gate.
- Escrituras pasan por el gate antes de crear signer.
- El gate no guarda claves ni expone secretos.
- Si el usuario cancela MetaMask, la app muestra un mensaje accionable y no
  intenta firmar.

## Impacto en ABI

No cambia ABI.

## Criterios de aceptacion

- Cualquier alta, service, siniestro, VTV, rol o transferencia prepara Sepolia
  antes de firmar.
- Si la wallet esta en otra red, MetaMask pide cambiar a Sepolia.
- Si Sepolia no esta agregada, MetaMask pide agregarla.
- Si el usuario cancela, se muestra un error claro.
- Consulta publica por VIN sigue funcionando sin wallet.

## Verificacion

No ejecutar validaciones frontend por regla del repo. Validaciones permitidas:

```bash
npm run compile
npm audit --audit-level=high
git diff --check
```
