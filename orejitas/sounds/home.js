// Orejitas · categoría: En casa / At home
import { vocal, tone, sweep, hit, thump, bell } from '../instruments.js';
import { strikeBell, bubbles } from './_machines.js';

// Barra metálica libre (timbre "ding-dong"): parciales 1 · 2,76 · 5,40
const BAR = [[1, 1, 1], [1.003, 0.3, 0.9], [2.756, 0.2, 0.35], [5.404, 0.06, 0.15]];

// Nota de flauta de fuelle (cucú)
function pipe(v, { t, freq, dur, gain = 0.3, dest }) {
  const end = t + dur;
  const o = v.osc(v.wave([1, 0.15, 0.05]), freq * 0.97, t, end + 0.05);
  o.frequency.setTargetAtTime(freq, t, 0.02);
  const g = v.gain(0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.03);
  g.gain.setValueAtTime(gain, end - 0.06);
  g.gain.linearRampToValueAtTime(0, end);
  v.chain(o, g, dest);
  const n = v.noise('white', { t, stop: end + 0.05 });
  const ng = v.gain(0);
  ng.gain.setValueAtTime(0, t);
  ng.gain.linearRampToValueAtTime(gain * 0.6, t + 0.02);
  ng.gain.linearRampToValueAtTime(gain * 0.25, t + 0.08);
  ng.gain.setValueAtTime(gain * 0.25, end - 0.06);
  ng.gain.linearRampToValueAtTime(0, end);
  v.chain(n, v.bp(freq, 6), ng, dest);
  return end;
}

