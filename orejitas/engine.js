// Orejitas · motor de audio
// Todos los sonidos se generan en tiempo real con la Web Audio API.
// El mismo código funciona en un AudioContext normal (la app) y en un
// OfflineAudioContext (herramienta de control de calidad en tools/).

const LOOKAHEAD = 3.0; // segundos que se programan por adelantado (bucles)
const TICK_MS = 250; // cada cuánto se rellena la cola de eventos
export const NOISE_RMS = 0.25; // nivel RMS de los buffers de ruido

// ---------------------------------------------------------------------------
// Buffers compartidos (ruido, "polvo" de impulsos, curvas de saturación)
// ---------------------------------------------------------------------------

const caches = new WeakMap();
function cacheFor(ctx) {
  let c = caches.get(ctx);
  if (!c) caches.set(ctx, (c = new Map()));
  return c;
}

function normalizeRms(d, target) {
  let sum = 0;
  for (let i = 0; i < d.length; i++) sum += d[i] * d[i];
  const rms = Math.sqrt(sum / d.length) || 1;
  const k = target / rms;
  for (let i = 0; i < d.length; i++) d[i] *= k;
}

// Ruido blanco, rosa o marrón. Se genera algo más largo de lo necesario y
// se funde el final con el principio para que el bucle no tenga saltos.
export function noiseBuffer(ctx, color = 'white', channels = 1, seconds = 10) {
  const key = `noise:${color}:${channels}:${seconds}`;
  const cache = cacheFor(ctx);
  if (cache.has(key)) return cache.get(key);

  const sr = ctx.sampleRate;
  const n = Math.floor(sr * seconds);
  const fade = Math.floor(sr * 0.5);
  const buf = ctx.createBuffer(channels, n, sr);
  for (let c = 0; c < channels; c++) {
    const raw = new Float32Array(n + fade);
    if (color === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < raw.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        raw[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
        b6 = w * 0.115926;
      }
    } else if (color === 'brown') {
      let last = 0;
      for (let i = 0; i < raw.length; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        raw[i] = last;
      }
      // quitar componente continua
      let mean = 0;
      for (let i = 0; i < raw.length; i++) mean += raw[i];
      mean /= raw.length;
      for (let i = 0; i < raw.length; i++) raw[i] -= mean;
    } else {
      for (let i = 0; i < raw.length; i++) raw[i] = Math.random() * 2 - 1;
    }
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = raw[i];
    // fundido de potencia constante: el final enlaza con el principio
    for (let i = 0; i < fade; i++) {
      const x = i / fade;
      d[i] = raw[i] * Math.sqrt(x) + raw[n + i] * Math.sqrt(1 - x);
    }
    normalizeRms(d, NOISE_RMS);
  }
  cache.set(key, buf);
  return buf;
}

// "Polvo": impulsos dispersos al azar (gotas, chasquidos, crepitar).
// density = impulsos por segundo. grain = duración de cada impulso (s).
export function dustBuffer(ctx, density = 20, { seconds = 10, grain = 0, channels = 1 } = {}) {
  const key = `dust:${density}:${seconds}:${grain}:${channels}`;
  const cache = cacheFor(ctx);
  if (cache.has(key)) return cache.get(key);
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(channels, n, sr);
  const g = Math.max(1, Math.floor(grain * sr));
  for (let c = 0; c < channels; c++) {
    const d = buf.getChannelData(c);
    const count = Math.round(density * seconds);
    for (let k = 0; k < count; k++) {
      const pos = Math.floor(Math.random() * (n - g));
      // amplitudes con distribución exponencial: muchas suaves, pocas fuertes
      const amp = Math.min(1, -Math.log(1 - Math.random()) * 0.35);
      const sign = Math.random() < 0.5 ? -1 : 1;
      if (g === 1) d[pos] += amp * sign;
      else for (let i = 0; i < g; i++) d[pos + i] += amp * (Math.random() * 2 - 1) * (1 - i / g) ** 2;
    }
  }
  cache.set(key, buf);
  return buf;
}

