# SDD - EPIC-25: Security Hardening de Integracion Blockchain

## Problema que resuelve

CarPass ya protege las escrituras con roles y Sepolia gate, pero quedan bordes
de hardening antes de una entrega mas solida: `VehicleParts` hace `_safeMint`
en loops, la UI permite seleccionar `DEFAULT_ADMIN_ROLE`, y el deploy estatico
no declara headers de seguridad.

## Alcance

- Agregar proteccion anti-reentrancy a las escrituras de `VehicleParts`.
- Mantener la ABI funcional de `VehicleParts` y sus reglas de negocio.
- Configurar headers de seguridad en `vercel.json`.
- Quitar `DEFAULT_ADMIN_ROLE` del selector operativo de roles y mostrar una nota
  de custodia admin.

No incluye:

- Migracion a multisig.
- Tests nuevos.
- Validaciones frontend.
- Cambio de roles on-chain.
- Deploy automatico.

## Interfaces publicas

No se agregan funciones nuevas.

Se preservan:

- `registrarPartes(uint256,string[6])`
- `reemplazarParte(uint256,TipoParte,string)`
- `grantRole(bytes32,address)` y `revokeRole(bytes32,address)` heredadas de
  `CarPass`.

## Roles autorizados

No cambian on-chain:

- `DEFAULT_ADMIN_ROLE` sigue existiendo en contrato.
- La UI deja de ofrecerlo como operacion normal para evitar grants accidentales
  de control total.

## Eventos emitidos

No cambian:

- `PartesRegistradas`
- `ParteReemplazada`
- `RoleGranted`
- `RoleRevoked`
- `WalletRevocada`

## Errores esperados

No cambian errores de dominio. `ReentrancyGuard` puede revertir una reentrada
con su error propio antes de mutar estado.

## Casos felices y rechazos

- Una concesionaria registra autopartes normalmente.
- Un taller reemplaza una parte normalmente.
- Si un receptor ERC-721 intenta reentrar durante `_safeMint`, la llamada
  reentrante revierte.
- Un admin puede gestionar roles operativos desde UI, pero no otorgar control
  total desde el panel.
- El deploy Vercel entrega CSP y headers basicos de hardening.

## Impacto en frontend y ABI

- El contrato cambia bytecode por heredar `ReentrancyGuard`, pero no cambia las
  funciones publicas consumidas por frontend.
- La UI de roles conserva Concesionaria, Taller, Aseguradora e Inspector VTV.
- `DEFAULT_ADMIN_ROLE` queda como operacion de custodia/manual documentada.

## Riesgos de seguridad o privacidad

- CSP debe permitir RPCs HTTPS/WSS, Wikimedia, fuentes e imagenes externas que
  la app ya usa.
- `frame-ancestors 'none'` evita embedding/clickjacking en produccion.
- Esto no reemplaza una multisig real para admin; solo reduce riesgo operativo
  desde UI.

## Verificacion

```bash
npm run compile
npm audit --audit-level=high
```

No ejecutar validaciones frontend salvo pedido explicito.
