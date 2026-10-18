// Orejitas · categoría: Animales salvajes / Wild animals
// Voces (vocal()), FM para pájaros y delfines, trenes de pulsos para la rana
// y el grillo, zumbido con panorama móvil para la abeja.
import { vocal, tone, hit } from '../instruments.js';
import { fmNote, birdSong, noiseEnv, points } from './_animals.js';

const FROG_SAC = { f: [600, 1300, 2400], lp: 3000 };
const FROG_SAC2 = { f: [500, 1150, 2300], lp: 2500 };

// Ululato del búho: tono casi puro + un poco de armónico y aliento
function hoot(v, t, f, d, gain) {
  tone(v, { t, freq: f, dur: d, a: Math.min(0.08, d * 0.3), r: d * 0.45, glide: [[0, f * 0.96], [d * 0.25, f], [d, f * 0.88]], gain, reverb: 0.4 });
  tone(v, { t, freq: f * 2, dur: d, a: 0.06, r: d * 0.5, glide: [[0, f * 1.92], [d * 0.25, f * 2], [d, f * 1.76]], gain: gain * 0.08 });
  noiseEnv(v, { t, env: [[0, 0], [d * 0.2, 1], [d, 0]], color: 'pink', filters: [v.bp(f, 4)], gain: gain * 0.6 });
  return t + d;
}

