# Maquetas del portfolio

Dos propuestas para `robermaps.github.io`, hechas en HTML, CSS y JavaScript sin dependencias ni proceso de build:

| Carpeta | Qué es |
| --- | --- |
| [`a-evolucion/`](a-evolucion/) | **Maqueta A · Evolución.** Mantiene la idea actual (fondo cartográfico en movimiento, ahora un globo que gira, barra superior con @robermaps) y corrige o mejora todo lo demás. Ya no lleva notas de maqueta: los cambios se explican en este README. |
| [`a-evolucion-v1/`](a-evolucion-v1/) | **Maqueta A · Versión 1 (guardada el 22 de noviembre de 2026).** Copia fija de la maqueta A tal como quedó en el commit `dc4abce`, antes de probar ideas nuevas: globo que acompaña el scroll en dos tramos de órbita, contenido sin tarjetas y sin notas de maqueta. No se toca; los cambios siguen en `a-evolucion/`. |
| [`b-hoja-559/`](b-hoja-559/) | **Maqueta B · Hoja 559.** Propuesta nueva: la web es una hoja del Mapa Topográfico (hoja 559, Madrid) con collar graduado, relieve generado en el navegador, leyenda como menú, mapa índice de proyectos y tablas de atributos. |

**Decisión: maqueta A.** Ya está ajustada con la estructura elegida: presentación transversal, geoproyectos, otros proyectos (con el archivo), trayectoria y contacto, sin notas técnicas y con botón de tema claro/oscuro. La B se queda en la rama solo como referencia.

Ambas llevan `<meta name="robots" content="noindex">` para que no se indexen mientras sean maquetas (la acción del sitemap también las excluye por eso).

**Cómo verlas en local** (en el Mac):

```bash
cd robermaps.github.io
python3 -m http.server 8000
open http://localhost:8000/maquetas/
```

Hace falta servirlas por HTTP: la maqueta A carga `world.json` con `fetch()` y eso no funciona abriendo el fichero con `file://`. Si se fusiona esta rama en `main`, quedarán en `https://robermaps.github.io/maquetas/`.

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

## 2. Maqueta A · Evolución

Respeta lo que ya funciona (mapa de fondo, columna de tarjetas, el azul `#126087`, el «@robermaps» como marca) y cambia lo siguiente:

