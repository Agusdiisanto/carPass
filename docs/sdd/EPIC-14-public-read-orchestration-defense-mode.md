# Public Read Orchestration & Defense Mode

## Problema que resuelve

La consulta publica por VIN ya existe, pero hoy depende de lecturas directas al contrato en Sepolia. Para una defensa online esto es correcto conceptualmente, aunque fragil operativamente: si el RPC publico demora, la red esta intermitente, la address no esta configurada o el contrato no responde a tiempo, la demo parece rota aunque la fuente de verdad sea valida.

EPIC-14 agrega una capa de lectura publica orquestada para mantener la demo online, verificable y resiliente. La blockchain sigue siendo la fuente primaria de verdad, pero la DApp puede mostrar un snapshot sincronizado desde Sepolia cuando la lectura live no esta disponible.

## Objetivo

Permitir consultar VIN, datos del vehiculo, historial, propietario NFT y sello de calidad en una defensa online con tres garantias:

- Preferir siempre lectura live desde Sepolia.
- Degradar a un snapshot local generado desde el contrato real cuando falle la lectura live.
- Informar en UI la fuente del dato para no presentar un snapshot o demo como si fuera una lectura on-chain en tiempo real.

## Fuera de alcance

- No crear backend/indexador persistente.
- No agregar bases de datos.
- No agregar IPFS ni adjuntos.
- No cambiar el ABI del contrato.
- No agregar tests salvo pedido explicito del usuario en el turno actual.
- No ejecutar validaciones frontend salvo pedido explicito del usuario en el turno actual.

## Arquitectura propuesta

La lectura publica se mueve a una capa de dominio con fuentes intercambiables:

```text
PublicView
  -> usePublicVehicleLookup
    -> VehicleReadService
      -> OnChainVehicleSource
      -> SnapshotVehicleSource
      -> DemoVehicleSource
```

### VehicleReadService

Coordina la consulta por VIN. Su contrato publico debe devolver un resultado normalizado:

```ts
type VehicleReadSource = 'live' | 'snapshot' | 'demo'

type PublicVehicleRecord = {
  source: VehicleReadSource
  syncedAt: string | null
  tokenId: string
  info: VehiculoInfo
  services: RegistroService[]
  siniestros: RegistroSiniestro[]
  vtv: RegistroVTV[]
  sello: SelloCalidad
  ownerAddress: string
}
```

Regla de prioridad:

1. Buscar en `OnChainVehicleSource`.
2. Si falla por timeout, RPC, address no configurada o contrato no disponible, buscar en `SnapshotVehicleSource`.
3. Si no existe en snapshot y el VIN pertenece a la flota de defensa, buscar en `DemoVehicleSource`.
4. Si ninguna fuente responde, mostrar "Vehiculo no encontrado" o "Infraestructura no disponible" segun corresponda.

### OnChainVehicleSource

Usa la integracion actual con `ethers` y el contrato `CarPass`.

Responsabilidades:

- Resolver `tokenId` desde `vinToTokenId`.
- Leer `getVehiculoInfo`.
- Leer services, siniestros, VTV y sello.
- Leer propietario con `ownerOf`.
- Aplicar timeout corto configurable para defensa.

No debe escribir en blockchain ni requerir wallet.

### SnapshotVehicleSource

Lee un archivo versionado en el frontend, por ejemplo:

```text
frontend/src/data/publicVehicleSnapshot.json
```

El snapshot debe contener:

- `contractAddress`.
- `network`.
- `chainId`.
- `syncedAt`.
- `blockNumber` si esta disponible.
- Lista de VINs demo y sus historiales normalizados.

El snapshot no reemplaza la blockchain; es el ultimo estado conocido exportado desde Sepolia para sostener la demo si el RPC falla.

### DemoVehicleSource

Usa la flota demo ya existente como ultima capa de degradacion. Debe devolver una respuesta claramente marcada como `source: 'demo'`.

