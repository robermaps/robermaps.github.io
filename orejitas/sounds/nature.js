// Orejitas · categoría: Naturaleza / Nature
import { bed, drift, mod, above, rain, thunderAt, birdPhrase, cuckoo, woodpecker, cricket, frogAt, owlAt, drop } from './_ambient.js';
import { sweep } from '../instruments.js';

export default {
  id: 'nature',
  emoji: '🌳',
  name: { es: 'Naturaleza', en: 'Nature' },
  sounds: [
    {
      id: 'rain', emoji: '🌧️', name: { es: 'Lluvia', en: 'Rain' }, say: { es: 'La lluvia', en: 'The rain' },
      kind: 'loop', fadeIn: 2,
      play(v) {
        rain(v, { intensity: 1 });
      },
    },
    {
      id: 'storm', emoji: '⛈️', name: { es: 'Tormenta', en: 'Storm' }, say: { es: 'La tormenta', en: 'The storm' },
      kind: 'loop', fadeIn: 2,
      play(v) {
        rain(v, { intensity: 1.5 });
        // ráfagas de viento suaves
        const gust = v.constant(0.4);
        drift(v, gust.offset, { min: 0.1, max: 0.8, every: [2, 6] });
        const wbp = v.bp(400, 1.2);
        const wg = v.gain(0);
        v.chain(bed(v, 'pink'), wbp, wg, v.out);
        mod(v, gust, wg.gain, 0.35);
        mod(v, gust, wbp.frequency, 500);
        // truenos lejanos de vez en cuando
        v.loop((t) => {
          const end = thunderAt(v, t + v.rand(2, 6), { dist: v.rand(0.55, 1), level: v.rand(0.9, 1.4) });
          return end + v.rand(4, 12);
        });
      },
    },
    {
      id: 'waves', emoji: '🌊', name: { es: 'Olas del mar', en: 'Ocean waves' }, say: { es: 'Las olas del mar', en: 'The ocean waves' },
      kind: 'loop', fadeIn: 2,
      play(v) {
        // resaca lejana constante
        const surfG = v.gain(0.22);
        v.chain(bed(v, 'brown'), v.lp(350), surfG, v.out);
        drift(v, surfG.gain, { min: 0.15, max: 0.3, every: [3, 9] });
        v.chain(bed(v, 'pink'), v.bp(800, 0.5), v.gain(0.02), v.out);
        // cada ola: se forma, rompe y la espuma se retira
        v.loop((t) => {
          const P = v.rand(6.5, 10.5);
          const D = P + v.rand(2, 4);
          const end = t + D;
          const crest = t + P * v.rand(0.35, 0.5);
          const peak = v.rand(0.6, 1);
          const pn = v.pan(v.rand(-0.35, 0.35));
          pn.connect(v.out);
          // cuerpo de la ola
          const lp = v.lp(250, 0.5);
          lp.frequency.setValueAtTime(250, t);
          lp.frequency.exponentialRampToValueAtTime(v.rand(2500, 4000), crest);
          lp.frequency.exponentialRampToValueAtTime(450, end);
          const g = v.gain(0);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(peak * 0.3, t + (crest - t) * 0.6);
          g.gain.linearRampToValueAtTime(peak, crest);
          g.gain.setTargetAtTime(0, crest + 0.2, (end - crest) / 4);
          v.chain(v.noise('pink', { t, stop: end + 0.1, stereo: true }), lp, g, pn);
          // espuma que se retira
          const fg = v.gain(0);
          fg.gain.setValueAtTime(0, crest);
          fg.gain.linearRampToValueAtTime(peak * 0.22, crest + 0.6);
          fg.gain.setTargetAtTime(0, crest + 0.8, (end - crest) / 3);
          v.chain(v.noise('white', { t: crest, stop: end + 0.1, stereo: true }), v.hp(2500, 0.5), v.lp(7000), fg, pn);
          // burbujas de la espuma
          const bg = v.gain(0);
          bg.gain.setValueAtTime(0, crest);
          bg.gain.linearRampToValueAtTime(peak * 1.6, crest + 0.7);
          bg.gain.setTargetAtTime(0, crest + 0.9, (end - crest) / 3);
          v.chain(v.dust(220, { t: crest, stop: end + 0.1, stereo: true }), v.bp(4500, 1), bg, pn);
          return t + P;
        });
      },
    },
    {
      id: 'river', emoji: '🏞️', name: { es: 'Río', en: 'Stream' }, say: { es: 'El río', en: 'The stream' },
      kind: 'loop', fadeIn: 2,
      play(v) {
        // corriente de fondo
        const bp1 = v.bp(1100, 0.5);
        const g1 = v.gain(0.7);
        v.chain(bed(v, 'pink'), v.hp(250), bp1, g1, v.out);
        drift(v, bp1.frequency, { min: 800, max: 1500, every: [1, 4] });
        drift(v, g1.gain, { min: 0.55, max: 0.8, every: [0.5, 2] });
        // brillo del agua
        const g2 = v.gain(0.1);
        v.chain(bed(v, 'white'), v.hp(3000), v.lp(8000), g2, v.out);
        drift(v, g2.gain, { min: 0.05, max: 0.13, every: [0.3, 1.5] });
        // borboteo: impulsos en resonadores cuya afinación se mueve deprisa
        for (let k = 0; k < 5; k++) {
          const r = v.bp(v.rand(500, 1600), 18);
          v.chain(v.dust(v.rand(10, 18)), r, v.gain(28), v.pan(v.rand(-0.7, 0.7)), v.out);
          drift(v, r.frequency, { min: 400, max: 1800, every: [0.08, 0.35], smooth: 0.5 });
        }
        // burbujas sueltas
        v.loop((t) => {
          sweep(v, { t, f0: v.rand(300, 700), f1: v.rand(900, 2000), dur: v.rand(0.03, 0.08), gain: v.rand(0.03, 0.08), pan: v.rand(-0.7, 0.7) });
          return t + v.rand(0.1, 0.55);
        });
      },
    },
    {
      id: 'wind', emoji: '🌬️', name: { es: 'Viento', en: 'Wind' }, say: { es: 'El viento', en: 'The wind' },
      kind: 'loop', fadeIn: 2.5,
      play(v) {
        // una sola señal de "ráfaga" controla todas las capas
        const gust = v.constant(0.5);
        drift(v, gust.offset, { min: 0.12, max: 1, every: [1.5, 5], smooth: 0.45 });
        // capa grave
        const bp1 = v.bp(300, 1.2);
        const g1 = v.gain(0.05);
        v.chain(bed(v, 'pink'), bp1, g1, v.out);
        mod(v, gust, g1.gain, 0.9);
        mod(v, gust, bp1.frequency, 450);
        // capa media
        const bp2 = v.bp(650, 2);
        const g2 = v.gain(0.02);
        v.chain(bed(v, 'pink'), bp2, g2, v.out);
        mod(v, gust, g2.gain, 0.5);
        mod(v, gust, bp2.frequency, 700);
        drift(v, bp2.Q, { min: 1.2, max: 3, every: [2, 6] });
        // silbido: solo en las ráfagas fuertes
        const wbp = v.bp(900, 22);
        const wg = v.gain(0);
        v.chain(v.noise('white'), wbp, wg, v.pan(0.3), v.out);
        v.chain(gust, above(v, 0.5, 2), v.gain(1.4), wg.gain);
        mod(v, gust, wbp.frequency, 500);
        drift(v, wbp.frequency, { min: 650, max: 1000, every: [3, 8] });
        // retumbo
        const g4 = v.gain(0);
        v.chain(bed(v, 'brown'), v.lp(200), g4, v.out);
        mod(v, gust, g4.gain, 0.4);
        // hojas
        const g5 = v.gain(0);
        v.chain(bed(v, 'pink'), v.hp(2500), v.lp(8000), g5, v.out);
        mod(v, gust, g5.gain, 0.12);
      },
    },
    {
      id: 'fire', emoji: '🔥', name: { es: 'Chimenea', en: 'Fireplace' }, say: { es: 'La chimenea', en: 'The fireplace' },
      kind: 'loop', fadeIn: 2,
      play(v) {
        // rugido del fuego
        const gR = v.gain(0.8);
        v.chain(bed(v, 'brown'), v.lp(300), gR, v.out);
        drift(v, gR.gain, { min: 0.6, max: 1, every: [0.5, 2] });
        const gM = v.gain(0.15);
        v.chain(bed(v, 'pink'), v.bp(500, 0.7), gM, v.out);
        drift(v, gM.gain, { min: 0.1, max: 0.2, every: [0.4, 1.5] });
        const gH = v.gain(0.05);
        v.chain(bed(v, 'pink'), v.hp(2000), v.lp(7000), gH, v.out);
        drift(v, gH.gain, { min: 0.03, max: 0.07, every: [0.5, 2] });
        // crepitar en rachas
        const gC = v.gain(2);
        v.chain(v.dust(40, { stereo: true, grain: 0.0012 }), v.hp(1200), v.lp(6000), gC, v.out);
        drift(v, gC.gain, { min: 0.4, max: 2.2, every: [0.15, 1.2], smooth: 0.3 });
        // chasquidos y estallidos de la madera
        v.chain(v.dust(5, { stereo: true, grain: 0.004 }), v.bp(2200, 0.8), v.gain(4), v.out);
        v.chain(v.dust(1.5, { grain: 0.01 }), v.bp(700, 1.5), v.gain(7), v.pan(-0.2), v.out);
      },
    },
    {
      id: 'forest', emoji: '🌲', name: { es: 'Bosque', en: 'Forest' }, say: { es: 'El bosque', en: 'The forest' },
      kind: 'loop', fadeIn: 2,
      play(v) {
        // brisa y hojas
        const gW = v.gain(0.12);
        const wbp = v.bp(500, 0.8);
        v.chain(bed(v, 'pink'), wbp, gW, v.out);
        drift(v, gW.gain, { min: 0.06, max: 0.16, every: [2, 6] });
        drift(v, wbp.frequency, { min: 350, max: 750, every: [3, 8] });
        const gL = v.gain(0.04);
        v.chain(bed(v, 'pink'), v.hp(1800), v.lp(6500), gL, v.out);
        drift(v, gL.gain, { min: 0.015, max: 0.06, every: [0.5, 3] });
        // pájaro cercano
        v.loop((t) => birdPhrase(v, t, { pan: v.rand(-0.8, 0.8), level: v.rand(0.15, 0.3) }) + v.rand(0.8, 4.5),
          v.t0 + v.rand(0.3, 1.5));
        // pájaros lejanos y visitantes ocasionales
        v.loop((t) => {
          const r = Math.random();
          let end;
          if (r < 0.12) end = cuckoo(v, t, { pan: v.rand(-0.9, 0.9), level: 0.12 });
          else if (r < 0.2) end = woodpecker(v, t, { pan: v.rand(-0.9, 0.9), level: 0.2 });
          else end = birdPhrase(v, t, { pan: v.rand(-1, 1), level: v.rand(0.05, 0.1) });
          return end + v.rand(2, 7);
        }, v.t0 + v.rand(2, 4));
      },
    },
    {
      id: 'night', emoji: '🌌', name: { es: 'Noche', en: 'Night' }, say: { es: 'La noche', en: 'The night' },
      kind: 'loop', fadeIn: 2,
      play(v) {
        // aire nocturno
        v.chain(bed(v, 'pink'), v.lp(700), v.gain(0.035), v.out);
        v.chain(bed(v, 'brown'), v.lp(200), v.gain(0.05), v.out);
        // grillos a distintas distancias
        cricket(v, v.out, { freq: v.rand(4300, 4600), pan: -0.45, rate: v.rand(1.5, 1.9), pulses: 3, level: 0.15 });
        cricket(v, v.out, { freq: v.rand(3900, 4200), pan: 0.5, rate: v.rand(2, 2.4), pulses: 4, level: 0.11 });
        cricket(v, v.out, { freq: v.rand(4700, 5000), pan: 0.05, rate: v.rand(1.2, 1.5), pulses: 3, level: 0.06 });
        // ranas
        v.loop((t) => frogAt(v, t, { pan: v.rand(-0.7, 0.7), level: v.rand(0.25, 0.4) }) + v.rand(3, 10), v.t0 + v.rand(1, 4));
        // búho de vez en cuando
        v.loop((t) => owlAt(v, t, { pan: v.rand(-0.8, 0.8), level: 0.12 }) + v.rand(14, 30), v.t0 + v.rand(5, 12));
      },
    },
    {
      id: 'thunder', emoji: '⚡', name: { es: 'Trueno', en: 'Thunder' }, say: { es: 'El trueno', en: 'The thunder' },
      kind: 'shot',
      play(v) {
        // lluvia ligera de fondo durante el trueno
        const D = v.rand(6, 8);
        const rg = v.gain(0);
        rg.gain.setValueAtTime(0, v.t0);
        rg.gain.linearRampToValueAtTime(0.12, v.t0 + 0.8);
        rg.gain.setValueAtTime(0.12, v.t0 + D - 1.5);
        rg.gain.linearRampToValueAtTime(0, v.t0 + D);
        v.chain(v.noise('pink', { stereo: true, stop: v.t0 + D + 0.1 }), v.hp(500), v.lp(6000), rg, v.out);
        thunderAt(v, v.t0 + 0.3, { dist: v.rand(0.35, 0.55), dur: D - 0.3, level: 1 });
        return v.t0 + D;
      },
    },
    {
      id: 'drips', emoji: '💧', name: { es: 'Gotas de agua', en: 'Water drops' }, say: { es: 'Las gotas de agua', en: 'The water drops' },
      kind: 'loop', fadeIn: 1.5,
      play(v) {
        // ambiente de cueva
        v.chain(bed(v, 'brown'), v.lp(250), v.gain(0.12), v.out);
        v.chain(bed(v, 'pink'), v.bp(600, 0.5), v.gain(0.015), v.out);
        // tres goteras con su propio ritmo y altura
        for (let k = 0; k < 3; k++) {
          const period = v.rand(0.8, 2.6);
          const f = v.rand(500, 1200);
          const pan = v.rand(-0.8, 0.8);
          const lvl = v.rand(0.12, 0.25);
          v.loop((t) => {
            drop(v, t, { f: f * v.rand(0.95, 1.05), pan, level: lvl * v.rand(0.8, 1), reverb: 0.6 });
            if (v.chance(0.12)) drop(v, t + v.rand(0.04, 0.09), { f: f * v.rand(1.3, 1.7), pan, level: lvl * 0.5, reverb: 0.6 });
            return t + period * v.rand(0.88, 1.12);
          }, v.t0 + v.rand(0.1, 1.5));
        }
      },
    },
  ],
};
