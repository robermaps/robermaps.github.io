// Orejitas · interfaz
import { Engine } from './engine.js';
import { CATEGORIES, EMOJI_15 } from './catalog.js';
import levels from './levels.js';
import { STRINGS, initialLang } from './i18n.js';

const $ = (sel) => document.querySelector(sel);
const store = {
  get(k) { try { return localStorage.getItem(`orejitas:${k}`); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(`orejitas:${k}`, v); } catch { /* modo privado */ } },
};

const TIMER_STEPS = [0, 15, 30, 60]; // minutos (0 = sin límite)
const NIGHT = new Set(['sleep', 'lullabies']);
const THEME = { day: '#FFF4DE', night: '#1A1E45' };

const engine = new Engine({ levels });
const state = {
  lang: initialLang(store.get('lang')),
  voice: store.get('voice') !== 'off',
  cat: pickCategory(),
  playing: null, // { voice, sound }
  timerMin: Number(store.get('timer')) || 0,
  timerEnd: 0,
};

const els = {
  cats: $('#cats'),
  grid: $('#grid'),
  title: $('#catTitle'),
  hint: $('#hint'),
  player: $('#player'),
  playerEmoji: $('#playerEmoji'),
  playerName: $('#playerName'),
  timerBtn: $('#timerBtn'),
  timerLabel: $('#timerLabel'),
  stopBtn: $('#stopBtn'),
  voiceBtn: $('#voiceBtn'),
  toast: $('#toast'),
  theme: document.querySelector('meta[name="theme-color"]'),
};

function pickCategory() {
  const fromHash = location.hash.slice(1);
  if (CATEGORIES.some((c) => c.id === fromHash)) return fromHash;
  const saved = store.get('cat');
  if (CATEGORIES.some((c) => c.id === saved)) return saved;
  return CATEGORIES[0].id;
}

// ¿El sistema dibuja emojis de Emoji 15? (un emoji no soportado sale sin color)
function supportsEmoji(ch) {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 24;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.textBaseline = 'top';
    g.font = '20px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    g.fillText(ch, 0, 0);
    const d = g.getImageData(0, 0, 24, 24).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0 && (Math.abs(d[i] - d[i + 1]) > 20 || Math.abs(d[i + 1] - d[i + 2]) > 20)) return true;
    }
  } catch { /* sin canvas */ }
  return false;
}
if (supportsEmoji('🫏')) {
  for (const c of CATEGORIES) for (const s of c.sounds) if (EMOJI_15[s.id]) s.emoji = EMOJI_15[s.id];
}

const t = (key) => STRINGS[state.lang][key] ?? key;
const label = (obj) => obj[state.lang] ?? obj.es;
const category = () => CATEGORIES.find((c) => c.id === state.cat);

// ---------------------------------------------------------------------------
// Pintado
// ---------------------------------------------------------------------------

function renderStatic() {
  document.documentElement.lang = state.lang;
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  document.querySelector('.brand').setAttribute('aria-label', t('app'));
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
  els.stopBtn.setAttribute('aria-label', t('stop'));
  renderVoiceBtn();
  renderTimer();
}

function renderTabs() {
  els.cats.innerHTML = '';
  for (const c of CATEGORIES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cat';
    b.setAttribute('role', 'tab');
    b.id = `tab-${c.id}`;
    b.dataset.cat = c.id;
    b.setAttribute('aria-selected', String(c.id === state.cat));
    b.tabIndex = c.id === state.cat ? 0 : -1;
    b.innerHTML = `<span class="cat-emoji" aria-hidden="true">${c.emoji}</span><span class="cat-name">${label(c.name)}</span>`;
    els.cats.appendChild(b);
  }
}

function renderGrid() {
  const c = category();
  document.body.dataset.cat = c.id;
  if (els.theme) els.theme.content = NIGHT.has(c.id) ? THEME.night : THEME.day;
  els.title.textContent = label(c.name);
  els.grid.innerHTML = '';
  c.sounds.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card';
    b.dataset.id = s.id;
    b.style.setProperty('--i', i);
    const loop = s.kind === 'loop';
    b.setAttribute('aria-label', label(s.name) + (loop ? ` · ${t('continuous')}` : ''));
    b.innerHTML = `<span class="card-emoji" aria-hidden="true">${s.emoji}</span>` +
      `<span class="card-name" aria-hidden="true">${label(s.name)}</span>` +
      (loop ? `<span class="badge" aria-hidden="true" title="${t('continuous')}">∞</span>` : '');
    els.grid.appendChild(b);
  });
  els.hint.hidden = !NIGHT.has(c.id);
  els.hint.textContent = t('tipSleep');
  markPlaying();
}

