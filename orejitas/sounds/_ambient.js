// Orejitas · utilidades para sonidos ambientales continuos (naturaleza y
// ruido blanco). Pensadas para sonar horas sin repeticiones audibles y con
// poca CPU: fuentes continuas + automatización de parámetros, en lugar de
// crear muchos nodos por segundo.
import { sweep } from '../instruments.js';

// Ruido continuo sin repetición audible: dos capas del mismo buffer con
// distinta velocidad y desfase (el patrón combinado no se repite nunca).
export function bed(v, color = 'pink', { stereo = true, gain = 1 } = {}) {
  const out = v.gain(gain * 0.72);
  v.noise(color, { stereo, rate: 1 }).connect(out);
  v.noise(color, { stereo, rate: 0.917 }).connect(out);
  return out;
}

// Paseo aleatorio lento de un parámetro: cada `every` segundos elige un
// objetivo nuevo entre min y max y se acerca suavemente (setTargetAtTime).
// No crea nodos: solo eventos de automatización.
export function drift(v, param, { min, max, every = [2, 6], smooth = 0.4, start } = {}) {
  param.setValueAtTime(start ?? v.rand(min, max), v.t0);
  v.loop((t) => {
    const dt = v.rand(every[0], every[1]);
    param.setTargetAtTime(v.rand(min, max), t, Math.max(0.01, dt * smooth));
    return t + dt;
  });
}

// Suma una señal de control (p. ej. una ConstantSource) a un parámetro, escalada
export function mod(v, control, param, amount = 1) {
  const g = v.gain(amount);
  control.connect(g).connect(param);
  return g;
}

// Waveshaper que deja pasar solo la parte de la señal por encima de `knee`
// (para que, p. ej., el silbido del viento aparezca solo en las ráfagas fuertes)
export function above(v, knee = 0.5, slope = 2) {
  const s = v.ctx.createWaveShaper();
  const len = 1024;
  const curve = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const x = (i / (len - 1)) * 2 - 1;
    curve[i] = Math.max(0, x - knee) * slope;
  }
  s.curve = curve;
  return s;
}

// ---------------------------------------------------------------------------
// Lluvia
// ---------------------------------------------------------------------------
export function rain(v, { intensity = 1, dest = v.out } = {}) {
  const out = v.gain(1);
  out.connect(dest);
  // siseo general
  const hissLp = v.lp(6500, 0.5);
  const hissG = v.gain(0.5);
  v.chain(bed(v, 'pink'), v.hp(450), hissLp, hissG, out);
  drift(v, hissLp.frequency, { min: 4800, max: 7800, every: [3, 8] });
  drift(v, hissG.gain, { min: 0.4 * intensity, max: 0.6 * intensity, every: [2, 7] });
  // cuerpo grave: agua sobre el suelo
  const bodyG = v.gain(0.3 * intensity);
  v.chain(bed(v, 'brown'), v.lp(650), bodyG, out);
  // gotas finas, muy densas
  v.chain(v.dust(450 * intensity, { stereo: true }), v.bp(4200, 0.7), v.gain(2.2), out);
  // gotas gruesas
  v.chain(v.dust(50 * intensity, { stereo: true, grain: 0.003 }), v.bp(1600, 0.9), v.lp(5000), v.gain(3), out);
  // "plic" resonantes sobre charcos y hojas, a varias alturas
  [[1700, -0.6], [2450, 0.15], [3500, 0.6], [2050, -0.25]].forEach(([f, p]) => {
    v.chain(v.dust(3.5 * intensity), v.bp(f * v.rand(0.92, 1.08), 25), v.gain(22), v.pan(p), out);
  });
  return out;
}

// ---------------------------------------------------------------------------
// Trueno: retumbo grave con varios picos. dist 0 (cerca) … 1 (lejos)
// ---------------------------------------------------------------------------
export function thunderAt(v, t, { dist = 0.8, dest = v.out, dur, level = 1 } = {}) {
  const D = dur ?? v.rand(5.5, 8);
  const end = t + D;
  const p = v.pan(v.rand(-0.5, 0.5));
  p.connect(dest);
  v.send(p, 0.35);

  // envolvente de retumbo con varios picos que se van apagando
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  let at = t;
  let lvl = level;
  for (let k = 0; k < 6 && at < end - 1.2; k++) {
    const rise = k === 0 ? v.rand(0.12, 0.35) * (0.6 + dist) : v.rand(0.08, 0.35);
    env.gain.setTargetAtTime(lvl, at, rise / 3);
    at += rise + v.rand(0.05, 0.35);
    const fall = v.rand(0.35, 0.9);
    env.gain.setTargetAtTime(lvl * v.rand(0.25, 0.5), at, fall / 3);
    at += fall;
    lvl *= v.rand(0.55, 0.85);
  }
  env.gain.setTargetAtTime(0, at, Math.max(0.2, (end - at) / 4));
  env.connect(p);

  // retumbo profundo
  const deepLp = v.lp(260, 0.6);
  deepLp.frequency.setValueAtTime(420 - 120 * dist, t);
  deepLp.frequency.exponentialRampToValueAtTime(110, end);
  v.chain(v.noise('brown', { t, stop: end + 0.1, stereo: true }), deepLp, v.gain(1.2), env);
  // cuerpo audible también en altavoces pequeños
  const bodyLp = v.lp(700, 0.5);
  bodyLp.frequency.setValueAtTime(900 - 400 * dist, t);
  bodyLp.frequency.exponentialRampToValueAtTime(250, end);
  v.chain(v.noise('pink', { t, stop: end + 0.1, stereo: true }), bodyLp, v.gain(0.55), env);

  // chasquido inicial suavizado (solo si está cerca)
  if (dist < 0.6) {
    const c = v.gain(0);
    const peak = 0.35 * (1 - dist) * level;
    c.gain.setValueAtTime(0, t);
    c.gain.linearRampToValueAtTime(peak, t + 0.05);
    c.gain.setTargetAtTime(0, t + 0.06, 0.25);
    v.chain(v.noise('pink', { t, stop: t + 1.6, stereo: true }), v.lp(2200, 0.5), c, p);
  }
  return end;
}