Esta fuente sirve para mostrar el flujo visual, pero no debe decir "verificado on-chain" si no hubo lectura live ni snapshot.

## Script de sincronizacion

Agregar un script raiz:

```bash
npm run sync:public-snapshot
```

El script debe:

1. Resolver la address como lo hacen los scripts actuales.
2. Leer la lista de VINs oficiales de defensa.
3. Consultar Sepolia usando el ABI actual.
4. Exportar el snapshot a `frontend/src/data/publicVehicleSnapshot.json`.
5. Fallar con mensajes claros si falta artifact, address o RPC.

Variables esperadas:

- `SEPOLIA_RPC_URL` o fallback publico si se decide mantenerlo.
- `CARPASS_CONTRACT_ADDRESS` o deployment versionado.

El script no debe requerir private key porque solo lee.

## Cambios en frontend

### PublicView

Debe dejar de consultar directamente `useCarPass` para lectura publica y pasar por `usePublicVehicleLookup`.

La vista debe mostrar:

- VIN consultado.
- Historial normalizado.
- Sello.
- Propietario NFT si esta disponible.
- Fuente del dato:
  - `Live Sepolia` cuando viene del contrato.
  - `Snapshot Sepolia` cuando viene del snapshot sincronizado.
  - `Demo local` cuando solo viene de datos demo.

### RuntimeStrip

Agregar un bloque o indicador de infraestructura publica:

- RPC live: disponible / lento / no disponible.
- Snapshot: fecha de ultima sincronizacion.
- Address del contrato.
- Red objetivo.

La UI debe ayudar durante la defensa a explicar que esta pasando sin abrir consola.

## Criterios de aceptacion

- La consulta publica intenta primero Sepolia live.
- Si Sepolia live falla, la consulta puede resolver VINs oficiales desde snapshot.
- Si snapshot no contiene el VIN, la demo local queda claramente marcada como demo.
- La UI muestra la fuente del dato en el resultado.
- La UI no afirma "verificado on-chain" para datos `demo`.
- No hay cambios de ABI.
- No se agregan dependencias de backend.
- El script de snapshot no requiere wallet ni private key.

## Manejo de errores

- VIN invalido: no consulta ninguna fuente.
- VIN no registrado: mensaje especifico de no encontrado.
- RPC caido o timeout: fallback a snapshot y aviso visible.
- Snapshot faltante o vacio: fallback a demo si aplica.
- Address invalida: no intentar live, usar snapshot/demo y mostrar advertencia.

## Seguridad y privacidad

- No se agregan secretos al repositorio.
- El snapshot solo contiene informacion publica ya expuesta por el contrato.
- El script de lectura no usa private key.
- La UI debe distinguir datos live de datos cacheados para evitar afirmaciones falsas durante la defensa.

## Impacto en ABI

No hay cambios de ABI. EPIC-14 consume las funciones publicas ya usadas por EPIC-10:

- `vinToTokenId`.
- `getVehiculoInfo`.
- `getHistorialService`.
- `getHistorialSiniestros`.
- `getHistorialVTV`.
- `getSelloCalidad`.
- `ownerOf`.

## Comandos de verificacion permitidos

No ejecutar validaciones frontend salvo pedido explicito del usuario.

Comandos permitidos para este modulo:

```bash
npm run compile
npm run sync:public-snapshot
```

## Riesgos

- Un snapshot desactualizado puede mostrar informacion anterior al ultimo bloque si hubo escrituras nuevas despues de sincronizar.
- Un fallback demasiado silencioso puede confundir la defensa; por eso la fuente del dato debe ser visible.
- Si el contrato se redeploya y no se actualiza la address, la lectura live puede fallar aunque el snapshot exista.

## Decision recomendada

Implementar EPIC-14 sin backend. Es la opcion mas eficiente para la defensa: conserva trazabilidad on-chain en vivo, agrega resiliencia ante fallas de RPC y mantiene el alcance acotado al frontend y scripts de lectura.
