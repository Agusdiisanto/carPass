# SDD - EPIC-09: Frontend Scaffold & Wallet Connection

## Problema que resuelve

La DApp necesita conectar MetaMask, validar Sepolia y enviar al usuario a la vista que corresponde segun sus roles on-chain.

## Alcance

- App React + Vite + TypeScript.
- Conexion/desconexion logica de wallet.
- Validacion de chain id Sepolia.
- Deteccion de roles desde contrato.
- Ruteo por rol.
- Consulta publica disponible sin enviar transacciones.

No incluye QR.

## Entradas

- `VITE_SEPOLIA_CHAIN_ID`.
- `VITE_CARPASS_CONTRACT_ADDRESS`, opcional si existe address versionada.
- Wallet inyectada en `window.ethereum`.
- ABI/address exportados por EPIC-08.

## Salidas

- Estado de wallet conectada.
- Estado de red correcta/incorrecta.
- Rol detectado: admin, registrador, mecanico, aseguradora, inspector o none.
- Vista renderizada segun rol.

## Reglas

- Solo las vistas de escritura requieren wallet.
- La consulta publica por VIN puede verse sin rol.
- Si la wallet no tiene rol, se muestra una pantalla de acceso restringido.
- Si la red no es Sepolia, no se deben iniciar escrituras.

## Criterios de aceptacion

- Un visitante sin wallet puede usar consulta publica por VIN.
- Una wallet admin entra al panel admin.
- Una wallet con rol especifico entra a su panel operativo.
- Una wallet sin rol ve `NoRoleView`.
- La UI avisa cuando la red no es Sepolia.

## Impacto en ABI

No cambia ABI. Consume:

- `DEFAULT_ADMIN_ROLE`
- `REGISTRADOR_ROLE`
- `MECANICO_ROLE`
- `ASEGURADORA_ROLE`
- `INSPECTOR_VTV_ROLE`
- `hasRole`

## Verificacion

No ejecutar validaciones frontend salvo pedido explicito del usuario.

## Riesgos

- Cambios de cuenta/red en vivo pueden requerir listeners adicionales.
- El fallback de address versionada debe mantenerse alineado con deploy.
