// Orejitas · categoría: Juguetes / Toys
import { vocal, tone, sweep, hit, bell } from '../instruments.js';

const SPARKLE = [[1, 1, 1], [2, 0.25, 0.4], [3, 0.07, 0.2]];
const PENT_HIGH = [1047, 1175, 1319, 1568, 1760, 2093]; // C6 D6 E6 G6 A6 C7

// Sonajero: muchas bolitas (impulsos dispersos) dentro de una cáscara
function rattle(v) {
  const n = v.irand(4, 7);
  const t0 = v.t0;
  const gap = v.rand(0.17, 0.24);
  const end = t0 + n * gap + 0.25;
  const src = v.dust(900, { grain: 0.0004, stop: end + 0.1 });
  const env = v.gain(0);
  const shell = v.filter('peaking', v.rand(1100, 1500), 2, 6);
  const p = v.pan(v.rand(-0.2, 0.2));
  v.chain(src, v.hp(1800), v.bp(v.rand(2800, 3600), 0.9), shell, env, p, v.out);
  v.send(p, 0.08);
  for (let i = 0; i < n; i++) {
    const ts = t0 + i * gap + v.rand(-0.015, 0.015);
    const peak = v.rand(0.6, 1) * (i === n - 1 ? 1 : 0.85);
    env.gain.setValueAtTime(0, ts);
    env.gain.linearRampToValueAtTime(peak, ts + 0.012);
    env.gain.setTargetAtTime(0, ts + 0.012, 0.03);
    // las bolitas chocan con el otro lado
    env.gain.setValueAtTime(0.0001, ts + gap * 0.48);
    env.gain.linearRampToValueAtTime(peak * 0.55, ts + gap * 0.48 + 0.008);
    env.gain.setTargetAtTime(0, ts + gap * 0.48 + 0.008, 0.025);
  }
  return end;
}

// Patito de goma: lengüeta que chirría al apretar y al soltar
function squeak(v, t, d, [f0, f1, f2], gain) {
  const end = t + d;
  const o = v.osc('sawtooth', f0, t, end + 0.05);
  o.frequency.linearRampToValueAtTime(f1, t + d * 0.3);
  o.frequency.linearRampToValueAtTime(f2, end);
  v.lfo(26, f1 * 0.025, o.frequency, { t, stop: end + 0.05 });
  v.wobble(o.detune, 25, 14, { t, stop: end + 0.05 });
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.025);
  env.gain.setValueAtTime(gain, end - 0.05);
  env.gain.linearRampToValueAtTime(0, end);
  v.chain(o, v.filter('peaking', 2400, 1.5, 8), v.lp(4500), env, v.out);
  hit(v, { t, dur: d, freq: 3000, Q: 1, gain: gain * 0.25, a: 0.03 });
  return end;
}
function rubberDuck(v) {
  const k = v.rand(0.92, 1.08);
  let t = v.t0;
  let end = t;
  const pairs = v.pick([2, 2, 3]);
  for (let i = 0; i < pairs; i++) {
    end = squeak(v, t, v.rand(0.24, 0.3), [1150 * k, 1380 * k, 1250 * k], 0.35);
    t = end + v.rand(0.1, 0.16);
    end = squeak(v, t, v.rand(0.18, 0.22), [880 * k, 980 * k, 860 * k], 0.22);
    t = end + v.rand(0.2, 0.3);
  }
  return end;
}

// Muelle: "boing" con vibrato ancho que se va apagando
function boing(v) {
  const t = v.t0;
  const d = v.rand(0.9, 1.2);
  const base = v.rand(170, 220);
  const o = v.osc('triangle', base, t, t + d + 0.05);
  o.frequency.exponentialRampToValueAtTime(base * 1.9, t + d);
  const l = v.osc('sine', 16, t, t + d + 0.05);
  l.frequency.linearRampToValueAtTime(11, t + d);
  const depth = v.gain(base * 0.6);
  depth.gain.setValueAtTime(base * 0.6, t);
  depth.gain.exponentialRampToValueAtTime(base * 0.03, t + d);
  l.connect(depth).connect(o.frequency);
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.6, t + 0.006);
  env.gain.exponentialRampToValueAtTime(0.001, t + d);
  v.chain(o, v.lp(3000), env, v.out);
  v.send(env, 0.1);
  hit(v, { t, dur: 0.04, type: 'lowpass', freq: 1500, gain: 0.3 });
  return t + d;
}