function selectCategory(id, { focus = false } = {}) {
  if (id === state.cat) return;
  state.cat = id;
  store.set('cat', id);
  try { history.replaceState(null, '', `#${id}`); } catch { /* entorno aislado */ }
  els.cats.querySelectorAll('.cat').forEach((b) => {
    const on = b.dataset.cat === id;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
    if (on) {
      b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      if (focus) b.focus();
    }
  });
  renderGrid();
  // si se había bajado mucho, volver al principio de la rejilla
  const headerH = document.querySelector('.top').offsetHeight;
  if (window.scrollY > headerH) window.scrollTo({ top: headerH, behavior: 'smooth' });
}

function markPlaying() {
  const id = state.playing?.sound.id;
  els.grid.querySelectorAll('.card').forEach((b) => {
    const on = b.dataset.id === id;
    b.classList.toggle('is-playing', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

function renderPlayer() {
  const p = state.playing;
  const show = p && p.sound.kind === 'loop';
  els.player.hidden = !show;
  if (!show) return;
  els.playerEmoji.textContent = p.sound.emoji;
  els.playerName.textContent = label(p.sound.name);
  renderTimer();
}

function renderTimer() {
  const active = state.timerMin > 0;
  els.timerBtn.classList.toggle('is-active', active);
  let text = '∞';
  if (active && state.timerEnd && state.playing?.sound.kind === 'loop') {
    const left = Math.max(0, Math.round((state.timerEnd - Date.now()) / 1000));
    text = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  } else if (active) {
    text = `${state.timerMin} ${t('minutes')}`;
  }
  els.timerLabel.textContent = text;
  els.timerBtn.setAttribute('aria-label', `${t('timer')}: ${active ? `${state.timerMin} ${t('minutes')}` : t('timerNone')}`);
}

function renderVoiceBtn() {
  els.voiceBtn.setAttribute('aria-pressed', String(state.voice));
  const txt = state.voice ? t('voiceOn') : t('voiceOff');
  els.voiceBtn.setAttribute('aria-label', txt);
  els.voiceBtn.title = txt;
}

// ---------------------------------------------------------------------------
// Reproducción
// ---------------------------------------------------------------------------

function play(sound) {
  const cur = state.playing;
  if (cur && cur.sound.id === sound.id && sound.kind === 'loop') {
    stop(0.5);
    return;
  }
  cancelSpeech();
  const voice = engine.play(sound, { onended: onVoiceEnded });
  state.playing = { voice, sound };
  if (sound.kind === 'loop') armTimer();
  markPlaying();
  renderPlayer();
}

function onVoiceEnded(voice) {
  if (state.playing?.voice !== voice) return; // ya sustituido por otro sonido
  const { sound } = state.playing;
  state.playing = null;
  state.timerEnd = 0;
  markPlaying();
  renderPlayer();
  if (sound.kind === 'shot' && !voice.cancelled) speak(label(sound.say || sound.name));
}

function stop(fade = 0.4) {
  cancelSpeech();
  const p = state.playing;
  if (!p) return;
  p.voice.stop(fade);
}

// Temporizador: el fundido final se programa en el reloj de audio
function armTimer() {
  const p = state.playing;
  if (!p || p.sound.kind !== 'loop') return;
  if (state.timerMin > 0) {
    state.timerEnd = Date.now() + state.timerMin * 60000;
    p.voice.scheduleEnd(p.voice.ctx.currentTime + state.timerMin * 60, 12);
  } else {
    state.timerEnd = 0;
    p.voice.clearScheduledEnd();
  }
  renderTimer();
}

function cycleTimer() {
  const i = TIMER_STEPS.indexOf(state.timerMin);
  state.timerMin = TIMER_STEPS[(i + 1) % TIMER_STEPS.length];
  store.set('timer', String(state.timerMin));
  armTimer();
  toast(`${t('timer')}: ${state.timerMin ? `${state.timerMin} ${t('minutes')}` : t('timerNone')}`);
}

setInterval(() => { if (state.timerEnd) renderTimer(); }, 1000);

// ---------------------------------------------------------------------------
// Voz: dice el nombre del sonido en el idioma elegido
// ---------------------------------------------------------------------------

const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];
function loadVoices() { voices = synth ? synth.getVoices() : []; }
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
  els.voiceBtn.hidden = false;
}

function pickVoice(lang) {
  const prefs = lang === 'es' ? ['es-ES', 'es-MX', 'es-US', 'es'] : ['en-US', 'en-GB', 'en'];
  for (const p of prefs) {
    const v = voices.find((x) => x.lang.replace('_', '-').toLowerCase().startsWith(p.toLowerCase()));
    if (v) return v;
  }
  return null;
}

function speak(text) {
  if (!synth || !state.voice || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = state.lang === 'es' ? 'es-ES' : 'en-US';
  const v = pickVoice(state.lang);
  if (v) u.voice = v;
  u.rate = 0.85;
  u.pitch = 1.15;
  synth.cancel();
  synth.speak(u);
}

function cancelSpeech() { if (synth && (synth.speaking || synth.pending)) synth.cancel(); }

// iOS solo deja hablar si la primera locución nace de un toque: la "desbloqueamos"
let speechUnlocked = false;
function unlockSpeech() {
  if (speechUnlocked || !synth) return;
  speechUnlocked = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  synth.speak(u);
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

els.grid.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const sound = category().sounds.find((s) => s.id === card.dataset.id);
  if (!sound) return;
  play(sound);
  if (state.voice) unlockSpeech();
});

els.cats.addEventListener('click', (e) => {
  const tab = e.target.closest('.cat');
  if (tab) selectCategory(tab.dataset.cat);
});

// Navegación con flechas entre pestañas (patrón ARIA tabs)
els.cats.addEventListener('keydown', (e) => {
  const ids = CATEGORIES.map((c) => c.id);
  let i = ids.indexOf(state.cat);
  if (e.key === 'ArrowRight') i = (i + 1) % ids.length;
  else if (e.key === 'ArrowLeft') i = (i - 1 + ids.length) % ids.length;
  else if (e.key === 'Home') i = 0;
  else if (e.key === 'End') i = ids.length - 1;
  else return;
  e.preventDefault();
  selectCategory(ids[i], { focus: true });
});

document.querySelector('.lang').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-lang]');
  if (!b || b.dataset.lang === state.lang) return;
  state.lang = b.dataset.lang;
  store.set('lang', state.lang);
  cancelSpeech();
  renderStatic();
  renderTabs();
  renderGrid();
  renderPlayer();
});