export default {
  id: 'home',
  emoji: '🏠',
  name: { es: 'En casa', en: 'At home' },
  sounds: [
    {
      id: 'doorbell', emoji: '🔔', name: { es: 'Timbre', en: 'Doorbell' }, say: { es: 'El timbre', en: 'The doorbell' }, kind: 'shot',
      play(v) {
        const hi = v.pick([659.25, 698.46, 622.25]);
        const lo = hi * 0.7937; // tercera mayor descendente: "ding-dong"
        const t = v.t0;
        const gap = v.rand(0.5, 0.6);
        hit(v, { t, dur: 0.01, freq: 4000, gain: 0.08 });
        bell(v, { t, freq: hi, dur: 2.2, partials: BAR, gain: 0.32, reverb: 0.25 });
        hit(v, { t: t + gap, dur: 0.01, freq: 3500, gain: 0.08 });
        return bell(v, { t: t + gap, freq: lo, dur: 2.6, partials: BAR, gain: 0.34, reverb: 0.25 });
      },
    },
    {
      id: 'phone', emoji: '☎️', name: { es: 'Teléfono', en: 'Telephone' }, say: { es: 'El teléfono', en: 'The telephone' }, kind: 'shot',
      play(v) {
        const f = v.vary(1180, 0.04);
        const rate = v.rand(20, 23);
        const ringDur = v.rand(1.1, 1.3);
        const A = [], B = [];
        let t = v.t0;
        for (let r = 0; r < 2; r++) {
          let i = 0;
          for (let s = 0; s < ringDur; s += 1 / rate) {
            (i++ % 2 ? B : A).push([t + s, v.rand(0.75, 1) * Math.min(1, 0.5 + s * 4)]);
          }
          t += ringDur + v.rand(0.6, 0.75);
        }
        const p = v.pan(v.rand(-0.2, 0.2));
        p.connect(v.out);
        v.send(p, 0.15);
        const partials = [[1, 1, 1], [2.4, 0.4, 0.5], [3.9, 0.15, 0.3]];
        strikeBell(v, { freq: f, partials, strikes: A, decay: 0.3, gain: 0.25, dest: p });
        return strikeBell(v, { freq: f * 1.12, partials, strikes: B, decay: 0.3, gain: 0.22, dest: p });
      },
    },
    {
      id: 'clock', emoji: '🕰️', name: { es: 'Reloj', en: 'Clock' }, say: { es: 'El reloj', en: 'The clock' }, kind: 'loop', fadeIn: 0.3,
      play(v) {
        const room = v.gain(1);
        v.chain(room, v.lp(7000), v.out);
        v.send(room, 0.08);
        const period = v.rand(0.48, 0.52);
        const hiF = v.vary(3300, 0.05), loF = hiF * 0.78;
        let tick = true;
        v.loop((t) => {
          const f = tick ? hiF : loF;
          // chasquido metálico resonante + golpe de la caja de madera
          sweep(v, { t, f0: f, f1: f * 0.97, dur: 0.03, gain: 0.5, dest: room });
          hit(v, { t, dur: 0.025, type: 'bandpass', freq: f, Q: 6, gain: 5, dest: room });
          hit(v, { t, dur: 0.04, type: 'bandpass', freq: f * 0.42, Q: 3, gain: 2.5, dest: room });
          tick = !tick;
          return t + period;
        });
      },
    },
    {
      id: 'alarm', emoji: '⏰', name: { es: 'Despertador', en: 'Alarm clock' }, say: { es: 'El despertador', en: 'The alarm clock' }, kind: 'shot',
      play(v) {
        const f = v.vary(1650, 0.04);
        const rate = v.rand(17, 19);
        const bursts = [[0, 2.0], [2.35, 1.2]];
        const A = [], B = [];
        for (const [dt, d] of bursts) {
          let i = 0;
          for (let s = 0; s < d; s += 1 / rate) {
            (i++ % 2 ? B : A).push([v.t0 + dt + s, v.rand(0.8, 1) * Math.min(1, 0.4 + s * 3)]);
          }
        }
        const p = v.pan(v.rand(-0.2, 0.2));
        p.connect(v.out);
        v.send(p, 0.12);
        const partials = [[1, 1, 1], [2.3, 0.35, 0.5], [3.6, 0.15, 0.3]];
        strikeBell(v, { freq: f, partials, strikes: A, decay: 0.25, gain: 0.22, dest: p });
        const end = strikeBell(v, { freq: f * 1.06, partials, strikes: B, decay: 0.25, gain: 0.2, dest: p });
        // traqueteo del martillo
        const n = v.dust(60, { t: v.t0, stop: end, grain: 0.002 });
        const g = v.gain(0);
        v.env(g.gain, [[0, 0.25], [2.0, 0.25], [2.05, 0, 'set'], [2.35, 0.25, 'set'], [3.55, 0.25], [3.6, 0]], v.t0);
        v.chain(n, v.bp(3000, 2), g, p);
        return end;
      },
    },
    {
      id: 'knock', emoji: '🚪', name: { es: 'Llamar a la puerta', en: 'Knock knock' }, say: { es: '¡Toc, toc!', en: 'Knock, knock!' }, kind: 'shot',
      play(v) {
        const door = v.gain(1);
        const p = v.pan(v.rand(-0.3, 0.3));
        v.chain(door, v.filter('peaking', 260, 2, 6), v.lp(3500), p, v.out);
        v.send(p, 0.12);
        const n = v.pick([3, 3, 2, 4]);
        const gap = v.rand(0.17, 0.24);
        const f0 = v.vary(190, 0.1);
        let t = v.t0, end = t;
        for (let i = 0; i < n; i++) {
          const k = i === n - 1 ? 1 : v.rand(0.75, 0.95);
          thump(v, { t, f0: f0 * v.rand(0.95, 1.05), f1: 110, dur: 0.15, gain: 0.8 * k, click: 0.25, dest: door });
          end = hit(v, { t, dur: 0.05, type: 'bandpass', freq: v.vary(700, 0.1), Q: 1.5, gain: 0.5 * k, dest: door });
          t += gap * v.rand(0.9, 1.1);
        }
        return end + 0.25;
      },
    },
    {
      id: 'tap', emoji: '🚰', name: { es: 'Grifo', en: 'Tap' }, say: { es: 'El grifo', en: 'The tap' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        const dur = 5;
        const bus = v.gain(0);
        v.env(bus.gain, [[0, 0], [0.3, 1], [dur - 0.6, 1], [dur, 0]], t);
        v.chain(bus, v.out);
        v.send(bus, 0.1);
        // chorro: ruido con temblor rápido
        const n = v.noise('white', { t, stop: t + dur + 0.1, stereo: true });
        const bp = v.bp(1700, 0.6);
        v.env(bp.frequency, [[0, 1700], [dur - 0.6, 1700], [dur, 3200]], t);
        const am = v.gain(0.35);
        v.wobble(am.gain, 0.12, 14, { t, stop: t + dur + 0.1 });
        v.chain(n, bp, am, bus);
        // salpicadura en el lavabo
        v.chain(v.noise('pink', { t, stop: t + dur + 0.1 }), v.filter('peaking', 420, 2, 6), v.lp(900), v.gain(0.35), bus);
        // burbujas
        bubbles(v, { t, dur: dur - 0.3, rate: 32, lo: 350, hi: 1500, gain: 0.18, dest: bus });
        return t + dur;
      },
    },
    {
      id: 'kettle', emoji: '🫖', name: { es: 'Tetera', en: 'Kettle' }, say: { es: 'La tetera', en: 'The kettle' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        const dur = 5.4;
        const stop = t + dur + 0.1;
        // hervor: rumor grave y burbujas
        const boil = v.gain(0);
        v.env(boil.gain, [[0, 0], [0.8, 0.6], [dur - 1, 0.7], [dur, 0]], t);
        v.chain(v.noise('brown', { t, stop }), v.lp(700), boil, v.out);
        bubbles(v, { t, dur: dur - 0.5, rate: 22, lo: 160, hi: 600, gain: 0.12, dest: boil });
        // silbido: sube de tono al aumentar la presión y baja al apartarla
        const ws = t + 1.2;
        const fA = v.vary(1350, 0.05), fB = v.vary(2050, 0.04);
        const wg = v.gain(0);
        v.env(wg.gain, [[0, 0], [1.3, 0.22], [2.9, 0.26], [3.6, 0.1], [dur - 1.2, 0]], ws);
        const p = v.pan(v.rand(-0.2, 0.2));
        v.chain(wg, p, v.out);
        v.send(p, 0.1);
        // la presión sube: el tono asciende rápido y luego se estabiliza
        const k = (x) => fA + (fB - fA) * x;
        const rise = [[0, fA], [0.6, k(0.4)], [1.3, k(0.72)], [2.1, k(0.92)], [2.9, fB], [3.8, fB * 0.85]];
        for (const [mul, lev] of [[1, 1], [1.012, 0.6]]) {
          const o = v.osc('sine', fA * mul, ws, stop);
          v.env(o.frequency, rise.map(([dt, f]) => [dt, f * mul]), ws);
          v.lfo(6, 12, o.detune, { t: ws, stop });
          v.chain(o, v.gain(lev), wg);
        }
        const bp = v.bp(fA, 12);
        v.env(bp.frequency, rise, ws);
        v.chain(v.noise('white', { t: ws, stop }), bp, v.gain(1.4), wg);
        return t + dur;
      },
    },
    {
      id: 'cuckoo', emoji: '🐦', name: { es: 'Cucú', en: 'Cuckoo clock' }, say: { es: 'El cucú', en: 'The cuckoo clock' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        const out = v.gain(1);
        v.chain(out, v.out);
        v.send(out, 0.15);
        // se abre la puertecita
        hit(v, { t, dur: 0.04, type: 'bandpass', freq: 1500, Q: 3, gain: 0.4, dest: out });
        thump(v, { t: t + 0.02, f0: 300, f1: 180, dur: 0.06, gain: 0.25, click: 0, dest: out });
        const hi = v.vary(698, 0.03), lo = hi / 1.19;
        const times = v.pick([2, 3, 3]);
        let at = t + 0.35, end = at;
        for (let i = 0; i < times; i++) {
          hit(v, { t: at, dur: 0.06, color: 'pink', type: 'lowpass', freq: 600, gain: 0.15, dest: out });
          pipe(v, { t: at, freq: hi, dur: 0.22, dest: out });
          end = pipe(v, { t: at + 0.3, freq: lo, dur: 0.42, dest: out });
          at = end + 0.45;
        }
        hit(v, { t: end + 0.15, dur: 0.04, type: 'bandpass', freq: 1300, Q: 3, gain: 0.3, dest: out });
        return end + 0.3;
      },
    },
    {
      id: 'microwave', emoji: '🍿', name: { es: 'Microondas', en: 'Microwave' }, say: { es: 'El microondas', en: 'The microwave' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        const hum = v.rand(2.4, 2.9);
        const stop = t + hum + 0.05;
        const hg = v.gain(0);
        v.env(hg.gain, [[0, 0], [0.12, 1], [hum - 0.08, 1], [hum, 0]], t);
        v.chain(hg, v.out);
        // zumbido de red (100 Hz) y armónicos, ventilador
        for (const [f, lev] of [[100, 0.35], [200, 0.2], [300, 0.08]]) v.chain(v.osc('sine', f, t, stop), v.gain(lev), hg);
        v.chain(v.osc('sawtooth', 100, t, stop), v.bp(1200, 2), v.gain(0.08), hg);
        v.chain(v.noise('pink', { t, stop }), v.bp(600, 0.6), v.gain(0.5), hg);
        thump(v, { t: t + hum, f0: 90, f1: 50, dur: 0.12, gain: 0.4, click: 0.1 });
        const at = t + hum + 0.35;
        if (v.chance(0.5)) {
          return bell(v, { t: at, freq: v.vary(1760, 0.03), dur: 1.8, partials: [[1, 1, 1], [2.76, 0.2, 0.4], [5.4, 0.05, 0.15]], gain: 0.3, reverb: 0.15 });
        }
        let end = at;
        for (let i = 0; i < 3; i++) {
          end = tone(v, { t: at + i * 0.32, freq: 1900, type: 'square', dur: 0.16, a: 0.005, r: 0.02, gain: 0.12, filter: { freq: 2600 } });
        }
        return end + 0.1;
      },
    },
    {
      id: 'keys', emoji: '🔑', name: { es: 'Llaves', en: 'Keys' }, say: { es: 'Las llaves', en: 'The keys' }, kind: 'shot',
      play(v) {
        const shakes = v.pick([2, 3, 3, 4]);
        const partials = [[1, 1, 1], [1.73, 0.5, 0.5], [2.64, 0.25, 0.3]];
        let t = v.t0, end = t;
        for (let s = 0; s < shakes; s++) {
          const n = v.irand(10, 16);
          for (let i = 0; i < n; i++) {
            const at = t + Math.pow(Math.random(), 1.5) * 0.14;
            end = Math.max(end, bell(v, { t: at, freq: v.rand(2000, 4200), dur: v.rand(0.15, 0.3), partials, gain: v.rand(0.04, 0.1), pan: v.rand(-0.3, 0.3), reverb: 0.05 }));
          }
          hit(v, { t, dur: 0.12, type: 'highpass', freq: 3000, Q: 0.7, a: 0.01, gain: 0.08 });
          t += v.rand(0.28, 0.4);
        }
        return end + 0.05;
      },
    },
    {
      id: 'applause', emoji: '👏', name: { es: 'Aplausos', en: 'Applause' }, say: { es: '¡Aplausos!', en: 'Applause!' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        const dur = v.rand(3.6, 4.4);
        const stop = t + dur + 0.1;
        const env = v.gain(0);
        v.env(env.gain, [[0, 0], [0.45, 1], [dur - 1.2, 0.9], [dur, 0]], t);
        v.chain(env, v.out);
        v.send(env, 0.15);
        // público: muchas palmas (granos de ruido) filtradas en dos bandas
        const crowd = v.dust(110, { t, stop, grain: 0.012, stereo: true });
        const a = v.bp(1600, 0.8), b = v.bp(850, 1);
        crowd.connect(a); crowd.connect(b);
        a.connect(v.gain(1.4)).connect(env);
        b.connect(v.gain(0.9)).connect(env);
        // algunas palmas cercanas más marcadas
        const close = v.irand(8, 14);
        for (let i = 0; i < close; i++) {
          hit(v, { t: t + v.rand(0.2, dur - 1), dur: 0.05, type: 'bandpass', freq: v.rand(1100, 2000), Q: 1.2, gain: v.rand(0.15, 0.3), pan: v.rand(-0.6, 0.6) });
        }
        return t + dur;
      },
    },
    {
      id: 'kiss', emoji: '😘', name: { es: 'Beso', en: 'Kiss' }, say: { es: '¡Un beso!', en: 'A kiss!' }, kind: 'shot',
      play(v) {
        const n = v.pick([1, 1, 2]);
        let t = v.t0, end = t;
        for (let i = 0; i < n; i++) {
          // "mmm" con los labios cerrados
          vocal(v, { t, dur: 0.13, pitch: [[0, v.vary(230, 0.1)]], vowels: [[0, 'm']], a: 0.03, r: 0.04, gain: 0.12 });
          // chasquido de labios
          const at = t + 0.11;
          hit(v, { t: at, dur: 0.06, type: 'bandpass', freq: v.vary(1500, 0.1), Q: 3, sweepTo: 650, gain: 0.9 });
          sweep(v, { t: at, f0: v.vary(1900, 0.1), f1: 700, dur: 0.035, type: 'triangle', gain: 0.25 });
          // "ua": soplido suave
          end = hit(v, { t: at + 0.03, dur: 0.16, type: 'bandpass', freq: 900, Q: 1, a: 0.02, gain: 0.12 });
          t = end + 0.25;
        }
        return end + 0.1;
      },
    },
  ],
};
