# Orejitas · Sonidos para bebés

App web para estimular a bebés y peques con sonidos de animales, naturaleza, ruido blanco,
transportes, cosas de casa, juguetes, instrumentos y nanas. Interfaz en español e inglés.

**En línea:** https://robermaps.github.io/orejitas/

## Cómo funciona

- **Todos los sonidos se sintetizan en tiempo real** con la Web Audio API: no hay archivos de audio,
  así que no hay licencias que gestionar, la app pesa muy poco, funciona sin conexión y cada
  reproducción varía un poco (tono, ritmo, repeticiones).
- Hay dos tipos de sonido: **cortos** (`shot`, p. ej. la vaca; al volver a pulsar se repiten) y
  **continuos** (`loop`, marcados con ∞; p. ej. ruido blanco o lluvia; suenan hasta que se paran
  o hasta que salta el temporizador de 15/30/60 min, con fundido final).
- Tras un sonido corto, la app puede **decir su nombre** en el idioma elegido (síntesis de voz del
  sistema; botón 💬 de la cabecera).
- Es una **PWA**: en Android, "Añadir a pantalla de inicio" la instala a pantalla completa y queda
  disponible sin conexión.
- Sin anuncios, sin cookies, sin analítica y sin peticiones a terceros (la fuente está autoalojada).

## Estructura

| Archivo | Qué hace |
| --- | --- |
| `index.html`, `styles.css`, `app.js`, `i18n.js` | Interfaz, temas por categoría, textos ES/EN |
| `engine.js` | Motor de audio: `Engine` (un sonido a la vez), `Voice` (utilidades para las recetas), ruido, reverb, limitador |
| `instruments.js` | Bloques reutilizables: voces de animales por formantes (`vocal`), campanas, Karplus-Strong, piano, caja de música, melodías… |
| `catalog.js` | Lista de categorías |
| `sounds/*.js` | Una categoría por archivo, con las recetas de cada sonido |
| `levels.js` | Ganancia de cada sonido para igualar el volumen (generado) |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA |
| `tools/` | Herramientas de desarrollo (no se usan en la app) |

## Añadir o cambiar un sonido

Cada sonido es un objeto en `sounds/<categoría>.js`:

```js
{
  id: 'cow', emoji: '🐮', kind: 'shot',
  name: { es: 'Vaca', en: 'Cow' },
  say: { es: 'La vaca', en: 'The cow' },   // lo que dice la voz
  play(v) {
    // v es una Voice: v.osc(), v.noise(), v.lp(), v.env(), v.loop()...
    return vocal(v, { dur: 1.8, pitch: [[0, 100], [0.4, 130], [1.8, 105]], vowels: [[0, 'm'], [0.4, 'u']] });
  },
}
```

- `shot`: `play(v)` devuelve el instante final (tiempo de audio), como hacen los instrumentos.
- `loop`: `play(v)` no devuelve nada; los eventos periódicos o aleatorios se programan con
  `v.loop(t => { …; return siguienteT; })`.

### Usar grabaciones reales

El motor también reproduce archivos. Basta con poner el audio en la carpeta (p. ej. `audio/vaca.mp3`)
y usar `src` en lugar de `play`:

```js
{ id: 'cow', emoji: '🐮', kind: 'shot', name: { es: 'Vaca', en: 'Cow' }, src: 'audio/vaca.mp3' }
```

Fuentes con licencias libres: [Freesound](https://freesound.org) (filtrar por CC0) y
[Wikimedia Commons](https://commons.wikimedia.org). Revisa la licencia de cada archivo y, si pide
atribución, añádela en el pie de la página.

## Herramientas (macOS)

Requisitos: Node 18+, Playwright (`npm i -g playwright && npx playwright install chromium`) y,
para los espectrogramas, ffmpeg (`brew install ffmpeg`).

```bash
cd orejitas
python3 -m http.server 8000          # y abre http://localhost:8000/
open http://localhost:8000/tools/qc.html   # escuchar y medir cada receta

node tools/render.mjs                # mide la sonoridad (BS.1770) y regenera levels.js
node tools/render.mjs farm --spec    # WAV + espectrogramas en tools/out/ (ignorado por git)
node tools/precache.mjs              # actualiza la lista y versión del service worker
```

Tras cambiar recetas, ejecuta `render.mjs` (iguala volúmenes) y `precache.mjs` antes de publicar.

## Notas

- Volumen: los sonidos continuos están normalizados unos 6 dB por debajo de los cortos. Para
  dormir, la AAP recomienda volumen bajo y el aparato lejos de la cuna.
- iOS/Safari suspende el audio web al bloquear la pantalla; en Android (Chrome) sigue sonando.
- Fuente: [Fredoka](https://fonts.google.com/specimen/Fredoka) (SIL OFL 1.1, ver `fonts/OFL.txt`).
