// Orejitas · textos de la interfaz (los nombres de los sonidos están en sounds/)

export const LANGS = ['es', 'en'];

export const STRINGS = {
  es: {
    app: 'Orejitas',
    title: 'Orejitas · Sonidos para bebés',
    tagline: 'Sonidos para bebés y peques',
    categories: 'Categorías',
    language: 'Idioma',
    voiceOn: 'Decir el nombre del sonido: activado',
    voiceOff: 'Decir el nombre del sonido: desactivado',
    stop: 'Parar',
    timer: 'Temporizador de apagado',
    timerNone: 'Sin límite',
    minutes: 'min',
    continuous: 'Sonido continuo',
    playing: 'Sonando',
    tipSleep: 'Consejo: volumen bajo y el móvil lejos de la cuna.',
    footer: 'Hecho con cariño por',
    footerNote: 'Sin anuncios · Funciona sin conexión',
  },
  en: {
    app: 'Little Ears',
    title: 'Little Ears · Sounds for babies',
    tagline: 'Sounds for babies and toddlers',
    categories: 'Categories',
    language: 'Language',
    voiceOn: 'Say the sound’s name: on',
    voiceOff: 'Say the sound’s name: off',
    stop: 'Stop',
    timer: 'Sleep timer',
    timerNone: 'No limit',
    minutes: 'min',
    continuous: 'Continuous sound',
    playing: 'Playing',
    tipSleep: 'Tip: keep the volume low and the phone away from the crib.',
    footer: 'Made with love by',
    footerNote: 'No ads · Works offline',
  },
};

// Idioma inicial: guardado > parámetro ?lang= > idioma del navegador
export function initialLang(saved) {
  const param = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(param)) return param;
  if (LANGS.includes(saved)) return saved;
  const nav = (navigator.languages || [navigator.language || 'es']).map((l) => l.toLowerCase());
  for (const l of nav) {
    if (l.startsWith('es')) return 'es';
    if (l.startsWith('en')) return 'en';
  }
  return 'es';
}
