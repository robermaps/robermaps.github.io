/*
 * Explorador planetario · lógica del visor.
 * Depende de Leaflet 1.9 y de window.EXPLORER_DATA (js/explorer-data.js).
 */
(function () {
	'use strict';

	var DATA = window.EXPLORER_DATA;
	var OPM_LINK = '© <a href="https://github.com/OpenPlanetary/opm" target="_blank" rel="noopener">OpenPlanetaryMap</a>';
	var EARTH_KM = 6371;          // radio medio terrestre, para la comparación de tamaños
	var MAX_LAT = 85.0511;        // límite de Web Mercator
	var WATCHDOG_MS = 12000;      // tiempo máximo sin teselas antes de dar una capa por caída

	var $ = function (id) { return document.getElementById(id); };
	var app = $('app');
	var mobileQuery = window.matchMedia('(max-width: 760px)');

	var state = {
		body: null,          // objeto del astro activo
		layer: null,         // id de la capa principal
		compare: false,
		compareLayer: null,
		shade: false,
		shadeOpacity: 0.7,
		grid: false,
		lon360: false,
		markers: true,
		filter: 'all',
		query: ''
	};
	var health = {};         // 'astro/capa' → 'ok' | 'down'
	var lastHash = '';

	DATA.bodies.forEach(function (body) {
		body.layers.forEach(function (def) { def.key = body.id + '/' + def.id; });
	});

	/* ------------------------------------------------------------------ utilidades */

	// Formato numérico español: coma decimal y espacio fino (no separable) cada tres cifras
	function fmt(n, decimals) {
		var parts = Math.abs(n).toFixed(decimals).split('.');
		if (parts[0].length > 4) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
		var text = parts[0] + (parts[1] ? ',' + parts[1] : '');
		return (n < 0 && parseFloat(text.replace(',', '.').replace(/\u202f/g, '')) !== 0 ? '\u2212' : '') + text;
	}
	function esc(s) {
		return String(s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}
	function plain(s) {
		return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
	}
	function findBody(id) {
		for (var i = 0; i < DATA.bodies.length; i++) if (DATA.bodies[i].id === id) return DATA.bodies[i];
		return null;
	}
	function findLayer(body, id) {
		for (var i = 0; i < body.layers.length; i++) if (body.layers[i].id === id) return body.layers[i];
		return null;
	}
	function wrapLng(lng) { return ((lng + 180) % 360 + 360) % 360 - 180; }
	function isMobile() { return mobileQuery.matches; }

	function fmtDistance(km) {
		if (km >= 100) return fmt(km, 0) + ' km';
		if (km >= 10) return fmt(km, 1) + ' km';
		if (km >= 1) return fmt(km, 2) + ' km';
		return fmt(km * 1000, 0) + ' m';
	}
	function fmtLat(lat, d) { return fmt(Math.abs(lat), d) + '° ' + (lat >= 0 ? 'N' : 'S'); }
	function fmtLng(lng, d) {
		lng = wrapLng(lng);
		if (state.lon360) return fmt((lng + 360) % 360, d) + '° E';
		return fmt(Math.abs(lng), d) + '° ' + (lng >= 0 ? 'E' : 'O');
	}
	function fmtLatLng(ll, d) { return fmtLat(ll.lat, d) + ' · ' + fmtLng(ll.lng, d); }

	function copyText(text, okMessage) {
		function done() { toast(okMessage); }
		function fail() { toast('No se ha podido copiar: ' + text); }
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(text).then(done, fail);
		} else { fail(); }
	}

	var toastTimer;
	function toast(message) {
		var el = $('toast');
		el.textContent = message;
		el.hidden = false;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () { el.hidden = true; }, 4500);
	}

	/* ------------------------------------------------------------------ geodesia esférica */

	var rad = function (d) { return d * Math.PI / 180; };
	var deg = function (r) { return r * 180 / Math.PI; };

	// Distancia angular (radianes) entre dos puntos {lat, lng}
	function angularDistance(a, b) {
		var p1 = rad(a.lat), p2 = rad(b.lat), dp = p2 - p1, dl = rad(b.lng - a.lng);
		var h = Math.pow(Math.sin(dp / 2), 2) + Math.cos(p1) * Math.cos(p2) * Math.pow(Math.sin(dl / 2), 2);
		return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
	}
	function initialBearing(a, b) {
		var p1 = rad(a.lat), p2 = rad(b.lat), dl = rad(b.lng - a.lng);
		return Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl));
	}
	function destination(c, bearing, dist) {
		var p1 = rad(c.lat), l1 = rad(c.lng);
		var p2 = Math.asin(Math.sin(p1) * Math.cos(dist) + Math.cos(p1) * Math.sin(dist) * Math.cos(bearing));
		var l2 = l1 + Math.atan2(Math.sin(bearing) * Math.sin(dist) * Math.cos(p1), Math.cos(dist) - Math.sin(p1) * Math.sin(p2));
		return { lat: deg(p2), lng: deg(l2) };
	}
	// Arco de círculo máximo de a hasta b, con las longitudes «desenrolladas» a partir de a
	function geodesic(a, b) {
		var d = angularDistance(a, b);
		if (d < 1e-9 || d > Math.PI - 1e-6) return [L.latLng(a.lat, a.lng), L.latLng(b.lat, a.lng + wrapLng(b.lng - a.lng))];
		var n = Math.max(1, Math.ceil(deg(d) / 2));
		var p1 = rad(a.lat), l1 = rad(a.lng), p2 = rad(b.lat), l2 = rad(b.lng);
		var pts = [L.latLng(a.lat, a.lng)], prev = a.lng;
		for (var i = 1; i <= n; i++) {
			var f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
			var x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
			var y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
			var z = A * Math.sin(p1) + B * Math.sin(p2);
			var lat = deg(Math.atan2(z, Math.sqrt(x * x + y * y)));
			var lng = deg(Math.atan2(y, x));
			lng += 360 * Math.round((prev - lng) / 360);
			pts.push(L.latLng(Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)), lng));
			prev = lng;
		}
		return pts;
	}

	/* ------------------------------------------------------------------ mapa */

	var map = L.map('map', {
		center: [0, 0],
		zoom: 3,
		zoomControl: false,
		attributionControl: false,
		worldCopyJump: true,
		maxBounds: [[-MAX_LAT, -100000], [MAX_LAT, 100000]],
		maxBoundsViscosity: 0.85,
		zoomSnap: 1,
		wheelPxPerZoomLevel: 90
	});
	L.control.attribution({ position: 'bottomright', prefix: '<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>' }).addTo(map);
	L.control.zoom({ position: 'topright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map);

	var HomeControl = L.Control.extend({
		options: { position: 'topright' },
		onAdd: function () {
			var box = L.DomUtil.create('div', 'leaflet-bar');
			var a = L.DomUtil.create('a', 'homebtn', box);
			a.href = '#';
			a.title = 'Vista inicial del astro';
			a.setAttribute('role', 'button');
			a.setAttribute('aria-label', 'Vista inicial del astro');
			a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7M6 10v9h12v-9"/></svg>';
			L.DomEvent.disableClickPropagation(box);
			L.DomEvent.on(a, 'click', function (e) {
				L.DomEvent.preventDefault(e);
				var v = state.body.view;
				map.flyTo(centerFor(L.latLng(v.lat, v.lng), fitZoom(v.zoom)), fitZoom(v.zoom), { duration: 1 });
			});
			return box;
		}
	});
	map.addControl(new HomeControl());

	map.createPane('under').style.zIndex = 190;
	map.createPane('compare').style.zIndex = 250;
	var shadePane = map.createPane('shade');
	shadePane.style.zIndex = 260;
	shadePane.style.mixBlendMode = 'multiply';
	shadePane.style.pointerEvents = 'none';
	var gridPane = map.createPane('grid');
	gridPane.style.zIndex = 350;
	gridPane.style.pointerEvents = 'none';

	function fitZoom(z) { return Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), z)); }

	function updateMinZoom() {
		var h = map.getSize().y || window.innerHeight;
		map.setMinZoom(Math.max(1, Math.round(Math.log(h / 256) / Math.LN2)));
	}

	// Rectángulo del mapa que no queda tapado por el panel (px del contenedor)
	function visibleRect() {
		var s = map.getSize(), r = { left: 0, top: 0, right: s.x, bottom: s.y };
		var closed = app.classList.contains('panel-closed');
		if (isMobile()) {
			r.top = document.querySelector('.topbar').getBoundingClientRect().bottom;
			r.bottom = Math.max(r.top + 80, $('sheet').getBoundingClientRect().top);
		} else if (!closed) {
			r.left = Math.min(s.x - 200, $('side').getBoundingClientRect().right);
		}
		return r;
	}
	// Centro del mapa necesario para que `latlng` quede en el centro del área visible
	function centerFor(latlng, zoom) {
		var r = visibleRect(), s = map.getSize();
		var off = L.point((r.left + r.right) / 2 - s.x / 2, (r.top + r.bottom) / 2 - s.y / 2);
		return map.unproject(map.project(latlng, zoom).subtract(off), zoom);
	}
	function visibleCenter() {
		var r = visibleRect();
		return map.containerPointToLatLng([(r.left + r.right) / 2, (r.top + r.bottom) / 2]);
	}

	/* ------------------------------------------------------------------ capas de teselas */

	function createTiles(def, pane, onStatus) {
		var layer = L.tileLayer(def.url, {
			tms: !!def.tms,
			maxNativeZoom: def.maxZoom,
			maxZoom: 14,
			minZoom: 0,
			pane: pane,
			keepBuffer: 3,
			attribution: OPM_LINK + ' · ' + def.attribution
		});
		var loaded = 0, failed = 0;
		function report(status) {
			if (health[def.key] === status) return;
			health[def.key] = status;
			if (onStatus) onStatus(status, def, layer);
		}
		var watchdog = setTimeout(function () { if (!loaded) report('down'); }, WATCHDOG_MS);
		layer.on('tileload', function () { loaded++; clearTimeout(watchdog); report('ok'); });
		layer.on('tileerror', function () { failed++; if (!loaded && failed >= 3) { clearTimeout(watchdog); report('down'); } });
		layer.on('remove', function () { clearTimeout(watchdog); });
		return layer;
	}

	var base = { main: null, under: null, def: null, picked: false };

	function clearBase() {
		if (base.main) map.removeLayer(base.main);
		if (base.under) map.removeLayer(base.under);
		base.main = base.under = base.def = null;
	}

	// Sigue la cadena de respaldos mientras la capa pedida conste como caída
	function resolveLayer(body, id) {
		var def = findLayer(body, id) || findLayer(body, body.defaultLayer), guard = 0;
		while (health[def.key] === 'down' && def.fallback && guard++ < 5) def = findLayer(body, def.fallback);
		return def;
	}

	function setLayer(id, opts) {
		opts = opts || {};
		var body = state.body;
		var def = opts.exact ? findLayer(body, id) : resolveLayer(body, id);
		if (opts.retry) delete health[def.key];

		clearBase();
		showEmpty(false);
		state.layer = def.id;
		base.def = def;
		base.picked = !!opts.picked;
		base.main = createTiles(def, 'tilePane', onBaseStatus).addTo(map);

		// Mientras no se confirme que el servidor responde, el respaldo se carga por debajo
		if (def.fallback && health[def.key] !== 'ok') {
			var fb = findLayer(body, def.fallback);
			if (fb && health[fb.key] !== 'down') base.under = createTiles(fb, 'under', renderLayers).addTo(map);
		}

		map.setMaxZoom(def.maxZoom + 1);
		if (state.compare && state.compareLayer === def.id) pickCompareLayer();
		updateCompare();
		renderLayers();
		writeHash();
	}

	function onBaseStatus(status, def, layer) {
		renderLayers();
		if (layer !== base.main) return;
		if (status === 'ok') {
			if (base.under) {
				var under = base.under;
				base.under = null;
				layer.once('load', function () { map.removeLayer(under); });
			}
			return;
		}
		var fb = def.fallback && findLayer(state.body, def.fallback);
		if (fb && health[fb.key] !== 'down') {
			// Solo se avisa si la capa la eligió la persona; al arrancar basta con la etiqueta de la lista
			if (base.picked) toast('«' + def.name + '» no responde ahora mismo. Se muestra «' + fb.name + '».');
			setLayer(fb.id, { exact: true });
		} else {
			showEmpty(true, def);
		}
	}

	function showEmpty(on, def) {
		$('empty').hidden = !on;
		if (on) {
			$('emptyText').textContent = 'El servidor de «' + def.name + '» no responde. Puede ser algo temporal: prueba otra capa u otro astro.';
		}
	}
	$('emptyRetry').addEventListener('click', function () {
		state.body.layers.forEach(function (d) { delete health[d.key]; });
		setLayer(state.body.defaultLayer);
	});

	/* -------- lista de capas */

	function thumbUrl(def) {
		return def.url.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0');
	}

	function renderLayers() {
		var body = state.body;
		var html = body.layers.map(function (def) {
			var active = def.id === state.layer;
			var right = state.compare && def.id === state.compareLayer;
			var down = health[def.key] === 'down';
			var badges = '';
			if (def.tag) badges += '<em class="tag">' + esc(def.tag) + '</em>';
			if (state.compare && active) badges += '<em class="tag tag--side">Izquierda</em>';
			if (right) badges += '<em class="tag tag--side">Derecha</em>';
			var meta = down
				? '<span class="layer__meta layer__meta--down">Sin respuesta del servidor · toca para reintentar</span>'
				: '<span class="layer__meta">Zoom máx. ' + def.maxZoom + ' · ' + esc(def.attribution) + '</span>';
			return '<button type="button" class="layer' + (active ? ' is-active' : '') + (down ? ' is-down' : '') + '" data-layer="' + def.id + '" aria-pressed="' + active + '">' +
				'<span class="layer__thumb"><img src="' + esc(thumbUrl(def)) + '" alt="" loading="lazy" onerror="this.remove()"></span>' +
				'<span class="layer__text">' +
				'<span class="layer__name">' + esc(def.name) + badges + '</span>' +
				'<span class="layer__desc">' + esc(def.desc) + '</span>' + meta +
				'</span></button>';
		}).join('');
		var list = $('layerlist');
		if (list.dataset.html !== html) { list.innerHTML = html; list.dataset.html = html; }
	}

	$('layerlist').addEventListener('click', function (e) {
		var btn = e.target.closest('.layer');
		if (!btn) return;
		var def = findLayer(state.body, btn.dataset.layer);
		setLayer(def.id, { exact: true, picked: true, retry: health[def.key] === 'down' });
	});

	/* -------- comparación con divisor */

	var cmp = { layer: null, x: 0.5 };

	// Prefiere una capa estática ya verificada antes que una pendiente de comprobar
	function pickCompareLayer() {
		var others = state.body.layers.filter(function (d) { return d.id !== state.layer; });
		var alive = others.filter(function (d) { return health[d.key] !== 'down'; });
		var solid = alive.filter(function (d) { return d.source === 's3' || health[d.key] === 'ok'; });
		state.compareLayer = (solid[0] || alive[0] || others[0] || {}).id || null;
	}

	function updateCompare() {
		if (cmp.layer) { map.removeLayer(cmp.layer); cmp.layer = null; }
		var body = state.body, canCompare = body.layers.length > 1;
		$('compareGroup').hidden = !canCompare;
		if (!canCompare) state.compare = false;
		$('compareToggle').checked = state.compare;
		$('compareField').hidden = !state.compare;
		$('swipe').hidden = !state.compare;
		if (!state.compare) return;

		if (!state.compareLayer || state.compareLayer === state.layer || !findLayer(body, state.compareLayer)) pickCompareLayer();
		var def = findLayer(body, state.compareLayer);
		$('compareSelect').innerHTML = body.layers.filter(function (d) { return d.id !== state.layer; }).map(function (d) {
			return '<option value="' + d.id + '"' + (d.id === def.id ? ' selected' : '') + '>' + esc(d.name) + '</option>';
		}).join('');
		$('swipeLabelA').textContent = findLayer(body, state.layer).name;
		$('swipeLabelB').textContent = def.name;

		cmp.layer = createTiles(def, 'compare', function (status, d) {
			renderLayers();
			if (status === 'down') toast('«' + d.name + '» no responde ahora mismo.');
		}).addTo(map);
		clipCompare();
	}

	function clipCompare() {
		if (!state.compare) return;
		var s = map.getSize(), x = Math.round(s.x * cmp.x);
		var a = map.containerPointToLayerPoint([x, 0]), b = map.containerPointToLayerPoint([s.x, s.y]);
		map.getPane('compare').style.clipPath = 'polygon(' + a.x + 'px ' + a.y + 'px,' + b.x + 'px ' + a.y + 'px,' + b.x + 'px ' + b.y + 'px,' + a.x + 'px ' + b.y + 'px)';
		var swipe = $('swipe');
		swipe.style.setProperty('--x', x + 'px');
		$('swipeHandle').setAttribute('aria-valuenow', Math.round(cmp.x * 100));
	}
	map.on('move zoom viewreset resize zoomend moveend', clipCompare);

	$('compareToggle').addEventListener('change', function () {
		state.compare = this.checked;
		if (state.compare) {
			var r = visibleRect(), s = map.getSize();
			cmp.x = ((r.left + r.right) / 2) / s.x;
		}
		updateCompare();
		renderLayers();
		writeHash();
	});
	$('compareSelect').addEventListener('change', function () {
		state.compareLayer = this.value;
		updateCompare();
		renderLayers();
		writeHash();
	});

	(function swipeDrag() {
		var handle = $('swipeHandle'), dragging = false;
		function move(clientX) {
			var rect = map.getContainer().getBoundingClientRect();
			cmp.x = Math.max(0.04, Math.min(0.96, (clientX - rect.left) / rect.width));
			clipCompare();
		}
		handle.addEventListener('pointerdown', function (e) {
			dragging = true;
			handle.setPointerCapture(e.pointerId);
			handle.classList.add('is-dragging');
			e.preventDefault();
		});
		handle.addEventListener('pointermove', function (e) { if (dragging) move(e.clientX); });
		function end() { dragging = false; handle.classList.remove('is-dragging'); }
		handle.addEventListener('pointerup', end);
		handle.addEventListener('pointercancel', end);
		handle.addEventListener('keydown', function (e) {
			if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
			cmp.x = Math.max(0.04, Math.min(0.96, cmp.x + (e.key === 'ArrowLeft' ? -0.02 : 0.02)));
			clipCompare();
			e.preventDefault();
		});
	})();

	/* -------- realce del relieve (sombreado multiplicado) */

	var shadeLayer = null;
	function updateShade() {
		if (shadeLayer) { map.removeLayer(shadeLayer); shadeLayer = null; }
		var sh = state.body.shade;
		$('shadeGroup').hidden = !sh;
		if (!sh) return;
		$('shadeToggle').checked = state.shade;
		$('shadeField').hidden = !state.shade;
		$('shadeHint').textContent = 'Multiplica «' + sh.name + '» sobre la capa activa';
		if (!state.shade) return;
		shadeLayer = L.tileLayer(sh.url, {
			tms: sh.tms, maxNativeZoom: sh.maxZoom, maxZoom: 14, pane: 'shade', opacity: state.shadeOpacity, keepBuffer: 3
		}).addTo(map);
	}
	$('shadeToggle').addEventListener('change', function () { state.shade = this.checked; updateShade(); });
	$('shadeRange').addEventListener('input', function () {
		state.shadeOpacity = this.value / 100;
		$('shadeOut').textContent = this.value + ' %';
		if (shadeLayer) shadeLayer.setOpacity(state.shadeOpacity);
	});

	/* ------------------------------------------------------------------ lugares */

	var markerGroup = L.layerGroup().addTo(map);
	var lastRandom = null;

	function placeKind(p) { return p.t === 'm' ? 'Misión' + (p.year ? ' · ' + p.year : '') : 'Relieve'; }

	function visiblePlaces() {
		var q = plain(state.query.trim());
		return state.body.places.filter(function (p) {
			if (state.filter !== 'all' && p.t !== state.filter) return false;
			return !q || plain(p.name + ' ' + p.text).indexOf(q) !== -1;
		});
	}

	function openPlace(p, latlng) {
		var r = visibleRect(), s = map.getSize();
		L.popup({
			className: 'placepopup',
			maxWidth: 280,
			offset: [0, -6],
			autoPanPaddingTopLeft: [r.left + 16, r.top + 16],
			autoPanPaddingBottomRight: [s.x - r.right + 16, s.y - r.bottom + 16]
		})
			.setLatLng(latlng)
			.setContent(
				'<span class="placepopup__kind placepopup__kind--' + p.t + '">' + esc(placeKind(p)) + '</span>' +
				'<strong class="placepopup__name">' + esc(p.name) + '</strong>' +
				'<p>' + esc(p.text) + '</p>' +
				'<span class="placepopup__coords">' + fmtLatLng(p, 2) + '</span>')
			.openOn(map);
	}

	function renderMarkers() {
		markerGroup.clearLayers();
		if (!state.markers) return;
		visiblePlaces().forEach(function (p) {
			// Una copia por cada «mundo» vecino, para que no desaparezcan al cruzar el antimeridiano
			[-360, 0, 360].forEach(function (shift) {
				var ll = L.latLng(p.lat, p.lng + shift);
				L.marker(ll, {
					icon: L.divIcon({ className: 'pin pin--' + p.t, html: '<i></i>', iconSize: [26, 26], iconAnchor: [13, 13] }),
					title: p.name,
					alt: p.name,
					riseOnHover: true,
					keyboard: shift === 0
				}).on('click', function () { openPlace(p, ll); }).addTo(markerGroup);
			});
		});
	}

	function renderPlaces() {
		var list = visiblePlaces();
		$('placelist').innerHTML = list.length ? list.map(function (p) {
			return '<li><button type="button" class="place" data-place="' + state.body.places.indexOf(p) + '">' +
				'<span class="pin pin--' + p.t + '" aria-hidden="true"><i></i></span>' +
				'<span class="place__text"><strong>' + esc(p.name) + '</strong><small>' + esc(placeKind(p)) + ' · ' + fmtLatLng(p, 1) + '</small></span>' +
				'</button></li>';
		}).join('') : '<li class="placelist__empty">Ningún lugar coincide con la búsqueda.</li>';
		renderMarkers();
	}

	function flyToPlace(p) {
		if (isMobile()) setPanelClosed(true);
		var c = map.getCenter();
		var ll = L.latLng(p.lat, p.lng + 360 * Math.round((c.lng - p.lng) / 360));
		var zoom = fitZoom(p.zoom || 6);
		map.closePopup();
		map.flyTo(centerFor(ll, zoom), zoom, { duration: 1.6 });
		map.once('moveend', function () { openPlace(p, ll); });
	}

	$('placelist').addEventListener('click', function (e) {
		var btn = e.target.closest('.place');
		if (btn) flyToPlace(state.body.places[+btn.dataset.place]);
	});
	$('placeSearch').addEventListener('input', function () { state.query = this.value; renderPlaces(); });
	$('placeFilter').addEventListener('click', function (e) {
		var chip = e.target.closest('[data-filter]');
		if (!chip) return;
		state.filter = chip.dataset.filter;
		[].forEach.call(this.querySelectorAll('[data-filter]'), function (c) { c.classList.toggle('is-active', c === chip); });
		renderPlaces();
	});
	$('markersToggle').addEventListener('change', function () { state.markers = this.checked; renderMarkers(); });
	$('randomPlace').addEventListener('click', function () {
		var list = visiblePlaces();
		if (!list.length) list = state.body.places;
		var pick;
		do { pick = list[Math.floor(Math.random() * list.length)]; } while (list.length > 1 && pick === lastRandom);
		lastRandom = pick;
		flyToPlace(pick);
	});

	/* ------------------------------------------------------------------ medición */

	var measure = { active: false, pts: [], group: L.layerGroup().addTo(map), rubber: null, label: null };
	var lineStyle = function () { return { color: accent(), weight: 3, opacity: 0.95, interactive: false }; };

	function accent() { return getComputedStyle(app).getPropertyValue('--accent').trim() || '#fff'; }

	function measureTotalKm(extra) {
		var pts = extra ? measure.pts.concat([extra]) : measure.pts, total = 0;
		for (var i = 1; i < pts.length; i++) total += angularDistance(pts[i - 1], pts[i]);
		return total * state.body.radiusKm;
	}

	function drawMeasure() {
		measure.group.clearLayers();
		measure.rubber = null;
		var pts = measure.pts;
		for (var i = 1; i < pts.length; i++) L.polyline(geodesic(pts[i - 1], pts[i]), lineStyle()).addTo(measure.group);
		pts.forEach(function (p) {
			L.circleMarker(p, { radius: 5, color: '#0a0d14', weight: 2, fillColor: accent(), fillOpacity: 1, interactive: false }).addTo(measure.group);
		});
		if (pts.length > 1) {
			L.tooltip({ permanent: true, direction: 'top', offset: [0, -8], className: 'measuretip' })
				.setLatLng(pts[pts.length - 1]).setContent(fmtDistance(measureTotalKm())).addTo(measure.group);
		}
		var res = $('measureResult');
		res.hidden = pts.length < 2;
		if (pts.length > 1) {
			var n = pts.length - 1;
			res.innerHTML = '<b>' + fmtDistance(measureTotalKm()) + '</b> sobre ' + esc(state.body.name) + ' · ' + n + (n === 1 ? ' tramo' : ' tramos');
		}
		$('measureClear').hidden = !pts.length;
	}

	function measureClick(e) {
		var p = e.latlng, pts = measure.pts;
		if (pts.length) {
			// El punto se guarda donde termina el arco más corto, que puede ser otra copia del mundo
			var arc = geodesic(pts[pts.length - 1], p);
			p = L.latLng(p.lat, arc[arc.length - 1].lng);
		}
		pts.push(p);
		drawMeasure();
	}
	function measureMove(e) {
		var pts = measure.pts;
		if (!pts.length) return;
		var arc = geodesic(pts[pts.length - 1], e.latlng);
		if (measure.rubber) measure.rubber.setLatLngs(arc);
		else measure.rubber = L.polyline(arc, L.extend(lineStyle(), { dashArray: '6 8', weight: 2, opacity: 0.8 })).addTo(measure.group);
		setHint('Total: ' + fmtDistance(measureTotalKm(e.latlng)) + ' · doble clic o Esc para terminar', true);
	}
	function measureStart() {
		measure.active = true;
		measure.pts = [];
		drawMeasure();
		map.closePopup();
		map.doubleClickZoom.disable();
		map.getContainer().classList.add('is-measuring');
		map.on('click', measureClick).on('mousemove', measureMove).on('dblclick', measureStop);
		$('measureStart').textContent = 'Terminar';
		setHint('Haz clic en el mapa para añadir puntos', true);
		if (isMobile()) setPanelClosed(true);
	}
	function measureStop() {
		if (!measure.active) return;
		measure.active = false;
		map.off('click', measureClick).off('mousemove', measureMove).off('dblclick', measureStop);
		map.getContainer().classList.remove('is-measuring');
		setTimeout(function () { map.doubleClickZoom.enable(); }, 300);
		// El doble clic añade dos veces el último punto
		var pts = measure.pts, n = pts.length;
		if (n > 1 && angularDistance(pts[n - 1], pts[n - 2]) < 1e-7) pts.pop();
		drawMeasure();
		$('measureStart').textContent = pts.length ? 'Medir de nuevo' : 'Empezar a medir';
		setHint(null);
	}
	function measureClear() {
		measureStop();
		measure.pts = [];
		drawMeasure();
		$('measureStart').textContent = 'Empezar a medir';
	}
	$('measureStart').addEventListener('click', function () { if (measure.active) measureStop(); else measureStart(); });
	$('measureClear').addEventListener('click', measureClear);
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape') measureStop(); });

	function setHint(text, withStop) {
		var el = $('hint');
		el.hidden = !text;
		if (!text) return;
		el.innerHTML = '<span>' + esc(text) + '</span>' + (withStop ? '<button type="button" class="btn btn--accent">Terminar</button>' : '');
	}
	$('hint').addEventListener('click', function (e) { if (e.target.closest('button')) measureStop(); });

	/* ------------------------------------------------------------------ comparación de tamaños */

	var sizeTool = { on: false, group: L.layerGroup().addTo(map), center: null, poly: null };
	var iberiaShape = (function () {
		var c = { lat: DATA.iberia.center[0], lng: DATA.iberia.center[1] };
		return DATA.iberia.ring.map(function (v) {
			var p = { lat: v[0], lng: v[1] };
			return { bearing: initialBearing(c, p), dist: angularDistance(c, p) };
		});
	})();

	function sizeFits() {
		var ratio = EARTH_KM / state.body.radiusKm;
		return Math.max.apply(null, iberiaShape.map(function (s) { return s.dist * ratio; })) < Math.PI / 2;
	}
	function sizeRing() {
		var ratio = EARTH_KM / state.body.radiusKm, c = sizeTool.center;
		return iberiaShape.map(function (s) {
			var d = destination(c, s.bearing, s.dist * ratio);
			return L.latLng(Math.max(-MAX_LAT, Math.min(MAX_LAT, d.lat)), c.lng + wrapLng(d.lng - c.lng));
		});
	}
	function updateSize() {
		var body = state.body, fits = sizeFits();
		var areaBody = 4 * Math.PI * body.radiusKm * body.radiusKm;
		var times = areaBody / DATA.iberia.areaKm2;
		$('sizeResult').innerHTML = fits
			? 'La superficie de ' + esc(body.name) + ' equivale a unas <b>' + fmt(times, 0) + '</b> penínsulas ibéricas.'
			: esc(body.name) + ' entero mide unos ' + fmt(Math.round(areaBody / 10) * 10, 0) + ' km²: cabría <b>' + fmt(Math.round(1 / times / 10) * 10, 0) + ' veces</b> dentro de la Península Ibérica, así que no hay forma de dibujarla encima.';
		$('sizeToggle').disabled = !fits;
		$('sizeToggle').textContent = sizeTool.on && fits ? 'Quitar la Península' : 'Colocar la Península';

		sizeTool.group.clearLayers();
		sizeTool.poly = null;
		if (!sizeTool.on || !fits) return;
		if (!sizeTool.center) sizeTool.center = visibleCenter();
		sizeTool.poly = L.polygon(sizeRing(), {
			color: accent(), weight: 2, fillColor: accent(), fillOpacity: 0.22, interactive: false
		}).addTo(sizeTool.group);
		L.marker(sizeTool.center, {
			draggable: true,
			autoPan: true,
			zIndexOffset: 1000,
			title: 'Arrastra para mover la Península Ibérica',
			icon: L.divIcon({
				className: 'sizehandle',
				html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/></svg>',
				iconSize: [34, 34], iconAnchor: [17, 17]
			})
		}).on('drag', function (e) {
			sizeTool.center = e.target.getLatLng();
			sizeTool.poly.setLatLngs(sizeRing());
		}).bindTooltip('Península Ibérica, a escala', { permanent: true, direction: 'bottom', offset: [0, 16], className: 'measuretip' })
			.addTo(sizeTool.group);
	}
	$('sizeToggle').addEventListener('click', function () {
		sizeTool.on = !sizeTool.on;
		sizeTool.center = null;
		updateSize();
		if (sizeTool.on && isMobile()) setPanelClosed(true);
	});

	/* ------------------------------------------------------------------ retícula */

	var gridGroup = L.layerGroup().addTo(map);

	function gridStep(zoom) {
		return zoom <= 2 ? 30 : zoom <= 4 ? 15 : zoom === 5 ? 10 : zoom === 6 ? 5 : zoom === 7 ? 2 : 1;
	}
	function drawGrid() {
		gridGroup.clearLayers();
		if (!state.grid) return;
		var step = gridStep(map.getZoom());
		var b = map.getBounds().pad(0.15), r = visibleRect();
		var west = Math.floor(b.getWest() / step) * step, east = Math.ceil(b.getEast() / step) * step;
		var south = Math.floor(b.getSouth() / step) * step, north = Math.ceil(b.getNorth() / step) * step;
		var labelLat = map.containerPointToLatLng([0, r.top + 10]).lat;
		var labelLng = map.containerPointToLatLng([r.left + 8, 0]).lng;
		var color = accent();
		function label(latlng, text, cls) {
			L.marker(latlng, {
				pane: 'grid', interactive: false, keyboard: false,
				icon: L.divIcon({ className: 'gridlabel ' + cls, html: '<span>' + text + '</span>', iconSize: [0, 0] })
			}).addTo(gridGroup);
		}
		for (var lng = west; lng <= east; lng += step) {
			var main = wrapLng(lng) === 0;
			L.polyline([[-MAX_LAT, lng], [MAX_LAT, lng]], { pane: 'grid', color: color, weight: main ? 1.6 : 1, opacity: main ? 0.75 : 0.38, interactive: false }).addTo(gridGroup);
			label([labelLat, lng], main ? '0°' : fmtLng(lng, 0), 'gridlabel--lng');
		}
		for (var lat = south; lat <= north; lat += step) {
			if (Math.abs(lat) > 80) continue;
			L.polyline([[lat, west], [lat, east]], { pane: 'grid', color: color, weight: lat === 0 ? 1.6 : 1, opacity: lat === 0 ? 0.75 : 0.38, interactive: false }).addTo(gridGroup);
			label([lat, labelLng], lat === 0 ? '0°' : fmtLat(lat, 0), 'gridlabel--lat');
		}
	}
	map.on('moveend zoomend', drawGrid);
	$('gridToggle').addEventListener('change', function () { state.grid = this.checked; drawGrid(); });
	$('lonToggle').addEventListener('change', function () {
		state.lon360 = this.checked;
		drawGrid();
		renderPlaces();
		updateCoords();
	});

	/* ------------------------------------------------------------------ coordenadas, escala y enlace */

	var pointer = null;
	function updateCoords() {
		var ll = pointer || visibleCenter();
		$('coords').textContent = fmtLatLng(ll, 3);
		$('coords').dataset.copy = ll.lat.toFixed(5) + ', ' + wrapLng(ll.lng).toFixed(5);
	}
	function updateScale() {
		var c = map.getCenter();
		var kmPerPx = 2 * Math.PI * state.body.radiusKm * Math.cos(rad(c.lat)) / (256 * Math.pow(2, map.getZoom()));
		var maxKm = kmPerPx * 110;
		var pow = Math.pow(10, Math.floor(Math.log(maxKm) / Math.LN10));
		var nice = maxKm / pow >= 5 ? 5 * pow : maxKm / pow >= 2 ? 2 * pow : pow;
		$('scaleBar').style.width = Math.round(nice / kmPerPx) + 'px';
		$('scaleText').textContent = nice >= 1 ? fmt(nice, 0) + ' km' : fmt(nice * 1000, 0) + ' m';
	}
	map.on('mousemove', function (e) { pointer = e.latlng; updateCoords(); });
	map.on('mouseout', function () { pointer = null; updateCoords(); });
	map.on('move', function () { if (!pointer) updateCoords(); updateScale(); });
	$('coords').addEventListener('click', function () { copyText(this.dataset.copy, 'Coordenadas copiadas: ' + this.dataset.copy); });

	function writeHash() {
		if (!state.body || !state.layer || !map._loaded) return;
		var c = map.getCenter();
		var parts = [state.body.id, state.layer, map.getZoom(), c.lat.toFixed(3), wrapLng(c.lng).toFixed(3)];
		if (state.compare && state.compareLayer) parts.push(state.compareLayer);
		lastHash = '#' + parts.join('/');
		if (location.hash !== lastHash) history.replaceState(null, '', lastHash);
	}
	function readHash() {
		var parts = location.hash.replace(/^#/, '').split('/');
		var body = findBody(parts[0]);
		if (!body) return null;
		var view = null, z = parseInt(parts[2], 10), lat = parseFloat(parts[3]), lng = parseFloat(parts[4]);
		if (isFinite(z) && isFinite(lat) && isFinite(lng)) view = { zoom: z, lat: Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)), lng: wrapLng(lng), exact: true };
		return { body: body, layer: findLayer(body, parts[1]) ? parts[1] : null, view: view, compare: findLayer(body, parts[5]) ? parts[5] : null };
	}
	map.on('moveend', writeHash);
	window.addEventListener('hashchange', function () {
		if (location.hash === lastHash) return;
		var h = readHash();
		if (h) setBody(h.body.id, h);
	});
	$('copyLink').addEventListener('click', function () {
		writeHash();
		copyText(location.href, 'Enlace copiado al portapapeles');
	});

	/* ------------------------------------------------------------------ astros */

	function renderBodies() {
		$('bodies').innerHTML = DATA.bodies.map(function (b) {
			return '<button type="button" class="body" role="tab" data-body="' + b.id + '" aria-selected="false">' +
				'<span class="orb orb--' + b.id + '" aria-hidden="true"></span><span>' + esc(b.name) + '</span></button>';
		}).join('');
	}
	$('bodies').addEventListener('click', function (e) {
		var btn = e.target.closest('.body');
		if (btn && btn.dataset.body !== state.body.id) setBody(btn.dataset.body);
	});

	function renderBodyCard() {
		var b = state.body;
		$('bodycard').innerHTML =
			'<span class="orb orb--lg orb--' + b.id + '" aria-hidden="true"></span>' +
			'<div class="bodycard__title"><h2>' + esc(b.name) + '</h2><p>' + esc(b.kicker) + '</p></div>' +
			'<dl class="facts">' + b.facts.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl>';
	}

	function renderCredits() {
		$('credits').innerHTML = DATA.bodies.map(function (b) {
			return '<li><strong>' + esc(b.name) + '</strong>' + b.layers.map(function (d) {
				return '<span>' + esc(d.name) + ' — ' + esc(d.attribution) + '</span>';
			}).join('') + '</li>';
		}).join('');
	}

	function setBody(id, opts) {
		opts = opts || {};
		var body = findBody(id) || findBody(DATA.defaultBody);
		var changed = state.body !== body;
		state.body = body;
		app.dataset.body = body.id;
		document.title = body.name + ' · Explorador planetario';

		[].forEach.call($('bodies').children, function (btn) {
			var on = btn.dataset.body === body.id;
			btn.classList.toggle('is-active', on);
			btn.setAttribute('aria-selected', on);
		});

		if (changed) {
			map.closePopup();
			measureClear();
			sizeTool.center = null;
			state.compareLayer = null;
			state.query = '';
			$('placeSearch').value = '';
			if (!body.shade) state.shade = false;
		}
		if (opts.compare) { state.compare = true; state.compareLayer = opts.compare; }

		renderBodyCard();

		// La vista se fija antes de añadir capas para no pedir teselas de la vista anterior
		map.setMaxZoom(14);
		var v = opts.view || body.view;
		var zoom = Math.max(map.getMinZoom(), v.zoom);
		var target = L.latLng(v.lat, v.lng);
		map.setView(v.exact ? target : centerFor(target, zoom), zoom, { animate: false });

		setLayer(opts.layer || body.defaultLayer);
		updateShade();
		renderPlaces();
		updateSize();
		drawGrid();
		updateCoords();
		updateScale();
	}

	/* ------------------------------------------------------------------ panel y pestañas */

	function setPanelClosed(closed) {
		app.classList.toggle('panel-closed', closed);
		$('sideToggle').setAttribute('aria-expanded', !closed);
		$('sideToggle').setAttribute('aria-label', closed ? 'Mostrar el panel' : 'Ocultar el panel');
	}
	function activateTab(name) {
		[].forEach.call(document.querySelectorAll('.tab'), function (t) {
			var on = t.dataset.tab === name;
			t.classList.toggle('is-active', on);
			t.setAttribute('aria-selected', on);
		});
		[].forEach.call(document.querySelectorAll('.pane'), function (p) {
			var on = p.dataset.pane === name;
			p.classList.toggle('is-active', on);
			p.hidden = !on;
		});
	}
	document.querySelector('.tabs').addEventListener('click', function (e) {
		var tab = e.target.closest('.tab');
		if (!tab) return;
		var wasActive = tab.classList.contains('is-active');
		var closed = app.classList.contains('panel-closed');
		activateTab(tab.dataset.tab);
		if (isMobile()) setPanelClosed(wasActive && !closed);
	});
	$('sideToggle').addEventListener('click', function () { setPanelClosed(!app.classList.contains('panel-closed')); });
	$('sheetGrab').addEventListener('click', function () { setPanelClosed(!app.classList.contains('panel-closed')); });
	map.on('click', function () { if (isMobile() && !measure.active) setPanelClosed(true); });

	// Los paneles flotan sobre el mapa: que sus gestos no lo muevan
	['side', 'hud', 'hint', 'swipe', 'empty', 'sideToggle'].forEach(function (id) {
		L.DomEvent.disableClickPropagation($(id));
		L.DomEvent.disableScrollPropagation($(id));
	});

	function measureChrome() {
		app.style.setProperty('--topbar-h', Math.round(document.querySelector('.topbar').getBoundingClientRect().bottom) + 'px');
	}
	window.addEventListener('resize', function () {
		measureChrome();
		updateMinZoom();
		clipCompare();
	});

	/* ------------------------------------------------------------------ arranque */

	renderBodies();
	renderCredits();
	setPanelClosed(isMobile());
	measureChrome();
	updateMinZoom();

	var start = readHash();
	setBody(start ? start.body.id : DATA.defaultBody, start || {});
})();
