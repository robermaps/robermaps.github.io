// Orejitas · categoría: Ruido blanco / White noise
// Sonidos continuos para dormir: estables, sin clics y sin repeticiones
// audibles (cada capa de ruido son dos buffers a distinta velocidad).
import { bed, drift } from './_ambient.js';

// Latido "lub-dub" sobre osciladores continuos (sin crear nodos por latido).
// Devuelve una función que programa un latido en el instante t.
function heart(v, dest, { level = 1, lp = 320, thud = 0.5 } = {}) {
  const o = v.osc('sine', 55);
  const g = v.gain(0);
  // la saturación genera armónicos (110–200 Hz) que sí suenan en un móvil
  v.chain(o, g, v.shaper(2.5), v.lp(lp, 0.8), v.gain(level), dest);
  const ng = v.gain(0);
  v.chain(v.noise('pink'), v.lp(Math.min(lp, 200)), ng, v.gain(level), dest);
  const beat = (t, amp, f0, f1, d) => {
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.014);
    g.gain.setTargetAtTime(0, t + 0.02, d / 4);
    ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(amp * thud * 3, t + 0.01);
    ng.gain.setTargetAtTime(0, t + 0.015, d / 4);
  };
  return (t, T) => {
    beat(t, 1, 62, 42, 0.16); // lub
    beat(t + T * 0.32, 0.72, 74, 50, 0.12); // dub
  };
}

const steady = (color, filters, gain = 0.8) => (v) => {
  v.chain(bed(v, color), ...filters(v), v.gain(gain), v.out);
};