// Curva de saturación suave (tanh)
export function driveCurve(ctx, amount = 2) {
  const key = `curve:${amount}`;
  const cache = cacheFor(ctx);
  if (cache.has(key)) return cache.get(key);
  const len = 2048;
  const curve = new Float32Array(len);
  const norm = Math.tanh(amount);
  for (let i = 0; i < len; i++) {
    const x = (i / (len - 1)) * 2 - 1;
    curve[i] = Math.tanh(amount * x) / norm;
  }
  cache.set(key, curve);
  return curve;
}

// Respuesta al impulso sintética para la reverberación compartida
function impulseResponse(ctx, seconds = 2.6, decay = 3.2) {
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      // ruido filtrado (más oscuro al final) con caída exponencial
      const w = Math.random() * 2 - 1;
      const k = 0.15 + 0.75 * (1 - t);
      lp += k * (w - lp);
      d[i] = lp * Math.pow(1 - t, decay) * (i < sr * 0.004 ? i / (sr * 0.004) : 1);
    }
  }
  return buf;
}

// ---------------------------------------------------------------------------
// Bus maestro: voces → limitador → salida, más una reverb compartida
// ---------------------------------------------------------------------------

export function createBus(ctx, { limiter = true } = {}) {
  const input = ctx.createGain();
  const master = ctx.createGain();
  master.gain.value = 1;
  let comp = null;
  if (limiter) {
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.knee.value = 3;
    comp.ratio.value = 20;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    input.connect(comp).connect(master);
  } else {
    input.connect(master);
  }
  master.connect(ctx.destination);

  const reverbIn = ctx.createGain();
  const reverb = ctx.createConvolver();
  reverb.buffer = impulseResponse(ctx);
  const reverbOut = ctx.createGain();
  reverbOut.gain.value = 0.6;
  reverbIn.connect(reverb).connect(reverbOut).connect(input);

  return { ctx, input, master, reverbIn, comp };
}

// ---------------------------------------------------------------------------
// Voice: un sonido en reproducción. Las recetas reciben una Voice (v) y usan
// sus utilidades para crear nodos, envolventes y eventos programados.
// ---------------------------------------------------------------------------

export class Voice {
  constructor(ctx, bus, { offline = false, renderEnd = 0, gain = 1, fadeIn = 0 } = {}) {
    this.ctx = ctx;
    this.bus = bus;
    this.offline = offline;
    this.renderEnd = renderEnd;
    this.sr = ctx.sampleRate;
    this.t0 = offline ? 0.02 : ctx.currentTime + 0.03;
    this.stopped = false;
    this.onended = null;

    // Dos caminos (directo y reverb) con la misma ganancia de normalización y
    // un único control de fundido (_level) que gobierna ambos.
    this.out = ctx.createGain(); // destino por defecto de las recetas
    this.out.gain.value = gain;
    this._wet = ctx.createGain(); // entrada de los envíos a reverb (v.send)
    this._wet.gain.value = gain;
    this._fader = ctx.createGain();
    this._wetFader = ctx.createGain();
    this._fader.gain.value = 0;
    this._wetFader.gain.value = 0;
    this._ctl = ctx.createConstantSource();
    this._ctl.offset.value = 1;
    this._ctl.connect(this._fader.gain);
    this._ctl.connect(this._wetFader.gain);
    this._ctl.start(offline ? 0 : ctx.currentTime);
    this._level = this._ctl.offset;
    this.out.connect(this._fader).connect(bus.input);
    this._wet.connect(this._wetFader).connect(bus.reverbIn);
    if (fadeIn > 0) {
      this._level.setValueAtTime(0, this.t0);
      this._level.linearRampToValueAtTime(1, this.t0 + fadeIn);
    }
    this._sources = new Set();
    this._timers = new Set();
    this._loops = [];
    this._interval = null;
  }

  // ---- azar -------------------------------------------------------------
  rand(a = 0, b = 1) { return a + Math.random() * (b - a); }
  irand(a, b) { return Math.floor(this.rand(a, b + 1)); }
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  chance(p) { return Math.random() < p; }
  vary(x, amount = 0.05) { return x * (1 + this.rand(-amount, amount)); }
  now() { return this.offline ? this.t0 : Math.max(this.t0, this.ctx.currentTime); }

