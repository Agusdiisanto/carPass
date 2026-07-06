# iOS MetaMask y QR de Pasaporte Post-Alta

## Problema que resuelve

El flujo mobile necesita ser evidente para usuarios de iPhone: Safari permite consulta publica, pero no inyecta MetaMask para firmar operaciones. Ademas, cuando una concesionaria da de alta un vehiculo, debe poder generar inmediatamente el QR del pasaporte para descargarlo, imprimirlo o pegarlo en el auto.

## Alcance

- Mejorar el copy de conexion para Safari iOS y desktop sin extension.
- Explicar que el QR de wallet se escanea desde MetaMask mobile, no desde la camara comun.
- Mostrar el QR del pasaporte apenas un registrador o admin registra un vehiculo.
- Reutilizar `VehiclePassportQr` para copiar enlace, copiar VIN, descargar PNG y abrir sticker A6.
- Mantener QR de vehiculo como URL publica con `?vin=`.

No incluye cambios de contrato, backend, IPFS, WalletConnect generico ni almacenamiento documental.

## Entradas

- VIN, marca, modelo, anio, color y propietario inicial del formulario de alta.
- Wallet con `REGISTRADOR_ROLE` o admin usando la vista de alta.
- URL publica configurada por `VITE_PUBLIC_APP_URL` o deploy actual para que el QR sea usable desde otro dispositivo.

## Salidas

- Vehiculo registrado on-chain por el flujo existente.
- Panel "Pasaporte listo" con QR descargable del VIN registrado.
- Sticker A6 imprimible con VIN, modelo y QR.
- Copy mobile que diferencia Safari, MetaMask mobile y QR de emparejamiento.

## Reglas

- Safari/iOS puede consultar VIN sin wallet.
- Operar en iOS requiere abrir CarPass dentro del navegador de MetaMask mobile.
- El QR de conexion wallet desktop se debe escanear desde MetaMask mobile.
- El QR del vehiculo debe abrir la ficha publica y precargar el VIN en paneles operativos.
- Si la app corre en localhost, el QR debe advertir que se necesita `VITE_PUBLIC_APP_URL` o una URL LAN accesible.

## Impacto en ABI

Ninguno. Se usan `registrarVehiculo`, lectura publica por VIN y los flujos QR existentes del frontend.

## Criterios de aceptacion

- En iPhone/Safari, la UI dice que Safari consulta pero que para firmar hay que abrir en MetaMask.
- En desktop sin extension, la UI indica que el QR debe escanearse desde MetaMask mobile.
- Despues de registrar un vehiculo, aparece el QR del pasaporte sin navegar a otra pantalla.
- El QR se puede descargar como PNG.
- El sticker A6 queda disponible desde el mismo panel.
- Taller, VTV o aseguradora pueden escanear ese QR y recibir el VIN en el identificador operativo.

## Verificacion

No agregar tests. No ejecutar validaciones frontend salvo pedido explicito del usuario.

Smoke manual recomendado:

1. Alta de vehiculo desde concesionaria.
2. Confirmar que aparece "Pasaporte listo".
3. Descargar QR.
4. Escanear QR desde taller o vista publica.
5. En iPhone Safari, confirmar copy de abrir MetaMask para operar.

## Riesgos

- Si el QR se genera desde localhost sin URL publica, otro dispositivo no podra abrirlo.
- El QR no prueba titularidad por si solo: solo identifica VIN y abre datos publicos.
- La firma de operaciones sigue dependiendo de MetaMask, Sepolia y roles on-chain.
