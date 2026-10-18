// Orejitas · categoría: Nanas / Lullabies
// Melodías de dominio público en bucle (una pasada, pausa, y otra vez con
// otro timbre) y tres piezas generativas que nunca se repiten.
import { melody, parseScore, freq } from '../instruments.js';
import { celesta, softBox, softHarp, softPiano, softBass, songLoop, outBus, partialsNote } from './_musical.js';

// ---- timbres de las pasadas (f llega en la octava escrita en la partitura)
// (dest = bus compartido que crea songLoop)
const BOX = {
  lead: (v, f, t, d, dest) => softBox(v, { t, freq: f * 2, gain: 0.2, dest }),
  bass: (v, f, t, d, dest) => softBox(v, { t, freq: f * 2, dur: Math.max(1.5, d), gain: 0.11, dest }),
};
const CELESTA = {
  lead: (v, f, t, d, dest) => celesta(v, { t, freq: f * 2, gain: 0.18, dest }),
  bass: (v, f, t, d, dest) => softBass(v, { t, freq: f, dur: d, gain: 0.14, dest }),
};
const HARP = {
  lead: (v, f, t, d, dest) => softHarp(v, { t, freq: f, gain: 0.24, dest }),
  bass: (v, f, t, d, dest) => softHarp(v, { t, freq: f, dur: Math.max(2, d * 1.5), gain: 0.15, dest }),
};
const PIANO = {
  lead: (v, f, t, d, dest) => softPiano(v, { t, freq: f, dur: 1.6, gain: 0.22, dest }),
  bass: (v, f, t, d, dest) => softPiano(v, { t, freq: f, dur: 1.3, gain: 0.13, dest }),
};

// ---- partituras (nota/duración en pulsos; r = silencio) -----------------

// Wiegenlied, J. Brahms (1868), 3/4 con anacrusa
const BRAHMS = `E4/0.5 E4/0.5
  G4/2 E4/0.5 E4/0.5  G4/2 E4/0.5 G4/0.5  C5/1 B4/1.5 A4/0.5  A4/1 G4/1 D4/0.5 E4/0.5
  F4/1 D4/1 D4/0.5 E4/0.5  F4/2 D4/0.5 F4/0.5  B4/1 A4/1 G4/0.5 B4/0.5  C5/2 C4/0.5 C4/0.5
  C5/2 A4/0.5 F4/0.5  G4/2 E4/0.5 C4/0.5  F4/1 G4/1 A4/1  G4/2 C4/0.5 C4/0.5
  C5/2 A4/0.5 F4/0.5  G4/2 E4/0.5 C4/0.5  F4/1 E4/1 D4/1  C4/3`;
const BRAHMS_BASS = `r/1
  C3/3 C3/3 F3/3 C3/3  G3/3 G3/3 G3/3 C3/3
  F3/3 C3/3 G3/3 C3/3  F3/3 C3/3 G3/3 C3/3`;

// Ah ! vous dirai-je, maman (s. XVIII) — "Estrellita" / "Twinkle, twinkle"
const TWINKLE_LINE1 = 'C4 C4 G4 G4 A4 A4 G4/2';
const TWINKLE_LINE2 = 'F4 F4 E4 E4 D4 D4 C4/2';
const TWINKLE_LINE3 = 'G4 G4 F4 F4 E4 E4 D4/2';
const TWINKLE = [TWINKLE_LINE1, TWINKLE_LINE2, TWINKLE_LINE3, TWINKLE_LINE3, TWINKLE_LINE1, TWINKLE_LINE2].join(' ');
const TWINKLE_BASS = [
  'C3/2 C3/2 F3/2 C3/2', 'F3/2 C3/2 G3/2 C3/2', 'C3/2 F3/2 C3/2 G3/2',
  'C3/2 F3/2 C3/2 G3/2', 'C3/2 C3/2 F3/2 C3/2', 'F3/2 C3/2 G3/2 C3/2',
].join(' ');

