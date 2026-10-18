// Orejitas · instrumentos reutilizables para las recetas de sonidos.
// Todas las funciones reciben la Voice (v) y un objeto de opciones, y
// devuelven el instante (tiempo de audio) en el que terminan.

// ---------------------------------------------------------------------------
// Voces (animales): fuente + formantes en cascada + envolvente
// ---------------------------------------------------------------------------

// Formantes aproximados (Hz) y corte del paso bajo para cada "vocal".
// 'm' y 'n' simulan la boca cerrada / sonido nasal.
export const VOWELS = {
  a: { f: [800, 1200, 2500], lp: 4200 },
  e: { f: [450, 1900, 2600], lp: 4800 },
  i: { f: [300, 2300, 3000], lp: 5200 },
  o: { f: [500, 900, 2400], lp: 2600 },
  u: { f: [330, 750, 2300], lp: 1500 },
  m: { f: [250, 1000, 2300], lp: 450 },
  n: { f: [300, 1500, 2600], lp: 700 },
};

// Filtro de formantes en cascada: picos en F1, F2, F3 y un paso bajo.
// vowels: [[dt, 'a'], [dt, 'u'], ...] (se interpolan linealmente).
export function formants(v, input, vowels = [[0, 'a']], {
  t = v.t0, scale = 1, bright = 1, peaks = [14, 11, 9], q = [4, 6, 7],
} = {}) {
  const fs = [0, 1, 2].map((k) => v.filter('peaking', 1000, q[k], peaks[k]));
  const lp = v.lp(2000, 0.8);
  v.chain(input, fs[0], fs[1], fs[2], lp);
  vowels.forEach(([dt, name], i) => {
    const vw = typeof name === 'string' ? VOWELS[name] : name;
    const at = Math.max(t + dt, 0);
    const set = (p, val) => (i === 0 ? p.setValueAtTime(val, at) : p.linearRampToValueAtTime(val, at));
    fs.forEach((f, k) => set(f.frequency, Math.min(vw.f[k] * scale, 16000)));
    set(lp.frequency, Math.min(vw.lp * scale * bright, 18000));
  });
  return lp;
}

// Aplica una lista de puntos [[dt, valor, curva?]] a un parámetro, escalados.
function applyPoints(v, param, points, t, k = 1) {
  points.forEach(([dt, val, curve], i) => {
    const at = Math.max(t + dt, 0);
    const x = val * k;
    if (i === 0) param.setValueAtTime(x, at);
    else if (curve === 'exp') param.exponentialRampToValueAtTime(Math.max(x, 1e-3), at);
    else param.linearRampToValueAtTime(x, at);
  });
}

// Fuente glotal: armónicos que caen más rápido que en una onda de sierra
const glottalCache = new WeakMap();
export function glottalWave(v) {
  let w = glottalCache.get(v.ctx);
  if (!w) {
    w = v.wave(Array.from({ length: 80 }, (_, i) => 1 / Math.pow(i + 1, 1.45)));
    glottalCache.set(v.ctx, w);
  }
  return w;
}

