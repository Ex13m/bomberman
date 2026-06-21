// Точка входа: 3D-сцена (Three.js) + общая игровая логика.

import { createGame, checkWinner } from './game.js';
import { initInput, consumePress } from './input.js';
import { updatePlayer } from './player.js';
import { placeBomb, updateBombs } from './bomb.js';
import { initScene } from './scene3d.js';
import { updateHud, updateBanner } from './ui.js';
import { initAudio, play } from './audio.js';

const canvas = document.getElementById('game');
const scene = initScene(canvas);

let game = createGame(1);
scene.setGame(game);

function fit() { scene.resize(); }
window.addEventListener('resize', fit);
fit();

initInput();

let audioReady = false;
window.addEventListener('keydown', (e) => {
  if (!audioReady) { audioReady = true; initAudio(); }
  if (e.code === 'KeyR') { game = createGame((Math.random() * 1e9) | 0); scene.setGame(game); }
});

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  update(dt);
  scene.frame(game, now / 1000);
  updateHud(game);
  updateBanner(game);
  requestAnimationFrame(loop);
}

function update(dt) {
  if (game.status !== 'playing') return;
  for (const p of game.players) {
    updatePlayer(game, p, dt);
    if (consumePress(p.keys.bomb)) placeBomb(game, p);
  }
  updateBombs(game, dt);
  checkWinner(game);
  for (const ev of game.events) play(ev);
  game.events.length = 0;
}

requestAnimationFrame(loop);