// ---------------------------------------------------------------------------
// Pájaros: frases generativas. Un oscilador + una ganancia por frase
// (la articulación de las notas es automatización, no nodos nuevos).
// ---------------------------------------------------------------------------
export function birdPhrase(v, t, { dest = v.out, pan = 0, level = 1, species } = {}) {
  const kind = species ?? v.pick(['whistle', 'whistle', 'warble', 'chirp', 'trill', 'whistle', 'warble']);
  const p = v.pan(pan);
  p.connect(dest);
  v.send(p, 0.3);
  const o = v.osc('sine', 3000, t);
  const g = v.gain(0);
  v.chain(o, g, p);
  const F = o.frequency;
  const G = g.gain;
  G.setValueAtTime(0, t);
  let at = t;

  const note = (f0, f1, d, a = 0.012, lvl = level) => {
    F.setValueAtTime(f0, at);
    F.exponentialRampToValueAtTime(f1, at + d);
    G.setValueAtTime(0, at);
    G.linearRampToValueAtTime(lvl, at + a);
    G.setValueAtTime(lvl * 0.85, at + Math.max(a, d - 0.02));
    G.linearRampToValueAtTime(0, at + d);
    at += d;
  };

  if (kind === 'whistle') { // tipo mirlo/petirrojo
    const base = v.rand(1800, 3200);
    const n = v.irand(3, 7);
    for (let i = 0; i < n; i++) {
      const f = base * v.rand(0.8, 1.3);
      note(f * v.rand(0.85, 1.15), f * v.rand(0.8, 1.25), v.rand(0.08, 0.24), 0.015, level * v.rand(0.6, 1));
      at += v.rand(0.03, 0.12);
    }
  } else if (kind === 'chirp') { // tipo gorrión
    const f0 = v.rand(4200, 5600);
    const n = v.irand(4, 9);
    for (let i = 0; i < n; i++) {
      note(f0 * v.rand(0.95, 1.05), f0 * v.rand(0.55, 0.7), v.rand(0.04, 0.07), 0.004, level * 0.8);
      at += v.rand(0.05, 0.11);
    }
  } else if (kind === 'trill') { // trino largo con modulación rápida
    const f = v.rand(3000, 4400);
    const d = v.rand(0.6, 1.4);
    const lfo = v.osc('sine', v.rand(20, 34), t, t + d + 0.05);
    const depth = v.gain(v.rand(250, 650));
    lfo.connect(depth).connect(F);
    note(f, f * v.rand(0.8, 0.95), d, 0.05, level * 0.6);
  } else { // gorjeo: notas rápidas encadenadas
    const n = v.irand(6, 14);
    for (let i = 0; i < n; i++) {
      const f = v.rand(2200, 5000);
      note(f, f * v.rand(0.85, 1.2), v.rand(0.045, 0.09), 0.006, level * v.rand(0.5, 0.9));
      at += v.rand(0.01, 0.04);
    }
  }
  o.stop(at + 0.05);
  return at;
}

// Cuco lejano: "cu-cú" repetido
export function cuckoo(v, t, { dest = v.out, pan = 0, level = 0.5 } = {}) {
  const p = v.pan(pan);
  p.connect(dest);
  v.send(p, 0.45);
  const f = v.rand(640, 720);
  const o = v.osc('sine', f, t);
  const g = v.gain(0);
  v.chain(o, v.lp(1500), g, p);
  let at = t;
  const reps = v.irand(2, 4);
  for (let i = 0; i < reps; i++) {
    [[f, 0.22], [f * 0.8, 0.32]].forEach(([fr, d]) => {
      o.frequency.setValueAtTime(fr * 1.02, at);
      o.frequency.linearRampToValueAtTime(fr, at + d);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(level, at + 0.04);
      g.gain.setTargetAtTime(0, at + d - 0.08, 0.04);
      at += d + 0.12;
    });
    at += v.rand(0.35, 0.6);
  }
  o.stop(at + 0.3);
  return at;
}

