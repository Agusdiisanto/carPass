# Admin Role View Switcher

## Problema que resuelve

El administrador necesita revisar y operar las pantallas de cada rol sin desconectar la wallet ni cambiar de cuenta. Esto facilita demos, gestion operativa y verificacion manual del flujo por rol.

## Alcance

- Agregar un selector interno en la vista de administrador.
- Permitir alternar entre:
  - Panel de administracion.
  - Vista de concesionaria / registrador.
  - Vista de taller.
  - Vista de aseguradora.
  - Vista de inspector VTV.
- Reutilizar las vistas existentes para no duplicar formularios ni logica de contrato.
- No cambiar ABI, contrato, roles on-chain ni hooks de escritura.

## Reglas funcionales

- Si la wallet detectada tiene rol `admin`, la DApp renderiza `AdminView`.
- Dentro de `AdminView`, el usuario puede elegir que panel ver.
- Al elegir un rol operativo, la DApp muestra la vista completa de ese rol, con su encabezado, badge y capacidades reales.
- La vista seleccionada usa la misma wallet conectada para firmar.
- Si el admin no tiene el rol on-chain requerido para una operacion, el contrato debe seguir rechazando la transaccion con `AccessControlUnauthorizedAccount`.
- El panel de administracion sigue exponiendo gestion de roles para que el admin pueda otorgarse o revocarse roles si corresponde.

## Impacto en frontend

- `frontend/src/views/AdminView.tsx` importa y renderiza las vistas de rol existentes como pantallas completas para demo.
- `frontend/src/App.css` agrega estilos para el selector de vista.

## Criterios de aceptacion

- Un admin ve un selector con las cinco opciones de panel.
- La opcion "Administracion" mantiene el formulario actual de alta de vehiculo y gestion de roles.
- Las opciones de concesionaria, taller, aseguradora e inspector muestran las mismas pantallas que ven esos roles.
- No se solicita wallet adicional al alternar entre vistas.
- No se ejecutan validaciones frontend salvo pedido explicito.