export default {
  id: 'sleep',
  emoji: '🌙',
  name: { es: 'Ruido blanco', en: 'White noise' },
  sounds: [
    {
      id: 'white', emoji: '⚪', name: { es: 'Ruido blanco', en: 'White noise' }, say: { es: 'El ruido blanco', en: 'White noise' },
      kind: 'loop', fadeIn: 2.5,
      // ligeramente suavizado en agudos para que no resulte áspero
      play: steady('white', (v) => [v.hp(40), v.lp(9000, 0.5)]),
    },
    {
      id: 'pink', emoji: '🌸', name: { es: 'Ruido rosa', en: 'Pink noise' }, say: { es: 'El ruido rosa', en: 'Pink noise' },
      kind: 'loop', fadeIn: 2.5,
      play: steady('pink', (v) => [v.hp(30), v.lp(12000, 0.5)]),
    },
    {
      id: 'brown', emoji: '🟤', name: { es: 'Ruido marrón', en: 'Brown noise' }, say: { es: 'El ruido marrón', en: 'Brown noise' },
      kind: 'loop', fadeIn: 2.5,
      play: steady('brown', (v) => [v.hp(28, 0.5), v.lp(2000, 0.5)]),
    },
    {
      id: 'shush', emoji: '🤫', name: { es: 'Shhh', en: 'Shush' }, say: { es: 'Shhh', en: 'Shush' },
      kind: 'loop', fadeIn: 1.5,
      play(v) {
        const pk = v.filter('peaking', 3000, 1.2, 9);
        const g = v.gain(0.12);
        v.chain(bed(v, 'pink', { stereo: false }), v.hp(1400, 0.7), pk, v.lp(7500, 0.6), g, v.out);
        g.gain.setValueAtTime(0.12, v.t0);
        v.loop((t) => {
          const len = v.rand(1.1, 1.5); // duración de cada "shhh"
          const gap = v.rand(0.25, 0.45);
          const peak = v.rand(0.85, 1);
          g.gain.setTargetAtTime(peak, t, 0.09);
          g.gain.setTargetAtTime(peak * 0.8, t + 0.35, 0.3);
          g.gain.setTargetAtTime(0.12, t + len, 0.12);
          pk.frequency.setTargetAtTime(v.rand(2600, 3400), t, 0.2);
          return t + len + gap;
        });
      },
    },
    {
      id: 'heartbeat', emoji: '💓', name: { es: 'Latido', en: 'Heartbeat' }, say: { es: 'El latido', en: 'The heartbeat' },
      kind: 'loop', fadeIn: 1.5,
      play(v) {
        const T = 60 / v.rand(66, 72);
        const beat = heart(v, v.out);
        v.loop((t) => { beat(t, T); return t + T * v.rand(0.98, 1.02); });
      },
    },
    {
      id: 'womb', emoji: '🤰', name: { es: 'Vientre materno', en: 'Womb' }, say: { es: 'El vientre de mamá', en: "Mommy's tummy" },
      kind: 'loop', fadeIn: 3,
      play(v) {
        const T = 60 / v.rand(68, 74);
        // fondo apagado (como oír desde dentro)
        const lp = v.lp(420, 0.7);
        const g = v.gain(0.6);
        v.chain(bed(v, 'brown'), lp, g, v.out);
        drift(v, g.gain, { min: 0.5, max: 0.7, every: [3, 8] });
        // "fiu" del flujo sanguíneo, al ritmo del corazón
        const wbp = v.bp(260, 0.8);
        const wg = v.gain(0.08);
        v.chain(bed(v, 'pink'), wbp, v.lp(600), wg, v.out);
        const beat = heart(v, v.out, { level: 0.55, lp: 170, thud: 0.6 });
        v.loop((t) => {
          beat(t, T);
          wg.gain.setValueAtTime(0.08, t);
          wg.gain.linearRampToValueAtTime(0.4, t + 0.2);
          wg.gain.setTargetAtTime(0.08, t + 0.22, 0.18);
          wbp.frequency.setValueAtTime(240, t);
          wbp.frequency.linearRampToValueAtTime(340, t + 0.2);
          wbp.frequency.setTargetAtTime(240, t + 0.22, 0.2);
          return t + T * v.rand(0.98, 1.02);
        });
      },
    },
    {
      id: 'fan', emoji: '🌀', name: { es: 'Ventilador', en: 'Fan' }, say: { es: 'El ventilador', en: 'The fan' },
      kind: 'loop', fadeIn: 2.5,
      play(v) {
        const lp = v.lp(1400, 0.5);
        const gA = v.gain(0.85);
        v.chain(bed(v, 'pink'), v.hp(60), lp, gA, v.out);
        v.chain(bed(v, 'brown'), v.lp(300), v.gain(0.35), v.out);
        // el ventilador gira despacio hacia ti y se aleja
        v.lfo(0.07, 350, lp.frequency);
        v.lfo(0.07, 0.15, gA.gain);
        // zumbido del motor (red de 50 Hz)
        const hum = v.gain(1);
        hum.connect(v.out);
        v.osc('sine', 100).connect(v.gain(0.02)).connect(hum);
        v.osc('sine', 200).connect(v.gain(0.008)).connect(hum);
      },
    },
    {
      id: 'hairdryer', emoji: '💨', name: { es: 'Secador', en: 'Hair dryer' }, say: { es: 'El secador', en: 'The hair dryer' },
      kind: 'loop', fadeIn: 1.5,
      play(v) {
        v.chain(bed(v, 'white'), v.hp(300), v.filter('peaking', 2200, 0.8, 5), v.lp(7000, 0.6), v.gain(0.6), v.out);
        v.chain(bed(v, 'pink'), v.lp(500), v.gain(0.4), v.out);
        // motor y aspas
        const motor = v.osc('sawtooth', 330);
        v.wobble(motor.frequency, 2, 6);
        v.chain(motor, v.bp(660, 4), v.gain(0.04), v.out);
        const whine = v.osc('sine', 2650);
        v.wobble(whine.frequency, 8, 6);
        v.chain(whine, v.gain(0.012), v.out);
      },
    },
    {
      id: 'vacuum', emoji: '🧹', name: { es: 'Aspiradora', en: 'Vacuum cleaner' }, say: { es: 'La aspiradora', en: 'The vacuum cleaner' },
      kind: 'loop', fadeIn: 1.5,
      play(v) {
        v.chain(bed(v, 'pink'), v.bp(900, 0.5), v.gain(0.9), v.out);
        v.chain(bed(v, 'white'), v.hp(3000), v.lp(7000), v.gain(0.1), v.out);
        v.chain(bed(v, 'brown'), v.lp(200), v.gain(0.3), v.out);
        const motor = v.osc('sawtooth', 470);
        v.wobble(motor.frequency, 2.5, 5);
        v.chain(motor, v.lp(2500), v.gain(0.022), v.out);
        const whine = v.osc('sine', 1880);
        v.wobble(whine.frequency, 10, 5);
        v.chain(whine, v.gain(0.01), v.out);
      },
    },
    {
      id: 'washer', emoji: '🧺', name: { es: 'Lavadora', en: 'Washing machine' }, say: { es: 'La lavadora', en: 'The washing machine' },
      kind: 'loop', fadeIn: 2,
      play(v) {
        // tambor
        v.chain(bed(v, 'brown'), v.lp(300), v.gain(0.25), v.out);
        // motor (sube y baja con cada fase de giro)
        const hum = v.gain(0);
        v.chain(v.osc('sawtooth', 50), v.lp(250), hum, v.out);
        // agua y ropa que cae
        const wbp = v.bp(450, 0.9);
        const wg = v.gain(0.05);
        v.chain(bed(v, 'pink'), wbp, wg, v.out);
        const thud = v.gain(0);
        v.chain(v.noise('brown'), v.lp(160), thud, v.out);
        let phaseEnd = v.t0 + v.rand(8, 12);
        hum.gain.setValueAtTime(0.05, v.t0);
        v.loop((t) => {
          if (t < phaseEnd) {
            const peak = v.rand(0.3, 0.5);
            wg.gain.setTargetAtTime(peak, t, 0.12);
            wg.gain.setTargetAtTime(0.06, t + 0.35, 0.25);
            wbp.frequency.setTargetAtTime(v.rand(300, 650), t, 0.1);
            thud.gain.setTargetAtTime(v.rand(0.25, 0.45), t + 0.3, 0.02);
            thud.gain.setTargetAtTime(0, t + 0.36, 0.08);
            return t + v.rand(1.1, 1.4);
          }
          // pausa y cambio de sentido
          const pause = v.rand(2, 3);
          hum.gain.setTargetAtTime(0.012, t, 0.4);
          hum.gain.setTargetAtTime(0.05, t + pause - 0.3, 0.3);
          wg.gain.setTargetAtTime(0.04, t, 0.3);
          phaseEnd = t + pause + v.rand(8, 12);
          return t + pause;
        });
      },
    },
    {
      id: 'carride', emoji: '🚙', name: { es: 'Viaje en coche', en: 'Car ride' }, say: { es: 'El viaje en coche', en: 'The car ride' },
      kind: 'loop', fadeIn: 2.5,
      play(v) {
        // rodadura y carretera
        v.chain(bed(v, 'brown'), v.lp(350), v.gain(0.6), v.out);
        const tire = v.gain(0.25);
        v.chain(bed(v, 'pink'), v.bp(250, 0.8), tire, v.out);
        drift(v, tire.gain, { min: 0.18, max: 0.3, every: [3, 10] });
        const air = v.gain(0.06);
        v.chain(bed(v, 'pink'), v.bp(1100, 0.6), air, v.out);
        drift(v, air.gain, { min: 0.04, max: 0.08, every: [4, 12] });
        // motor, que sube y baja de vueltas suavemente
        const eng = v.osc('sawtooth', 58);
        drift(v, eng.frequency, { min: 50, max: 68, every: [6, 15] });
        v.chain(eng, v.lp(220), v.gain(0.06), v.out);
        // juntas de la carretera: dos golpecitos suaves (ruedas delanteras y traseras)
        const jg = v.gain(0);
        v.chain(v.noise('brown'), v.lp(170), jg, v.out);
        v.loop((t) => {
          [0, v.rand(0.1, 0.14)].forEach((dt) => {
            jg.gain.setTargetAtTime(0.5, t + dt, 0.006);
            jg.gain.setTargetAtTime(0, t + dt + 0.02, 0.03);
          });
          return t + v.rand(4, 11);
        }, v.t0 + v.rand(2, 5));
      },
    },
    {
      id: 'cabin', emoji: '💺', name: { es: 'Cabina de avión', en: 'Airplane cabin' }, say: { es: 'La cabina del avión', en: 'The airplane cabin' },
      kind: 'loop', fadeIn: 3,
      play(v) {
        const g = v.gain(0.9);
        v.chain(bed(v, 'pink'), v.hp(60), v.lp(900, 0.5), g, v.out);
        drift(v, g.gain, { min: 0.82, max: 0.95, every: [5, 15] });
        v.chain(bed(v, 'brown'), v.lp(250), v.gain(0.4), v.out);
        v.chain(bed(v, 'white'), v.hp(4000), v.lp(8000), v.gain(0.02), v.out);
        // dos motores casi sincronizados: batido lento
        const hum = v.gain(1);
        hum.connect(v.out);
        v.osc('sine', 115).connect(v.gain(0.012)).connect(hum);
        v.osc('sine', 115.4).connect(v.gain(0.012)).connect(hum);
        v.osc('sine', 230).connect(v.gain(0.005)).connect(hum);
      },
    },
  ],
};