// Voz sintética para animales.
//  pitch:   [[dt, Hz, curva?], ...] contorno de tono
//  amp:     [[dt, nivel], ...] envolvente (si no, ataque a / caída r)
//  vowels:  [[dt, 'a'], ...] evolución de la "boca"
//  scale:   escala de formantes (>1 animal pequeño, <1 grande)
//  vibrato: {rate, depth (cents), delay}
//  tremolo: {rate, depth (0..1)}  — a frecuencias altas da "gruñido"
//  jitter:  inestabilidad de tono (cents RMS)
//  sub:     nivel de subarmónico (aspereza grave)
//  detune:  cents de un segundo oscilador (coro / aspereza)
//  breath:  ruido de aliento mezclado en la fuente
//  drive:   saturación
//  type:    'glottal' (por defecto, más suave y natural), 'sawtooth', 'square'...
export function vocal(v, {
  t = v.t0, dur = 1, type = 'glottal',
  pitch = [[0, 200]], amp = null, a = 0.03, r = 0.15,
  vowels = [[0, 'a']], scale = 1, bright = 1, peaks, q,
  vibrato = null, tremolo = null, jitter = 15, sub = 0, detune = 0,
  breath = 0, breathColor = 'white', breathHp = 800, drive = 0,
  gain = 0.5, dest = v.out, pan = 0, reverb = 0,
} = {}) {
  const end = t + dur;
  const stop = end + 0.05;
  const src = v.gain(1);
  const oscs = [];
  const wave = type === 'glottal' ? glottalWave(v) : type;
  const mk = (ratio, level, cents) => {
    const o = v.osc(wave, pitch[0][1] * ratio, t, stop);
    applyPoints(v, o.frequency, pitch, t, ratio);
    if (cents) o.detune.value = cents;
    const g = v.gain(level);
    o.connect(g).connect(src);
    oscs.push(o);
  };
  mk(1, 1, 0);
  if (detune) mk(1, 0.6, detune);
  if (sub) mk(0.5, sub, 0);

  const mod = v.gain(1); // suma de moduladores de tono (en cents)
  oscs.forEach((o) => mod.connect(o.detune));
  if (vibrato) {
    const depth = v.gain(0);
    const d0 = t + (vibrato.delay || 0);
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(vibrato.depth, d0 + 0.1);
    v.osc('sine', vibrato.rate, t, stop).connect(depth).connect(mod);
  }
  if (jitter) v.wobble(mod, jitter, 9, { t, stop });

  if (breath) {
    const n = v.noise(breathColor, { t, stop });
    const g = v.gain(breath);
    v.chain(n, v.hp(breathHp), g, src);
  }

  let node = src;
  if (drive) node = v.chain(node, v.shaper(drive));
  const shaped = formants(v, node, vowels, { t, scale, bright, peaks, q });

  const env = v.gain(0);
  shaped.connect(env);
  if (amp) applyPoints(v, env.gain, amp, t);
  else {
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + a);
    env.gain.setValueAtTime(1, Math.max(t + a, end - r));
    env.gain.linearRampToValueAtTime(0, end);
  }
  let last = env;
  if (tremolo) {
    const tg = v.gain(1 - tremolo.depth / 2);
    v.lfo(tremolo.rate, tremolo.depth / 2, tg.gain, { t, stop });
    last = v.chain(last, tg);
  }
  const out = v.gain(gain);
  const p = v.pan(pan);
  v.chain(last, out, p, dest);
  if (reverb) v.send(p, reverb);
  return end;
}

// ---------------------------------------------------------------------------
// Tonos, barridos, golpes
// ---------------------------------------------------------------------------

// Tono simple con envolvente. glide: [[dt, Hz, curva?]]
export function tone(v, {
  t = v.t0, freq = 440, type = 'sine', dur = 0.5, a = 0.005, r = 0.1,
  glide = null, gain = 0.3, dest = v.out, pan = 0, reverb = 0, filter = null,
} = {}) {
  const end = t + dur;
  const o = v.osc(type, freq, t, end + 0.02);
  if (glide) applyPoints(v, o.frequency, glide, t);
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + a);
  env.gain.setValueAtTime(gain, Math.max(t + a, end - r));
  env.gain.linearRampToValueAtTime(0, end);
  let node = o;
  if (filter) node = v.chain(node, v.filter(filter.type || 'lowpass', filter.freq, filter.Q || 0.7));
  const p = v.pan(pan);
  v.chain(node, env, p, dest);
  if (reverb) v.send(p, reverb);
  return end;
}

// Barrido de tono con envolvente percusiva (pío, burbuja, "bip")
export function sweep(v, {
  t = v.t0, f0 = 1000, f1 = 2000, dur = 0.1, type = 'sine', curve = 'exp',
  a = 0.004, gain = 0.3, dest = v.out, pan = 0, reverb = 0,
} = {}) {
  const end = t + dur;
  const o = v.osc(type, f0, t, end + 0.02);
  if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), end);
  else o.frequency.linearRampToValueAtTime(f1, end);
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + a);
  env.gain.exponentialRampToValueAtTime(0.001, end);
  const p = v.pan(pan);
  v.chain(o, env, p, dest);
  if (reverb) v.send(p, reverb);
  return end;
}

