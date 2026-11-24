/*
 * Explorador planetario · catálogo de astros, capas y lugares.
 *
 * Todas las teselas proceden de OpenPlanetaryMap (https://github.com/OpenPlanetary/opm),
 * en proyección Web Mercator (EPSG:3857) centrada en el meridiano 0°.
 *   source: 's3'    → teselas estáticas en los buckets públicos de OPM.
 *   source: 'carto' → mapas compuestos servidos por la cuenta «opmbuilder» de CARTO.
 *   source: 'ext'   → ráster externo usado por OPM dentro de un mapa compuesto.
 * `fallback` indica la capa que entra si el servidor de la capa no responde.
 * Longitudes en grados este (±180), latitudes planetocéntricas. Las posiciones
 * de los lugares son aproximadas (2-3 decimales como mucho).
 */
window.EXPLORER_DATA = (function () {
	'use strict';

	var S3_OPM = 'https://s3.amazonaws.com/opmbuilder';
	var S3_MARS = 'https://s3.us-east-2.amazonaws.com/opmmarstiles';
	var S3_WOM = 'https://s3-eu-west-1.amazonaws.com/whereonmars.cartodb.net';
	var CARTO = 'https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named';
	var XYZ = '/{z}/{x}/{y}.png';

	var bodies = [
		{
			id: 'mercury',
			name: 'Mercurio',
			kicker: 'El planeta más cercano al Sol',
			radiusKm: 2439.7,
			facts: [['Radio medio', '2439,7 km'], ['Gravedad', '3,70 m/s²'], ['Día solar', '176 días']],
			view: { lat: 20, lng: 60, zoom: 2 },
			defaultLayer: 'opm-mercury',
			layers: [
				{
					id: 'opm-mercury',
					name: 'OPM Mercury Basemap v0.1',
					tag: 'Borrador',
					desc: 'Mapa base preliminar de OPM: mosaico MDIS de MESSENGER, curvas de nivel y nomenclatura IAU.',
					url: CARTO + '/opm-mercury-basemap-v0-1/all' + XYZ,
					tms: false, maxZoom: 7, source: 'carto',
					attribution: 'NASA/JHUAPL/MESSENGER · PLANMAP',
					fallback: 'mdis'
				},
				{
					id: 'mdis',
					name: 'Mosaico MDIS (MESSENGER)',
					desc: 'El ráster global de la cámara MDIS que OPM usa como fondo de su mapa de Mercurio, servido por PlanetServer.',
					url: 'https://access.planetserver.eu/planmap/mdis_mosaic_3857' + XYZ,
					tms: true, maxZoom: 7, source: 'ext',
					attribution: 'NASA/JHUAPL/MESSENGER · PLANMAP/PlanetServer'
				}
			],
			places: [
				{ t: 'm', name: 'MESSENGER (impacto)', year: 2015, lat: 54.44, lng: -149.92, text: 'Final de la misión MESSENGER: tras más de 4000 órbitas se quedó sin combustible e impactó contra la superficie.' },
				{ t: 'f', name: 'Caloris Planitia', lat: 31.6, lng: 162.0, zoom: 4, text: 'Una de las mayores cuencas de impacto del sistema solar, de unos 1550 km de diámetro.' },
				{ t: 'f', name: 'Hun Kal', lat: -0.5, lng: -20.0, zoom: 6, text: 'Cráter de apenas 1,5 km que define el meridiano 20° O de Mercurio. Su nombre significa «veinte» en maya.' },
				{ t: 'f', name: 'Kuiper', lat: -11.3, lng: -31.3, zoom: 6, text: 'Cráter joven de 62 km, uno de los puntos más brillantes del planeta, rodeado de rayos.' },
				{ t: 'f', name: 'Hokusai', lat: 57.8, lng: 16.9, zoom: 4, text: 'Cráter cuyos rayos de material eyectado se extienden más de mil kilómetros.' },
				{ t: 'f', name: 'Rachmaninoff', lat: 27.6, lng: 57.4, zoom: 5, text: 'Cuenca de doble anillo de unos 300 km con llanuras volcánicas de las más jóvenes de Mercurio.' },
				{ t: 'f', name: 'Raditladi', lat: 27.3, lng: 119.1, zoom: 5, text: 'Cuenca de doble anillo de unos 260 km, sorprendentemente joven.' },
				{ t: 'f', name: 'Rembrandt', lat: -33.0, lng: 87.9, zoom: 4, text: 'Cuenca de impacto de unos 715 km descubierta por MESSENGER en 2008.' },
				{ t: 'f', name: 'Beethoven', lat: -20.8, lng: -123.9, zoom: 4, text: 'Cuenca de unos 630 km, una de las mayores del planeta.' },
				{ t: 'f', name: 'Tolstoj', lat: -16.2, lng: -164.7, zoom: 5, text: 'Cuenca antigua de unos 350 km, muy degradada por impactos posteriores.' },
				{ t: 'f', name: 'Debussy', lat: -33.9, lng: 12.5, zoom: 5, text: 'Cráter con un sistema de rayos brillantes detectado primero por radar desde la Tierra.' },
				{ t: 'f', name: 'Discovery Rupes', lat: -56.3, lng: -38.3, zoom: 5, text: 'Escarpe de unos 650 km de largo, formado cuando el planeta se contrajo al enfriarse.' }
			]
		},
		{
			id: 'moon',
			name: 'Luna',
			kicker: 'El satélite natural de la Tierra',
			radiusKm: 1737.4,
			facts: [['Radio medio', '1737,4 km'], ['Gravedad', '1,62 m/s²'], ['Día solar', '29,5 días']],
			view: { lat: 12, lng: 0, zoom: 3 },
			defaultLayer: 'opm-moon',
			shade: { url: S3_OPM + '/301_moon/tiles/w' + XYZ, tms: true, maxZoom: 6, name: 'Sombreado LOLA' },
			layers: [
				{
					id: 'opm-moon',
					name: 'OPM Moon Basemap v0.1',
					desc: 'Mapa base de OPM: relieve y albedo, curvas de nivel cada kilómetro, nomenclatura IAU y los sitios Apollo y Luna.',
					url: CARTO + '/opm-moon-basemap-v0-1/all' + XYZ,
					tms: false, maxZoom: 8, source: 'carto',
					attribution: 'NASA/LOLA/USGS · IAU',
					fallback: 'albedo'
				},
				{
					id: 'albedo',
					name: 'Albedo con relieve',
					desc: 'Mezcla del sombreado LOLA con el mapa de albedo: los mares oscuros destacan sobre las tierras altas.',
					url: S3_OPM + '/301_moon/tiles/w/hillshaded-albedo' + XYZ,
					tms: true, maxZoom: 6, source: 's3',
					attribution: 'NASA/LOLA/USGS'
				},
				{
					id: 'lola',
					name: 'Sombreado LOLA',
					desc: 'Solo relieve: modelo sombreado del altímetro láser LOLA (LRO), 128 píxeles por grado. No figura en el catálogo web de OPM.',
					url: S3_OPM + '/301_moon/tiles/w' + XYZ,
					tms: true, maxZoom: 6, source: 's3',
					attribution: 'NASA/LRO/LOLA/USGS'
				}
			],
			places: [
				{ t: 'm', name: 'Apollo 11', year: 1969, lat: 0.674, lng: 23.473, text: 'Primer alunizaje tripulado: Armstrong y Aldrin pisaron Mare Tranquillitatis el 20 de julio de 1969.' },
				{ t: 'm', name: 'Apollo 12', year: 1969, lat: -3.012, lng: -23.422, text: 'Aterrizaje de precisión a 180 m de la sonda Surveyor 3, en Oceanus Procellarum.' },
				{ t: 'm', name: 'Apollo 14', year: 1971, lat: -3.645, lng: -17.471, text: 'Formación Fra Mauro. Alan Shepard golpeó aquí dos pelotas de golf.' },
				{ t: 'm', name: 'Apollo 15', year: 1971, lat: 26.132, lng: 3.634, text: 'Hadley-Apeninos: primera misión con el vehículo lunar (LRV).' },
				{ t: 'm', name: 'Apollo 16', year: 1972, lat: -8.973, lng: 15.500, text: 'Única misión Apollo en las tierras altas, cerca del cráter Descartes.' },
				{ t: 'm', name: 'Apollo 17', year: 1972, lat: 20.191, lng: 30.772, text: 'Valle de Taurus-Littrow: la última vez que alguien caminó sobre la Luna, con el geólogo Harrison Schmitt.' },
				{ t: 'm', name: 'Luna 2', year: 1959, lat: 29.1, lng: 0.0, text: 'Primer objeto humano en alcanzar otro cuerpo celeste (impacto). Posición estimada.' },
				{ t: 'm', name: 'Luna 9', year: 1966, lat: 7.08, lng: -64.37, text: 'Primer aterrizaje suave y primeras fotografías tomadas desde la superficie lunar.' },
				{ t: 'm', name: 'Luna 17 · Lunojod 1', year: 1970, lat: 38.24, lng: -35.00, text: 'Primer rover teledirigido en otro mundo: recorrió unos 10 km en Mare Imbrium.' },
				{ t: 'm', name: 'Luna 24', year: 1976, lat: 12.71, lng: 62.21, text: 'Última misión soviética de retorno de muestras, en Mare Crisium.' },
				{ t: 'm', name: 'Chang\'e 3 · Yutu', year: 2013, lat: 44.12, lng: -19.51, text: 'Primer aterrizaje suave en la Luna desde 1976.' },
				{ t: 'm', name: 'Chang\'e 4 · Yutu-2', year: 2019, lat: -45.46, lng: 177.59, text: 'Primer aterrizaje en la cara oculta, dentro del cráter Von Kármán.' },
				{ t: 'm', name: 'Chang\'e 5', year: 2020, lat: 43.06, lng: -51.92, text: 'Retorno de muestras desde las cercanías de Mons Rümker.' },
				{ t: 'm', name: 'Chang\'e 6', year: 2024, lat: -41.64, lng: -153.99, text: 'Primeras muestras traídas de la cara oculta, en la cuenca Apollo.' },
				{ t: 'm', name: 'Chandrayaan-3', year: 2023, lat: -69.37, lng: 32.35, text: 'Primer aterrizaje en las cercanías del polo sur lunar.' },
				{ t: 'm', name: 'SLIM', year: 2024, lat: -13.32, lng: 25.25, text: 'Aterrizaje de precisión japonés junto al cráter Shioli.' },
				{ t: 'f', name: 'Tycho', lat: -43.31, lng: -11.36, zoom: 5, text: 'Cráter joven de 85 km con un sistema de rayos visible a simple vista en luna llena.' },
				{ t: 'f', name: 'Copernicus', lat: 9.62, lng: -20.08, zoom: 5, text: 'Cráter de 93 km con terrazas y picos centrales, referencia de la estratigrafía lunar.' },
				{ t: 'f', name: 'Mare Imbrium', lat: 32.8, lng: -15.6, zoom: 4, text: 'Gran cuenca de impacto de unos 1100 km inundada de basalto.' },
				{ t: 'f', name: 'Mare Orientale', lat: -19.4, lng: -92.8, zoom: 4, text: 'La cuenca multianillo mejor conservada de la Luna, casi invisible desde la Tierra.' },
				{ t: 'f', name: 'Cuenca Polo Sur-Aitken', lat: -53.0, lng: -169.0, zoom: 3, text: 'La mayor cuenca de impacto de la Luna: unos 2500 km de diámetro en la cara oculta.' },
				{ t: 'f', name: 'Tsiolkovskiy', lat: -20.4, lng: 129.1, zoom: 5, text: 'Cráter de la cara oculta con un suelo de basalto oscuro y un pico central muy marcado.' },
				{ t: 'f', name: 'Aristarchus', lat: 23.7, lng: -47.4, zoom: 5, text: 'Uno de los cráteres más brillantes de la Luna, junto al valle sinuoso de Schröter.' },
				{ t: 'f', name: 'Clavius', lat: -58.4, lng: -14.4, zoom: 5, text: 'Cráter de 231 km donde el observatorio SOFIA detectó agua molecular en 2020.' },
				{ t: 'f', name: 'Plato', lat: 51.6, lng: -9.4, zoom: 5, text: 'Cráter de 101 km con el fondo liso y oscuro, al borde de Mare Imbrium.' }
			]
		},
		{
			id: 'mars',
			name: 'Marte',
			kicker: 'El planeta rojo',
			radiusKm: 3389.5,
			facts: [['Radio medio', '3389,5 km'], ['Gravedad', '3,72 m/s²'], ['Día solar', '24 h 39 min']],
			view: { lat: 5, lng: -75, zoom: 3 },
			defaultLayer: 'opm-mars',
			shade: { url: S3_MARS + '/hillshade-tiles' + XYZ, tms: true, maxZoom: 6, name: 'Sombreado MOLA' },
			layers: [
				{
					id: 'opm-mars',
					name: 'OPM Mars Basemap v0.2',
					desc: 'Mapa base de OPM: relieve, albedo TES, curvas de nivel cada 200 m y nomenclatura IAU.',
					url: CARTO + '/opm-mars-basemap-v0-2/all' + XYZ,
					tms: false, maxZoom: 8, source: 'carto',
					attribution: 'NASA/MOLA/TES · IAU/USGS',
					fallback: 'viking'
				},
				{
					id: 'viking',
					name: 'Viking MDIM 2.1',
					desc: 'Mosaico global en color de los orbitadores Viking, a 232 m por píxel.',
					url: S3_WOM + '/viking_mdim21_global' + XYZ,
					tms: true, maxZoom: 7, source: 's3',
					attribution: 'NASA/Viking/USGS'
				},
				{
					id: 'mola-color',
					name: 'Elevación MOLA sombreada',
					desc: 'Altimetría láser MOLA en color con sombreado: del azul de las tierras bajas del norte al rojo de Tharsis.',
					url: S3_WOM + '/mola-color' + XYZ,
					tms: true, maxZoom: 6, source: 's3',
					attribution: 'NASA/MGS/MOLA'
				},
				{
					id: 'mola-flat',
					name: 'Elevación MOLA',
					desc: 'La misma rampa de color sin sombreado, útil para leer cotas sin el efecto de la iluminación.',
					url: S3_WOM + '/mola_color-noshade_global' + XYZ,
					tms: true, maxZoom: 6, source: 's3',
					attribution: 'NASA/MGS/MOLA'
				},
				{
					id: 'mola-gray',
					name: 'Elevación MOLA en grises',
					desc: 'Elevación sombreada en escala de grises. Es la capa con más detalle: llega al nivel de zoom 9.',
					url: S3_WOM + '/mola-gray' + XYZ,
					tms: true, maxZoom: 9, source: 's3',
					attribution: 'NASA/MGS/MOLA'
				},
				{
					id: 'texture',
					name: 'Textura de superficie',
					desc: 'Textura sombreada a color natural creada por la comunidad de Celestia.',
					url: S3_WOM + '/celestia_mars-shaded-16k_global' + XYZ,
					tms: true, maxZoom: 5, source: 's3',
					attribution: 'Celestia/praesepe'
				},
				{
					id: 'hillshade',
					name: 'Sombreado MOLA',
					desc: 'Solo relieve: el modelo sombreado que OPM usa como base de su mapa de Marte.',
					url: S3_MARS + '/hillshade-tiles' + XYZ,
					tms: true, maxZoom: 6, source: 's3',
					attribution: 'NASA/MGS/MOLA'
				},
				{
					id: 'normal',
					name: 'Mapa de normales MOLA',
					tag: 'Curiosidad',
					desc: 'La orientación de cada pendiente codificada en RGB, tal como la usan los motores 3D. No figura en el catálogo web de OPM.',
					url: S3_MARS + '/normal-tiles' + XYZ,
					tms: true, maxZoom: 6, source: 's3',
					attribution: 'NASA/MGS/MOLA'
				}
			],
			places: [
				{ t: 'm', name: 'Viking 1', year: 1976, lat: 22.27, lng: -47.95, text: 'Primera misión que operó con éxito sobre la superficie de Marte, en Chryse Planitia.' },
				{ t: 'm', name: 'Viking 2', year: 1976, lat: 47.64, lng: 134.29, text: 'Aterrizó en Utopia Planitia y fotografió escarcha sobre el suelo marciano.' },
				{ t: 'm', name: 'Mars 3', year: 1971, lat: -45.0, lng: -158.0, text: 'Primer aterrizaje suave en Marte; la sonda soviética transmitió solo unos segundos. Posición estimada.' },
				{ t: 'm', name: 'Mars Pathfinder · Sojourner', year: 1997, lat: 19.13, lng: -33.22, text: 'Ares Vallis. Sojourner fue el primer rover que rodó por Marte.' },
				{ t: 'm', name: 'Spirit', year: 2004, lat: -14.57, lng: 175.47, text: 'Cráter Gusev. Diseñado para 90 soles, funcionó más de seis años.' },
				{ t: 'm', name: 'Opportunity', year: 2004, lat: -1.95, lng: -5.53, text: 'Meridiani Planum. Recorrió más de 45 km en casi quince años.' },
				{ t: 'm', name: 'Phoenix', year: 2008, lat: 68.22, lng: -125.75, text: 'Confirmó la presencia de hielo de agua bajo el suelo del ártico marciano.' },
				{ t: 'm', name: 'Curiosity', year: 2012, lat: -4.59, lng: 137.44, text: 'Cráter Gale, al pie de Aeolis Mons (monte Sharp). Sigue activo.' },
				{ t: 'm', name: 'InSight', year: 2018, lat: 4.50, lng: 135.62, text: 'Elysium Planitia. Su sismómetro registró más de 1300 martemotos.' },
				{ t: 'm', name: 'Perseverance · Ingenuity', year: 2021, lat: 18.44, lng: 77.45, text: 'Cráter Jezero, un antiguo delta fluvial. Ingenuity hizo aquí el primer vuelo propulsado en otro planeta.' },
				{ t: 'm', name: 'Zhurong', year: 2021, lat: 25.07, lng: 109.93, text: 'Utopia Planitia. Primer rover chino en Marte, de la misión Tianwen-1.' },
				{ t: 'f', name: 'Olympus Mons', lat: 18.65, lng: -133.8, zoom: 5, text: 'El mayor volcán conocido del sistema solar: unos 22 km de altura y 600 km de diámetro.' },
				{ t: 'f', name: 'Valles Marineris', lat: -13.9, lng: -59.2, zoom: 4, text: 'Sistema de cañones de unos 4000 km de largo y hasta 7 km de profundidad.' },
				{ t: 'f', name: 'Tharsis Montes', lat: 1.48, lng: -112.96, zoom: 4, text: 'Tres volcanes en escudo alineados: Arsia, Pavonis y Ascraeus Mons.' },
				{ t: 'f', name: 'Noctis Labyrinthus', lat: -7.0, lng: -101.0, zoom: 5, text: 'Laberinto de valles y fosas en el extremo occidental de Valles Marineris.' },
				{ t: 'f', name: 'Hellas Planitia', lat: -42.4, lng: 70.5, zoom: 4, text: 'Cuenca de impacto de unos 2300 km que contiene el punto más bajo de Marte.' },
				{ t: 'f', name: 'Argyre Planitia', lat: -49.7, lng: -44.0, zoom: 4, text: 'Cuenca de impacto de unos 1800 km en las tierras altas del sur.' },
				{ t: 'f', name: 'Syrtis Major', lat: 8.4, lng: 69.5, zoom: 4, text: 'La mancha oscura que Huygens dibujó en 1659: el primer rasgo cartografiado de otro planeta.' },
				{ t: 'f', name: 'Elysium Mons', lat: 25.02, lng: 147.21, zoom: 5, text: 'Volcán principal de la segunda provincia volcánica de Marte.' },
				{ t: 'f', name: 'Cydonia', lat: 40.75, lng: -9.46, zoom: 6, text: 'La mesa que las imágenes Viking de 1976 convirtieron en la «Cara de Marte».' },
				{ t: 'f', name: 'Cráter Korolev', lat: 72.77, lng: 164.58, zoom: 5, text: 'Cráter de 82 km relleno de hielo de agua durante todo el año.' }
			]
		},
		{
			id: 'phobos',
			name: 'Fobos',
			kicker: 'La luna mayor de Marte',
			radiusKm: 11.1,
			facts: [['Radio medio', '11,1 km'], ['Gravedad', '0,006 m/s²'], ['Órbita', '7 h 39 min']],
			view: { lat: 5, lng: -30, zoom: 3 },
			defaultLayer: 'viking',
			layers: [
				{
					id: 'viking',
					name: 'Mosaico Viking',
					desc: 'Mosaico global de las imágenes de los orbitadores Viking, a 40 píxeles por grado con el control geodésico del DLR. Está en el bucket de OPM aunque no figura en su catálogo web.',
					url: S3_OPM + '/401_phobos/tiles/w/viking_40ppd_dlrcontrol' + XYZ,
					tms: true, maxZoom: 5, source: 's3',
					attribution: 'NASA/Viking/USGS/DLR'
				}
			],
			places: [
				{ t: 'f', name: 'Stickney', lat: 1.0, lng: -49.0, zoom: 4, text: 'Cráter de unos 9 km: casi la mitad del diámetro medio de Fobos. El impacto estuvo cerca de destruirlo.' },
				{ t: 'f', name: 'Punto sub-Marte', lat: 0.0, lng: 0.0, zoom: 4, text: 'Fobos muestra siempre la misma cara a Marte: el meridiano 0° apunta hacia el planeta.' }
			]
		}
	];

	/*
	 * Contorno muy simplificado de la Península Ibérica (lat, lng en la Tierra),
	 * usado por la herramienta de comparación de tamaños.
	 */
	var iberia = {
		name: 'Península Ibérica',
		areaKm2: 583254,
		center: [40.2, -3.7],
		ring: [
			[42.88, -9.27], [43.37, -8.40], [43.79, -7.69], [43.55, -7.04], [43.66, -5.85], [43.46, -3.80],
			[43.35, -3.00], [43.32, -1.98], [43.34, -1.79], [43.00, -1.30], [42.70, 0.60], [42.60, 1.50],
			[42.45, 2.90], [42.32, 3.32], [41.90, 3.20], [41.38, 2.18], [41.11, 1.25], [40.72, 0.87],
			[39.98, -0.03], [39.47, -0.32], [38.73, 0.23], [38.34, -0.48], [37.63, -0.69], [37.60, -0.98],
			[36.72, -2.19], [36.83, -2.46], [36.72, -3.52], [36.72, -4.42], [36.13, -5.35], [36.00, -5.61],
			[36.53, -6.30], [37.20, -6.95], [37.18, -7.40], [36.98, -7.93], [37.02, -8.99], [37.95, -8.87],
			[38.41, -9.22], [38.78, -9.50], [39.36, -9.38], [40.15, -8.87], [40.64, -8.75], [41.15, -8.67],
			[41.69, -8.83], [42.12, -8.85]
		]
	};

	return { bodies: bodies, iberia: iberia, defaultBody: 'moon' };
})();