// Silbato de émbolo: subidas y bajadas de tono
function slideWhistle(v) {
  const t = v.t0;
  const pattern = v.pick([
    [[600, 1500, 0.55], [1500, 560, 0.6], [560, 1300, 0.4]],
    [[1400, 550, 0.6], [550, 1450, 0.55]],
    [[550, 1100, 0.35], [700, 1500, 0.45], [1500, 520, 0.7]],
  ]);
  let at = t;
  const o = v.osc(v.wave([1, 0.06, 0.03]), pattern[0][0], t, t + 3);
  const bp = v.bp(pattern[0][0], 4);
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  pattern.forEach(([a, b, d]) => {
    o.frequency.setValueAtTime(a, at);
    o.frequency.exponentialRampToValueAtTime(b, at + d);
    bp.frequency.setValueAtTime(a, at);
    bp.frequency.exponentialRampToValueAtTime(b, at + d);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(0.4, at + 0.04);
    env.gain.setValueAtTime(0.4, at + d - 0.04);
    env.gain.linearRampToValueAtTime(0, at + d);
    at += d + 0.07;
  });
  v.lfo(6, 8, o.detune, { t, stop: at });
  const breath = v.noise('white', { t, stop: at });
  const bg = v.gain(0.35);
  v.chain(breath, bp, bg, env);
  v.chain(o, env, v.out);
  v.send(env, 0.12);
  return at;
}

// Bocina de payaso: "mec-mec" al apretar y soltar la pera
function clownHorn(v) {
  let t = v.t0;
  let end = t;
  const k = v.rand(0.9, 1.1);
  const honk = (f, d, g) => vocal(v, {
    t, dur: d, type: 'sawtooth',
    pitch: [[0, f * 0.9], [0.03, f * 1.04], [d, f]],
    amp: [[0, 0], [0.015, 1], [d - 0.04, 0.85], [d, 0]],
    vowels: [[0, 'a'], [d, 'o']], scale: 1.1, bright: 0.7, drive: 1.5, jitter: 10,
    tremolo: { rate: 55, depth: 0.2 }, gain: g, reverb: 0.05,
  });
  for (let i = 0; i < 2; i++) {
    end = honk(400 * k, 0.28, 0.5);
    t = end + 0.1;
    end = honk(330 * k, 0.2, 0.35);
    t = end + 0.22;
  }
  return end;
}

// Peonza musical: acorde que gira cada vez más despacio y al final cae
function spinningTop(v) {
  const t = v.t0;
  const d = v.rand(3.4, 4.0);
  const fall = t + d * 0.82;
  const trem = v.gain(0.6);
  const rate = v.osc('sine', 13, t, t + d + 0.1);
  rate.frequency.linearRampToValueAtTime(5, fall);
  rate.frequency.linearRampToValueAtTime(2.5, t + d);
  const depth = v.gain(0.35);
  rate.connect(depth).connect(trem.gain);
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(1, t + 0.35);
  env.gain.setValueAtTime(1, fall - 0.3);
  env.gain.linearRampToValueAtTime(0, t + d);
  const k = v.rand(0.95, 1.05);
  [440, 554.4, 659.3].forEach((f, i) => {
    const o = v.osc('triangle', f * k * 1.02, t, t + d + 0.1);
    o.frequency.linearRampToValueAtTime(f * k, t + 0.35);
    o.frequency.exponentialRampToValueAtTime(f * k * 0.95, fall);
    o.frequency.exponentialRampToValueAtTime(f * k * 0.9, t + d);
    const g = v.gain([0.22, 0.16, 0.13][i]);
    v.chain(o, g, trem);
  });
  const whoosh = v.noise('pink', { t, stop: t + d + 0.1 });
  v.chain(whoosh, v.bp(1600, 1), v.gain(0.25), trem);
  v.chain(trem, env, v.lp(4000), v.out);
  v.send(env, 0.15);
  // cae y repiquetea cada vez más rápido
  const clicks = [0, 0.13, 0.23, 0.3, 0.35, 0.39, 0.42, 0.44];
  clicks.forEach((c, i) => hit(v, {
    t: fall + c, dur: 0.035, freq: v.rand(2200, 2800), Q: 3, gain: 0.5 * (1 - i * 0.08),
  }));
  return Math.max(t + d, fall + 0.5);
}