// Ráfaga de ruido filtrado (golpes, chasquidos, palmas, soplidos)
export function hit(v, {
  t = v.t0, dur = 0.08, color = 'white', type = 'bandpass', freq = 1500, Q = 1,
  a = 0.001, gain = 0.5, dest = v.out, pan = 0, reverb = 0, sweepTo = null,
} = {}) {
  const end = t + dur;
  const n = v.noise(color, { t, stop: end + 0.02 });
  const f = v.filter(type, freq, Q);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, end);
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + a);
  env.gain.exponentialRampToValueAtTime(0.001, end);
  const p = v.pan(pan);
  v.chain(n, f, env, p, dest);
  if (reverb) v.send(p, reverb);
  return end;
}

// Golpe grave con caída de tono (latido, bombo, golpe en madera)
export function thump(v, {
  t = v.t0, f0 = 120, f1 = 45, dur = 0.3, gain = 0.8, click = 0.15,
  dest = v.out, pan = 0, reverb = 0,
} = {}) {
  const end = t + dur;
  const o = v.osc('sine', f0, t, end + 0.02);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur * 0.6);
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.001, end);
  const p = v.pan(pan);
  v.chain(o, env, p, dest);
  if (click) hit(v, { t, dur: 0.02, type: 'lowpass', freq: 2500, gain: click, dest: p });
  if (reverb) v.send(p, reverb);
  return end;
}

// ---------------------------------------------------------------------------
// Instrumentos afinados
// ---------------------------------------------------------------------------

// Parciales [relación, amplitud, factor de duración]
export const PARTIALS = {
  bell: [[1, 1, 1], [2, 0.35, 0.6], [2.76, 0.3, 0.5], [5.4, 0.14, 0.3], [8.93, 0.07, 0.18]],
  chime: [[1, 1, 1], [2.32, 0.45, 0.6], [4.25, 0.22, 0.4], [6.63, 0.1, 0.25]],
  church: [[0.5, 0.55, 1.3], [1, 1, 1], [1.19, 0.45, 0.8], [1.5, 0.35, 0.7], [2, 0.35, 0.6],
    [2.51, 0.18, 0.45], [3.01, 0.14, 0.35], [4.17, 0.08, 0.25]],
  musicbox: [[1, 1, 1], [2, 0.12, 0.45], [6.27, 0.22, 0.12], [17.55, 0.06, 0.05]],
  xylo: [[1, 1, 1], [3.93, 0.3, 0.25], [10.7, 0.08, 0.08]],
  glass: [[1, 1, 1], [2.7, 0.4, 0.5], [5.2, 0.2, 0.3], [8.3, 0.1, 0.2]],
};

// Síntesis aditiva para campanas, carillones, xilófono...
export function bell(v, {
  t = v.t0, freq = 880, dur = 2.5, gain = 0.25, partials = PARTIALS.bell,
  a = 0.002, dest = v.out, pan = 0, reverb = 0.2, detune = 0,
} = {}) {
  const set = typeof partials === 'string' ? PARTIALS[partials] : partials;
  const p = v.pan(pan);
  p.connect(dest);
  if (reverb) v.send(p, reverb);
  let end = t;
  for (const [ratio, amp, df] of set) {
    const f = freq * ratio;
    if (f > 18000) continue;
    const d = dur * df;
    const o = v.osc('sine', f, t, t + d + 0.05);
    if (detune) o.detune.value = v.rand(-detune, detune);
    const env = v.gain(0);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain * amp, t + a);
    env.gain.exponentialRampToValueAtTime(0.0005, t + d);
    v.chain(o, env, p);
    end = Math.max(end, t + d);
  }
  return end;
}

export function musicBox(v, { t = v.t0, freq = 880, dur = 1.8, gain = 0.22, dest = v.out, pan = 0, reverb = 0.35 } = {}) {
  hit(v, { t, dur: 0.012, freq: 6000, Q: 1, gain: gain * 0.15, dest, pan });
  return bell(v, { t, freq, dur, gain, partials: 'musicbox', dest, pan, reverb });
}

