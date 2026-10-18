// Orejitas · utilidades compartidas por las categorías de animales
// (granja y animales salvajes).
import { hit } from '../instruments.js';

// Aplica puntos [[dt, valor, curva?]] a un parámetro (escalados por k)
export function points(param, pts, t, k = 1) {
  pts.forEach(([dt, val, curve], i) => {
    const at = Math.max(t + dt, 0);
    const x = val * k;
    if (i === 0) param.setValueAtTime(x, at);
    else if (curve === 'exp') param.exponentialRampToValueAtTime(Math.max(x, 1e-3), at);
    else param.linearRampToValueAtTime(x, at);
  });
}

// Nota con contorno de tono y FM opcional (trinos, silbidos, chillidos).
//  freq:   [[dt, Hz], ...]
//  fmRate / fmDepth (Hz): modulación de frecuencia (trino)
//  harm:   nivel de un segundo armónico que sigue el mismo contorno
export function fmNote(v, {
  t = v.t0, dur = 0.2, freq = [[0, 3000]], fmRate = 0, fmDepth = 0, type = 'sine',
  a = 0.005, r = null, gain = 0.3, dest = v.out, pan = 0, reverb = 0, harm = 0,
} = {}) {
  const end = t + dur;
  const p = v.pan(pan);
  p.connect(dest);
  if (reverb) v.send(p, reverb);
  const env = v.gain(0);
  const rel = r ?? Math.min(0.03, dur * 0.3);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + a);
  env.gain.setValueAtTime(gain, Math.max(t + a, end - rel));
  env.gain.linearRampToValueAtTime(0, end);
  env.connect(p);
  const voices = [[1, 1]];
  if (harm) voices.push([2, harm]);
  let fm = null;
  if (fmRate && fmDepth) {
    fm = v.gain(fmDepth);
    v.osc('sine', fmRate, t, end + 0.02).connect(fm);
  }
  for (const [ratio, level] of voices) {
    const o = v.osc(type, freq[0][1] * ratio, t, end + 0.02);
    points(o.frequency, freq, t, ratio);
    if (fm) {
      const k = v.gain(ratio);
      fm.connect(k).connect(o.frequency);
    }
    const g = v.gain(level);
    v.chain(o, g, env);
  }
  return end;
}

// Canto de pájaro generativo: varios motivos (pío, trino, silbido, gorjeo)
// que se repiten 2-4 veces, como hacen los pájaros cantores.
export function birdSong(v, { t = v.t0, base = 3200, pan = 0, gain = 0.25, motifs = 3, reverb = 0.15 } = {}) {
  let at = t;
  let end = t;
  let prev = null;
  for (let m = 0; m < motifs; m++) {
    let kind = v.pick(['chirps', 'trill', 'whistle', 'tweets', 'chirps', 'tweets']);
    if (kind === prev) kind = v.pick(['whistle', 'trill']);
    prev = kind;
    const f = base * v.rand(0.85, 1.2);
    const reps = v.irand(2, 4);
    if (kind === 'trill') {
      const d = v.rand(0.3, 0.5);
      end = fmNote(v, { t: at, dur: d, freq: [[0, f * 1.05], [d, f * 0.9]], fmRate: v.rand(26, 38), fmDepth: f * 0.14, gain: gain * 0.8, pan, reverb, a: 0.02 });
      at = end + 0.08;
    } else {
      for (let r = 0; r < reps; r++) {
        if (kind === 'chirps') {
          const d = v.rand(0.045, 0.07);
          end = fmNote(v, { t: at, dur: d, freq: [[0, f * 1.45], [d, f * 0.75]], gain, pan, reverb, harm: 0.1 });
          at = end + v.rand(0.035, 0.06);
        } else if (kind === 'whistle') {
          const d = v.rand(0.12, 0.2);
          const up = v.chance(0.6);
          end = fmNote(v, { t: at, dur: d, freq: up ? [[0, f * 0.8], [d, f * 1.15]] : [[0, f * 1.2], [d, f * 0.85]], gain, pan, reverb, a: 0.012, r: 0.04 });
          at = end + v.rand(0.05, 0.08);
        } else {
          const d = v.rand(0.06, 0.09);
          end = fmNote(v, { t: at, dur: d, freq: [[0, f * 0.7], [d * 0.55, f * 1.3], [d, f * 1.15]], gain, pan, reverb, harm: 0.08 });
          at = end + v.rand(0.05, 0.09);
        }
      }
    }
    at += v.rand(0.06, 0.18);
  }
  return end;
}

// Aleteo de labios / resoplido ("brrr" del caballo)
export function flutter(v, { t = v.t0, dur = 0.4, rate = 24, freq = 450, gain = 0.4, dest = v.out, pan = 0 } = {}) {
  const end = t + dur;
  const n = v.noise('pink', { t, stop: end + 0.02 });
  const bp = v.bp(freq, 1.1);
  const am = v.gain(0.5);
  v.lfo(rate, 0.5, am.gain, { t, stop: end + 0.02, type: 'square' });
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.03);
  env.gain.linearRampToValueAtTime(gain * 0.7, t + dur * 0.6);
  env.gain.linearRampToValueAtTime(0, end);
  v.chain(n, bp, am, env, v.pan(pan), dest);
  // golpe de aire inicial
  hit(v, { t, dur: 0.08, color: 'pink', type: 'lowpass', freq: 900, gain: gain * 0.8, dest, pan });
  return end;
}

// Ruido con envolvente libre: [[dt, nivel]] (siseos, aliento, soplidos)
export function noiseEnv(v, {
  t = v.t0, env = [[0, 0], [0.1, 1], [0.5, 0]], color = 'white', filters = [], gain = 0.5,
  dest = v.out, pan = 0, reverb = 0,
} = {}) {
  const last = env[env.length - 1][0];
  const n = v.noise(color, { t, stop: t + last + 0.02 });
  const g = v.gain(0);
  points(g.gain, env, t, gain);
  const p = v.pan(pan);
  v.chain(n, ...filters, g, p, dest);
  if (reverb) v.send(p, reverb);
  return t + last;
}
