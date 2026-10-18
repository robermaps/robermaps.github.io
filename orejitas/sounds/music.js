// Orejitas · categoría: Música / Music
// Frases cortas y alegres que muestran cada instrumento.
import { hit, thump, bell, pluck, piano, melody, parseScore, freq } from '../instruments.js';

// ---------------------------------------------------------------------------
// Timbres
// ---------------------------------------------------------------------------

// Metal (trompeta): sierra con "golpe" de brillo al atacar y leve subida de tono
function brassNote(v, { t, freq: f, dur, gain = 0.3, dest = v.out, vib = 0 }) {
  const end = t + dur;
  const stop = end + 0.1;
  const mix = v.gain(1);
  [0, 7].forEach((cents, i) => {
    const o = v.osc('sawtooth', f * 0.97, t, stop);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    o.detune.value = cents;
    if (vib) {
      const d = v.gain(0);
      d.gain.setValueAtTime(0, t);
      d.gain.linearRampToValueAtTime(vib, t + Math.min(0.35, dur * 0.6));
      v.osc('sine', 5.5, t, stop).connect(d).connect(o.detune);
    }
    v.chain(o, v.gain(i ? 0.5 : 1), mix);
  });
  const lp = v.lp(500, 1.2);
  lp.frequency.setValueAtTime(500, t);
  lp.frequency.linearRampToValueAtTime(3200, t + 0.05);
  lp.frequency.setTargetAtTime(2100, t + 0.05, 0.1);
  lp.frequency.setValueAtTime(2100, Math.max(t + 0.06, end - 0.06));
  lp.frequency.linearRampToValueAtTime(700, end);
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.03);
  env.gain.linearRampToValueAtTime(gain * 0.8, t + 0.12);
  env.gain.setValueAtTime(gain * 0.8, Math.max(t + 0.12, end - 0.06));
  env.gain.linearRampToValueAtTime(0, end);
  v.chain(mix, lp, v.filter('peaking', 1300, 1.5, 5), env, dest);
  v.send(env, 0.18);
  return end;
}

// Flauta: casi senoidal, con soplo y vibrato tardío
function fluteNote(v, { t, freq: f, dur, gain = 0.3, dest = v.out }) {
  const end = t + dur;
  const stop = end + 0.1;
  const o = v.osc(v.wave([1, 0.22, 0.07, 0.025]), f, t, stop);
  const d = v.gain(0);
  d.gain.setValueAtTime(0, t);
  d.gain.linearRampToValueAtTime(14, t + Math.min(0.3, dur * 0.7));
  v.osc('sine', 5, t, stop).connect(d).connect(o.detune);
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.06);
  env.gain.setValueAtTime(gain, Math.max(t + 0.06, end - 0.08));
  env.gain.linearRampToValueAtTime(0, end);
  const breath = v.noise('white', { t, stop });
  v.chain(breath, v.bp(f * 2, 1.5), v.gain(0.35), env);
  v.chain(o, env, dest);
  hit(v, { t, dur: 0.05, type: 'highpass', freq: 3000, gain: gain * 0.2, a: 0.01, dest });
  v.send(env, 0.25);
  return end;
}

// Violín: una sola cuerda que liga las notas (portamento) con vibrato
function violinPhrase(v, notes, { t, gain = 0.25, dest = v.out }) {
  const total = notes.reduce((s, [, d]) => s + d, 0);
  const end = t + total;
  const stop = end + 0.2;
  const o = v.osc('sawtooth', notes[0][0], t, stop);
  const o2 = v.osc('sawtooth', notes[0][0], t, stop);
  o2.detune.value = 5;
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.09);
  let at = t;
  notes.forEach(([f, d], i) => {
    if (i > 0) {
      o.frequency.setTargetAtTime(f, at, 0.018);
      o2.frequency.setTargetAtTime(f, at, 0.018);
      // cambio de arco: pequeña bajada de intensidad
      env.gain.setValueAtTime(gain, at - 0.04);
      env.gain.linearRampToValueAtTime(gain * 0.72, at);
      env.gain.linearRampToValueAtTime(gain, at + 0.07);
    }
    at += d;
  });
  env.gain.setValueAtTime(gain, end - 0.18);
  env.gain.linearRampToValueAtTime(0, end);
  const vd = v.gain(0);
  vd.gain.setValueAtTime(0, t);
  vd.gain.linearRampToValueAtTime(18, t + 0.4);
  const vib = v.osc('sine', 5.6, t, stop);
  vib.connect(vd);
  vd.connect(o.detune);
  vd.connect(o2.detune);
  const mix = v.gain(0.6);
  o.connect(mix);
  o2.connect(mix);
  const bow = v.noise('white', { t, stop });
  v.chain(bow, v.bp(3000, 0.7), v.gain(0.08), mix);
  v.chain(mix, v.hp(190), v.filter('peaking', 280, 1.2, 6), v.filter('peaking', 2800, 1, 5),
    v.lp(5500), env, dest);
  v.send(env, 0.25);
  return end;
}

