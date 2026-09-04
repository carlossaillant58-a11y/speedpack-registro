# Speedpack · embudo QR

Plataforma móvil de captación para campañas universitarias y vía pública. Todos los QR abren el mismo formulario; los parámetros del enlace identifican internamente la fuente, universidad, campaña y pieza impresa.

## Enlace público

`https://speedpack-registro.onrender.com/`

El enlace sin parámetros es el registro general. Los QR impresos agregan parámetros de seguimiento sin mostrar información personal del propietario.

## Recorridos

- Universidad válida: muestra el nombre del campus, registra la atribución y, después del envío, habilita solamente el seguimiento de ese campus.
- Vía pública: muestra el registro general y nunca muestra canales ni Campus Drops universitarios.
- Campus inexistente o inactivo: vuelve al registro general y muestra una advertencia; no mezcla datos entre universidades.

Universidades configuradas: PUCMM, INTEC, UNIBE, UNICARIBE y UNFU.

## Datos solicitados

Nombre completo, cédula/RNC/pasaporte, fecha de nacimiento, teléfono, correo electrónico, dirección exacta de residencia y autorización de uso de datos. El formulario no solicita pagos ni datos de tarjetas.

## Google Sheets

El receptor escribe en la hoja privada y crea estas pestañas:

- `Registros`: maestro con estado, consentimiento, fuente, universidad, campaña, QR y pieza.
- `Universidades`: configuración editable de campus, canal, punto de retiro y umbrales.
- `Inventario`: cantidad impresa, asignada, distribuida y disponible por pieza.
- `Campus Drops`: calendario, operadores, vehículo, volumen, confirmaciones y estado de ruta.
- `Plantillas WhatsApp`: mensajes listos para apertura, llegada y cierre.
- `Dashboard`: adquisición por fuente/pieza y señal operativa por campus.

Para activar un canal, pega el enlace oficial `https://chat.whatsapp.com/...` en la columna `Canal WhatsApp` de la pestaña `Universidades`. El frontend lo obtiene automáticamente; no hace falta republicar la web. Si la celda está vacía o el dominio no es el oficial de WhatsApp, el botón se mantiene oculto.

## Añadir otra universidad

1. Agrega una fila en `Universidades` con slug, nombre, código de campaña, tipo `universidad`, canal, punto de retiro, umbrales, condición de hub y estado `Activo`.
2. Añade el mismo slug a `campaign-config.js` como respaldo sin conexión.
3. Genera QR con `source=university&campus=<slug>` y sus campos `campaign`, `piece`, `id` y `src`.
4. Prueba portada, envío, confirmación y aislamiento del canal antes de imprimir.

## Pruebas mínimas antes de distribuir

- PUCMM: el campus se identifica como PUCMM.
- INTEC: el campus se identifica como INTEC.
- Otra universidad activa: no hereda el canal de PUCMM ni INTEC.
- Vía pública: no aparece ningún seguimiento universitario.
- Campus inválido: vuelve a vía pública con advertencia.
- Móvil 320–430 px: encabezado, selector, consentimiento, botón y confirmación caben sin desplazamiento horizontal.
- Hoja: cada fila registra consentimiento, fuente, campus, campaña, tipo e ID de pieza.

Los recursos visuales provienen del material oficial suministrado por Speedpack y no deben recolorearse, deformarse ni sustituirse. La mascota Speedy está excluida hasta que la dirección entregue su rediseño oficial.