export default {
  id: 'wild',
  emoji: '🦁',
  name: { es: 'Animales salvajes', en: 'Wild animals' },
  sounds: [
    {
      // Rugido: grave, áspero (subarmónico + saturación + gruñido a ~28 Hz)
      id: 'lion', emoji: '🦁', name: { es: 'León', en: 'Lion' }, say: { es: 'El león', en: 'The lion' }, kind: 'shot',
      play(v) {
        const f = v.vary(110, 0.1);
        let t = v.t0;
        if (v.chance(0.5)) {
          t = vocal(v, {
            t, dur: 0.35, type: 'sawtooth',
            pitch: [[0, f * 0.7], [0.35, f * 0.6]],
            amp: [[0, 0], [0.05, 0.5], [0.3, 0.3], [0.35, 0]],
            vowels: [[0, 'u'], [0.35, 'o']], scale: 0.6, sub: 0.5, drive: 3,
            breath: 0.5, breathColor: 'pink', breathHp: 200, tremolo: { rate: 25, depth: 0.6 }, gain: 0.5,
          }) + 0.15;
        }
        const dur = v.rand(1.6, 2.2);
        return vocal(v, {
          t, dur, type: 'sawtooth',
          pitch: [[0, f * 0.8], [0.35, f * 1.3], [dur * 0.5, f * 1.45], [dur * 0.8, f * 1.1], [dur, f * 0.65]],
          amp: [[0, 0], [0.3, 0.7], [0.7, 1], [dur - 0.5, 0.75], [dur, 0]],
          vowels: [[0, 'u'], [0.3, 'o'], [0.6, 'a'], [dur * 0.75, 'o'], [dur, 'u']],
          scale: 0.6, sub: 0.5, detune: 25, drive: 3.5, breath: 0.6, breathColor: 'pink', breathHp: 200,
          tremolo: { rate: v.rand(24, 32), depth: 0.5 }, jitter: 50, gain: 0.7, reverb: 0.25,
        });
      },
    },
    {
      // Barritar: trompetazo metálico que sube de tono y tiembla
      id: 'elephant', emoji: '🐘', name: { es: 'Elefante', en: 'Elephant' }, say: { es: 'El elefante', en: 'The elephant' }, kind: 'shot',
      play(v) {
        const dur = v.rand(1.0, 1.5);
        const f = v.vary(420, 0.1);
        return vocal(v, {
          dur, type: 'sawtooth',
          pitch: [[0, f * 0.75], [0.15, f * 1.35], [0.45, f * 1.55], [dur * 0.75, f * 1.45], [dur, f * 1.0]],
          amp: [[0, 0], [0.1, 0.8], [0.3, 1], [dur - 0.25, 0.9], [dur, 0]],
          vowels: [[0, 'o'], [0.15, 'a'], [dur - 0.2, 'a'], [dur, 'o']], bright: 1.3, peaks: [10, 12, 12],
          vibrato: { rate: 7, depth: 60, delay: 0.2 }, jitter: 60, drive: 3.5, detune: 22, breath: 0.25,
          tremolo: { rate: 42, depth: 0.25 }, gain: 0.6, reverb: 0.3,
        });
      },
    },
    {
      // "Uh uh uh... ¡ah ah!": ululatos que se aceleran y suben hasta gritos
      id: 'monkey', emoji: '🐵', name: { es: 'Mono', en: 'Monkey' }, say: { es: 'El mono', en: 'The monkey' }, kind: 'shot',
      play(v) {
        let t = v.t0, end = t;
        const f = v.vary(300, 0.1);
        const nh = v.irand(4, 6);
        for (let i = 0; i < nh; i++) {
          const k = 1 + i * 0.1;
          const d = v.rand(0.1, 0.14);
          end = vocal(v, {
            t, dur: d,
            pitch: [[0, f * k * 0.9], [d * 0.5, f * k * 1.1], [d, f * k]],
            amp: [[0, 0], [0.02, 1], [d * 0.6, 0.7], [d, 0]],
            vowels: [[0, i % 2 ? 'o' : 'u'], [d, 'u']], scale: 1.15,
            breath: i % 2 ? 0.4 : 0.15, jitter: 30, gain: 0.5,
          });
          t = end + Math.max(0.06, 0.2 - i * 0.025);
        }
        const na = v.irand(2, 3);
        for (let j = 0; j < na; j++) {
          const d = v.rand(0.18, 0.26);
          const fa = f * v.rand(2.8, 3.4);
          end = vocal(v, {
            t, dur: d, type: 'sawtooth',
            pitch: [[0, fa * 0.9], [d * 0.3, fa * 1.08], [d, fa * 0.8]],
            amp: [[0, 0], [0.015, 1], [d * 0.7, 0.8], [d, 0]],
            vowels: [[0, 'e'], [0.04, 'a'], [d, 'a']], scale: 1.2,
            drive: 2.2, breath: 0.3, jitter: 40, tremolo: { rate: 40, depth: 0.3 }, gain: 0.6, reverb: 0.15,
          });
          t = end + v.rand(0.06, 0.12);
        }
        return end;
      },
    },
    {
      // Aullido: tono casi puro que sube, se sostiene y cae; a veces un segundo lobo
      id: 'wolf', emoji: '🐺', name: { es: 'Lobo', en: 'Wolf' }, say: { es: 'El lobo', en: 'The wolf' }, kind: 'shot',
      play(v) {
        const howl = (t, f, dur, gain, pan) => vocal(v, {
          t, dur,
          pitch: [[0, f * 0.8], [0.45, f * 1.3], [0.8, f * 1.4], [dur - 0.9, f * 1.35], [dur, f * 0.95]],
          amp: [[0, 0], [0.3, 0.8], [0.7, 1], [dur - 0.7, 0.85], [dur, 0]],
          vowels: [[0, 'u'], [0.5, 'o'], [dur - 0.6, 'o'], [dur, 'u']],
          vibrato: { rate: 5, depth: 18, delay: 0.6 }, jitter: 10, breath: 0.06, gain, pan, reverb: 0.55,
        });
        const dur = v.rand(2.4, 3.3);
        const f = v.vary(380, 0.1);
        let end = howl(v.t0, f, dur, 0.6, v.rand(-0.2, 0.2));
        if (v.chance(0.45)) {
          end = Math.max(end, howl(v.t0 + v.rand(0.9, 1.4), f * v.rand(1.15, 1.3), dur * 0.85, 0.35, v.rand(0.4, 0.7) * v.pick([-1, 1])));
        }
        return end;
      },
    },
    {
      // "Uuh... uh-uh-uuuh": ululatos suaves con reverberación nocturna
      id: 'owl', emoji: '🦉', name: { es: 'Búho', en: 'Owl' }, say: { es: 'El búho', en: 'The owl' }, kind: 'shot',
      play(v) {
        const f = v.vary(370, 0.08);
        // [duración, tono relativo]; 0 = silencio
        const pattern = v.pick([
          [[0.45, 1], [0.35, 0], [0.16, 1.04], [0.09, 0], [0.16, 1.04], [0.25, 0], [0.6, 0.97], [0.2, 0], [0.4, 0.95]],
          [[0.6, 1], [0.7, 0], [0.15, 1.03], [0.1, 0], [0.7, 0.98]],
          [[0.4, 1], [0.3, 0], [0.4, 1], [0.5, 0], [0.18, 1.05], [0.08, 0], [0.18, 1.05], [0.08, 0], [0.55, 0.96]],
        ]);
        let t = v.t0, end = t;
        for (const [d, k] of pattern) {
          if (k) end = hoot(v, t, f * k, d, 0.4);
          t += d;
        }
        return end;
      },
    },
    {
      // "Croac": pares "rib-bit" con tren de pulsos y resonancia del saco vocal
      id: 'frog', emoji: '🐸', name: { es: 'Rana', en: 'Frog' }, say: { es: 'La rana', en: 'The frog' }, kind: 'shot',
      play(v) {
        const n = v.pick([2, 2, 3]);
        let t = v.t0, end = t;
        const f = v.vary(95, 0.1);
        const rate = v.rand(38, 50);
        for (let i = 0; i < n; i++) {
          const d1 = v.rand(0.1, 0.14);
          const d2 = v.rand(0.13, 0.17);
          const common = { type: 'sawtooth', tremolo: { rate, depth: 0.9 }, drive: 2, jitter: 30, peaks: [16, 13, 10] };
          end = vocal(v, {
            ...common, t, dur: d1,
            pitch: [[0, f], [d1, f * 1.1]],
            amp: [[0, 0], [0.01, 1], [d1 * 0.7, 0.8], [d1, 0]],
            vowels: [[0, FROG_SAC], [d1, FROG_SAC2]], gain: 0.55,
          });
          end = vocal(v, {
            ...common, t: end + 0.05, dur: d2,
            pitch: [[0, f * 1.05], [d2, f * 0.9]],
            amp: [[0, 0], [0.01, 1], [d2 * 0.6, 0.8], [d2, 0]],
            vowels: [[0, FROG_SAC2], [d2, FROG_SAC]], gain: 0.6, reverb: 0.1,
          });
          t = end + v.rand(0.35, 0.6);
        }
        return end;
      },
    },
    {
      // "Bzzz": zumbido de sierra (~220 Hz) que pasa de un lado a otro (Doppler)
      id: 'bee', emoji: '🐝', name: { es: 'Abeja', en: 'Bee' }, say: { es: 'La abeja', en: 'The bee' }, kind: 'shot',
      play(v) {
        const dur = v.rand(2.4, 3.4);
        const t = v.t0;
        const end = t + dur;
        const f = v.vary(220, 0.08);
        const dir = v.pick([-1, 1]);
        const fpts = [[0, f * 1.04], [dur * 0.42, f * 1.03], [dur * 0.58, f * 0.96], [dur, f * 0.95]];
        const mod = v.gain(1);
        v.lfo(v.rand(22, 28), 15, mod, { t, stop: end + 0.05 });
        v.wobble(mod, 20, 5, { t, stop: end + 0.05 });
        const sum = v.gain(0.5);
        [1, 1.006].forEach((k) => {
          const o = v.osc('sawtooth', f * k, t, end + 0.05);
          points(o.frequency, fpts, t, k);
          mod.connect(o.detune);
          o.connect(sum);
        });
        const env = v.gain(0);
        points(env.gain, [[0, 0], [dur * 0.15, 0.35], [dur * 0.45, 1], [dur * 0.6, 0.9], [dur * 0.85, 0.3], [dur, 0]], t);
        const p = v.pan(0);
        points(p.pan, [[0, -0.85 * dir], [dur * 0.5, 0.1 * dir], [dur, 0.85 * dir]], t);
        v.chain(sum, v.filter('peaking', 500, 1.5, 8), v.filter('peaking', 1600, 2, 6), v.lp(3500), env, p, v.out);
        return end;
      },
    },
    {
      // Cri-cri: grupos de 3-4 pulsos de un tono puro (~4,5 kHz)
      id: 'cricket', emoji: '🦗', name: { es: 'Grillo', en: 'Cricket' }, say: { es: 'El grillo', en: 'The cricket' }, kind: 'shot',
      play(v) {
        const f = v.vary(4400, 0.06);
        const chirps = v.irand(5, 8);
        const period = v.rand(0.42, 0.55);
        const pulses = v.irand(3, 4);
        const t = v.t0;
        const dur = (chirps - 1) * period + pulses * 0.032 + 0.02;
        const o = v.osc('sine', f, t, t + dur + 0.1);
        const env = v.gain(0);
        env.gain.setValueAtTime(0, t);
        for (let c = 0; c < chirps; c++) {
          for (let p = 0; p < pulses; p++) {
            const pt = t + c * period + p * 0.032;
            env.gain.setValueAtTime(0, pt);
            env.gain.linearRampToValueAtTime(1, pt + 0.004);
            env.gain.setValueAtTime(1, pt + 0.014);
            env.gain.linearRampToValueAtTime(0, pt + 0.02);
          }
        }
        const pan = v.pan(v.rand(-0.3, 0.3));
        v.chain(o, env, v.gain(0.22), pan, v.out);
        v.send(pan, 0.15);
        return t + dur;
      },
    },
    {
      // Canto generativo: píos, trinos (FM) y silbidos; distinto cada vez
      id: 'bird', emoji: '🐦', name: { es: 'Pájaro', en: 'Bird' }, say: { es: 'El pájaro', en: 'The bird' }, kind: 'shot',
      play(v) {
        return birdSong(v, { base: v.rand(2800, 3600), pan: v.rand(-0.3, 0.3), gain: 0.25, motifs: v.irand(2, 4) });
      },
    },
    {
      // Canto de ballena: gemidos largos con glisandos, mucha reverb y fondo submarino
      id: 'whale', emoji: '🐳', name: { es: 'Ballena', en: 'Whale' }, say: { es: 'La ballena', en: 'The whale' }, kind: 'shot',
      play(v) {
        const shapes = [
          (f, d) => [[0, f], [d * 0.6, f * 2.2], [d, f * 1.8]],
          (f, d) => [[0, f * 2], [d, f * 0.8]],
          (f, d) => [[0, f], [d * 0.5, f * 1.6], [d, f * 0.9]],
          (f, d) => [[0, f * 1.5], [d * 0.3, f * 1.2], [d * 0.7, f * 1.3], [d, f * 2.4]],
        ];
        const n = v.irand(3, 4);
        let t = v.t0 + 0.3, end = t;
        for (let i = 0; i < n; i++) {
          const d = v.rand(1.1, 2.2);
          const f = v.rand(160, 260);
          end = vocal(v, {
            t, dur: d, pitch: v.pick(shapes)(f, d),
            amp: [[0, 0], [d * 0.3, 1], [d * 0.75, 0.8], [d, 0]],
            vowels: [[0, 'u'], [d * 0.5, 'o'], [d, 'u']], scale: 0.85,
            vibrato: { rate: 4, depth: 20 }, jitter: 8, breath: 0.03,
            gain: 0.5, reverb: 0.8, pan: v.rand(-0.3, 0.3),
          });
          t = end + v.rand(0.2, 0.6);
        }
        const tail = end + 0.6;
        noiseEnv(v, {
          t: v.t0, env: [[0, 0], [0.6, 1], [tail - v.t0 - 0.8, 1], [tail - v.t0, 0]],
          color: 'brown', filters: [v.lp(350)], gain: 0.25,
        });
        return tail;
      },
    },
    {
      // Delfín: trenes de clics que se aceleran, silbidos (3,5-5 kHz) y parloteo
      id: 'dolphin', emoji: '🐬', name: { es: 'Delfín', en: 'Dolphin' }, say: { es: 'El delfín', en: 'The dolphin' }, kind: 'shot',
      play(v) {
        let t = v.t0, end = t;
        const pan = v.rand(-0.3, 0.3);
        const parts = v.pick([
          ['clicks', 'whistle', 'chatter', 'whistle'],
          ['whistle', 'clicks', 'whistle'],
          ['chatter', 'whistle', 'clicks', 'whistle'],
        ]);
        for (const part of parts) {
          if (part === 'clicks') {
            const d = v.rand(0.4, 0.7);
            let ct = t;
            let rate = v.rand(15, 25);
            while (ct < t + d) {
              hit(v, { t: ct, dur: 0.004, type: 'bandpass', freq: 3500, Q: 0.8, gain: 0.5, pan });
              rate *= 1.12;
              ct += 1 / rate;
            }
            end = t + d;
          } else if (part === 'whistle') {
            const d = v.rand(0.35, 0.6);
            const f = v.rand(3500, 5000);
            const shape = v.pick([
              [[0, f], [d * 0.5, f * 1.4], [d, f * 0.9]],
              [[0, f * 0.8], [d, f * 1.5]],
              [[0, f * 1.3], [d * 0.3, f], [d * 0.7, f * 1.4], [d, f * 1.1]],
            ]);
            end = fmNote(v, { t, dur: d, freq: shape, fmRate: v.rand(5, 9), fmDepth: f * 0.03, gain: 0.25, a: 0.02, harm: 0.12, pan, reverb: 0.2 });
          } else {
            const k = v.irand(5, 8);
            let ct = t;
            for (let i = 0; i < k; i++) {
              const d = v.rand(0.04, 0.07);
              const f = v.rand(2500, 4500);
              end = fmNote(v, { t: ct, dur: d, freq: [[0, f * 0.85], [d * 0.5, f * 1.15], [d, f]], gain: 0.22, harm: 0.15, pan });
              ct = end + v.rand(0.02, 0.05);
            }
          }
          t = end + v.rand(0.08, 0.2);
        }
        return end;
      },
    },
    {
      // "Iii iii": chillidos agudos y cortos con vibrato rápido
      id: 'mouse', emoji: '🐭', name: { es: 'Ratón', en: 'Mouse' }, say: { es: 'El ratón', en: 'The mouse' }, kind: 'shot',
      play(v) {
        const n = v.irand(3, 5);
        let t = v.t0, end = t;
        const base = v.vary(3000, 0.1);
        for (let i = 0; i < n; i++) {
          const d = v.rand(0.07, 0.13);
          const f = base * v.rand(0.88, 1.12);
          end = fmNote(v, {
            t, dur: d, freq: [[0, f * 0.9], [d * 0.4, f * 1.1], [d, f]],
            fmRate: v.rand(30, 40), fmDepth: f * 0.04, gain: 0.2, harm: 0.1, a: 0.008, pan: v.rand(-0.2, 0.2),
          });
          t = end + v.rand(0.06, 0.18);
        }
        return end;
      },
    },
    {
      // "Sssss": siseo de ruido agudo que crece y se apaga
      id: 'snake', emoji: '🐍', name: { es: 'Serpiente', en: 'Snake' }, say: { es: 'La serpiente', en: 'The snake' }, kind: 'shot',
      play(v) {
        const n = v.pick([1, 2]);
        let t = v.t0, end = t;
        for (let i = 0; i < n; i++) {
          const d = v.rand(1.0, 1.6) * (i ? 0.7 : 1);
          end = noiseEnv(v, {
            t, env: [[0, 0], [0.15, 0.7], [d * 0.6, 1], [d, 0]], color: 'white',
            filters: [v.hp(2500), v.filter('peaking', v.rand(4500, 5500), 1.5, 6), v.lp(8000)],
            gain: 0.5, pan: v.rand(-0.2, 0.2),
          });
          t = end + v.rand(0.25, 0.4);
        }
        return end;
      },
    },
  ],
};
