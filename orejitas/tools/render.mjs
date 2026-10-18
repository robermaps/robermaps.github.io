#!/usr/bin/env node
// Orejitas · renderizado y control de calidad de los sonidos.
//
// Renderiza cada receta en Chromium (OfflineAudioContext), mide la sonoridad
// (BS.1770) y escribe ../levels.js con la ganancia que iguala el volumen de
// todos los sonidos. Opcionalmente guarda WAV y espectrogramas (ffmpeg).
//
// Uso (desde la carpeta orejitas/):
//   node tools/render.mjs                 # mide todo y actualiza levels.js
//   node tools/render.mjs farm cow        # solo esas categorías / sonidos
//   node tools/render.mjs --wav --spec    # además WAV + PNG en tools/out/
//   node tools/render.mjs --no-write      # no tocar levels.js
//
// Requisitos: Node 18+, `npm i -g playwright` (o local) y, para --spec, ffmpeg.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outDir = path.join(here, 'out');

// Objetivos de sonoridad (LUFS). Cortos: sonoridad momentánea máxima.
// Continuos: sonoridad integrada, algo más baja (pensados para dormir).
const TARGET_SHOT = -17;
const TARGET_LOOP = -23;
const MAX_GAIN = 12;

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const filters = args.filter((a) => !a.startsWith('--'));

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = ['playwright', 'playwright-core'];
  try {
    const globalRoot = execFileSync('npm', ['root', '-g']).toString().trim();
    candidates.push(path.join(globalRoot, 'playwright'));
  } catch { /* sin npm global */ }
  for (const c of candidates) {
    try { return require(c); } catch { /* siguiente */ }
  }
  throw new Error('No encuentro Playwright. Instálalo con: npm i -g playwright');
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const server = await serve();
const port = server.address().port;
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://127.0.0.1:${port}/tools/qc.html`);
await page.waitForFunction(() => window.qcReady === true, null, { timeout: 15000 }).catch(() => {});
if (errors.length) { console.error(errors.join('\n')); }

const list = await page.evaluate(() => window.qc.list());
const selected = filters.length ? list.filter((s) => filters.includes(s.id) || filters.includes(s.cat)) : list;
if (flags.has('--wav') || flags.has('--spec')) fs.mkdirSync(outDir, { recursive: true });

const levelsPath = path.join(root, 'levels.js');
let levels = {};
if (fs.existsSync(levelsPath)) {
  const txt = fs.readFileSync(levelsPath, 'utf8');
  const json = txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
  try { levels = JSON.parse(json); } catch { levels = {}; }
}

const rows = [];
for (const s of selected) {
  let r;
  try {
    r = await page.evaluate(([id, wav]) => window.qc.render(id, { wav }), [s.id, flags.has('--wav') || flags.has('--spec')]);
  } catch (e) {
    console.error(`✗ ${s.id}: ${e.message.split('\n')[0]}`);
    rows.push({ ...s, error: true });
    continue;
  }
  const measure = r.kind === 'loop' ? r.integrated : r.maxM;
  const target = r.kind === 'loop' ? TARGET_LOOP : TARGET_SHOT;
  let gain = Math.pow(10, (target - measure) / 20);
  gain = Math.min(gain, MAX_GAIN);
  if (measure > -69) levels[s.id] = Math.round(gain * 1000) / 1000;
  const after = r.peakDb + 20 * Math.log10(gain);
  rows.push({ ...r, gain, after });
  if (r.wav) {
    const wavPath = path.join(outDir, `${s.cat}-${s.id}.wav`);
    fs.writeFileSync(wavPath, Buffer.from(r.wav, 'base64'));
    if (flags.has('--spec')) {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, '-lavfi',
        'showspectrumpic=s=900x360:legend=1:scale=log:fscale=lin:stop=8000:drange=75', path.join(outDir, `${s.cat}-${s.id}.png`)]);
    }
  }
  const warn = [];
  if (r.nan) warn.push(`NaN×${r.nan}`);
  if (measure < -60) warn.push('¿silencio?');
  if (gain >= MAX_GAIN) warn.push('muy flojo');
  if (after > 3) warn.push(`pico +${after.toFixed(1)} dB tras ganancia`);
  console.log(`${warn.length ? '!' : '✓'} ${s.cat.padEnd(10)} ${s.id.padEnd(14)} ${String(r.kind).padEnd(5)} ` +
    `I ${r.integrated.toFixed(1).padStart(6)}  M ${r.maxM.toFixed(1).padStart(6)}  pico ${r.peakDb.toFixed(1).padStart(5)} dB  ` +
    `${r.dur ? (r.dur.toFixed(2) + ' s').padStart(8) : '   bucle'}  ${String(r.ms).padStart(5)} ms  gan ${gain.toFixed(2)}  ${warn.join(' ')}`);
}

if (!flags.has('--no-write')) {
  const known = new Set(list.map((s) => s.id));
  const clean = Object.fromEntries(Object.entries(levels).filter(([k]) => known.has(k)).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(levelsPath, `// Generado por tools/render.mjs: ganancia de cada sonido para igualar el volumen.\n// No editar a mano; vuelve a ejecutar la herramienta tras cambiar una receta.\nexport default ${JSON.stringify(clean, null, 2)};\n`);
  console.log(`\nlevels.js actualizado (${Object.keys(clean).length} sonidos).`);
}
if (errors.length) console.log(`\nErrores en la página:\n${errors.join('\n')}`);
await browser.close();
server.close();
