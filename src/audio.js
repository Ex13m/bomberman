// Звук на Web Audio API. Файлы лежат в assets/sfx/ (генерируются Higgsfield).
// Если файла нет — игра просто работает без этого звука (graceful degradation).

const FILES = {
  place: './assets/sfx/place.mp3',
  explode: './assets/sfx/explode.mp3',
  powerup: './assets/sfx/powerup.mp3',
  death: './assets/sfx/death.mp3',
  win: './assets/sfx/win.mp3',
};

let ctx = null;
const buffers = {};
let enabled = true;

// Вызывать после первого пользовательского жеста (иначе AudioContext заблокирован).
export async function initAudio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') await ctx.resume();
  await Promise.all(Object.entries(FILES).map(async ([key, url]) => {
    if (buffers[key]) return;
    try {
      const res = await fetch(url);
      if (!res.ok) return; // файла ещё нет — пропускаем
      buffers[key] = await ctx.decodeAudioData(await res.arrayBuffer());
    } catch {
      /* нет файла / ошибка декодирования — играем без этого звука */
    }
  }));
}

export function play(name) {
  if (!enabled || !ctx || !buffers[name]) return;
  const src = ctx.createBufferSource();
  src.buffer = buffers[name];
  src.connect(ctx.destination);
  src.start();
}

export function toggleSound() {
  enabled = !enabled;
  return enabled;
}