function xylo(v, t, f, gain = 0.26) {
  hit(v, { t, dur: 0.008, type: 'highpass', freq: 4000, gain: gain * 0.25 });
  return bell(v, { t, freq: f, dur: 0.9, gain, partials: 'xylo', a: 0.001, reverb: 0.15 });
}

function snare(v, t, g = 0.5) {
  hit(v, { t, dur: 0.18, type: 'bandpass', freq: 2500, Q: 0.6, gain: g });
  thump(v, { t, f0: 210, f1: 160, dur: 0.1, gain: g * 0.45, click: 0 });
}
function tom(v, t, f = 140, g = 0.6) {
  thump(v, { t, f0: f * 1.4, f1: f, dur: 0.35, gain: g, click: 0.18 });
  hit(v, { t, dur: 0.1, type: 'lowpass', freq: 1200, gain: g * 0.2 });
}
function cymbal(v, t, g = 0.15) {
  const n = v.noise('white', { t, stop: t + 1.4 });
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(g, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
  v.chain(n, v.hp(4000), v.lp(10000), env, v.out);
  v.send(env, 0.2);
  return t + 1.3;
}

function triangleHit(v, t, g, dur = 2.5) {
  const f = 1150;
  bell(v, {
    t, freq: f, dur, gain: g, detune: 5, reverb: 0.25,
    partials: [[1, 1, 1], [2.756, 0.6, 0.8], [5.404, 0.3, 0.6], [8.933, 0.1, 0.4]],
  });
  bell(v, { t, freq: f * 1.004, dur, gain: g * 0.4, reverb: 0, partials: [[1, 1, 1], [2.76, 0.5, 0.8]] });
  hit(v, { t, dur: 0.01, type: 'highpass', freq: 6000, gain: g * 0.3 });
  return t + dur;
}

function shake(v, t, g, pan = 0, d = 0.09) {
  hit(v, { t, dur: d, type: 'highpass', freq: 4500, a: 0.012, gain: g * 1.2, pan });
  const s = v.dust(2500, { grain: 0.0005, stop: t + d + 0.02 });
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(g * 1.5, t + 0.012);
  env.gain.exponentialRampToValueAtTime(0.001, t + d);
  v.chain(s, v.hp(4000), v.lp(10000), env, v.pan(pan), v.out);
  return t + d;
}

function jingle(v, t, g, d = 0.28, pan = 0) {
  for (let k = 0; k < 3; k++) {
    const at = t + k * 0.012 * v.rand(0.7, 1.3);
    const kk = 1 - k * 0.25;
    hit(v, { t: at, dur: d, freq: 5400, Q: 4, gain: g * 0.5 * kk, pan });
    hit(v, { t: at, dur: d * 0.8, freq: 7200, Q: 5, gain: g * 0.4 * kk, pan });
  }
}
function tambHit(v, t, g) {
  jingle(v, t, g);
  thump(v, { t, f0: 260, f1: 180, dur: 0.12, gain: g * 0.5, click: 0.1 });
}
function tambShake(v, t, g, d = 0.45) {
  const n = v.noise('white', { t, stop: t + d + 0.2 });
  const trem = v.gain(0.5);
  v.lfo(26, 0.45, trem.gain, { t, stop: t + d + 0.2 });
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(g, t + 0.05);
  env.gain.setValueAtTime(g, t + d - 0.05);
  env.gain.exponentialRampToValueAtTime(0.001, t + d + 0.15);
  const a = v.bp(5400, 4);
  const b = v.bp(7200, 5);
  n.connect(a);
  n.connect(b);
  a.connect(trem);
  b.connect(trem);
  v.chain(trem, env, v.out);
  v.send(env, 0.1);
}

const CHORDS = {
  C: ['C3', 'E3', 'G3', 'C4', 'E4'],
  F: ['F2', 'C3', 'F3', 'A3', 'C4', 'F4'],
  G: ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'],
  Am: ['A2', 'E3', 'A3', 'C4', 'E4'],
};
function strum(v, chord, t, { down = true, gain = 0.3 } = {}) {
  const notes = CHORDS[chord].map(freq);
  const order = down ? notes : [...notes].reverse().slice(0, 4);
  let end = t;
  order.forEach((f, i) => {
    end = Math.max(end, pluck(v, {
      t: t + i * 0.018 * v.rand(0.8, 1.2), freq: f, dur: 2.2, gain: gain * (down ? 1 : 0.65),
      bright: 0.5, pan: (i / Math.max(1, order.length - 1) - 0.5) * 0.3, reverb: 0.12,
    }));
  });
  return end;
}

// ---------------------------------------------------------------------------
// Frases
// ---------------------------------------------------------------------------

const PIANO_PHRASES = [
  { rh: 'C4/0.5 E4/0.5 G4/0.5 C5/0.5 E5/0.5 G5/0.5 C6/2', lh: 'C3/3 C3+G3/2' },
  { rh: 'E4/0.5 G4/0.5 C5/0.5 G4/0.5 A4/0.5 F4/0.5 D4/0.5 B3/0.5 C4/2', lh: 'C3/1 C3/1 F3/1 G3/1 C3+G3/2' },
  { rh: 'G4/0.5 C5/0.5 E5/0.5 D5/0.5 C5/0.5 D5/0.5 E5/1 C5/2', lh: 'C3/2 G3/2 C3+G3/2' },
];

function pianoPlay(v) {
  const ph = v.pick(PIANO_PHRASES);
  const bpm = v.rand(112, 124);
  const end = melody(v, ph.rh, { bpm, swing: 0.005, play: (f, t, d) => piano(v, { t, freq: f, dur: Math.max(1.2, d * 1.6), gain: 0.25 }) });
  melody(v, ph.lh, { bpm, play: (f, t, d) => piano(v, { t, freq: f, dur: Math.max(1.4, d), gain: 0.16 }) });
  return end + 0.6;
}

function xylophonePlay(v) {
  const t = v.t0;
  const style = v.irand(0, 2);
  if (style === 2) {
    const end = melody(v, 'C5/0.5 E5/0.5 G5/0.5 E5/0.5 C6/1 G5/0.5 C6/1.5', {
      bpm: 140, play: (f, at) => xylo(v, at, f),
    });
    return end + 0.4;
  }
  const scale = ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'].map(freq);
  const run = style === 0 ? scale : [...scale].reverse().concat(scale.slice(1));
  let at = t;
  run.forEach((f, i) => { xylo(v, at, f, 0.2 + (i / run.length) * 0.08); at += 0.07; });
  at += 0.25;
  xylo(v, at, freq('G5'), 0.28);
  at += 0.3;
  return xylo(v, at, freq('C6'), 0.3);
}

function drumPlay(v) {
  const t = v.t0;
  if (v.chance(0.5)) {
    tom(v, t, 170); tom(v, t + 0.25, 170);
    snare(v, t + 0.5); snare(v, t + 0.625, 0.35); snare(v, t + 0.75);
    tom(v, t + 1.0, 120);
    for (let i = 0; i < 12; i++) snare(v, t + 1.25 + i * 0.0625, 0.15 + i * 0.04);
    tom(v, t + 2.0, 110, 0.7);
    return cymbal(v, t + 2.0);
  }
  [0, 0.8].forEach((o) => { tom(v, t + o, 160); tom(v, t + o + 0.2, 160); snare(v, t + o + 0.4); });
  [1.6, 1.7, 1.8, 1.9].forEach((o, i) => snare(v, t + o, 0.3 + i * 0.1));
  tom(v, t + 2.1, 110, 0.7);
  return cymbal(v, t + 2.1);
}

function guitarPlay(v) {
  const prog = v.pick([['C', 'F', 'G'], ['C', 'Am', 'F', 'G'], ['G', 'C', 'G']]);
  const beat = 60 / v.rand(104, 116);
  let t = v.t0;
  prog.forEach((ch) => {
    strum(v, ch, t);
    strum(v, ch, t + beat, { gain: 0.24 });
    strum(v, ch, t + beat * 1.5, { down: false });
    t += beat * 2;
  });
  const last = prog[0] === 'G' ? 'G' : 'C';
  return strum(v, last, t, { gain: 0.32 });
}

function trumpetPlay(v) {
  const t = v.t0;
  const fanfare = v.pick([
    [['G4', 0.18], ['C5', 0.18], ['E5', 0.18], ['G5', 0.45], ['E5', 0.17], ['G5', 1.1]],
    [['C5', 0.2], ['E5', 0.2], ['G5', 0.4], ['E5', 0.2], ['G5', 1.0]],
    [['C5', 0.16], ['C5', 0.16], ['C5', 0.16], ['G5', 0.6], ['E5', 0.3], ['C5', 0.9]],
  ]);
  let at = t;
  let end = t;
  fanfare.forEach(([n, d], i) => {
    const last = i === fanfare.length - 1;
    end = brassNote(v, { t: at, freq: freq(n), dur: last ? d : d * 0.85, gain: 0.28, vib: last ? 14 : 0 });
    at += d;
  });
  return end + 0.2;
}

function flutePlay(v) {
  const phrase = v.pick([
    'D5/0.5 G5/0.5 A5/0.5 B5/1 A5/0.5 G5/0.5 E5/0.5 D5/1.5',
    'G5/0.5 B5/0.5 D6/1 C6/0.5 A5/0.5 B5/0.5 G5/1.5',
  ]);
  const events = parseScore(phrase);
  const beat = 60 / v.rand(96, 106);
  let t = v.t0;
  let end = t;
  events.forEach((ev, i) => {
    const d = ev.beats * beat;
    const last = i === events.length - 1;
    ev.notes.forEach((f) => { end = fluteNote(v, { t, freq: f, dur: last ? d : d * 0.95, gain: 0.3 }); });
    t += d;
  });
  return end + 0.2;
}

function violinPlay(v) {
  const beat = 60 / v.rand(86, 94);
  const score = v.pick([
    'A4/1 D5/0.5 F#5/0.5 A5/1.5 G5/0.5 F#5/0.5 E5/0.5 D5/2',
    'D5/1 E5/0.5 F#5/0.5 G5/1 F#5/0.5 E5/0.5 D5/1 A4/2',
  ]);
  const notes = parseScore(score).map((ev) => [ev.notes[0], ev.beats * beat]);
  return violinPhrase(v, notes, { t: v.t0 }) + 0.3;
}

function harpPlay(v) {
  const t = v.t0;
  const scale = v.chance(0.5)
    ? ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6']
    : ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
  let at = t;
  let end = t;
  scale.map(freq).forEach((f, i) => {
    end = pluck(v, { t: at, freq: f, dur: 2.5, gain: 0.28 - i * 0.006, bright: 0.45, body: false, pan: -0.4 + (i / scale.length) * 0.8, reverb: 0.3 });
    at += 0.055 * v.rand(0.9, 1.1);
  });
  return end;
}

function churchBellsPlay(v) {
  const t = v.t0;
  const bells = ['A4', 'G4', 'F4', 'E4', 'D4', 'C4'].map(freq);
  const gap = v.rand(0.3, 0.36);
  const rounds = [bells, bells];
  if (v.chance(0.5)) rounds[1] = [bells[1], bells[0], bells[3], bells[2], bells[5], bells[4]];
  // todas las campanas pasan por un fundido final para no cortar en seco
  const fade = v.gain(1);
  fade.connect(v.out);
  let at = t;
  rounds.forEach((row) => {
    row.forEach((f, i) => {
      bell(v, { t: at, freq: f, dur: 4, gain: 0.17, partials: 'church', reverb: 0.35, detune: 3, pan: -0.5 + i * 0.2, dest: fade });
      at += gap;
    });
    at += gap; // pausa de "handstroke"
  });
  fade.gain.setValueAtTime(1, at + 0.8);
  fade.gain.linearRampToValueAtTime(0, at + 3);
  return at + 3;
}

function trianglePlay(v) {
  const t = v.t0;
  triangleHit(v, t, 0.35, 1.5);
  triangleHit(v, t + 0.6, 0.3, 1.5);
  for (let i = 0; i < 8; i++) triangleHit(v, t + 1.2 + i * 0.07, 0.12 + (i % 2) * 0.04, 0.6);
  return triangleHit(v, t + 1.85, 0.38, 2.8);
}

function maracasPlay(v) {
  const t = v.t0;
  const b = 60 / v.rand(116, 126) / 2;
  const accents = [1, 0.5, 0.7, 0.5, 1, 0.5, 0.7, 0.5];
  let end = t;
  accents.forEach((a, i) => { end = shake(v, t + i * b, 0.5 * a, i % 2 ? 0.25 : -0.25); });
  const c = t + 8 * b;
  [0, 0.5, 1].forEach((k, i) => { end = shake(v, c + k * b, 0.45, i % 2 ? 0.25 : -0.25, 0.07); });
  return shake(v, c + 2 * b, 0.6, 0, 0.16) + 0.2;
}

function tambourinePlay(v) {
  const t = v.t0;
  tambHit(v, t, 0.5);
  tambHit(v, t + 0.4, 0.4);
  tambShake(v, t + 0.8, 0.35, 0.45);
  tambHit(v, t + 1.4, 0.45);
  tambHit(v, t + 1.6, 0.35);
  tambHit(v, t + 1.8, 0.45);
  tambShake(v, t + 2.1, 0.35, 0.5);
  tambHit(v, t + 2.75, 0.55);
  return t + 3.2;
}

export default {
  id: 'music',
  emoji: '🥁',
  name: { es: 'Música', en: 'Music' },
  sounds: [
    { id: 'piano', emoji: '🎹', name: { es: 'Piano', en: 'Piano' }, say: { es: 'El piano', en: 'The piano' }, kind: 'shot', play: pianoPlay },
    { id: 'xylophone', emoji: '🌈', name: { es: 'Xilófono', en: 'Xylophone' }, say: { es: 'El xilófono', en: 'The xylophone' }, kind: 'shot', play: xylophonePlay },
    { id: 'drum', emoji: '🥁', name: { es: 'Tambor', en: 'Drum' }, say: { es: 'El tambor', en: 'The drum' }, kind: 'shot', play: drumPlay },
    { id: 'guitar', emoji: '🎸', name: { es: 'Guitarra', en: 'Guitar' }, say: { es: 'La guitarra', en: 'The guitar' }, kind: 'shot', play: guitarPlay },
    { id: 'trumpet', emoji: '🎺', name: { es: 'Trompeta', en: 'Trumpet' }, say: { es: 'La trompeta', en: 'The trumpet' }, kind: 'shot', play: trumpetPlay },
    { id: 'flute', emoji: '🎵', name: { es: 'Flauta', en: 'Flute' }, say: { es: 'La flauta', en: 'The flute' }, kind: 'shot', play: flutePlay },
    { id: 'violin', emoji: '🎻', name: { es: 'Violín', en: 'Violin' }, say: { es: 'El violín', en: 'The violin' }, kind: 'shot', play: violinPlay },
    { id: 'harp', emoji: '👼', name: { es: 'Arpa', en: 'Harp' }, say: { es: 'El arpa', en: 'The harp' }, kind: 'shot', play: harpPlay },
    { id: 'churchbells', emoji: '⛪', name: { es: 'Campanas', en: 'Church bells' }, say: { es: 'Las campanas', en: 'The church bells' }, kind: 'shot', play: churchBellsPlay },
    { id: 'triangle', emoji: '🔺', name: { es: 'Triángulo', en: 'Triangle' }, say: { es: 'El triángulo', en: 'The triangle' }, kind: 'shot', play: trianglePlay },
    { id: 'maracas', emoji: '💃', name: { es: 'Maracas', en: 'Maracas' }, say: { es: 'Las maracas', en: 'The maracas' }, kind: 'shot', play: maracasPlay },
    { id: 'tambourine', emoji: '🪘', name: { es: 'Pandereta', en: 'Tambourine' }, say: { es: 'La pandereta', en: 'The tambourine' }, kind: 'shot', play: tambourinePlay },
  ],
};
