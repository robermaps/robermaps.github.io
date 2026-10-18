// Orejitas · catálogo: categorías y sonidos.
// Cada módulo de sounds/ exporta { id, emoji, name: {es, en}, sounds: [...] }.
// Cada sonido: { id, emoji, name: {es, en}, say?: {es, en}, kind: 'shot'|'loop',
//   play(v) } o bien { src: 'archivo.mp3' }. En los 'shot', play(v) devuelve el
//   instante final (tiempo de audio absoluto, como los instrumentos).
import farm from './sounds/farm.js';
import wild from './sounds/wild.js';
import nature from './sounds/nature.js';
import sleep from './sounds/sleep.js';
import transport from './sounds/transport.js';
import home from './sounds/home.js';
import toys from './sounds/toys.js';
import music from './sounds/music.js';
import lullabies from './sounds/lullabies.js';

export const CATEGORIES = [farm, wild, nature, sleep, transport, home, toys, music, lullabies];

export const SOUNDS = new Map();
for (const c of CATEGORIES) for (const s of c.sounds) SOUNDS.set(s.id, s);
