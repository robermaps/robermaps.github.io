// Orejitas · categoría: Transportes / Vehicles
import { tone, hit, thump } from '../instruments.js';
import { interp, grid, apply, passby, motor, strikeBell } from './_machines.js';

// Silbato de vapor: varias notas a la vez con soplido de vapor
function steamWhistle(v, { t, dur, notes, gain = 0.18, dest }) {
  const end = t + dur;
  for (const f of notes) {
    const o = v.osc('triangle', f * 0.94, t, end + 0.05);
    o.frequency.setTargetAtTime(f, t, 0.05);
    const g = v.gain(0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.08);
    g.gain.setValueAtTime(gain, end - 0.15);
    g.gain.linearRampToValueAtTime(0, end);
    v.chain(o, v.lp(f * 3), g, dest);
    const n = v.noise('white', { t, stop: end + 0.05 });
    const bp = v.bp(f, 14);
    const ng = v.gain(0);
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(gain * 2.2, t + 0.06);
    ng.gain.setValueAtTime(gain * 2.2, end - 0.15);
    ng.gain.linearRampToValueAtTime(0, end);
    v.chain(n, bp, ng, dest);
  }
  // soplido inicial de vapor
  hit(v, { t, dur: dur + 0.1, type: 'highpass', freq: 2500, Q: 0.5, a: 0.03, gain: gain * 0.25, dest });
  return end;
}

// Sirena con forma de tono f(dt) y paso Doppler opcional
function sirenVoice(v, { t, dur, f, type = 'square', cutoff = 2800, gain = 0.3, pb = null, step = 0.02, dest = v.out, reverb = 0.12 }) {
  const end = t + dur;
  const o = v.osc(type, f(0), t, end + 0.05);
  apply(o.frequency, grid(dur, step, (dt) => f(dt) * (pb ? pb.dop(dt) : 1)), t);
  const env = v.gain(0);
  const p = v.pan(0);
  const lev = (dt) => gain * (pb ? pb.gain(dt) : 1);
  apply(env.gain, grid(dur, 0.05, (dt) => lev(dt) * Math.min(1, dt / 0.15, (dur - dt) / 0.2)), t);
  if (pb) apply(p.pan, grid(dur, 0.05, pb.pan), t);
  v.chain(o, v.lp(cutoff, 0.9), v.filter('peaking', 1100, 1, 5), env, p, dest);
  if (reverb) v.send(p, reverb);
  return end;
}

