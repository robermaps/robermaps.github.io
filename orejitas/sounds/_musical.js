// Orejitas · timbres y utilidades musicales compartidas por
// juguetes, música y nanas (solo los usan esos módulos).
import { bell, hit, melody, parseScore } from '../instruments.js';

// Celesta: casi armónica, dulce, caída media
export function celesta(v, { t = v.t0, freq = 523, dur = 2.4, gain = 0.2, dest = v.out, pan = 0, reverb = 0.35 } = {}) {
  return bell(v, {
    t, freq, dur, gain, dest, pan, reverb, a: 0.004,
    partials: [[1, 1, 1], [2, 0.3, 0.45], [3, 0.08, 0.25], [4, 0.035, 0.15]],
  });
}

// Caja de música suave (púa metálica, poco brillo para no molestar)
export function softBox(v, { t = v.t0, freq = 880, dur = 2, gain = 0.2, dest = v.out, pan = 0, reverb = 0.4 } = {}) {
  hit(v, { t, dur: 0.01, freq: 5000, Q: 1.2, gain: gain * 0.08, dest, pan });
  return bell(v, {
    t, freq, dur, gain, dest, pan, reverb, a: 0.003,
    partials: [[1, 1, 1], [2, 0.12, 0.4], [3, 0.04, 0.25], [6.27, 0.09, 0.1]],
  });
}

// Arpa suave por síntesis aditiva (sin buffers: ideal para bucles largos)
export function softHarp(v, { t = v.t0, freq = 262, dur = 3, gain = 0.22, dest = v.out, pan = 0, reverb = 0.35 } = {}) {
  const p = v.pan(pan);
  p.connect(dest);
  if (reverb) v.send(p, reverb);
  const harm = [[1, 1], [2, 0.5], [3, 0.22], [4, 0.12], [5, 0.06]];
  for (const [n, amp] of harm) {
    const f = freq * n;
    if (f > 12000) break;
    const d = dur / (1 + 0.55 * (n - 1));
    const o = v.osc('sine', f, t, t + d + 0.05);
    const g = v.gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * amp, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0004, t + d);
    v.chain(o, g, p);
  }
  hit(v, { t, dur: 0.02, freq: Math.min(freq * 3, 4000), Q: 1, gain: gain * 0.05, dest: p });
  return t + dur;
}

// Bajo suave y redondo (seno con un poco de 2º y 3º armónico)
export function softBass(v, { t = v.t0, freq = 131, dur = 1.5, gain = 0.2, dest = v.out, pan = 0, reverb = 0.2 } = {}) {
  const end = t + dur;
  const o = v.osc(v.wave([1, 0.4, 0.15]), freq, t, end + 0.3);
  const g = v.gain(0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.03);
  g.gain.exponentialRampToValueAtTime(gain * 0.35, end);
  g.gain.linearRampToValueAtTime(0, end + 0.25);
  const p = v.pan(pan);
  v.chain(o, g, p, dest);
  if (reverb) v.send(p, reverb);
  return end + 0.25;
}

// Nana en bucle: una pasada de la melodía, pausa, y otra vez alternando
// timbres. voices: [{ lead(v, f, t, d), bass?(v, f, t, d) }]
export function songLoop(v, { score, bass = null, bpm = 80, voices, pause = [1.8, 2.8], extra = null }) {
  const notes = parseScore(score);
  const low = bass ? parseScore(bass) : null;
  let pass = 0;
  v.loop((t) => {
    const voice = voices[pass % voices.length];
    const tempo = bpm * v.rand(0.97, 1.03);
    let end = melody(v, notes, { t, bpm: tempo, swing: 0.006, play: (f, at, d) => voice.lead(v, f, at, d) });
    if (low && voice.bass) melody(v, low, { t, bpm: tempo, play: (f, at, d) => voice.bass(v, f, at, d) });
    if (extra) end = Math.max(end, extra(v, voice, t, tempo, pass) || 0);
    pass++;
    return end + v.rand(pause[0], pause[1]);
  });
}
