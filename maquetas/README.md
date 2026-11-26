# Maquetas del portfolio

Propuestas para `robermaps.github.io`, hechas en HTML, CSS y JavaScript sin dependencias ni proceso de build:

| Carpeta | Qué es |
| --- | --- |
| [`v3/`](v3/) | **V3 · Elegida.** Conserva la animación de fondo (globo, estelas y sol ligados al scroll) y rehace todo lo demás; las imágenes de los proyectos usan el lenguaje del globo y se animan al pasar el ratón. Parte de la V2, descrita en la sección 2; lo que cambia respecto a ella, en la sección 3. |

**Decisión: V3.** Las demás maquetas (A, su copia guardada, B, la V2 y la V2 en azul) se han descartado y se han quitado de la rama; siguen en el historial de git.

Lleva `<meta name="robots" content="noindex">` para que no se indexen mientras sean maquetas.

**Cómo verlas en local** (en el Mac):

```bash
cd robermaps.github.io
python3 -m http.server 8000
open http://localhost:8000/maquetas/
```

Hace falta servirlas por HTTP: el globo carga `world.json` con `fetch()` y eso no funciona abriendo el fichero con `file://`. Si se fusiona esta rama en `main`, quedarán en `https://robermaps.github.io/maquetas/`.

---

## 1. Diagnóstico de la web actual

### Errores

1. **El visor de la Luna y Marte tiene el panel lateral roto.** `maps/mars-moon-explorer.html` sigue cargando `styles/social.css`, `styles/L.Control.SlideMenu.css` y `js/L.Control.SlideMenu.js`, que se borraron en los commits `5672ede` y `d055725` («Clean legacy»). Resultado: tres 404 y un `TypeError: L.control.slideMenu is not a function`, así que el panel con tu presentación y el enlace al plugin no aparece. El mapa y el selector de capas sí funcionan porque se crean antes del error.
2. **El visor mezcla versiones de Leaflet**: CSS 1.5.0 desde cdnjs con JS 1.0.3, cuando en el repo ya tienes Leaflet 1.9.4 en `leaflet/`.
3. **Seis capas del visor usan `http://`** (`s3-eu-west-1.amazonaws.com/whereonmars...`). En una web HTTPS solo cargan si el navegador las actualiza solo a HTTPS. Conviene cambiarlas a `https://` y comprobar que los mosaicos de CARTO (`cartocdn-gusc...opmbuilder`) siguen vivos; desde este entorno no he podido verificarlo.
4. **El visor enlaza perfiles antiguos**: Twitter `exorober_` (en la portada es `x.com/robermaps`) y un avatar de Google Photos (`lh3.googleusercontent.com/pw/...`) que probablemente ha caducado. Además, `maximum-scale=1.0, user-scalable=no` impide hacer zoom, lo que incumple WCAG 1.4.4.
5. **La animación de la portada no empieza en Madrid.** La ruta «Original» usa `startLng: 3.69` (positivo, al este), que cae en el Mediterráneo, al norte de Menorca. Madrid está en 3,70° **O**. Además `animLat` (43.41) no coincide con `startLat` (40.41), así que en el primer fotograma la vista salta 3° al norte, al golfo de León. Los comentarios tampoco cuadran con el código: la ruta de «Canadá, hacia el norte» tiene `dLat` negativo y va hacia el sur.
6. **La clase `grayscale` no hace nada.** Se añade al contenedor de teselas, pero la regla CSS estaba comentada y se eliminó en «Clean legacy». El mapa se ve en color (estilo HOT) con desenfoque.
7. **`font-family: apple-system`** necesita el guion (`-apple-system`); tal como está, Safari lo ignora.

### Rendimiento

