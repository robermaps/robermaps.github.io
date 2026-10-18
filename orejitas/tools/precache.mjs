#!/usr/bin/env node
// Regenera la lista de archivos y la versión del service worker (sw.js).
// Uso (desde orejitas/): node tools/precache.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skip = new Set(['tools', 'sw.js', 'README.md', 'icons/og.png', 'fonts/OFL.txt']);
const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (skip.has(rel) || name.startsWith('.')) continue;
    if (fs.statSync(full).isDirectory()) walk(full);
    else files.push(rel);
  }
})(root);

const hash = crypto.createHash('sha256');
for (const f of files) hash.update(f).update(fs.readFileSync(path.join(root, f)));
const version = hash.digest('hex').slice(0, 10);
const assets = ['./', ...files.filter((f) => f !== 'index.html')];

const swPath = path.join(root, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
sw = sw.replace(/const ASSETS = \[[\s\S]*?\];/, `const ASSETS = [\n${assets.map((a) => `  '${a}',`).join('\n')}\n];`);
fs.writeFileSync(swPath, sw);
console.log(`sw.js: versión ${version}, ${assets.length} archivos`);