// Frère Jacques / Martinillo (tradicional)
const FRERE = `C4 D4 E4 C4  C4 D4 E4 C4  E4 F4 G4/2  E4 F4 G4/2
  G4/0.5 A4/0.5 G4/0.5 F4/0.5 E4 C4  G4/0.5 A4/0.5 G4/0.5 F4/0.5 E4 C4
  C4 G3 C4/2  C4 G3 C4/2`;
const FRERE_BASS = 'C3/2 G3/2 C3/2 G3/2 C3/2 G3/2 C3/2 G3/2 C3/2 G3/2 C3/2 G3/2 C3/2 G3/2 C3/4';

// Himno de la alegría, L. van Beethoven (9ª sinfonía)
const ODE_A = 'E4 E4 F4 G4  G4 F4 E4 D4  C4 C4 D4 E4';
const ODE = `${ODE_A}  E4/1.5 D4/0.5 D4/2  ${ODE_A}  D4/1.5 C4/0.5 C4/2
  D4 D4 E4 C4  D4 E4/0.5 F4/0.5 E4 C4  D4 E4/0.5 F4/0.5 E4 D4  C4 D4 G3/2
  ${ODE_A}  D4/1.5 C4/0.5 C4/2`;
const ODE_BASS = `C3/4 G3/4 C3/4 G3/4  C3/4 G3/4 C3/4 G3/2 C3/2
  G3/2 C3/2 G3/2 C3/2 G3/4 C3/2 G3/2  C3/4 G3/4 C3/4 G3/2 C3/2`;

// Für Elise, L. van Beethoven — tema inicial (pulso = corchea)
const ELISE_A = `E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5  A4/1 r/0.5 C4/0.5 E4/0.5 A4/0.5
  B4/1 r/0.5 E4/0.5 G#4/0.5 B4/0.5  C5/1 r/0.5 E4/0.5 E5/0.5 D#5/0.5
  E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5  A4/1 r/0.5 C4/0.5 E4/0.5 A4/0.5
  B4/1 r/0.5 E4/0.5 C5/0.5 B4/0.5`;
const ELISE = `E5/0.5 D#5/0.5 ${ELISE_A} A4/1 r/1 E5/0.5 D#5/0.5 ${ELISE_A} A4/3`;
const ELISE_LH_A = `r/3  A2/0.5 E3/0.5 A3/0.5 r/1.5  E2/0.5 E3/0.5 G#3/0.5 r/1.5  A2/0.5 E3/0.5 A3/0.5 r/1.5
  r/3  A2/0.5 E3/0.5 A3/0.5 r/1.5  E2/0.5 E3/0.5 G#3/0.5 r/1.5`;
const ELISE_LH = `r/1 ${ELISE_LH_A} A2/0.5 E3/0.5 A3/0.5 r/1.5 ${ELISE_LH_A} A2/0.5 E3/0.5 A3/0.5 r/1.5`;

// Mary had a little lamb (tradicional)
const MARY = `E4 D4 C4 D4  E4 E4 E4/2  D4 D4 D4/2  E4 G4 G4/2
  E4 D4 C4 D4  E4 E4 E4 E4  D4 D4 E4 D4  C4/4`;
const MARY_BASS = 'C3/4 C3/4 G3/4 C3/4 C3/4 C3/4 G3/4 C3/4';

// ---- piezas generativas ------------------------------------------------

const PENT = ['G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'].map(freq);
const BOX_CHORDS = [['C4', 'G4'], ['A3', 'E4'], ['F3', 'C4'], ['G3', 'D4']].map((c) => c.map(freq));

