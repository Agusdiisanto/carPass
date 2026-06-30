# SDD - EPIC-16: Vehicle Media via Wikimedia Commons

## Problema que resuelve

Las cards y el hero del vehiculo muestran solo gradiente de marca cuando no hay `imageUrl` curada (VINs on-chain fuera de la demo). Se necesita una imagen representativa sin scraping ni backend propio.

## Alcance

- Resolver imagen por `marca + modelo + anio` usando Wikimedia Commons API (JSON, CORS publico).
- Mantener `imageUrl` curada de `demoVehicles.ts` como primera opcion para la flota demo.
- Cache en memoria y `sessionStorage` por clave de vehiculo.
- Fallback silencioso al gradiente de marca si no hay resultado o la API falla.
- Hook `useVehicleMedia` para componentes React.

No incluye: scraping HTML, NHTSA decode (ya hay marca/modelo on-chain), subida de fotos al NFT, APIs de pago.

## Entradas

- `vin`, `marca`, `modelo`, `anio` del registro publico o demo.
- `curatedUrl` opcional (demo).

## Salidas

- URL de imagen (thumb ~640px) o `null` para fallback visual existente.

## Reglas

- No bloquear la UI: la busqueda es async; el hero muestra marca mientras carga.
- Timeout de Commons: 5s.
- Una busqueda activa por clave; cancelar si cambia el VIN.
- Commons: `origin=*`, namespace File (6), filtrar mime `image/*`.

## Criterios de aceptacion

- VIN demo sigue mostrando foto curada Wikimedia.
- VIN on-chain sin curacion intenta Commons y muestra foto si existe.
- Sin resultado: mismo fallback de marca que hoy.
- Segunda visita al mismo vehiculo usa cache sin nueva peticion.

## Impacto en ABI

Ninguno.

## Riesgos

- Commons puede no tener foto para todos los modelos.
- Calidad de imagen variable (stock photos).
- Rate limits leves de Wikimedia; mitigado con cache.
