// Orejitas · timbres y utilidades musicales compartidas por
// juguetes, música y nanas (solo los usan esos módulos).
//
// Los timbres "ligeros" no crean panoramizador ni envío de reverb por nota:
// escriben en un bus compartido (ver outBus). Así las nanas, que suenan
// durante horas, gastan poca CPU en móviles.
import { melody, parseScore } from '../instruments.js';

// Bus de salida compartido: panorama fijo + envío a la reverb
export function outBus(v, { pan = 0, reverb = 0.35, gain = 1 } = {}) {
  const g = v.gain(gain);
  const p = v.pan(pan);
  v.chain(g, p, v.out);
  if (reverb) v.send(p, reverb);
  return g;
}

// Suma de parciales senoidales con caída exponencial (sin nodos extra)
export function partialsNote(v, { t, freq, dur, gain, partials, dest, a = 0.003 }) {
  let end = t;
  for (const [ratio, amp, df] of partials) {
    const f = freq * ratio;
    if (f > 16000) continue;
    const d = dur * df;
    const o = v.osc('sine', f, t, t + d + 0.03);
    const g = v.gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain * amp, t + a);
    g.gain.setTargetAtTime(0, t + a, d / 6);
    o.connect(g).connect(dest);
    end = Math.max(end, t + d);
  }
  return end;
}

const CELESTA = [[1, 1, 1], [2, 0.3, 0.45], [3, 0.08, 0.25]];
const BOX = [[1, 1, 1], [2, 0.12, 0.4], [6.27, 0.09, 0.1]];
const HARP = [[1, 1, 1], [2, 0.5, 0.65], [3, 0.22, 0.48], [4, 0.1, 0.38]];
const PIANO = [[1, 1, 1], [2.001, 0.55, 0.7], [3.004, 0.28, 0.5], [4.008, 0.13, 0.35]];

// Celesta: casi armónica, dulce, caída media
export function celesta(v, { t = v.t0, freq = 523, dur = 2.4, gain = 0.2, dest = v.out } = {}) {
  return partialsNote(v, { t, freq, dur, gain, partials: CELESTA, dest, a: 0.004 });
}

// Caja de música suave (púa metálica, poco brillo para no molestar)
export function softBox(v, { t = v.t0, freq = 880, dur = 2, gain = 0.2, dest = v.out } = {}) {
  return partialsNote(v, { t, freq, dur, gain, partials: BOX, dest, a: 0.002 });
}

// Arpa suave por síntesis aditiva (sin buffers: ideal para bucles largos)
export function softHarp(v, { t = v.t0, freq = 262, dur = 2.8, gain = 0.22, dest = v.out } = {}) {
  return partialsNote(v, { t, freq, dur, gain, partials: HARP, dest, a: 0.004 });
}

// Piano suave ligero
export function softPiano(v, { t = v.t0, freq = 440, dur = 1.8, gain = 0.22, dest = v.out } = {}) {
  return partialsNote(v, { t, freq, dur: freq > 1000 ? dur * 0.7 : dur, gain, partials: PIANO, dest, a: 0.004 });
}

// Bajo suave y redondo (seno con un poco de 2º y 3º armónico)
const bassWaves = new WeakMap();
export function softBass(v, { t = v.t0, freq = 131, dur = 1.5, gain = 0.2, dest = v.out } = {}) {
  let w = bassWaves.get(v.ctx);
  if (!w) bassWaves.set(v.ctx, (w = v.wave([1, 0.4, 0.15])));
  const end = t + dur;
  const o = v.osc(w, freq, t, end + 0.3);
  const g = v.gain(0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.03);
  g.gain.exponentialRampToValueAtTime(gain * 0.35, end);
  g.gain.linearRampToValueAtTime(0, end + 0.25);
  o.connect(g).connect(dest);
  return end + 0.25;
}

// Nana en bucle: una pasada de la melodía, pausa, y otra vez alternando
// timbres. voices: [{ lead(v, f, t, d, dest), bass?(v, f, t, d, dest) }]
export function songLoop(v, { score, bass = null, bpm = 80, voices, pause = [1.8, 2.8], extra = null }) {
  const notes = parseScore(score);
  const low = bass ? parseScore(bass) : null;
  const buses = { lead: outBus(v, { pan: -0.08, reverb: 0.4 }), bass: outBus(v, { pan: 0.12, reverb: 0.3 }) };
  let pass = 0;
  v.loop((t) => {
    const voice = voices[pass % voices.length];
    const tempo = bpm * v.rand(0.97, 1.03);
    let end = melody(v, notes, { t, bpm: tempo, swing: 0.006, play: (f, at, d) => voice.lead(v, f, at, d, buses.lead) });
    if (low && voice.bass) melody(v, low, { t, bpm: tempo, play: (f, at, d) => voice.bass(v, f, at, d, buses.bass) });
    if (extra) end = Math.max(end, extra(v, voice, t, tempo, pass, buses) || 0);
    pass++;
    return end + v.rand(pause[0], pause[1]);
  });
}