function musicBoxLoop(v) {
  const lead = outBus(v, { pan: -0.05, reverb: 0.4 });
  const low = outBus(v, { pan: 0.1, reverb: 0.3 });
  let idx = 4;
  let k = v.irand(0, 3);
  v.loop((t) => {
    const beat = v.rand(0.42, 0.52);
    const len = v.pick([6, 8, 8, 10]);
    const chord = BOX_CHORDS[k % BOX_CHORDS.length];
    k += v.pick([1, 1, 1, 2]);
    softBox(v, { t, freq: chord[0], dur: 2.5, gain: 0.1, dest: low });
    softBox(v, { t: t + (len / 2) * beat, freq: chord[1], dur: 2.5, gain: 0.08, dest: low });
    let at = t;
    for (let i = 0; i < len; i++) {
      let step = v.pick([-2, -1, -1, 0, 1, 1, 2]);
      if (idx > 7) step = -Math.abs(step);
      if (idx < 2) step = Math.abs(step);
      idx = Math.max(0, Math.min(PENT.length - 1, idx + step));
      const d = i === len - 1 ? beat * 2 : (v.chance(0.15) ? beat * 0.5 : beat);
      softBox(v, { t: at + v.rand(-0.01, 0.01), freq: PENT[idx], gain: v.rand(0.16, 0.21), dest: lead });
      at += d;
    }
    return at + beat * v.rand(1, 2.5);
  });
}

const MOBILE = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'].map(freq);
const CHIME = [[1, 1, 1], [2.32, 0.45, 0.6], [4.25, 0.2, 0.4], [6.63, 0.08, 0.25]];
function mobileLoop(v) {
  const sides = [-0.6, -0.2, 0.2, 0.6].map((pan) => outBus(v, { pan, reverb: 0.5 }));
  v.loop((t) => {
    const i = v.irand(0, MOBILE.length - 1);
    partialsNote(v, { t, freq: MOBILE[i], dur: v.rand(3, 5), gain: v.rand(0.08, 0.14), partials: CHIME, dest: v.pick(sides) });
    if (v.chance(0.3)) {
      const j = Math.min(MOBILE.length - 1, i + v.pick([1, 2]));
      partialsNote(v, { t: t + v.rand(0.15, 0.35), freq: MOBILE[j], dur: v.rand(3, 4.5), gain: v.rand(0.06, 0.1), partials: CHIME, dest: v.pick(sides) });
    }
    return t + v.rand(0.7, 2.2);
  });
}

const HARP_PROGS = [
  [['F3', 'C4', 'E4', 'A4', 'C5', 'E5', 'A5'], ['E3', 'B3', 'D4', 'G4', 'B4', 'D5', 'G5'],
    ['D3', 'A3', 'C4', 'F4', 'A4', 'C5', 'F5'], ['C3', 'G3', 'B3', 'E4', 'G4', 'B4', 'E5']],
  [['C3', 'G3', 'C4', 'E4', 'G4', 'C5', 'E5'], ['A2', 'E3', 'A3', 'C4', 'E4', 'A4', 'C5'],
    ['F2', 'C3', 'F3', 'A3', 'C4', 'F4', 'A4'], ['G2', 'D3', 'G3', 'B3', 'D4', 'G4', 'B4']],
].map((prog) => prog.map((ch) => ch.map(freq)));

function harpLoop(v) {
  const lanes = [-0.4, 0, 0.4].map((pan) => outBus(v, { pan, reverb: 0.4 }));
  const low = outBus(v, { pan: 0, reverb: 0.25 });
  let prog = v.pick(HARP_PROGS);
  let k = 0;
  v.loop((t) => {
    if (k > 0 && k % 4 === 0 && v.chance(0.5)) prog = v.pick(HARP_PROGS);
    const ch = prog[k % 4];
    k++;
    const s = v.rand(0.2, 0.25);
    softBass(v, { t, freq: ch[0] < 100 ? ch[0] * 2 : ch[0], dur: 7 * s + 0.6, gain: 0.08, dest: low });
    let at = t;
    ch.forEach((f, i) => {
      softHarp(v, { t: at, freq: f, dur: 2.8, gain: 0.22 * (1 - i * 0.05), dest: lanes[Math.min(2, Math.floor(i / 2.5))] });
      at += s * v.rand(0.92, 1.08);
    });
    if (v.chance(0.4)) { // a veces, un adorno descendente
      softHarp(v, { t: at, freq: ch[5], dur: 2.6, gain: 0.14, dest: lanes[2] });
      at += s;
      softHarp(v, { t: at, freq: ch[4], dur: 2.6, gain: 0.12, dest: lanes[1] });
    }
    return at + v.rand(0.35, 0.7);
  });
}

