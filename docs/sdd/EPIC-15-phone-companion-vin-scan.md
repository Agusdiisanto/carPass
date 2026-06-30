# SDD - EPIC-15: Phone Companion VIN Scan

## Problema que resuelve

Operadores que conectan wallet desde notebook no pueden escanear comodamente el QR fisico del VIN del vehiculo. El celular tiene camara trasera adecuada; la notebook no.

## Alcance

- Flujo companion notebook ↔ celular sin backend.
- QR de enlace para abrir CarPass en modo escaneo en el celular.
- Pantalla relay en el celular con QR del VIN detectado.
- Recepcion del VIN en notebook escaneando la pantalla del celular.
- Deteccion de dispositivo para mostrar el companion solo en desktop.
- Deep link `?vin=` para completar la busqueda al recibir el codigo.

No incluye WalletConnect generico ni sync realtime cross-device. La conexion wallet por QR en desktop (MetaMask Connect) vive en EPIC-09; este epic solo reutiliza `VITE_PUBLIC_APP_URL` y flujos mobile.

## Entradas

- Wallet conectada en notebook (opcional en celular; la consulta publica sigue sin wallet).
- URL con `?companion=scan` en el celular.
- QR del vehiculo o payload compatible con `extractVinFromQrPayload`.
- Camara disponible en cada dispositivo segun el paso del flujo.

## Salidas

- VIN cargado y buscado en la notebook.
- UI de pasos y QR de enlace en desktop.
- UI relay con QR del VIN en celular.

## Reglas

- En desktop con wallet conectada y red correcta, mostrar card companion.
- En celular con `?companion=scan`, abrir escaner automaticamente.
- Al detectar VIN en modo companion, mostrar relay antes de buscar en celular.
- El escaner de recepcion en desktop reutiliza `VinQrScanner` existente.
- `?vin=` en URL dispara busqueda al cargar la vista publica.

## Errores esperados

- Camara no disponible: fallback a pestana manual del escaner.
- QR sin VIN valido: mensaje existente del escaner.
- Red incorrecta en wallet: no mostrar acciones de escaneo operativo.

## Criterios de aceptacion

- Desktop con wallet: se ve card "Escanear con tu celular" con QR de enlace.
- Celular abre enlace companion: escaner se abre solo.
- Tras escanear VIN en celular: pantalla con QR grande para mostrar al notebook.
- Desktop "Recibir VIN del celular": escaner lee QR del celular y busca el vehiculo.
- Mobile normal sin companion: flujo de escaneo directo sin relay obligatorio.
- Visitante sin wallet en desktop: no ve card companion (solo consulta manual/demo).

## Impacto en ABI

Ninguno.

## Dependencias frontend

- `qrcode`: generacion local de QR para enlace companion y relay de VIN.

## Verificacion

No ejecutar validaciones frontend salvo pedido explicito del usuario.

Smoke manual:

1. Conectar wallet en desktop → ver card companion.
2. Escanear QR de enlace con celular → abre escaner.
3. Escanear VIN del vehiculo/demo → ver relay QR.
4. En desktop, recibir VIN → historial cargado.

## Riesgos

- En dev con `localhost`, el celular no puede abrir `localhost`. Configurar `VITE_PUBLIC_APP_URL` con el deploy publico; el QR companion usa esa URL aunque la notebook siga en local.
- Fallback sin deploy: IP LAN via WebRTC y `vite` con `host: true` (misma WiFi).
- El segundo paso (notebook lee pantalla del celular) depende de camara frontal y `BarcodeDetector`.