els.voiceBtn.addEventListener('click', () => {
  state.voice = !state.voice;
  store.set('voice', state.voice ? 'on' : 'off');
  if (!state.voice) cancelSpeech();
  renderVoiceBtn();
  toast(state.voice ? t('voiceOn') : t('voiceOff'));
});

let toastTimer = 0;
function toast(text) {
  els.toast.textContent = text;
  els.toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('is-on'), 1800);
}

// La barra de categorías solo lleva fondo cuando se queda fija arriba
new IntersectionObserver(([entry]) => {
  document.querySelector('.cats-wrap').classList.toggle('is-stuck', !entry.isIntersecting);
}).observe(document.querySelector('.top'));

els.timerBtn.addEventListener('click', cycleTimer);
els.stopBtn.addEventListener('click', () => stop(0.6));

// Evitar el menú contextual al mantener pulsado (peques)
document.addEventListener('contextmenu', (e) => { if (e.target.closest('.card, .cat')) e.preventDefault(); });

window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (CATEGORIES.some((c) => c.id === id)) selectCategory(id);
});

// Si el navegador suspende el audio (p. ej. al volver de otra app), reactivarlo
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && engine.ctx && engine.ctx.state !== 'running' && state.playing) {
    engine.ctx.resume();
  }
});

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

renderStatic();
renderTabs();
renderGrid();
requestAnimationFrame(() => {
  document.getElementById(`tab-${state.cat}`)?.scrollIntoView({ inline: 'center', block: 'nearest' });
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch { /* sin service worker */ }
  });
}
