// Orejitas · categoría: Granja / Farm
// Voces sintetizadas con fuente glotal/sierra + formantes (vocal()).
// Cada reproducción varía ligeramente (tono, duración, repeticiones).
import { vocal, tone, hit } from '../instruments.js';
import { flutter } from './_animals.js';

// "Vocales" propias de algunos animales (formantes F1-F3 y paso bajo)
const NASAL_PIG = { f: [450, 1150, 2500], lp: 2600 };
const NASAL_GOAT = { f: [560, 1750, 2650], lp: 3600 };
const QUACK_A = { f: [950, 1600, 2700], lp: 3800 };
const QUACK_B = { f: [750, 1350, 2500], lp: 2800 };

export default {
  id: 'farm',
  emoji: '🐮',
  name: { es: 'Granja', en: 'Farm' },
  sounds: [
    {
      // Mugido largo: boca cerrada (m) → u/o → m, tono grave con aspereza
      id: 'cow', emoji: '🐮', name: { es: 'Vaca', en: 'Cow' }, say: { es: 'La vaca', en: 'The cow' }, kind: 'shot',
      play(v) {
        const G = 0.26; // nivel interno (≈ ganancia de normalización 1)
        const dur = v.rand(1.5, 2.2);
        const f = v.vary(115, 0.1);
        return vocal(v, {
          dur, type: 'sawtooth',
          pitch: [[0, f * 0.8], [0.3, f * 1.05], [dur * 0.55, f * 1.12], [dur - 0.2, f * 0.95], [dur, f * 0.8]],
          amp: [[0, 0], [0.1, 0.5], [0.4, 1], [dur - 0.4, 0.85], [dur, 0]],
          vowels: [[0, 'm'], [0.2, 'm'], [0.5, 'u'], [dur * 0.6, 'o'], [dur - 0.25, 'u'], [dur, 'm']],
          scale: 0.72, sub: 0.2, detune: 10, jitter: 25, breath: 0.08, breathColor: 'pink',
          tremolo: { rate: v.rand(18, 26), depth: 0.2 }, gain: (0.7) * G, reverb: 0.12,
        });
      },
    },
    {
      // "Oink oink": resoplido + gruñido nasal pulsado
      id: 'pig', emoji: '🐷', name: { es: 'Cerdo', en: 'Pig' }, say: { es: 'El cerdo', en: 'The pig' }, kind: 'shot',
      play(v) {
        const G = 0.5; // nivel interno (≈ ganancia de normalización 1)
        const n = v.pick([2, 3, 3]);
        let t = v.t0, end = t;
        const f = v.vary(190, 0.1);
        for (let i = 0; i < n; i++) {
          const d = v.rand(0.2, 0.28);
          hit(v, { t, dur: 0.08, color: 'pink', type: 'bandpass', freq: 650, Q: 1.4, gain: (0.6) * G});
          end = vocal(v, {
            t: t + 0.02, dur: d, type: 'sawtooth',
            pitch: [[0, f * 0.9], [d * 0.3, f * 1.15], [d, f * 0.75]],
            amp: [[0, 0], [0.02, 1], [d * 0.6, 0.8], [d, 0]],
            vowels: [[0, 'n'], [0.04, NASAL_PIG], [d * 0.75, 'o'], [d, 'n']],
            sub: 0.35, drive: 2, breath: 0.35, breathColor: 'pink', breathHp: 300,
            tremolo: { rate: v.rand(30, 40), depth: 0.6 }, jitter: 40, gain: (0.6) * G,
          });
          t = end + v.rand(0.12, 0.22);
        }
        return end;
      },
    },
    {
      // "Beee": balido con trémolo y vibrato sincronizados (~10 Hz)
      id: 'sheep', emoji: '🐑', name: { es: 'Oveja', en: 'Sheep' }, say: { es: 'La oveja', en: 'The sheep' }, kind: 'shot',
      play(v) {
        const G = 0.5; // nivel interno (≈ ganancia de normalización 1)
        const bleat = (t, f, dur, gain) => {
          const rate = v.rand(8, 11);
          return vocal(v, {
            t, dur, type: 'sawtooth',
            pitch: [[0, f * 0.9], [0.08, f * 1.05], [dur * 0.7, f], [dur, f * 0.85]],
            amp: [[0, 0], [0.05, 0.9], [0.15, 1], [dur * 0.75, 0.8], [dur, 0]],
            vowels: [[0, 'm'], [0.05, 'e'], [dur * 0.7, 'e'], [dur, 'a']],
            scale: 1.15, vibrato: { rate, depth: 70 }, tremolo: { rate, depth: 0.75 },
            detune: 12, breath: 0.1, jitter: 25, gain: gain * G, reverb: 0.1,
          });
        };
        const f = v.vary(300, 0.1);
        let end = bleat(v.t0, f, v.rand(0.9, 1.3), 0.55);
        if (v.chance(0.3)) end = bleat(end + v.rand(0.25, 0.45), f * 1.35, v.rand(0.6, 0.8), 0.4); // corderito
        return end;
      },
    },
    {
      // "Meee": más agudo, nasal y con un temblor más rápido que la oveja
      id: 'goat', emoji: '🐐', name: { es: 'Cabra', en: 'Goat' }, say: { es: 'La cabra', en: 'The goat' }, kind: 'shot',
      play(v) {
        const G = 0.4; // nivel interno (≈ ganancia de normalización 1)
        const n = v.pick([1, 2, 2]);
        let t = v.t0, end = t;
        const f = v.vary(420, 0.1);
        for (let i = 0; i < n; i++) {
          const dur = v.rand(0.6, 0.9);
          const rate = v.rand(14, 17);
          end = vocal(v, {
            t, dur, type: 'sawtooth',
            pitch: [[0, f * 0.95], [0.06, f * 1.1], [dur * 0.6, f * 1.02], [dur, f * 0.8]],
            amp: [[0, 0], [0.04, 1], [dur * 0.7, 0.8], [dur, 0]],
            vowels: [[0, 'm'], [0.05, NASAL_GOAT], [dur * 0.7, 'e'], [dur, 'a']],
            scale: 1.25, vibrato: { rate, depth: 110 }, tremolo: { rate, depth: 0.85 },
            drive: 1.8, breath: 0.15, detune: 18, jitter: 30, gain: (0.55) * G, reverb: 0.1,
          });
          t = end + v.rand(0.3, 0.5);
        }
        return end;
      },
    },
    {
      // Galope opcional (clop-clop) + relincho agudo con vibrato fuerte + resoplido
      id: 'horse', emoji: '🐎', name: { es: 'Caballo', en: 'Horse' }, say: { es: 'El caballo', en: 'The horse' }, kind: 'shot',
      play(v) {
        const G = 0.26; // nivel interno (≈ ganancia de normalización 1)
        let t = v.t0;
        if (v.chance(0.6)) {
          const beats = v.irand(2, 3);
          const cyc = v.rand(0.38, 0.45);
          for (let b = 0; b < beats; b++) {
            [0, 0.09, 0.2].forEach((off, k) => hit(v, {
              t: t + b * cyc + off, dur: 0.05, type: 'bandpass', freq: v.rand(1400, 2000), Q: 5,
              gain: (k === 2 ? 0.8 : 0.6) * G, pan: -0.5 + b * 0.3, reverb: 0.1,
            }));
          }
          t += beats * cyc + 0.2;
        }
        const dur = v.rand(1.2, 1.6);
        const f = v.vary(900, 0.08);
        const rate = v.rand(11, 14);
        let end = vocal(v, {
          t, dur, type: 'sawtooth',
          pitch: [[0, f * 0.75], [0.1, f * 1.12], [0.4, f], [dur * 0.75, f * 0.6], [dur, f * 0.42]],
          amp: [[0, 0], [0.06, 1], [dur * 0.5, 0.85], [dur * 0.85, 0.55], [dur, 0]],
          vowels: [[0, 'i'], [dur * 0.4, 'e'], [dur * 0.8, 'a'], [dur, 'o']],
          scale: 1.15, vibrato: { rate, depth: 110 }, tremolo: { rate, depth: 0.6 },
          drive: 1.8, breath: 0.25, jitter: 40, detune: 15, gain: (0.6) * G, reverb: 0.15,
        });
        end = flutter(v, { t: end + 0.08, dur: v.rand(0.35, 0.5), rate: v.rand(20, 26), freq: 450, gain: (0.5) * G});
        return end;
      },
    },
    {
      // "Iii-aaa": inspiración aguda y ruidosa + espiración grave y áspera
      id: 'donkey', emoji: '🐴', name: { es: 'Burro', en: 'Donkey' }, say: { es: 'El burro', en: 'The donkey' }, kind: 'shot',
      play(v) {
        const G = 0.2; // nivel interno (≈ ganancia de normalización 1)
        const n = v.irand(3, 4);
        let t = v.t0, end = t;
        const fh = v.vary(700, 0.08);
        const fl = v.vary(420, 0.08);
        for (let i = 0; i < n; i++) {
          const k = 1 - i * 0.04;
          const dh = v.rand(0.3, 0.38) * k;
          end = vocal(v, {
            t, dur: dh, type: 'sawtooth',
            pitch: [[0, fh * 0.9], [dh, fh * 1.2]],
            amp: [[0, 0], [0.05, 0.8], [dh * 0.8, 1], [dh, 0]],
            vowels: [[0, 'i'], [dh, 'e']], scale: 1.2,
            drive: 1.5, breath: 0.5, breathHp: 1200, jitter: 40, gain: (0.4) * G,
          });
          const dl = v.rand(0.4, 0.5) * k;
          end = vocal(v, {
            t: end + 0.02, dur: dl, type: 'sawtooth',
            pitch: [[0, fl * 1.05], [0.05, fl * 1.1], [dl, fl * 0.6]],
            amp: [[0, 0], [0.03, 1], [dl * 0.7, 0.8], [dl, 0]],
            vowels: [[0, 'a'], [dl * 0.6, 'a'], [dl, 'o']], scale: 0.9,
            sub: 0.35, detune: 15, drive: 2.5, breath: 0.2, breathColor: 'pink',
            tremolo: { rate: 30, depth: 0.4 }, jitter: 40, gain: (0.75) * G, reverb: 0.1,
          });
          t = end + 0.04;
        }
        return end;
      },
    },
    {
      // Cacareo: "coc, coc, coc..." y a veces el "¡cocorocóo!" final
      id: 'hen', emoji: '🐔', name: { es: 'Gallina', en: 'Hen' }, say: { es: 'La gallina', en: 'The hen' }, kind: 'shot',
      play(v) {
        const G = 0.2; // nivel interno (≈ ganancia de normalización 1)
        let t = v.t0, end = t;
        const f = v.vary(450, 0.1);
        const cluck = (at, ff, d, gain) => vocal(v, {
          t: at, dur: d, type: 'sawtooth',
          pitch: [[0, ff * 1.15], [d, ff * 0.85]],
          amp: [[0, 0], [0.006, 1], [d * 0.5, 0.6], [d, 0]],
          vowels: [[0, 'o'], [d, 'a']], scale: 1.4,
          drive: 1.5, breath: 0.15, jitter: 30, gain: gain * G,
        });
        const n = v.irand(4, 7);
        for (let i = 0; i < n; i++) {
          end = cluck(t, f * v.rand(0.95, 1.08), v.rand(0.07, 0.11), 0.5);
          t = end + v.rand(0.1, 0.32);
        }
        if (v.chance(0.65)) {
          for (let k = 0; k < 2; k++) { end = cluck(t, f * 1.3, 0.08, 0.55); t = end + 0.07; }
          const d = v.rand(0.4, 0.55);
          end = vocal(v, {
            t, dur: d, type: 'sawtooth',
            pitch: [[0, f * 1.5], [0.08, f * 2.0], [d * 0.6, f * 1.9], [d, f * 1.4]],
            amp: [[0, 0], [0.02, 1], [d * 0.7, 0.8], [d, 0]],
            vowels: [[0, 'e'], [0.07, 'a'], [d * 0.8, 'a'], [d, 'o']], scale: 1.4,
            drive: 2.2, breath: 0.2, tremolo: { rate: 50, depth: 0.3 }, vibrato: { rate: 9, depth: 40 },
            gain: (0.6) * G, reverb: 0.1,
          });
        }
        return end;
      },
    },
    {
      // "Kikirikí": cuatro sílabas, la última larga y descendente, timbre áspero
      id: 'rooster', emoji: '🐓', name: { es: 'Gallo', en: 'Rooster' }, say: { es: 'El gallo', en: 'The rooster' }, kind: 'shot',
      play(v) {
        const G = 0.16; // nivel interno (≈ ganancia de normalización 1)
        const f = v.vary(520, 0.08);
        const common = {
          type: 'sawtooth', drive: 2.5, breath: 0.25, tremolo: { rate: 55, depth: 0.35 },
          scale: 1.5, bright: 1.1, jitter: 35, detune: 20, gain: (0.6) * G, reverb: 0.15,
        };
        let t = v.t0, end = t;
        const short = [[0.16, 1.0, 1.15], [0.13, 1.15, 1.2], [0.24, 1.2, 1.35]];
        for (const [d, k0, k1] of short) {
          end = vocal(v, {
            ...common, t, dur: d * v.rand(0.9, 1.1),
            pitch: [[0, f * k0], [d, f * k1]],
            amp: [[0, 0], [0.015, 1], [d * 0.8, 0.85], [d, 0]],
            vowels: [[0, 'i'], [d, 'i']],
          });
          t = end + v.rand(0.035, 0.07);
        }
        const d = v.rand(0.8, 1.0);
        end = vocal(v, {
          ...common, t, dur: d,
          pitch: [[0, f * 1.35], [d * 0.2, f * 1.45], [d * 0.75, f * 1.35], [d, f * 1.0]],
          amp: [[0, 0], [0.02, 1], [d * 0.7, 0.9], [d, 0]],
          vowels: [[0, 'i'], [0.1, 'e'], [d * 0.6, 'a'], [d, 'o']],
        });
        return end;
      },
    },
    {
      // Píos agudos (3-4,5 kHz) con un pequeño ascenso y caída, varios pollitos
      id: 'chick', emoji: '🐥', name: { es: 'Pollito', en: 'Chick' }, say: { es: 'El pollito', en: 'The chick' }, kind: 'shot',
      play(v) {
        const G = 1.0; // nivel interno (≈ ganancia de normalización 1)
        let t = v.t0, end = t;
        const n = v.irand(6, 10);
        for (let i = 0; i < n; i++) {
          const f = v.rand(3300, 4200);
          const d = v.rand(0.08, 0.14);
          end = Math.max(end, tone(v, {
            t, freq: f, dur: d, a: 0.008, r: d * 0.5,
            glide: [[0, f * 0.85], [d * 0.25, f], [d, f * 0.72]],
            gain: (0.22) * G, pan: v.rand(-0.4, 0.4), reverb: 0.05,
          }));
          t += d + v.rand(v.chance(0.2) ? -0.05 : 0.05, 0.22);
        }
        return end;
      },
    },
    {
      // "Cua cua cua": graznido nasal y áspero, en decrescendo
      id: 'duck', emoji: '🦆', name: { es: 'Pato', en: 'Duck' }, say: { es: 'El pato', en: 'The duck' }, kind: 'shot',
      play(v) {
        const G = 0.42; // nivel interno (≈ ganancia de normalización 1)
        const n = v.irand(3, 5);
        let t = v.t0, end = t;
        const f = v.vary(300, 0.08);
        for (let i = 0; i < n; i++) {
          const k = 1 - i * 0.07;
          const d = v.rand(0.17, 0.24);
          end = vocal(v, {
            t, dur: d, type: 'sawtooth',
            pitch: [[0, f * k * 1.05], [0.04, f * k * 1.12], [d, f * k * 0.8]],
            amp: [[0, 0], [0.012, 1], [d * 0.65, 0.85], [d, 0]],
            vowels: [[0, 'n'], [0.035, QUACK_A], [d * 0.7, QUACK_B], [d, 'n']],
            drive: 3, detune: 30, tremolo: { rate: 65, depth: 0.45 }, breath: 0.15,
            jitter: 30, gain: (0.55 * k) * G, peaks: [12, 12, 10],
          });
          t = end + v.rand(0.08, 0.14);
        }
        return end;
      },
    },
    {
      // "Glu-glu-glu": gorgoteo rápido (FM + AM sincronizadas a ~16 Hz)
      id: 'turkey', emoji: '🦃', name: { es: 'Pavo', en: 'Turkey' }, say: { es: 'El pavo', en: 'The turkey' }, kind: 'shot',
      play(v) {
        const G = 0.19; // nivel interno (≈ ganancia de normalización 1)
        const dur = v.rand(0.9, 1.3);
        const f = v.vary(620, 0.08);
        const rate = v.rand(14, 18);
        return vocal(v, {
          dur, type: 'sawtooth',
          pitch: [[0, f * 1.1], [dur, f * 0.75]],
          amp: [[0, 0], [0.05, 1], [dur * 0.7, 0.85], [dur, 0]],
          vowels: [[0, 'u'], [dur * 0.5, 'o'], [dur, 'u']], scale: 1.3,
          vibrato: { rate, depth: 250 }, tremolo: { rate, depth: 0.9 },
          drive: 2, breath: 0.15, jitter: 40, gain: (0.6) * G, reverb: 0.1,
        });
      },
    },
    {
      // "¡Guau guau!": golpe de aire ruidoso + ladrido corto saturado
      id: 'dog', emoji: '🐶', name: { es: 'Perro', en: 'Dog' }, say: { es: 'El perro', en: 'The dog' }, kind: 'shot',
      play(v) {
        const G = 0.21; // nivel interno (≈ ganancia de normalización 1)
        const n = v.pick([2, 2, 3]);
        let t = v.t0, end = t;
        const f = v.vary(420, 0.1);
        for (let i = 0; i < n; i++) {
          const d = v.rand(0.14, 0.2);
          hit(v, { t, dur: 0.06, color: 'pink', type: 'bandpass', freq: 1100, Q: 0.8, gain: (0.9) * G});
          end = vocal(v, {
            t, dur: d, type: 'sawtooth',
            pitch: [[0, f * 1.2], [0.03, f * 1.4], [d * 0.5, f], [d, f * 0.6]],
            amp: [[0, 0], [0.005, 1], [0.05, 0.85], [d * 0.6, 0.5], [d, 0]],
            vowels: [[0, 'a'], [d * 0.45, 'o'], [d, 'u']], scale: 0.85, bright: 1.2,
            drive: 4, breath: 0.9, breathColor: 'pink', breathHp: 300,
            jitter: 60, sub: 0.35, detune: 25, gain: (0.6) * G, reverb: 0.12,
          });
          t = end + v.rand(0.15, 0.28);
        }
        return end;
      },
    },
    {
      // "Miau": m → i → a → u con tono que sube y baja
      id: 'cat', emoji: '🐱', name: { es: 'Gato', en: 'Cat' }, say: { es: 'El gato', en: 'The cat' }, kind: 'shot',
      play(v) {
        const G = 0.17; // nivel interno (≈ ganancia de normalización 1)
        const meow = (t, f, dur, gain) => vocal(v, {
          t, dur,
          pitch: [[0, f * 0.85], [dur * 0.35, f * 1.2], [dur * 0.7, f * 1.05], [dur, f * 0.75]],
          amp: [[0, 0], [0.06, 0.8], [dur * 0.3, 1], [dur * 0.8, 0.7], [dur, 0]],
          vowels: [[0, 'm'], [0.07, 'i'], [dur * 0.35, 'e'], [dur * 0.55, 'a'], [dur * 0.85, 'o'], [dur, 'u']],
          scale: 1.35, jitter: 20, vibrato: { rate: 7, depth: 25, delay: 0.2 }, breath: 0.05, gain: gain * G, reverb: 0.08,
        });
        const f = v.vary(560, 0.1);
        let end = meow(v.t0, f, v.rand(0.75, 1.0), 0.5);
        if (v.chance(0.3)) end = meow(end + v.rand(0.3, 0.5), f * v.rand(1.05, 1.2), v.rand(0.55, 0.75), 0.45);
        return end;
      },
    },
  ],
};
