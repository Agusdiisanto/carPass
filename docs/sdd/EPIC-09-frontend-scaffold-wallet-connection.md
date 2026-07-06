# Frontend Scaffold & Wallet Connection

## Problema que resuelve

La DApp necesita conectar MetaMask, validar Sepolia y enviar al usuario a la vista que corresponde segun sus roles on-chain. Ademas debe funcionar en tres contextos reales:

1. **Desktop con extension** — flujo clasico `window.ethereum`.
2. **Mobile / Safari sin extension** — deep link a MetaMask mobile (`metamask.app.link/dapp/...`).
3. **Desktop sin extension** — emparejamiento por QR con MetaMask mobile via MetaMask Connect (`@metamask/connect-evm`), sin instalar la extension.

## Alcance

- App React + Vite + TypeScript.
- Conexion/desconexion logica de wallet.
- Validacion de chain id Sepolia.
- Deteccion de roles desde contrato.
- Ruteo por rol.
- Consulta publica disponible sin enviar transacciones.
- Banner `MobileWalletHint` con modos segun dispositivo y disponibilidad de provider.
- Conexion desktop sin extension mediante QR (MetaMask Connect, headless).
- Deep link mobile para abrir CarPass en el navegador in-app de MetaMask.
- Persistencia de sesion MetaMask Connect entre recargas (manejada por la libreria).
- Handoff simple notebook ↔ celular via query params (`?vin=`, `?panel=operative`, `?w=`) — solo contexto de URL, no copia de sesion criptografica.

No incluye WalletConnect generico ni sync realtime cross-device.

## Entradas

- `VITE_SEPOLIA_CHAIN_ID` (default `11155111`).
- `VITE_SEPOLIA_RPC_URL` (opcional; fallback publico para lecturas y `supportedNetworks` de Connect).
- `VITE_CARPASS_CONTRACT_ADDRESS`, opcional si existe address versionada.
- `VITE_PUBLIC_APP_URL` — URL publica del deploy; requerida para deep links y QR companion desde `localhost`.
- `VITE_DEV_LAN_HOST` — IP LAN manual si la autodeteccion falla.
- Wallet inyectada en `window.ethereum` (extension), o sesion MetaMask Connect (QR mobile).
- ABI/address exportados por EPIC-08.

## Salidas

- Estado de wallet conectada (`address`, `chainId`, `connected`, `wrongNetwork`).
- Modo de conexion: `injected` | `mobile-deeplink` | `desktop-install`.
- Estado de emparejamiento QR: `pairingUri`, `connecting`, `connectError`.
- Rol detectado: admin, registrador, mecanico, aseguradora, inspector o none.
- Vista renderizada segun rol.
- Provider activo usable por `useCarPass` (extension o Connect).

## Modos de conexion

| Modo | Condicion | UX principal |
|------|-----------|--------------|
| `injected` | `window.ethereum` presente | Conectar desde topbar; sin banner hint |
| `mobile-deeplink` | Mobile o iOS sin extension | Banner "Abrir en MetaMask" → `metamask.app.link/dapp/...` |
| `desktop-install` | Desktop sin extension | Banner con pasos + QR; boton "Conectar con MetaMask mobile" |

Resolucion del modo en `getWalletConnectionMode()` (`ethereumProvider.ts`).

## Interfaces publicas (frontend)

### `useWallet()`

Expone:

- `connect()` — extension si existe; deep link en mobile; QR Connect en desktop sin extension.
- `disconnect()` — marca desconexion manual; revoca sesion Connect si aplica.
- `openInMetaMaskApp()` — deep link mobile.
- `openMetaMaskInstall()` — abre pagina de descarga de extension.
- `connectionMode`, `pairingUri`, `connecting`, `connectError`, `needsMobileWallet`.

### `getActiveEthereum()` (`ethereumProvider.ts`)

Devuelve provider inyectado o provider cacheado de MetaMask Connect. Usado por `useCarPass` para firmar transacciones.

### `metamaskConnect.ts`

- `createEVMClient` singleton con `ui.headless: true`, `ui.preferExtension: false`.
- `connectViaMetaMaskConnect({ onDisplayUri })` — emite URI para QR custom.
- `disconnectMetaMaskConnect()` — revoca sesion al desconectar.
- Redes soportadas: Sepolia (`VITE_SEPOLIA_CHAIN_ID`) + mainnet como bootstrap fallback requerido por Connect.

### `MobileWalletHint`

- Desktop: card con pasos, QR (`QrCodeImage`), botones primario/secundario.
- Mobile: CTA "Abrir en MetaMask"; copy especial para Safari iOS.