- **Presentación**: nombre como `h1` (desde 1280 px, en una línea a 4,1 rem para llenar la columna, con el globo como segunda columna; por debajo, apilado palabra a palabra), y en lugar de rol y párrafos de presentación, una **leyenda de mapa** con los tres ejes, cada uno con el símbolo de una geometría vectorial: polígono rayado para «Cartografía y diseño», círculos proporcionales para «Geografía cuantitativa» y línea con vértices para «Desarrollo web y apps». Debajo, la ubicación con coordenadas y un único botón «Escríbeme».
- **Geoproyectos**: miniaturas en SVG (sin emojis) y enlaces con formato de etiqueta (fondo suave, tipografía monoespaciada), sin etiquetas de tecnologías. Abre la sección OpenPlanetaryMap Tile Loader para QGIS 4.x (activo; ficha en QGIS Plugins y repositorio `robermaps/opmtileloader`), seguido del visor de la Luna y Marte.
- **Otros proyectos**: sección separada para lo que no es geoespacial, de momento con un aviso de «Muy pronto», y debajo **Del archivo**: OpenPlanetary Tile Loader para QGIS 3.x («Ya no lo mantengo») y @esmapbot (inactivo). Las tarjetas del archivo usan el mismo estilo que «Muy pronto» (borde punteado y fondo gris) para distinguirse de los proyectos activos.
- **Trayectoria**: una entradilla y cuatro puntos: los tres ejes de la cabecera (cartografía y diseño, geografía cuantitativa, desarrollo web y apps) y un cuarto, automatización e IA aplicada, que recoge del CV de 2026 la automatización con Python de informes y validaciones y el trabajo con agentes de IA. Sin línea de tiempo de puestos y formación, sin texto «Sobre mí» ni bloque de herramientas, y sin el teléfono del CV.
- Sin sección de notas técnicas, ni notas de maqueta (franja superior, marcas numeradas y lista «Qué cambia»): la página se ve tal como quedaría publicada.
- **Contacto**: email grande con botón de copiar y redes con su usuario visible.
- **Versión móvil** (hasta 780 px): la misma composición sin tarjetas. La navegación y las redes van dentro de un menú de hamburguesa que se cierra al elegir una sección, al tocar fuera o con Escape. El globo usa `world-110m.json` (Natural Earth 1:110M, 17 KB comprimido) y se para cuando la cabecera sale de pantalla. d3 se carga bajo demanda una sola vez.
- **Barra superior**: solo Proyectos (lleva a Geoproyectos), Trayectoria y Contacto, también en el menú de móvil. En escritorio, la marca y los iconos se alinean con los márgenes de la columna de contenido.
- **Contenido sin tarjetas y centrado**: las secciones van directamente sobre la página (un único fondo, blanco en tema claro), separadas por espacio y una línea fina. Barras y contenido comparten un ancho máximo de 1100 px centrado con 16 px de margen interior (los valores de la versión con tarjetas). Desde 1024 px, la columna de contenido (hasta 720 px) va centrada y deja un pasillo libre a cada lado por el que se mueve el globo. Sin foto. El nombre ocupa una línea por palabra y los proyectos van en una única columna, cada uno en una fila con la miniatura a la izquierda (apilados por debajo de 640 px). Los proyectos activos van sin caja (solo la miniatura enmarcada); el archivo y «Muy pronto» mantienen su borde punteado.
- **Globo terráqueo**: un globo completo en proyección ortográfica (d3-geo) que gira sobre su eje inclinado 23,44°, una vuelta cada 2 minutos, visto desde 18° N, con 5 estelas en órbita (4 en pantallas estrechas) cuyo radio escala con el globo y que pasan por delante y por detrás. En escritorio recorre la ventana según el avance por la página: dos cuartos de elipse encadenados en sentido horario: sale junto al nombre (desde 1280 px, como segunda columna de la cabecera: a 40 px del final real del texto, centrado en vertical con todo el bloque de la cabecera y con el radio que permitan el hueco hasta el borde, con 24 px de margen, y la altura del bloque: 113 px a 1280, 153 px a 1440 y 166 px desde 1536, donde manda la altura del bloque, así que en pantallas muy anchas el sobrante queda a la derecha del globo y no entre el globo y el texto; por debajo, con el nombre apilado, a medio camino entre el nombre y el borde derecho de la columna, con un diámetro parecido al del bloque del nombre), llega al centro del borde derecho de la pantalla a mitad de página y termina en la esquina inferior izquierda al final (hasta un tercio del lado menor de la ventana, cortado por la esquina y sin llegar al texto), creciendo como si se acercara. Mientras cruza por detrás de la columna de texto se atenúa al 40 %. El desplazamiento es además un giro de cámara hacia el **sol**: desde el 15 % de la página sale de detrás de la esquina inferior izquierda, sube por el pasillo izquierdo, cruza por la parte alta (una curva de Bézier cuadrática) y acaba en la esquina superior derecha, bajo la barra. Es más pequeño que el globo porque está mucho más lejos. Como el globo va a la vez de arriba a la derecha a abajo a la izquierda, da media vuelta alrededor del sol en el sentido de las agujas del reloj. Al cruzar por detrás de la columna de texto el sol se atenúa (al 50 % en tema claro y al 22 % en oscuro, donde el texto es claro). Con ello cambia la luz: arriba del todo el sol queda a la espalda de quien mira y el globo se ve casi lleno; al final el sol está delante y el globo se ve iluminado de lado (ángulo sol-globo-cámara de 28° a 100°). La noche se dibuja con 18 casquetes de `d3.geoCircle` centrados en el punto antisolar, de 107° a 73°, que dan un terminador suave; el punto subsolar se calcula pasando la dirección de la luz a coordenadas geográficas del globo girado, así que el día y la noche quedan fijos frente al sol mientras la Tierra gira debajo. El sol también tiñe el fondo de la página con un degradado radial cálido (22 % de opacidad junto al sol en tema claro, 17 % en oscuro) y enciende el borde de la atmósfera del lado que mira hacia él. La posición se suaviza fotograma a fotograma y sigue al desplazamiento aunque la animación esté en pausa. Por debajo de 1024 px va en la esquina superior derecha de la cabecera, junto al nombre. Arranca activo y se pausa con el botón de la barra o al ocultar la pestaña.
- **Modo oscuro** automático según el dispositivo, con botón sol/luna para cambiarlo a mano (se guarda en `localStorage` y se aplica antes de pintar para evitar el parpadeo), foco visible con teclado, contraste AA, Open Graph y JSON-LD `Person`. Sin AdSense.