// Juguete de cuerda: se da cuerda (trinquete) y luego anda hasta pararse
function windUp(v) {
  let t = v.t0;
  const click = (at, g, f = v.rand(3000, 3600)) => {
    hit(v, { t: at, dur: 0.025, freq: f, Q: 6, gain: g });
    hit(v, { t: at, dur: 0.02, type: 'lowpass', freq: 1200, gain: g * 0.3 });
  };
  for (let turn = 0; turn < 3; turn++) {
    for (let i = 0; i < 7; i++) { click(t, 0.5 * v.rand(0.8, 1)); t += 0.07; }
    t += 0.22;
  }
  // mecanismo en marcha: tic-tic rápido que se frena
  const runStart = t;
  const runDur = v.rand(2, 2.4);
  let rate = 28;
  let i = 0;
  while (t < runStart + runDur) {
    const x = (t - runStart) / runDur;
    hit(v, { t, dur: 0.015, freq: i % 2 ? 4200 : 3700, Q: 8, gain: 0.28 * (1 - x * 0.5) });
    rate = 28 - 22 * x * x;
    t += 1 / rate;
    i++;
  }
  const buzz = v.osc('sawtooth', 95, runStart, runStart + runDur + 0.1);
  buzz.frequency.exponentialRampToValueAtTime(45, runStart + runDur);
  const bg = v.gain(0);
  bg.gain.setValueAtTime(0, runStart);
  bg.gain.linearRampToValueAtTime(0.12, runStart + 0.05);
  bg.gain.linearRampToValueAtTime(0, runStart + runDur);
  v.chain(buzz, v.bp(420, 2), bg, v.out);
  return runStart + runDur;
}

// Robot: pitidos de ordenador, un servo y un "bup" final
function robot(v) {
  let t = v.t0;
  const notes = [523, 659, 784, 880, 1047, 1319, 1568];
  const n = v.irand(6, 9);
  const servoAt = v.irand(2, n - 2);
  for (let i = 0; i < n; i++) {
    if (i === servoAt) {
      const d = 0.35;
      const o = v.osc('sawtooth', 200, t, t + d + 0.02);
      o.frequency.linearRampToValueAtTime(340, t + d * 0.6);
      o.frequency.linearRampToValueAtTime(260, t + d);
      const g = v.gain(0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.03);
      g.gain.setValueAtTime(0.18, t + d - 0.04);
      g.gain.linearRampToValueAtTime(0, t + d);
      v.chain(o, v.lp(900), g, v.out);
      t += d + 0.05;
      continue;
    }
    if (v.chance(0.18)) {
      const up = v.chance(0.5);
      t = sweep(v, { t, f0: up ? 400 : 1600, f1: up ? 1600 : 400, dur: 0.22, curve: 'exp', gain: 0.25, a: 0.01 }) + 0.04;
      continue;
    }
    const sq = v.chance(0.5);
    const d = v.rand(0.07, 0.15);
    t = tone(v, {
      t, freq: v.pick(notes), type: sq ? 'square' : 'sine', dur: d, a: 0.004, r: 0.02,
      gain: sq ? 0.12 : 0.28, filter: sq ? { freq: 2500 } : null, pan: v.rand(-0.3, 0.3),
    }) + v.rand(0.02, 0.06);
  }
  // "bi-bup"
  t = tone(v, { t: t + 0.05, freq: 880, type: 'square', dur: 0.1, gain: 0.12, filter: { freq: 2500 } }) + 0.03;
  return tone(v, { t, freq: 330, type: 'square', dur: 0.22, r: 0.08, gain: 0.14, filter: { freq: 1800 }, reverb: 0.1 });
}