// Pájaro carpintero lejano: tamborileo rápido sobre madera
export function woodpecker(v, t, { dest = v.out, pan = 0, level = 0.6 } = {}) {
  const p = v.pan(pan);
  p.connect(dest);
  v.send(p, 0.4);
  const n = v.irand(12, 22);
  const rate = v.rand(14, 19);
  const end = t + n / rate + 0.1;
  const g = v.gain(0);
  v.chain(v.noise('white', { t, stop: end }), v.bp(v.rand(800, 1100), 4), g, p);
  for (let i = 0; i < n; i++) {
    const at = t + i / rate;
    const lvl = level * (i < 3 ? 0.6 + i * 0.15 : 1 - (i / n) * 0.5);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(lvl, at + 0.002);
    g.gain.setTargetAtTime(0, at + 0.003, 0.008);
  }
  return end;
}

// ---------------------------------------------------------------------------
// Noche: grillos, ranas, búho
// ---------------------------------------------------------------------------
// Un grillo: oscilador continuo cuya amplitud se pulsa por automatización
export function cricket(v, dest, { freq = 4400, pan = 0, rate = 1.6, pulses = 3, level = 0.3 } = {}) {
  const o = v.osc('sine', freq);
  const g = v.gain(0);
  const p = v.pan(pan);
  v.chain(o, g, p, dest);
  v.send(p, 0.15);
  v.loop((t) => {
    if (v.chance(0.04)) return t + v.rand(1.5, 4); // pausa ocasional
    const n = pulses + (v.chance(0.3) ? 1 : 0) - (v.chance(0.15) ? 1 : 0);
    const pp = v.rand(0.028, 0.034);
    const lvl = level * v.rand(0.8, 1);
    o.frequency.setValueAtTime(freq * v.rand(0.99, 1.01), t);
    for (let k = 0; k < n; k++) {
      const tp = t + k * pp;
      g.gain.setValueAtTime(0, tp);
      g.gain.linearRampToValueAtTime(lvl, tp + 0.004);
      g.gain.linearRampToValueAtTime(lvl * 0.7, tp + pp * 0.45);
      g.gain.linearRampToValueAtTime(0, tp + pp * 0.62);
    }
    return t + (1 / rate) * v.rand(0.92, 1.08);
  });
}

// Croar de rana: tren de pulsos a través de una resonancia
export function frogAt(v, t, { dest = v.out, pan = 0, level = 0.5 } = {}) {
  const syll = v.pick([1, 2, 2, 3]);
  const rate = v.rand(45, 70);
  const fc = v.rand(700, 1100);
  let at = t;
  const o = v.osc('sawtooth', rate, t);
  const g = v.gain(0);
  const p = v.pan(pan);
  v.chain(o, v.bp(fc, 5), v.lp(2500), g, p, dest);
  v.send(p, 0.3);
  for (let i = 0; i < syll; i++) {
    const d = v.rand(0.1, 0.16);
    o.frequency.setValueAtTime(rate * 1.1, at);
    o.frequency.linearRampToValueAtTime(rate * 0.9, at + d);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(level, at + 0.015);
    g.gain.setValueAtTime(level, at + d - 0.03);
    g.gain.linearRampToValueAtTime(0, at + d);
    at += d + v.rand(0.06, 0.1);
  }
  o.stop(at + 0.05);
  return at;
}

// Búho (cárabo): "uuh… u-u-uuuh"
export function owlAt(v, t, { dest = v.out, pan = 0, level = 0.4 } = {}) {
  const f = v.rand(360, 420);
  const p = v.pan(pan);
  p.connect(dest);
  v.send(p, 0.5);
  const o = v.osc('sine', f, t);
  const g = v.gain(0);
  v.chain(o, g, p);
  const ng = v.gain(0);
  const pattern = [[0, 0.4], [1.0, 0.16], [1.28, 0.16], [1.56, 0.85]];
  const end = t + 1.56 + 0.85;
  v.chain(v.noise('pink', { t, stop: end + 0.1 }), v.bp(f * 1.1, 3), ng, p);
  for (const [dt, d] of pattern) {
    const at = t + dt;
    o.frequency.setValueAtTime(f * 1.04, at);
    o.frequency.linearRampToValueAtTime(f * 0.96, at + d);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(level, at + 0.06);
    g.gain.setValueAtTime(level * 0.9, at + d - 0.1);
    g.gain.linearRampToValueAtTime(0, at + d);
    ng.gain.setValueAtTime(0, at);
    ng.gain.linearRampToValueAtTime(level * 0.6, at + 0.05);
    ng.gain.linearRampToValueAtTime(0, at + d);
  }
  o.stop(end + 0.05);
  return end;
}

// ---------------------------------------------------------------------------
// Agua: burbuja / gota (barrido ascendente)
// ---------------------------------------------------------------------------
export function drop(v, t, { f = 800, dest = v.out, pan = 0, level = 0.3, reverb = 0 } = {}) {
  const d = v.rand(0.035, 0.07);
  return sweep(v, { t, f0: f * 0.75, f1: f * v.rand(1.8, 2.6), dur: d, gain: level, dest, pan, reverb });
}
