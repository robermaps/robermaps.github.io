// Orejitas · utilidades para máquinas y vehículos (transporte y casa).
// Motores, paso de vehículos con efecto Doppler, campanas golpeadas y agua.

import { sweep } from '../instruments.js';

// Interpola linealmente una lista de puntos [[dt, valor], ...] en dt
export function interp(points, dt) {
  if (dt <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [t1, v1] = points[i];
    if (dt <= t1) {
      const [t0, v0] = points[i - 1];
      return v0 + (v1 - v0) * ((dt - t0) / (t1 - t0 || 1));
    }
  }
  return points[points.length - 1][1];
}

// Muestrea una función f(dt) cada `step` segundos → [[dt, valor], ...]
export function grid(dur, step, f) {
  const pts = [];
  for (let dt = 0; dt < dur; dt += step) pts.push([dt, f(dt)]);
  pts.push([dur, f(dur)]);
  return pts;
}

// Aplica puntos a un parámetro (primer punto fijo, el resto en rampa lineal)
export function apply(param, points, t, k = 1) {
  points.forEach(([dt, val], i) => {
    const at = Math.max(t + dt, 0);
    if (i === 0) param.setValueAtTime(val * k, at);
    else param.linearRampToValueAtTime(val * k, at);
  });
}

// Vehículo que pasa por delante en línea recta. El punto más cercano está en
// `center` (fracción de dur). Devuelve funciones de dt para ganancia (1 en el
// punto más cercano), panorámica, factor Doppler y corte de "distancia".
export function passby(dur, { speed = 20, h = 10, c = 343, center = 0.5, dir = 1, maxPan = 0.85, power = 1 } = {}) {
  const x = (dt) => (dt - dur * center) * speed;
  const d = (dt) => Math.hypot(x(dt), h);
  return {
    gain: (dt) => Math.pow(h / d(dt), power),
    pan: (dt) => (dir * maxPan * x(dt)) / d(dt),
    dop: (dt) => c / (c + (speed * x(dt)) / d(dt)),
    cutoff: (dt, near = 9000, far = 900) => far + (near - far) * Math.pow(h / d(dt), 0.8),
  };
}

// Motor de explosión. fire: [[dt, Hz de encendido], ...]
// Devuelve el nodo de salida (con envolvente de ataque/caída) y el final.
export function motor(v, {
  t = v.t0, dur = 3, fire = [[0, 30]], bright = 7, sub = 0.35, puff = 0.6, drive = 2.2,
  body = 380, q = 2.2, jitter = 25, a = 0.08, r = 0.25, gain = 0.5,
} = {}) {
  const end = t + dur;
  const stop = end + 0.05;
  const sum = v.gain(1);
  const f0 = fire[0][1];

  const saw = v.osc('sawtooth', f0, t, stop);
  apply(saw.frequency, fire, t);
  saw.connect(v.gain(0.6)).connect(sum);

  const half = v.osc('square', f0 / 2, t, stop);
  apply(half.frequency, fire, t, 0.5);
  half.connect(v.gain(sub)).connect(sum);

  // ruido de escape modulado por cada explosión
  const pulse = v.osc('square', f0, t, stop);
  apply(pulse.frequency, fire, t);
  const am = v.gain(0.5);
  pulse.connect(v.gain(0.5)).connect(am.gain);
  v.chain(v.noise('white', { t, stop }), v.lp(2500), am, v.gain(puff * 3), sum);

  if (jitter) {
    const mod = v.gain(1);
    [saw, half, pulse].forEach((o) => mod.connect(o.detune));
    v.wobble(mod, jitter, 7, { t, stop });
  }

  const lp = v.lp(f0 * bright, q);
  apply(lp.frequency, fire.map(([dt, f]) => [dt, Math.min(f * bright, 12000)]), t);
  const env = v.gain(0);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + a);
  env.gain.setValueAtTime(gain, Math.max(t + a, end - r));
  env.gain.linearRampToValueAtTime(0, end);
  v.chain(sum, v.shaper(drive), lp, v.filter('peaking', body, 1.4, 6), env);
  return { out: env, end };
}

// Campana golpeada varias veces (teléfono, despertador, timbre de bici).
// Los parciales oscilan todo el rato y cada golpe reaviva su envolvente:
// muchos golpes con muy pocos nodos.
//  strikes: [[t absoluto, intensidad], ...]
export function strikeBell(v, {
  freq = 1200, partials = [[1, 1, 1], [2.4, 0.4, 0.5], [3.9, 0.15, 0.3]], strikes = [],
  decay = 0.25, gain = 0.3, dest = v.out, detune = 0,
} = {}) {
  if (!strikes.length) return v.t0;
  const t = strikes[0][0];
  const last = strikes[strikes.length - 1][0];
  const end = last + decay * 1.6;
  for (const [ratio, amp, df] of partials) {
    const f = freq * ratio;
    if (f > 16000) continue;
    const o = v.osc('sine', f, t, end + 0.05);
    if (detune) o.detune.value = v.rand(-detune, detune);
    const g = v.gain(0);
    g.gain.setValueAtTime(0, t);
    const tau = (decay * df) / 4;
    for (const [ts, k] of strikes) {
      g.gain.setTargetAtTime(gain * amp * k, ts, 0.0012);
      g.gain.setTargetAtTime(0, ts + 0.006, tau);
    }
    g.gain.setTargetAtTime(0, end - 0.05, 0.01);
    o.connect(g).connect(dest);
  }
  return end;
}

// Burbujas de agua (resonancia de Minnaert: el tono sube mientras se apaga)
export function bubbles(v, { t = v.t0, dur = 2, rate = 30, lo = 300, hi = 1400, gain = 0.12, dest = v.out, spread = 0.4 } = {}) {
  let at = t;
  while (at < t + dur) {
    const f0 = lo * Math.pow(hi / lo, Math.random());
    const d = v.rand(0.015, 0.05);
    sweep(v, { t: at, f0, f1: f0 * v.rand(1.3, 1.9), dur: d, gain: gain * v.rand(0.3, 1), dest, pan: v.rand(-spread, spread) });
    at += -Math.log(1 - Math.random()) / rate;
  }
  return t + dur;
}