// Varita mágica: soplo que sube y cascada de destellos
function magicWand(v) {
  const t = v.t0;
  const w = v.noise('pink', { t, stop: t + 1.2 });
  const bp = v.bp(800, 1.5);
  bp.frequency.exponentialRampToValueAtTime(5000, t + 0.9);
  const wg = v.gain(0);
  wg.gain.setValueAtTime(0, t);
  wg.gain.linearRampToValueAtTime(0.35, t + 0.35);
  wg.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
  v.chain(w, bp, wg, v.out);
  v.send(wg, 0.2);
  const n = v.irand(14, 20);
  let at = t + 0.15;
  let idx = PENT_HIGH.length - 1;
  let end = at;
  for (let i = 0; i < n; i++) {
    idx = Math.max(0, Math.min(PENT_HIGH.length - 1, idx + v.pick([-2, -1, -1, 0, 1])));
    end = Math.max(end, bell(v, {
      t: at, freq: PENT_HIGH[idx] * (i % 5 === 4 ? 0.5 : 1), dur: v.rand(0.8, 1.3),
      gain: 0.11 * (1 - i / (n * 1.4)), partials: SPARKLE, pan: v.rand(-0.7, 0.7), reverb: 0.4,
    }));
    at += v.rand(0.045, 0.085);
  }
  return end;
}

// Silbato de juguete con bolita: trino suave "fi-fi-fiii"
function whistle(v) {
  const t = v.t0;
  const f0 = v.rand(1500, 1750);
  const blows = v.pick([[0.14, 0.14, 0.6], [0.5, 0.15, 0.15, 0.5], [0.7]]);
  let at = t;
  const o = v.osc(v.wave([1, 0, 0.08]), f0, t, t + 3);
  v.lfo(28, f0 * 0.03, o.frequency, { t, stop: t + 3 });
  const trem = v.gain(0.6);
  v.lfo(28, 0.35, trem.gain, { t, stop: t + 3 });
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  for (const d of blows) {
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(0.3, at + 0.02);
    env.gain.setValueAtTime(0.3, at + d - 0.04);
    env.gain.linearRampToValueAtTime(0, at + d);
    at += d + 0.08;
  }
  const breath = v.noise('white', { t, stop: at });
  v.chain(breath, v.bp(f0, 3), v.gain(0.4), trem);
  v.chain(o, trem, env, v.lp(4500), v.out);
  v.send(env, 0.1);
  return at;
}

// Globo que se desinfla volando por la habitación
function balloon(v) {
  const t = v.t0;
  const d = v.rand(2.2, 2.8);
  const end = t + d;
  const o = v.osc('sawtooth', 260, t, end + 0.05);
  const path = [[0, 260], [0.3, 340], [0.55, 300], [1.0, 420], [1.3, 380], [d - 0.3, 520], [d, 560]];
  path.forEach(([dt, f]) => o.frequency.linearRampToValueAtTime(f * v.rand(0.95, 1.05), t + dt));
  v.wobble(o.detune, 120, 12, { t, stop: end + 0.05 });
  const flutter = v.gain(0.6);
  v.lfo(v.rand(28, 36), 0.4, flutter.gain, { t, stop: end + 0.05 });
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.5, t + 0.04);
  env.gain.setValueAtTime(0.5, end - 0.45);
  // chisporroteo final
  for (let i = 0; i < 4; i++) {
    const at = end - 0.45 + i * 0.11;
    env.gain.linearRampToValueAtTime(0.05, at + 0.04);
    env.gain.linearRampToValueAtTime(0.4 * (1 - i * 0.2), at + 0.08);
  }
  env.gain.linearRampToValueAtTime(0, end);
  const p = v.pan(0);
  if (p.pan) {
    p.pan.setValueAtTime(0, t);
    for (let x = 0.4; x < d; x += 0.4) p.pan.linearRampToValueAtTime(v.rand(-0.8, 0.8), t + x);
  }
  const air = v.noise('white', { t, stop: end + 0.05 });
  v.chain(air, v.hp(2500), v.gain(0.15), flutter);
  v.chain(o, v.bp(900, 0.8), v.lp(2500), flutter, env, p, v.out);
  return end;
}