  // ---- creación de nodos -------------------------------------------------
  _start(node, t, stop) {
    node.start(Math.max(t, 0));
    if (stop != null) node.stop(Math.max(stop, t + 0.001));
    this._sources.add(node);
    node.onended = () => this._sources.delete(node);
    return node;
  }

  osc(type = 'sine', freq = 440, t = this.t0, stop) {
    const o = this.ctx.createOscillator();
    if (typeof type === 'string') o.type = type;
    else o.setPeriodicWave(type);
    o.frequency.setValueAtTime(freq, Math.max(t, 0));
    return this._start(o, t, stop);
  }

  // Onda periódica a partir de amplitudes de armónicos [a1, a2, a3...]
  wave(harmonics) {
    const real = new Float32Array(harmonics.length + 1);
    const imag = new Float32Array(harmonics.length + 1);
    harmonics.forEach((a, i) => { imag[i + 1] = a; });
    return this.ctx.createPeriodicWave(real, imag);
  }

  noise(color = 'white', { t = this.t0, stop, stereo = false, rate = 1 } = {}) {
    const buf = noiseBuffer(this.ctx, color, stereo ? 2 : 1);
    return this.buffer(buf, { t, stop, loop: true, rate, offset: Math.random() * buf.duration });
  }

  dust(density = 20, { t = this.t0, stop, grain = 0, stereo = false, rate = 1 } = {}) {
    const buf = dustBuffer(this.ctx, density, { grain, channels: stereo ? 2 : 1 });
    return this.buffer(buf, { t, stop, loop: true, rate, offset: Math.random() * buf.duration });
  }