- **El fondo nunca para.** `setTimeout(animateMap, 100)` llama a `map.setView()` diez veces por segundo de forma indefinida. Cada desplazamiento pide teselas nuevas a `a.tile.openstreetmap.fr/hot`, un servidor de voluntarios con política de uso. Encima, `filter: blur(2px)` sobre un mapa a pantalla completa obliga a la GPU a recomponer toda la ventana en cada fotograma, algo que se nota en móviles modestos.
- **No hay forma de pausar el movimiento** ni se respeta «reducir movimiento» del sistema. WCAG 2.2.2 pide un control de pausa para cualquier animación automática de más de 5 segundos.
- **Iconos sobredimensionados**: `X_logo.png` mide 3000 × 2808 px (127 KB) y se muestra a unos 30 px. LinkedIn (486 px) y GitHub (512 px) igual. Tres SVG en línea ocupan menos de 2 KB en total.
- **AdSense en el portfolio**: añade varios cientos de KB de JavaScript y cookies de terceros. En el Espacio Económico Europeo, Google exige desde 2024 una plataforma de consentimiento (CMP) certificada; sin ella no sirve anuncios personalizados y, por RGPD y LSSI, necesitarías el banner de cookies igualmente. Con el tráfico de un portfolio el ingreso es testimonial y resta imagen profesional. Si quieres monetizar, mejor en el blog o en el visor que en la portada.
- **Ficheros sin uso en el repo**: `img/robermaps.jpg`, `js/jquery.js`, `js/Bing.js`, `js/L.tileLayer.betterWms.js`, `styles/tabs.css`, `styles/leaflet.css` y, dentro de `leaflet/` (2,9 MB), todo salvo `leaflet.js`, `leaflet.css` y `images/`: los `.map` y las versiones `-src`. `.DS_Store` está versionado aunque figure en `.gitignore` (`git rm --cached .DS_Store`). Ojo: `img/mars-moon.jpg` no se usa en la web, pero sí en el README del plugin `opmtileloader`, así que no hay que borrarla.
- **El workflow del sitemap** usa `actions/checkout@v2` y `peter-evans/create-pull-request@v3`, con runtimes de Node ya retirados por GitHub. Conviene subirlos a sus versiones actuales antes de que fallen.

### SEO y enlaces compartidos

- El `<h1>` es «@robermaps» y tu nombre va en un `<h2>` del mismo tamaño que los títulos de proyecto.
- La `meta description` está en inglés con `lang="es"`. `meta keywords` la ignoran todos los buscadores grandes.
- No hay Open Graph ni Twitter Card: al compartir el enlace en LinkedIn, WhatsApp o X no sale tarjeta.
- No hay datos estructurados (`Person` en JSON-LD) ni `canonical`.
- El contenido indexable se reduce a dos proyectos. Los seis tutoriales borrados en junio de 2026 (plugins de QGIS, herramientas de procesamiento, GDAL/OGR, GeoPandas y Jupyter, ModelBuilder y apuntes de R) eran lo que podía traer tráfico orgánico, porque responden a búsquedas reales.

### Accesibilidad

- Los iconos de redes son `<img>` sin `alt` dentro de enlaces: un lector de pantalla los anuncia sin nombre.
- El texto justificado abre «ríos» de espacio en móvil (se ve en la captura a 390 px).
- Los botones son un `div` con un `p` dentro de un `a`; no hay estilos de foco y el hover pasa de azul petróleo a verde, un color que no aparece en ningún otro sitio.
- No hay modo oscuro.

### Contenido y posicionamiento

- La portada no dice a qué te dedicas profesionalmente ni qué ofreces: falta experiencia, stack, CV y una llamada clara a contactar.
- Lo más sólido de tu perfil, el año y medio de fotointerpretación para Copernicus (Red Natura 2000), ya no aparece.
- Tu faceta de desarrollador y diseñador web tampoco aparece, aunque la propia web debería ser la prueba.
- El avatar de Playmobil tiene personalidad. Si el objetivo es empleo o clientes, valora usar tu foto (`img/robermaps.jpg` sigue en el repo) al menos en LinkedIn y en el contacto.

---

## 2. V2 · Órbita (base de la V3)