// Platillo volante: theremin ondulante que cruza de un lado a otro
function ufo(v) {
  const t = v.t0;
  const d = v.rand(2.8, 3.4);
  const end = t + d;
  const o = v.osc('sine', 520, t, end + 0.05);
  const o2 = v.osc('triangle', 780, t, end + 0.05);
  const path = [[0, 520], [0.8, 900], [1.6, 650], [2.4, 1000], [d, 600]];
  path.forEach(([dt, f], i) => {
    if (i === 0) return;
    o.frequency.exponentialRampToValueAtTime(f, t + dt);
    o2.frequency.exponentialRampToValueAtTime(f * 1.5, t + dt);
  });
  const vib = v.gain(70);
  v.osc('sine', 7, t, end + 0.05).connect(vib);
  vib.connect(o.detune);
  vib.connect(o2.detune);
  const mix = v.gain(1);
  o.connect(mix);
  v.chain(o2, v.gain(0.15), mix);
  const wub = v.gain(0.7);
  v.lfo(9, 0.3, wub.gain, { t, stop: end + 0.05 });
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.35, t + 0.3);
  env.gain.setValueAtTime(0.35, end - 0.5);
  env.gain.linearRampToValueAtTime(0, end);
  const p = v.pan(-0.8);
  if (p.pan) p.pan.linearRampToValueAtTime(0.8, end);
  // eco
  const dl = v.delay(0.22);
  const fb = v.gain(0.35);
  v.chain(dl, v.lp(2000), fb, dl);
  v.chain(mix, wub, env, p, v.out);
  p.connect(dl);
  fb.connect(v.out);
  v.send(p, 0.3);
  return end + 0.6;
}

export default {
  id: 'toys',
  emoji: '🧸',
  name: { es: 'Juguetes', en: 'Toys' },
  sounds: [
    { id: 'rattle', emoji: '👶', name: { es: 'Sonajero', en: 'Rattle' }, say: { es: 'El sonajero', en: 'The rattle' }, kind: 'shot', play: rattle },
    { id: 'rubberduck', emoji: '🐤', name: { es: 'Patito de goma', en: 'Rubber duck' }, say: { es: 'El patito de goma', en: 'The rubber duck' }, kind: 'shot', play: rubberDuck },
    { id: 'boing', emoji: '🌀', name: { es: 'Muelle', en: 'Spring' }, say: { es: 'El muelle', en: 'The spring' }, kind: 'shot', play: boing },
    { id: 'slidewhistle', emoji: '🎢', name: { es: 'Silbato de émbolo', en: 'Slide whistle' }, say: { es: 'El silbato de émbolo', en: 'The slide whistle' }, kind: 'shot', play: slideWhistle },
    { id: 'clownhorn', emoji: '🤡', name: { es: 'Bocina de payaso', en: 'Clown horn' }, say: { es: 'La bocina del payaso', en: 'The clown horn' }, kind: 'shot', play: clownHorn },
    { id: 'spinningtop', emoji: '💫', name: { es: 'Peonza', en: 'Spinning top' }, say: { es: 'La peonza', en: 'The spinning top' }, kind: 'shot', play: spinningTop },
    { id: 'windup', emoji: '⚙️', name: { es: 'Juguete de cuerda', en: 'Wind-up toy' }, say: { es: 'El juguete de cuerda', en: 'The wind-up toy' }, kind: 'shot', play: windUp },
    { id: 'robot', emoji: '🤖', name: { es: 'Robot', en: 'Robot' }, say: { es: 'El robot', en: 'The robot' }, kind: 'shot', play: robot },
    { id: 'magicwand', emoji: '🪄', name: { es: 'Varita mágica', en: 'Magic wand' }, say: { es: 'La varita mágica', en: 'The magic wand' }, kind: 'shot', play: magicWand },
    { id: 'whistle', emoji: '😗', name: { es: 'Silbato', en: 'Whistle' }, say: { es: 'El silbato', en: 'The whistle' }, kind: 'shot', play: whistle },
    { id: 'balloon', emoji: '🎈', name: { es: 'Globo', en: 'Balloon' }, say: { es: 'El globo', en: 'The balloon' }, kind: 'shot', play: balloon },
    { id: 'ufo', emoji: '🛸', name: { es: 'Platillo volante', en: 'Flying saucer' }, say: { es: 'El platillo volante', en: 'The flying saucer' }, kind: 'shot', play: ufo },
  ],
};