  buffer(buf, { t = this.t0, stop, loop = false, rate = 1, offset = 0 } = {}) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = loop;
    s.playbackRate.value = rate;
    s.start(Math.max(t, 0), offset % buf.duration);
    if (stop != null) s.stop(Math.max(stop, t + 0.001));
    this._sources.add(s);
    s.onended = () => this._sources.delete(s);
    return s;
  }

  // Constante como fuente de señal (útil para sumar a parámetros)
  constant(value = 1, t = this.t0, stop) {
    const c = this.ctx.createConstantSource();
    c.offset.value = value;
    return this._start(c, t, stop);
  }

  gain(value = 1) {
    const g = this.ctx.createGain();
    g.gain.value = value;
    return g;
  }

  filter(type = 'lowpass', freq = 1000, Q = 0.707, gainDb = 0) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = Q;
    f.gain.value = gainDb;
    return f;
  }
  lp(freq, Q = 0.707) { return this.filter('lowpass', freq, Q); }
  hp(freq, Q = 0.707) { return this.filter('highpass', freq, Q); }
  bp(freq, Q = 1) { return this.filter('bandpass', freq, Q); }

  pan(x = 0) {
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = x;
      return p;
    }
    return this.gain(1);
  }

  shaper(amount = 2) {
    const s = this.ctx.createWaveShaper();
    s.curve = driveCurve(this.ctx, amount);
    s.oversample = '2x';
    return s;
  }

  delay(time = 0.1, max = 2) {
    const d = this.ctx.createDelay(max);
    d.delayTime.value = time;
    return d;
  }

  // Conecta en serie y devuelve el último nodo (o parámetro)
  chain(...nodes) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return nodes[nodes.length - 1];
  }

  // Envía un nodo a la reverb compartida
  send(node, amount = 0.3) {
    const g = this.gain(amount);
    node.connect(g);
    g.connect(this._wet);
    return g;
  }

  // ---- envolventes --------------------------------------------------------
  // points: [[dt, valor, curva?], ...] relativos a t. curva: 'lin' (defecto,
  // rampa que TERMINA en dt), 'exp', 'set' o un número: setTargetAtTime que
  // EMPIEZA en dt con esa constante de tiempo (se acerca al valor sin llegar).
  env(param, points, t = this.t0) {
    let end = t;
    points.forEach(([dt, value, curve], i) => {
      const at = Math.max(t + dt, 0);
      if (i === 0 || curve === 'set') param.setValueAtTime(value, at);
      else if (curve === 'exp') param.exponentialRampToValueAtTime(Math.max(value, 1e-4), at);
      else if (typeof curve === 'number') param.setTargetAtTime(value, at, curve);
      else param.linearRampToValueAtTime(value, at);
      end = Math.max(end, at);
    });
    return end;
  }

  // Envolvente de percusión: subida corta y caída exponencial
  perc(param, t = this.t0, { a = 0.005, decay = 0.3, peak = 1 } = {}) {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + a);
    param.setTargetAtTime(0, t + a, decay / 5);
    return t + a + decay;
  }

  // ADSR clásica; devuelve el instante final
  adsr(param, { t = this.t0, a = 0.01, d = 0.1, s = 0.7, hold = 0.3, r = 0.2, peak = 1 } = {}) {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + a);
    param.linearRampToValueAtTime(peak * s, t + a + d);
    param.setValueAtTime(peak * s, t + a + d + hold);
    param.linearRampToValueAtTime(0, t + a + d + hold + r);
    return t + a + d + hold + r;
  }

  // Oscilador de baja frecuencia sumado a un parámetro
  lfo(rate, depth, param, { type = 'sine', t = this.t0, stop } = {}) {
    const o = this.osc(type, rate, t, stop);
    const g = this.gain(depth);
    o.connect(g).connect(param);
    return { osc: o, gain: g };
  }

  // Bamboleo aleatorio suave (RMS ≈ depth) para dar naturalidad.
  // Úsalo con rate ≥ 0.5 Hz: por debajo se nota el bucle de 10 s del ruido.
  // Para derivas muy lentas, programa pasos con setTargetAtTime en v.loop.
  wobble(param, depth, rate = 6, { t = this.t0, stop } = {}) {
    const n = this.noise('white', { t, stop });
    const f = this.lp(rate, 0.5);
    const scale = depth / (NOISE_RMS * Math.sqrt((2.22 * rate) / this.sr));
    const g = this.gain(scale);
    n.connect(f).connect(g).connect(param);
    return g;
  }

  // ---- tiempo -------------------------------------------------------------
  // Ejecuta fn cerca del instante de audio t (en offline, inmediatamente)
  at(t, fn) {
    if (this.offline) { fn(); return; }
    const ms = Math.max(0, (t - this.ctx.currentTime - 0.05) * 1000);
    const id = setTimeout(() => { this._timers.delete(id); if (!this.stopped) fn(); }, ms);
    this._timers.add(id);
  }

  // Programador para sonidos continuos. fn(t) programa un evento en t y
  // devuelve el instante del siguiente. Funciona igual en offline.
  loop(fn, start = this.t0) {
    const L = { next: start, fn };
    if (this.offline) {
      let guard = 0;
      while (L.next < this.renderEnd && guard++ < 100000) {
        const n = fn(L.next);
        if (!(n > L.next)) break;
        L.next = n;
      }
      return;
    }
    this._loops.push(L);
    this._pump();
    if (!this._interval) this._interval = setInterval(() => this._pump(), TICK_MS);
  }

  _pump() {
    if (this.stopped) return;
    const now = this.ctx.currentTime;
    const horizon = now + LOOKAHEAD;
    for (const L of this._loops) {
      if (L.dead) continue;
      if (L.next < now) L.next = now + 0.05; // si el navegador se retrasó
      let guard = 0;
      while (L.next < horizon && guard++ < 1000) {
        const n = L.fn(L.next);
        if (!(n > L.next)) { L.dead = true; break; }
        L.next = n;
      }
    }
  }

  // ---- ciclo de vida --------------------------------------------------------
  // Para sonidos cortos: el motor llama a endAt con la duración de la receta.
  endAt(t) {
    if (this.offline) return;
    // pequeño fundido de seguridad para no cortar en seco ninguna cola
    this._level.setValueAtTime(1, t);
    this._level.linearRampToValueAtTime(0, t + 0.08);
    const ms = Math.max(0, (t - this.ctx.currentTime) * 1000) + 160;
    const id = setTimeout(() => this._dispose(), ms);
    this._timers.add(id);
  }

  // Temporizador de apagado: el fundido se programa en el reloj de audio, así
  // funciona aunque el navegador ralentice los temporizadores en segundo plano.
  scheduleEnd(at, fade = 10) {
    if (this.offline || this.stopped) return;
    this.clearScheduledEnd();
    const g = this._level;
    const now = this.ctx.currentTime;
    const start = Math.max(now + 0.05, at - fade);
    g.setValueAtTime(1, start);
    g.linearRampToValueAtTime(0, Math.max(at, start + 0.1));
    this._endTimer = setTimeout(() => this._dispose(), Math.max(0, at - now) * 1000 + 300);
  }

  clearScheduledEnd() {
    if (!this._endTimer) return;
    clearTimeout(this._endTimer);
    this._endTimer = null;
    const g = this._level;
    const now = this.ctx.currentTime;
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now);
    else { const v = g.value; g.cancelScheduledValues(now); g.setValueAtTime(v, now); }
    g.linearRampToValueAtTime(1, now + 0.5);
  }

  stop(fade = 0.12) {
    if (this.stopped) return;
    this.stopped = true;
    this.cancelled = true; // parada manual (no terminó por sí solo)
    this._clearTimers();
    const now = this.ctx.currentTime;
    const g = this._level;
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now);
    else { const v = g.value; g.cancelScheduledValues(now); g.setValueAtTime(v, now); }
    g.linearRampToValueAtTime(0, now + fade);
    setTimeout(() => this._dispose(true), (fade + 0.05) * 1000);
  }

  _clearTimers() {
    for (const id of this._timers) clearTimeout(id);
    this._timers.clear();
    if (this._endTimer) clearTimeout(this._endTimer);
    this._endTimer = null;
    if (this._interval) clearInterval(this._interval);
    this._interval = null;
    this._loops = [];
  }

  _dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.stopped = true;
    this._clearTimers();
    for (const s of this._sources) { try { s.stop(); } catch (e) { /* ya parada */ } }
    this._sources.clear();
    try { this._ctl.stop(); } catch (e) { /* nada */ }
    try { this._fader.disconnect(); this._wetFader.disconnect(); } catch (e) { /* nada */ }
    if (this.onended) { const cb = this.onended; this.onended = null; cb(); }
  }
}

