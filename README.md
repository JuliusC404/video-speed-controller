# Video Speed Controller

Extensión de Chrome (Manifest V3) pa controlar la velocidad de reproducción de cualquier video en el navegador, con incrementos finos de 0.1x y funcionalidades extra pa ver contenido a tu ritmo.

## Funcionalidades

- **Velocidad 0.1x – 4.0x** en pasos de 0.1, desde un overlay flotante sobre el video o desde el popup de la extensión.
- **Atajos de teclado configurables** (activables/desactivables desde Opciones):
  - `S` / `D` — bajar / subir velocidad
  - `R` — reset a 1x
  - `Z` / `X` — skip atrás / adelante (segundos configurables)
  - `L` — marcar loop de segmento (1er press = inicio, 2do = fin y activa, `Shift+L` = borrar)
- **Persistencia por sitio** — recuerda la velocidad preferida por dominio (ej. YouTube 1.5x, cursos 2x).
- **Menú contextual** — click derecho sobre un video pa elegir velocidad desde presets.
- **Detección dinámica** — funciona en SPAs (YouTube, Netflix, etc.) vía `MutationObserver`, sin importar cuándo se inyecta el `<video>`.

## Instalación (uso personal, sin publicar en la Web Store)

1. Clona o descarga este repo.
2. Abre `chrome://extensions` en Chrome.
3. Activa **Modo desarrollador** (esquina superior derecha).
4. Click en **Cargar descomprimida** y selecciona la carpeta del repo.

## Estructura

```
manifest.json           # Manifest V3
background.js           # Service worker: menú contextual
content/
  content.js             # Lógica principal: overlay, atajos, loop, skip, persistencia
  overlay.css
popup/
  popup.html/js/css       # Panel del ícono de la extensión
options/
  options.html/js/css     # Configuración: atajos, rango de velocidad, sitios guardados
lib/
  storage.js              # Helpers compartidos de chrome.storage
icons/
```

## Configuración

Desde **Opciones** (click derecho en el ícono → Opciones, o desde el popup) se puede:

- Activar/desactivar los atajos de teclado por completo.
- Rebindear cada atajo (click en el campo y presionar la tecla deseada).
- Ajustar segundos de skip, incremento de velocidad, y rango mínimo/máximo.
- Activar/desactivar la persistencia de velocidad por sitio.
- Ver y borrar velocidades guardadas por sitio.

## Permisos usados

- `storage` — guardar configuración y velocidades por sitio.
- `contextMenus` — menú click-derecho sobre video.
- `tabs` — comunicación entre popup y la pestaña activa.
- `host_permissions: <all_urls>` — el content script necesita correr en cualquier sitio con video.

Extensión de uso personal, no publicada en Chrome Web Store.