`world.json` sale de `world-atlas@2.0.2` (Natural Earth 1:50M): la tierra fusionada en polígonos con sus huecos (el Caspio, por ejemplo), las fronteras interiores, simplificación esférica y coordenadas cuantizadas a 0,025° y codificadas en deltas. Ocupa 168 KB, unos 57 KB comprimido con gzip, que es como lo sirve GitHub Pages. La proyección y el recorte del hemisferio oculto los hace `d3-geo@3.1.1` (con `d3-array@3.2.4`), cargados desde jsDelivr; si no cargan, queda la esfera sin continentes.

## 3. Maqueta B · Hoja 559

La idea es que la web sea un mapa topográfico y no una página que habla de mapas.

- **Hoja 559** es la hoja del MTN50 que cubre Madrid, y los proyectos ocupan sus cuatro cuadrantes, 559-I a 559-IV, igual que las hojas del MTN25 dentro de cada hoja del MTN50.
- **Collar graduado** en blanco y negro alrededor de la hoja y marcas de longitud en el margen (3°48′ a 3°36′ O, la franja de Madrid).
- **Portada con relieve generado** con ruido fractal y marching squares: equidistancia de 10 m, curvas maestras cada 50 m con su cota rotulada sobre la curva y con halo, el río Manzanares con su topónimo en azul cursiva (la convención de la hidrografía) y el vértice «Madrid 667» (cota de la estación del Retiro). Las curvas se dibujan de menor a mayor cota al cargar.
- **Instrumento de lectura**: al mover el puntero, X/Y en ETRS89 / UTM 30N y la cota bajo el cursor. Las coordenadas de la Puerta del Sol (X 440 291, Y 4 474 255) están calculadas con la proyección real; el resto del relieve es simulado y así lo dice la marginalia.
- **Tierra / Luna / Marte**: el mismo instrumento cambia a la Luna (sitio del Apolo 11, coordenadas selenográficas, cráteres) y a Marte (cráter Jezero, coordenadas planetocéntricas). Es el «…y más allá» de tu presentación hecho interacción, y enlaza con tus dos proyectos planetarios.
- **Signos convencionales como menú fijo**: área rayada = proyectos, vértice geodésico = trayectoria, camino = notas, fuente = contacto.
- **Trayectoria como tablas de atributos** (`fid`, `tipo`, `descripción`), como cualquier capa de QGIS.
- **Marginalia** con norte, sistema de referencia, nota sobre el relieve y edición.
- Tipografía Archivo con eje de anchura (expandida y en versales para los títulos, como la rotulación de un mapa) e IBM Plex Mono para datos. Modo claro «papel» y modo oscuro «nocturno».

No usa librerías: el relieve son unas 200 líneas de JavaScript y la página entera pesa 54 KB más el avatar.

## 4. Pendiente en la maqueta A

- **Otros proyectos**: sustituir el aviso de «Muy pronto» por las tarjetas cuando haya contenido (la rejilla `.projects` ya sirve).
- **Datos que no conozco** y conviene completar: fechas, empresa o proyecto concreto de Copernicus, universidad, y si quieres añadir la parte de diseño web con algún trabajo.
- **Imagen Open Graph** de 1200 × 630 px (`og:image`) para que los enlaces compartidos lleven imagen.
- **Al pasar a producción**: quitar `noindex`, añadir `<link rel="canonical" href="https://robermaps.github.io/">` y mover el contenido a `index.html`.

## 5. Siguientes pasos que recomiendo

1. Arreglar el visor de la Luna y Marte ya, con independencia de la maqueta que elijas: quitar las tres referencias rotas, usar el Leaflet local 1.9.4, pasar las capas a `https://` y actualizar el panel con el SlideMenu restaurado o un panel propio.
2. Pasar la maqueta A a `index.html` (quitando el `noindex`).
3. Limpiar el repo (ficheros sin uso, `.DS_Store`, acciones del workflow).