// ---------------------------------------------------------------------------
// Engine: punto de entrada de la app. Un sonido a la vez.
// ---------------------------------------------------------------------------

export class Engine {
  constructor({ levels = {} } = {}) {
    this.ctx = null;
    this.bus = null;
    this.current = null;
    this.levels = levels;
    this._files = new Map();
  }

  // Debe llamarse dentro de un gesto del usuario (requisito de los navegadores)
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.bus = createBus(this.ctx);
      // iOS: que el audio suene aunque el interruptor de silencio esté activo
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* nada */ }
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
    return this.ctx;
  }

  // Reproduce un sonido del catálogo. Devuelve la Voice.
  play(sound, { onended } = {}) {
    this.unlock();
    this.stopCurrent(0.06);
    const loop = sound.kind === 'loop';
    const v = new Voice(this.ctx, this.bus, {
      gain: (this.levels[sound.id] ?? 1) * (sound.gain ?? 1),
      fadeIn: loop ? (sound.fadeIn ?? 1.2) : 0,
    });
    v.sound = sound;
    v.onended = () => {
      if (this.current === v) this.current = null;
      if (onended) onended(v);
    };
    this.current = v;
    if (sound.src) {
      this._playFile(v, sound);
    } else {
      // Las recetas cortas devuelven el instante (tiempo de audio) en que acaban
      const end = sound.play(v);
      if (!loop) v.endAt(end > v.t0 ? end : v.t0 + 2);
    }
    return v;
  }

  // Soporte para grabaciones reales: sound.src = 'audio/vaca.mp3'
  async _playFile(v, sound) {
    try {
      let buf = this._files.get(sound.src);
      if (!buf) {
        const res = await fetch(sound.src);
        buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
        this._files.set(sound.src, buf);
      }
      if (v.stopped) return;
      const loop = sound.kind === 'loop';
      const s = v.buffer(buf, { t: this.ctx.currentTime + 0.01, loop });
      s.connect(v.out);
      if (!loop) v.endAt(this.ctx.currentTime + buf.duration);
    } catch (e) {
      console.warn('No se pudo cargar', sound.src, e);
      v.stop(0.01);
    }
  }

  stopCurrent(fade = 0.12) {
    if (this.current) {
      const v = this.current;
      this.current = null;
      v.stop(fade);
    }
  }
}