Parte de la maqueta A y responde a que esta se sentía corporativa y rígida. Conserva tal cual la animación de fondo y la sección de contacto; el resto es nuevo. La columna central de 720 px se mantiene porque la coreografía la necesita: el globo y el sol viajan por los pasillos de los lados.

- **Sin barra superior ni enlaces.** La marca queda en la esquina superior izquierda y, en la derecha, solo los dos controles (tema y pausa), flotando; el contenido se funde al pasar por debajo. No hay navegación por secciones ni menú de móvil: la página es un único recorrido.
- **Portada.** En lugar del nombre, «@robermaps» en grande: es la propia marca de la cabecera, que al bajar sube hasta su sitio en la esquina superior izquierda mientras se encoge (sigue al hueco de la portada y queda fija al llegar). La protagonista es una frase en dos líneas: «Creo cosas» en la grotesca negrita y «que se usan y se entienden.» en cursiva con serifa y en ámbar, el color del sol. Cada línea toma el cuerpo que la hace medir exactamente el ancho disponible hasta el globo (el CSS lo calcula con el ancho en em de cada línea, 5,005 y 8,974, y un script lo afina con la medida real, también si no cargan las fuentes web), así que la segunda sale al 56 % del tamaño de la primera. Ese ancho es toda la columna en móvil y tableta; en escritorio, media ventana menos el globo, su separación de 40 px y el margen, sin pasar de la columna. En pantallas estrechas (menos de 1024 px) la segunda parte se apila en dos líneas, «que se usan» / «y se entienden.», al tamaño que hace medir la más larga todo el ancho. Las palabras entran escalonadas al cargar. Debajo, dos botones: «Te lo muestro», relleno, que lleva a los proyectos, y «Escríbeme», solo con contorno, que lleva a la sección de contacto. Comprobado de 1024 a 2560 px: el globo queda siempre a 40 px del texto sin pisarlo; en móvil va en la esquina superior derecha, junto al nombre.
- **Proyectos.** Sin rótulo: la frase «Herramientas para explorar la Tierra y otros mundos.» es el encabezado de la sección, seguida de un índice de filas grandes: cada fila entera es el enlace, con el nombre en grande, una línea de descripción y los mundos que toca cada proyecto dibujados como esferas (Marte, Mercurio, Luna), que se separan al pasar el ratón. «Qué más» (antes «Otros proyectos») es una sección aparte, con un encabezado del mismo tamaño que la frase anterior: debajo, en pequeño y sin rótulo, cuatro proyectos profesionales sacados del CV, sin cliente ni fechas (desarrollo de flujos de datos de indicadores ambientales de la UE en Ibertech, el Plan de Carreteras de la Comunidad de Madrid en Clothos, estudio de riesgos ambientales en Lima y Callao en IDOM y cartografía de la Red Natura 2000 para Copernicus en Telespazio Ibérica), cada uno con su imagen animada; después, la automatización de un negocio de formación (un flujo cuya línea se recorre y termina en una marca de hecho), y a continuación los dos proyectos del archivo.
- **Trayectoria.** Sin título visible (queda uno oculto para lectores de pantalla). Abre la frase «Llevo más de 7 años convirtiendo la información en solución.» y siguen los cuatro oficios: el nombre en grande y en peso medio y, justo debajo, en su propia línea, la frase gancho en cursiva con serifa y en ámbar. Todo el texto, en la tipografía normal, se enciende palabra a palabra al ritmo de la lectura: cada línea se enciende al cruzar la altura de lectura (el 62 % de la ventana) y, dentro de ella, de izquierda a derecha; al llegar al final de la página queda todo encendido. En escritorio, donde el globo pasa por detrás de esta sección, las palabras aún sin encender se ven algo más (28 % en vez de 16 %).
- **Contacto.** Como en la maqueta A, con un cambio: arriba, a modo de firma, «Soy Roberto Jiménez».
- **Globo más atenuado tras el texto.** Mientras cruza la columna de contenido, el globo baja hasta el 20 % de opacidad (en la maqueta A se quedaba en el 40 %). El solape se mide sobre lo que puede llegar a taparse (el diámetro del globo o el ancho de la columna, lo que sea menor), así que en pantallas muy anchas, donde el globo es más ancho que la columna, también llega al mínimo; con el 60 % del solape ya está atenuado del todo.
- **Una sola pausa.** El botón de pausa detiene el globo y el resto de movimientos automáticos. El final del recorrido usa un globo algo mayor (hasta el 40 % del lado menor de la ventana).
- **Tipografía y color.** Se mantienen Schibsted Grotesk, Source Sans 3 y DM Mono, y se añade Instrument Serif en cursiva para los remates. El acento deja de ser el azul y pasa al ámbar del sol.