### Deep link mobile

- `buildMetaMaskDappLink()` / `openInMetaMaskBrowser()` — reescriben URL local a `VITE_PUBLIC_APP_URL` cuando la notebook corre en localhost.

## Reglas

- Solo las vistas de escritura requieren wallet.
- La consulta publica por VIN puede verse sin rol ni wallet.
- Si la wallet no tiene rol, se muestra `NoRoleView`.
- Si la red no es Sepolia, no se deben iniciar escrituras.
- El QR de emparejamiento Connect es **de un solo uso**; si expira o falla, el usuario debe regenerarlo.
- `localStorage.carpass_wallet_manual_disconnect` impide auto-reconexion hasta nuevo `connect()`.
- MetaMask Connect no reemplaza la extension cuando esta instalada: el modo `injected` tiene prioridad.

## Errores esperados

| Situacion | Comportamiento |
|-----------|----------------|
| Usuario rechaza conexion en mobile | `connectError` visible; `connecting` false |
| QR expirado | Regenerar con nuevo click en conectar |
| Desktop en localhost sin `VITE_PUBLIC_APP_URL` | Deep link companion puede fallar; documentado en EPIC-15 |
| Sin provider ni Connect disponible | Mensaje "MetaMask no detectado" |
| Red distinta de Sepolia post-conexion | `wrongNetwork` true; UI advierte |

## Criterios de aceptacion

- Un visitante sin wallet puede usar consulta publica por VIN.
- Una wallet admin entra al panel admin.
- Una wallet con rol especifico entra a su panel operativo.
- Una wallet sin rol ve `NoRoleView`.
- La UI avisa cuando la red no es Sepolia.
- **Desktop sin extension:** el banner muestra pasos y permite conectar escaneando QR con MetaMask mobile; la sesion queda activa en el navegador desktop.
- **Mobile Safari:** consulta publica sin wallet; operar requiere abrir en MetaMask mobile via deep link.
- **Desktop con extension:** flujo inyectado sin banner hint.
- Desconectar revoca sesion Connect cuando no hay extension inyectada.
- Tras conectar por QR, `useCarPass` puede firmar transacciones con el mismo provider activo.

## Dependencias

- `@metamask/connect-evm` — emparejamiento QR desktop ↔ MetaMask mobile (reemplazo oficial de `@metamask/sdk`).
- `qrcode` — render del URI en `QrCodeImage`.

## Impacto en ABI

No cambia ABI. Consume:

- `DEFAULT_ADMIN_ROLE`
- `REGISTRADOR_ROLE`
- `MECANICO_ROLE`
- `ASEGURADORA_ROLE`
- `INSPECTOR_VTV_ROLE`
- `hasRole`

## Archivos clave

- `frontend/src/hooks/useWallet.ts`
- `frontend/src/hooks/useCarPass.ts` — usa `getActiveEthereum()`
- `frontend/src/lib/ethereumProvider.ts` — modos, deep link, provider activo
- `frontend/src/lib/metamaskConnect.ts` — cliente Connect headless
- `frontend/src/lib/deviceProfile.ts` — deteccion mobile / Safari iOS
- `frontend/src/lib/publicAppUrl.ts` — URL publica para deep links
- `frontend/src/components/MobileWalletHint.tsx`
- `frontend/src/components/QrCodeImage.tsx`

## Verificacion

No ejecutar validaciones frontend salvo pedido explicito del usuario.

Smoke manual sugerido:

1. Desktop sin extension → conectar via QR → firmar una operacion de rol.
2. Mobile Safari → consulta VIN sin wallet → deep link a MetaMask.
3. Desktop con extension → conectar sin ver banner hint.
4. Desconectar y verificar que no auto-reconecta hasta nuevo click.

## Riesgos

- Cambios de cuenta/red en vivo pueden requerir listeners adicionales.
- El fallback de address versionada debe mantenerse alineado con deploy.
- MetaMask Connect agrega dependencias transitivas; auditar periodicamente con `npm audit`.
- QR desde `localhost` puede fallar entre dispositivos; usar `VITE_PUBLIC_APP_URL` o deploy publico.
- No existe copia de sesion MetaMask entre notebook y celular: solo misma cuenta + params de URL (ver EPIC-15).

## Relación con otros módulos

- **EPIC-15:** companion VIN scan y relay QR; comparte `VITE_PUBLIC_APP_URL` y flujo mobile.
- **EPIC-12:** QR publico de verificacion — fuera de alcance; distinto del QR de wallet Connect.