export default {
  id: 'transport',
  emoji: '🚗',
  name: { es: 'Transportes', en: 'Vehicles' },
  sounds: [
    {
      id: 'carhorn', emoji: '🚕', name: { es: 'Claxon', en: 'Car horn' }, say: { es: 'El claxon', en: 'The horn' }, kind: 'shot',
      play(v) {
        const f1 = v.vary(415, 0.06);
        const f2 = f1 * 1.26; // tercera mayor: claxon de dos tonos
        const pattern = v.pick([[0.16, 0.34], [0.18, 0.18], [0.14, 0.14, 0.3]]);
        const bus = v.gain(1);
        const p = v.pan(v.rand(-0.2, 0.2));
        v.chain(bus, v.shaper(1.6), v.filter('peaking', 2200, 1.2, 7), v.lp(4500), p, v.out);
        v.send(p, 0.12);
        let t = v.t0, end = t;
        for (const d of pattern) {
          for (const f of [f1, f2]) {
            const o = v.osc('sawtooth', f * 0.97, t, t + d + 0.05);
            o.frequency.setTargetAtTime(f, t, 0.01);
            const g = v.gain(0);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.32, t + 0.012);
            g.gain.setValueAtTime(0.32, t + d - 0.03);
            g.gain.linearRampToValueAtTime(0, t + d);
            o.connect(g).connect(bus);
          }
          end = t + d;
          t = end + v.rand(0.09, 0.13);
        }
        return end + 0.15;
      },
    },
    {
      id: 'car', emoji: '🚗', name: { es: 'Coche', en: 'Car' }, say: { es: 'El coche', en: 'The car' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        const idle = v.vary(26, 0.08);
        const r1 = v.vary(92, 0.1), r2 = v.vary(112, 0.1);
        const dur = 5.6, leave = 2.7;
        // ralentí → acelerón → acelerón → se aleja acelerando
        const fire = [[0, idle], [0.5, idle], [0.8, r1], [1.25, idle * 1.3], [1.6, idle * 1.2], [1.9, r2],
          [2.4, idle * 1.4], [leave, idle * 1.6], [4.6, 82], [dur, 92]];
        const away = (dt) => Math.max(0, dt - leave);
        const dop = (dt) => 343 / (343 + Math.min(away(dt) * 9, 25));
        const { out, end } = motor(v, {
          t, dur, fire: grid(dur, 0.05, (dt) => interp(fire, dt) * dop(dt)),
          bright: 7, sub: 0.4, puff: 0.6, drive: 2.4, body: 360, a: 0.15, r: 0.4, gain: 0.5,
        });
        const dist = v.lp(9000, 0.7);
        apply(dist.frequency, grid(dur, 0.1, (dt) => 9000 / (1 + away(dt) * 1.4)), t);
        const g = v.gain(1);
        apply(g.gain, grid(dur, 0.1, (dt) => 1 / (1 + away(dt) * away(dt) * 0.35)), t);
        const p = v.pan(0);
        apply(p.pan, grid(dur, 0.1, (dt) => Math.min(0.85, away(dt) * 0.35)), t);
        v.chain(out, dist, g, p, v.out);
        v.send(p, 0.08);
        return end;
      },
    },
    {
      id: 'motorbike', emoji: '🏍️', name: { es: 'Moto', en: 'Motorbike' }, say: { es: 'La moto', en: 'The motorbike' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        const idle = v.vary(42, 0.08);
        const top = v.vary(175, 0.08);
        const dur = 5.2, leave = 1.6;
        const fire = [[0, idle], [0.45, idle], [0.8, top * 0.9], [1.25, idle * 1.2], [leave, idle * 1.4],
          [2.5, top], [2.65, top * 0.62], [3.5, top * 1.05], [3.65, top * 0.68], [4.5, top * 1.08], [dur, top * 1.1]];
        const away = (dt) => Math.max(0, dt - leave);
        const dop = (dt) => 343 / (343 + Math.min(away(dt) * 12, 30));
        const { out, end } = motor(v, {
          t, dur, fire: grid(dur, 0.025, (dt) => interp(fire, dt) * dop(dt)),
          bright: 11, sub: 0.25, puff: 0.7, drive: 3.2, body: 600, q: 3, a: 0.1, r: 0.4, gain: 0.45, jitter: 35,
        });
        const dist = v.lp(10000, 0.7);
        apply(dist.frequency, grid(dur, 0.1, (dt) => 10000 / (1 + away(dt) * 1.2)), t);
        const g = v.gain(1);
        apply(g.gain, grid(dur, 0.1, (dt) => 1 / (1 + away(dt) * away(dt) * 0.25)), t);
        const p = v.pan(0);
        apply(p.pan, grid(dur, 0.1, (dt) => Math.max(-0.85, -away(dt) * 0.3)), t);
        v.chain(out, dist, g, p, v.out);
        v.send(p, 0.08);
        return end;
      },
    },
    {
      id: 'police', emoji: '🚓', name: { es: 'Policía', en: 'Police car' }, say: { es: 'La policía', en: 'The police car' }, kind: 'shot',
      play(v) {
        const dur = v.rand(3.8, 4.4);
        const lo = v.vary(680, 0.05), hi = lo * 2;
        const period = v.rand(0.5, 0.6);
        // "wiu-wiu": subida rápida y bajada, repetida
        const f = (dt) => {
          const ph = (dt % period) / period;
          const x = ph < 0.6 ? ph / 0.6 : 1 - (ph - 0.6) / 0.4;
          return lo * Math.pow(hi / lo, Math.sin((x * Math.PI) / 2));
        };
        const pb = passby(dur, { speed: 16, h: 14, dir: v.pick([1, -1]), power: 0.8 });
        return sirenVoice(v, { t: v.t0, dur, f, type: 'square', cutoff: 2600, gain: 0.28, pb });
      },
    },
    {
      id: 'ambulance', emoji: '🚑', name: { es: 'Ambulancia', en: 'Ambulance' }, say: { es: 'La ambulancia', en: 'The ambulance' }, kind: 'shot',
      play(v) {
        const lo = v.vary(466, 0.03), hi = lo * 4 / 3; // dos tonos a una cuarta: "ni-no"
        const half = v.rand(0.55, 0.62);
        const dur = half * 8;
        const f = (dt) => {
          const ph = (dt % (half * 2)) / (half * 2);
          // transición corta entre tonos
          if (ph < 0.48) return hi;
          if (ph < 0.5) return hi + (lo - hi) * ((ph - 0.48) / 0.02);
          if (ph < 0.98) return lo;
          return lo + (hi - lo) * ((ph - 0.98) / 0.02);
        };
        const pb = passby(dur, { speed: 14, h: 14, dir: v.pick([1, -1]), power: 0.8 });
        const bus = v.gain(1);
        v.chain(bus, v.bp(1000, 0.7), v.out);
        sirenVoice(v, { t: v.t0, dur, f, type: 'sawtooth', cutoff: 3200, gain: 0.3, pb, step: 0.01, dest: bus });
        return sirenVoice(v, { t: v.t0, dur, f: (dt) => f(dt) * 1.004, type: 'square', cutoff: 2200, gain: 0.12, pb, step: 0.01, reverb: 0.1 });
      },
    },
    {
      id: 'firetruck', emoji: '🚒', name: { es: 'Bomberos', en: 'Fire truck' }, say: { es: 'Los bomberos', en: 'The fire truck' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        // bocina de aire: dos toques graves
        const horn = v.gain(1);
        const hp = v.pan(0);
        v.chain(horn, v.shaper(2), v.filter('peaking', 700, 1, 6), v.lp(3000), hp, v.out);
        v.send(hp, 0.15);
        const base = v.vary(233, 0.04);
        const blasts = [[0, 0.55], [0.72, 0.85]];
        for (const [dt, d] of blasts) {
          for (const f of [base, base * 1.19, base * 1.5]) {
            tone(v, { t: t + dt, freq: f, type: 'sawtooth', dur: d, a: 0.04, r: 0.08, gain: 0.16, dest: horn });
          }
        }
        // sirena mecánica: sube, se mantiene y baja
        const ts = t + 1.75;
        const sd = 3.4;
        const f = (dt) => {
          if (dt < 1.1) return 260 + 640 * (1 - Math.exp(-dt * 2.6));
          if (dt < 1.9) return (260 + 640 * (1 - Math.exp(-1.1 * 2.6))) * (1 + 0.025 * Math.sin((dt - 1.1) * Math.PI * 2.5));
          return 300 + 540 * Math.exp(-(dt - 1.9) * 1.6);
        };
        const tri = v.gain(1);
        v.chain(tri, v.out);
        sirenVoice(v, { t: ts, dur: sd, f, type: 'triangle', cutoff: 3000, gain: 0.38, dest: tri, reverb: 0.15 });
        return sirenVoice(v, { t: ts, dur: sd, f, type: 'square', cutoff: 2000, gain: 0.08, reverb: 0 });
      },
    },
    {
      id: 'train', emoji: '🚂', name: { es: 'Tren de vapor', en: 'Steam train' }, say: { es: 'El tren', en: 'The train' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        const dur = 6;
        const bus = v.gain(1);
        const p = v.pan(0);
        v.chain(bus, p, v.out);
        v.send(p, 0.1);
        // traqueteo grave de fondo
        const rum = v.noise('brown', { t, stop: t + dur + 0.1 });
        const rg = v.gain(0);
        v.env(rg.gain, [[0, 0], [1, 0.5], [dur - 0.5, 0.6], [dur, 0]], t);
        v.chain(rum, v.lp(180), rg, bus);
        // "chu-chu": soplidos de vapor que se aceleran
        const r0 = v.rand(1.5, 1.8), r1 = v.rand(4.2, 4.8);
        const accents = [1, 0.55, 0.8, 0.5];
        let at = 0, k = 0;
        while (at < dur - 0.2) {
          const rate = r0 + (r1 - r0) * (at / dur);
          const d = Math.min(0.22, 0.75 / rate);
          const fc = v.vary(1000, 0.15);
          hit(v, { t: t + at, dur: d, color: 'pink', type: 'bandpass', freq: fc, Q: 0.9, a: 0.006, gain: 0.9 * accents[k % 4], dest: bus });
          hit(v, { t: t + at, dur: d * 0.6, color: 'white', type: 'highpass', freq: 3000, Q: 0.5, a: 0.004, gain: 0.12 * accents[k % 4], dest: bus });
          at += 1 / rate;
          k++;
        }
        // silbato: corto + largo
        const notes = [349.2, 415.3, 523.3].map((f) => v.vary(f, 0.01));
        steamWhistle(v, { t: t + 2.4, dur: 0.45, notes, dest: bus });
        steamWhistle(v, { t: t + 3.05, dur: 1.15, notes, dest: bus });
        return t + dur;
      },
    },
    {
      id: 'plane', emoji: '✈️', name: { es: 'Avión', en: 'Plane' }, say: { es: 'El avión', en: 'The plane' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        const dur = 7;
        const pb = passby(dur, { speed: 60, h: 70, dir: v.pick([1, -1]), power: 1.2, center: 0.5 });
        const bus = v.gain(0);
        const p = v.pan(0);
        apply(bus.gain, grid(dur, 0.05, (dt) => pb.gain(dt) * Math.min(1, dt / 0.8, (dur - dt) / 0.8)), t);
        apply(p.pan, grid(dur, 0.05, pb.pan), t);
        v.chain(bus, p, v.out);
        v.send(p, 0.15);
        // rugido del reactor
        const n = v.noise('pink', { t, stop: t + dur + 0.1, stereo: true });
        const lp = v.lp(1000, 0.7);
        apply(lp.frequency, grid(dur, 0.05, (dt) => pb.cutoff(dt, 6000, 500)), t);
        v.chain(n, lp, v.gain(0.9), bus);
        const rum = v.noise('brown', { t, stop: t + dur + 0.1 });
        v.chain(rum, v.lp(220), v.gain(0.9), bus);
        // silbido de turbina con Doppler
        for (const [f0, lev] of [[1900, 0.05], [2650, 0.03]]) {
          const o = v.osc('sine', f0, t, t + dur + 0.05);
          apply(o.frequency, grid(dur, 0.05, (dt) => f0 * pb.dop(dt)), t);
          v.chain(o, v.gain(lev), bus);
        }
        return t + dur;
      },
    },
    {
      id: 'helicopter', emoji: '🚁', name: { es: 'Helicóptero', en: 'Helicopter' }, say: { es: 'El helicóptero', en: 'The helicopter' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        const dur = 6.5;
        const pb = passby(dur, { speed: 22, h: 30, dir: v.pick([1, -1]), power: 1, center: 0.5 });
        const bus = v.gain(0);
        const p = v.pan(0);
        apply(bus.gain, grid(dur, 0.05, (dt) => pb.gain(dt) * Math.min(1, dt / 0.6, (dur - dt) / 0.6)), t);
        apply(p.pan, grid(dur, 0.05, pb.pan), t);
        const lp = v.lp(3000, 0.7);
        apply(lp.frequency, grid(dur, 0.1, (dt) => pb.cutoff(dt, 5000, 900)), t);
        v.chain(bus, lp, p, v.out);
        v.send(p, 0.12);
        // golpes de las palas (~12 por segundo)
        const bpf = v.vary(12.5, 0.08);
        let at = 0;
        while (at < dur) {
          hit(v, { t: t + at, dur: 0.06, color: 'pink', type: 'lowpass', freq: 700, Q: 1.6, a: 0.003, gain: 1.1, dest: bus });
          hit(v, { t: t + at, dur: 0.03, type: 'bandpass', freq: 1800, Q: 1, a: 0.002, gain: 0.12, dest: bus });
          at += 1 / (bpf * pb.dop(at));
        }
        // turbina y rotor de cola
        const tw = v.osc('sine', 1450, t, t + dur + 0.05);
        apply(tw.frequency, grid(dur, 0.1, (dt) => 1450 * pb.dop(dt)), t);
        v.chain(tw, v.gain(0.025), bus);
        const tail = v.osc('sawtooth', 72, t, t + dur + 0.05);
        apply(tail.frequency, grid(dur, 0.1, (dt) => 72 * pb.dop(dt)), t);
        v.chain(tail, v.lp(450), v.gain(0.08), bus);
        v.chain(v.noise('brown', { t, stop: t + dur + 0.1 }), v.lp(150), v.gain(0.6), bus);
        return t + dur;
      },
    },
    {
      id: 'ship', emoji: '🚢', name: { es: 'Barco', en: 'Ship' }, say: { es: 'El barco', en: 'The ship' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        const dur = 5;
        // agua chapoteando
        const w = v.noise('pink', { t, stop: t + dur + 0.1, stereo: true });
        const wg = v.gain(0);
        v.env(wg.gain, [[0, 0], [0.6, 0.25], [dur - 0.8, 0.25], [dur, 0]], t);
        const wl = v.lp(600, 0.7);
        v.lfo(0.35, 250, wl.frequency, { t, stop: t + dur + 0.1 });
        v.chain(w, wl, wg, v.out);
        // sirena grave del barco: dos toques largos
        const f = v.vary(98, 0.05);
        const horn = v.gain(1);
        const p = v.pan(v.rand(-0.3, 0.3));
        v.chain(horn, v.shaper(1.6), v.filter('peaking', 450, 1, 8), v.lp(1400, 0.8), p, v.out);
        v.send(p, 0.45);
        const blasts = [[0.3, 1.6], [2.4, 1.3]];
        let end = t;
        for (const [dt, d] of blasts) {
          for (const [ratio, lev, type] of [[1, 0.3, 'sawtooth'], [1.004, 0.22, 'sawtooth'], [0.5, 0.12, 'square']]) {
            end = tone(v, { t: t + dt, freq: f * ratio, type, dur: d, a: 0.18, r: 0.35, gain: lev, dest: horn });
          }
        }
        return Math.max(end + 0.5, t + dur);
      },
    },
    {
      id: 'bikebell', emoji: '🚲', name: { es: 'Timbre de bici', en: 'Bike bell' }, say: { es: 'La bici', en: 'The bike' }, kind: 'shot',
      play(v) {
        const f = v.vary(2050, 0.04);
        const partials = [[1, 1, 1], [1.51, 0.45, 0.7], [2.04, 0.3, 0.5], [2.72, 0.15, 0.35]];
        const rings = v.pick([2, 2, 3]);
        const rate = v.rand(16, 19);
        const strikes = [];
        let t = v.t0;
        for (let r = 0; r < rings; r++) {
          const n = v.irand(5, 7);
          for (let i = 0; i < n; i++) strikes.push([t + i / rate, v.rand(0.6, 1) * (1 - i * 0.06)]);
          t += n / rate + v.rand(0.3, 0.42);
        }
        const p = v.pan(v.rand(-0.2, 0.2));
        p.connect(v.out);
        v.send(p, 0.12);
        return strikeBell(v, { freq: f, partials, strikes, decay: 0.9, gain: 0.25, dest: p });
      },
    },
    {
      id: 'tractor', emoji: '🚜', name: { es: 'Tractor', en: 'Tractor' }, say: { es: 'El tractor', en: 'The tractor' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        const dur = 5;
        const bus = v.gain(0);
        v.env(bus.gain, [[0, 0.6], [2, 1], [dur - 0.6, 0.9], [dur, 0]], t);
        const p = v.pan(0);
        v.env(p.pan, [[0, -0.5], [dur, 0.5]], t);
        v.chain(bus, v.filter('peaking', 180, 1.2, 5), p, v.out);
        v.send(p, 0.08);
        // "pof-pof" del diésel
        const rate = [[0, v.rand(6.5, 7.5)], [1.4, 7], [2.2, 11.5], [3, 8.5], [dur, 8.5]];
        let at = 0;
        while (at < dur - 0.1) {
          const k = v.rand(0.8, 1);
          thump(v, { t: t + at, f0: v.vary(105, 0.08), f1: 48, dur: 0.13, gain: 0.7 * k, click: 0.04, dest: bus });
          hit(v, { t: t + at, dur: 0.07, color: 'pink', type: 'lowpass', freq: 520, Q: 2, gain: 0.7 * k, dest: bus });
          at += (1 / interp(rate, at)) * v.rand(0.92, 1.08);
        }
        // traqueteo mecánico
        const cl = v.dust(45, { t, stop: t + dur + 0.1, grain: 0.002 });
        v.chain(cl, v.bp(2400, 2), v.gain(0.5), bus);
        return t + dur;
      },
    },
    {
      id: 'rocket', emoji: '🚀', name: { es: 'Cohete', en: 'Rocket' }, say: { es: 'El cohete', en: 'The rocket' }, kind: 'shot',
      play(v) {
        const t = v.t0;
        // cuenta atrás: pip, pip, pip, piiip
        for (let i = 0; i < 3; i++) tone(v, { t: t + i * 0.6, freq: 880, type: 'triangle', dur: 0.12, a: 0.01, r: 0.04, gain: 0.22, reverb: 0.1 });
        tone(v, { t: t + 1.8, freq: 1320, type: 'triangle', dur: 0.4, a: 0.01, r: 0.08, gain: 0.22, reverb: 0.1 });
        // despegue: el rugido crece, se mantiene y se aleja hacia arriba
        const ig = t + 2.3;
        const dur = 5.2;
        const bus = v.gain(0);
        v.env(bus.gain, [[0, 0], [1.5, 0.85], [2.6, 1], [dur, 0]], ig);
        const lp = v.lp(600, 0.7);
        v.env(lp.frequency, [[0, 500], [1.2, 3500], [2.6, 3800], [dur, 250, 'exp']], ig);
        v.chain(bus, lp, v.out);
        v.send(bus, 0.2);
        const stop = ig + dur + 0.1;
        v.chain(v.noise('brown', { t: ig, stop, stereo: true }), v.lp(300), v.gain(1.2), bus);
        v.chain(v.noise('pink', { t: ig, stop, stereo: true }), v.gain(0.6), bus);
        // crepitar del escape
        v.chain(v.dust(220, { t: ig, stop, grain: 0.003, stereo: true }), v.hp(700), v.gain(0.9), bus);
        return ig + dur;
      },
    },
  ],
};