## 3. V3

Copia de la V2 en la que solo cambian las imágenes de los proyectos. Todas usan el lenguaje del globo de fondo: esferas con retícula fina, sombra hacia el limbo, el color de cada mundo (Marte, Luna, Mercurio) y el acento para lo que se mueve. Cada una tiene una animación corta al pasar el ratón (o al llegar con el teclado; en pantallas táctiles se reproduce una vez al aparecer la fila) y todas se desactivan con «reducir movimiento».

- **OpenPlanetaryMap Tile Loader:** Marte hecho de teselas, con una capa vectorial encima y la Luna y Mercurio en órbita. Al pasar el ratón, las teselas se recargan en oleada, la capa vectorial se vuelve a dibujar y los satélites avanzan por su órbita.
- **Visor de la Luna y Marte:** tres capas apiladas en perspectiva (Luna con cráteres, Marte en tintas hipsométricas con curvas de nivel y un sombreado de relieve) que se separan como en un panel de capas.
- **Frase de portada en pantallas estrechas:** cada línea tiene un tamaño mínimo (5 rem «Creo cosas», 3,5 rem las líneas en cursiva apiladas, 2,75 rem la cursiva en una sola línea). Si para caber en el ancho tuviera que quedar por debajo, se queda en ese mínimo y sus palabras saltan de línea: en un móvil, «Creo» / «cosas»; en pantallas aún más estrechas, también «que se» / «entienden». En móvil y tableta la frase va arriba del todo y debajo «@robermaps» con el globo a su lado, ajustado al hueco que deja el globo para no solaparse. En pantallas bajas (como el Moto G4, 360 × 640) los mínimos de la frase bajan hasta un 75 % según el alto, el globo se limita al 20 % del alto y el margen superior se acorta, así que «Creo cosas» vuelve a caber en una línea y la portada entra entera en la pantalla.
- **«Qué más» plegado:** de cada proyecto se ve solo la imagen, el título y, en los del archivo, su estado; el texto se abre al pulsar el título (con un + que gira a ×) y se cierra al volver a pulsarlo.
- **Iconos de «Qué más»:** flujos de datos que llegan por una tubería al anillo de estrellas de la UE (los paquetes avanzan al pasar el ratón); radiales y anillos de Madrid con tráfico que circula; la costa de Lima y Callao con las manzanas y la franja de peligro junto al mar (las olas avanzan y la franja se intensifica); un satélite sobre un mosaico de coberturas del suelo (el satélite se desplaza y las lindes se redibujan); y un birrete rodeado de flechas circulares que giran. Los títulos se centran con el icono y las etiquetas de estado del archivo van dentro del texto plegado.
- **Archivo:** el plugin para QGIS 3 es la misma esfera en teselas, en grises y con el contorno punteado; sus teselas parpadean al pasar el ratón. @esmapbot es un encuadre de satélite sobre un terreno que una línea de barrido recorre.

## 5. Siguientes pasos que recomiendo

1. Arreglar el visor de la Luna y Marte ya, con independencia de la maqueta que elijas: quitar las tres referencias rotas, usar el Leaflet local 1.9.4, pasar las capas a `https://` y actualizar el panel con el SlideMenu restaurado o un panel propio.
2. Pasar la V3 a `index.html` (quitando el `noindex`).
3. Limpiar el repo (ficheros sin uso, `.DS_Store`, acciones del workflow).