// Cuerda pulsada (Karplus-Strong precalculado en un buffer)
const ksCache = new WeakMap();
function ksBuffer(ctx, freq, dur, bright) {
  let c = ksCache.get(ctx);
  if (!c) ksCache.set(ctx, (c = new Map()));
  const key = `${Math.round(freq * 10)}:${dur}:${bright}`;
  if (c.has(key)) return c.get(key);
  const sr = ctx.sampleRate;
  const N = Math.max(2, Math.round(sr / freq));
  const n = Math.floor(sr * dur);
  const buf = ctx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  const line = new Float32Array(N);
  // excitación: ruido suavizado (menos brillo = más suavizado)
  let lp = 0;
  const k = 0.15 + 0.85 * bright;
  for (let i = 0; i < N; i++) { lp += k * ((Math.random() * 2 - 1) - lp); line[i] = lp; }
  const t60 = Math.max(0.3, dur * 0.7);
  const g = Math.pow(0.001, 1 / (freq * t60));
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const cur = line[idx];
    const nxt = line[(idx + 1) % N];
    const val = g * (0.5 * (cur + nxt));
    d[i] = cur;
    line[idx] = val;
    idx = (idx + 1) % N;
  }
  // normalizar pico
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0) for (let i = 0; i < n; i++) d[i] /= peak;
  // fundido final
  const f = Math.min(n, Math.floor(sr * 0.05));
  for (let i = 0; i < f; i++) d[n - 1 - i] *= i / f;
  c.set(key, buf);
  return buf;
}

export function pluck(v, {
  t = v.t0, freq = 220, dur = 2, gain = 0.4, bright = 0.6, dest = v.out, pan = 0, reverb = 0.15, body = true,
} = {}) {
  const s = v.buffer(ksBuffer(v.ctx, freq, dur, bright), { t });
  const g = v.gain(gain);
  const p = v.pan(pan);
  let node = s;
  if (body) node = v.chain(node, v.filter('peaking', 220, 1.2, 4)); // resonancia de caja
  v.chain(node, g, p, dest);
  if (reverb) v.send(p, reverb);
  return t + dur;
}

// Piano suave (aditivo con ligera inarmonicidad + martillo)
export function piano(v, { t = v.t0, freq = 440, dur = 1.6, gain = 0.25, dest = v.out, pan = 0, reverb = 0.2 } = {}) {
  const p = v.pan(pan);
  p.connect(dest);
  if (reverb) v.send(p, reverb);
  const B = 0.0004;
  for (let n = 1; n <= 7; n++) {
    const f = freq * n * Math.sqrt(1 + B * n * n);
    if (f > 16000) break;
    const amp = gain / Math.pow(n, 1.3) * (n === 1 ? 1 : 0.8);
    const d = dur / (1 + 0.35 * (n - 1)) * (freq > 1000 ? 0.6 : 1);
    const o = v.osc('sine', f, t, t + d + 0.05);
    const env = v.gain(0);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(amp, t + 0.004);
    env.gain.exponentialRampToValueAtTime(amp * 0.3, t + Math.min(0.15, d * 0.3));
    env.gain.exponentialRampToValueAtTime(0.0005, t + d);
    v.chain(o, env, p);
  }
  hit(v, { t, dur: 0.03, freq: Math.min(freq * 4, 6000), Q: 0.8, gain: gain * 0.12, dest: p });
  return t + dur;
}

// ---------------------------------------------------------------------------
// Notas y melodías
// ---------------------------------------------------------------------------

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// 'A4' → 69, 'C#5' → 73, 'Bb3' → 58
export function midi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Nota no válida: ${name}`);
  let n = NOTE_INDEX[m[1]] + (m[3] * 1 + 1) * 12;
  if (m[2] === '#') n += 1;
  if (m[2] === 'b') n -= 1;
  return n;
}
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const freq = (name) => mtof(midi(name));

// Partitura en texto: "E4/0.5 E4/0.5 G4/2 r/1 C5+E5/1"
// nota/duración en pulsos; 'r' es silencio; '+' une notas de un acorde.
export function parseScore(score) {
  return score.trim().split(/\s+/).map((tok) => {
    const [n, d] = tok.split('/');
    const beats = d ? parseFloat(d) : 1;
    if (n === 'r') return { notes: [], beats };
    return { notes: n.split('+').map(freq), beats };
  });
}

// Toca una partitura. play(freq, t, durSegundos, i) debe programar la nota.
// Devuelve el instante final.
export function melody(v, score, { t = v.t0, bpm = 90, play, swing = 0 } = {}) {
  const beat = 60 / bpm;
  const events = typeof score === 'string' ? parseScore(score) : score;
  let at = t;
  events.forEach((ev, i) => {
    const d = ev.beats * beat;
    const jitter = swing ? v.rand(-swing, swing) : 0;
    ev.notes.forEach((f) => play(f, at + jitter, d, i));
    at += d;
  });
  return at;
}