// Martinillo: en las pasadas impares, canon a dos voces
const FRERE_NOTES = parseScore(FRERE);
function frereRound(v, voice, t, tempo, pass, buses) {
  if (pass % 2 === 0) return 0;
  const beat = 60 / tempo;
  return melody(v, FRERE_NOTES, {
    t: t + 8 * beat, bpm: tempo, swing: 0.006,
    play: (f, at) => celesta(v, { t: at, freq: f, gain: 0.13, dest: buses.bass }),
  });
}

export default {
  id: 'lullabies',
  emoji: '🎶',
  name: { es: 'Nanas', en: 'Lullabies' },
  sounds: [
    {
      id: 'brahms', emoji: '🌛', name: { es: 'Nana de Brahms', en: "Brahms' lullaby" },
      say: { es: 'La nana de Brahms', en: "Brahms' lullaby" }, kind: 'loop',
      play(v) { songLoop(v, { score: BRAHMS, bass: BRAHMS_BASS, bpm: 76, voices: [BOX, HARP, CELESTA] }); },
    },
    {
      id: 'twinkle', emoji: '⭐', name: { es: 'Estrellita', en: 'Twinkle, twinkle' },
      say: { es: 'Estrellita, ¿dónde estás?', en: 'Twinkle, twinkle, little star' }, kind: 'loop',
      play(v) { songLoop(v, { score: TWINKLE, bass: TWINKLE_BASS, bpm: 84, voices: [BOX, CELESTA, HARP] }); },
    },
    {
      id: 'frerejacques', emoji: '🔔', name: { es: 'Martinillo', en: 'Frère Jacques' },
      say: { es: 'Martinillo', en: 'Frère Jacques' }, kind: 'loop',
      play(v) { songLoop(v, { score: FRERE, bass: FRERE_BASS, bpm: 88, voices: [BOX, HARP], extra: frereRound }); },
    },
    {
      id: 'odetojoy', emoji: '🎼', name: { es: 'Himno de la alegría', en: 'Ode to Joy' },
      say: { es: 'El himno de la alegría', en: 'Ode to Joy' }, kind: 'loop',
      play(v) { songLoop(v, { score: ODE, bass: ODE_BASS, bpm: 80, voices: [CELESTA, BOX, HARP] }); },
    },
    {
      id: 'furelise', emoji: '💐', name: { es: 'Para Elisa', en: 'Für Elise' },
      say: { es: 'Para Elisa', en: 'Für Elise' }, kind: 'loop',
      play(v) {
        const box = {
          lead: (vv, f, t, d, dest) => softBox(vv, { t, freq: f * 2, gain: 0.18, dest }),
          bass: (vv, f, t, d, dest) => softBox(vv, { t, freq: f * 2, dur: 1.6, gain: 0.12, dest }),
        };
        songLoop(v, { score: ELISE, bass: ELISE_LH, bpm: 132, voices: [PIANO, box] });
      },
    },
    {
      id: 'marylamb', emoji: '🐑', name: { es: 'Corderito', en: 'Little lamb' },
      say: { es: 'María tenía un corderito', en: 'Mary had a little lamb' }, kind: 'loop',
      play(v) { songLoop(v, { score: MARY, bass: MARY_BASS, bpm: 84, voices: [BOX, HARP, CELESTA] }); },
    },
    {
      id: 'musicbox', emoji: '🎁', name: { es: 'Caja de música', en: 'Music box' },
      say: { es: 'La caja de música', en: 'The music box' }, kind: 'loop',
      play(v) { musicBoxLoop(v); },
    },
    {
      id: 'mobile', emoji: '🎠', name: { es: 'Móvil de cuna', en: 'Crib mobile' },
      say: { es: 'El móvil de la cuna', en: 'The crib mobile' }, kind: 'loop',
      play(v) { mobileLoop(v); },
    },
    {
      id: 'harpdream', emoji: '☁️', name: { es: 'Arpa de sueños', en: 'Dreamy harp' },
      say: { es: 'El arpa de los sueños', en: 'The dreamy harp' }, kind: 'loop',
      play(v) { harpLoop(v); },
    },
  ],
};
