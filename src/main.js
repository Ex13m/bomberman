// Точка входа: настраивает canvas, запускает игровой цикл, связывает модули.

import { TILE, COLS, ROWS } from './config.js';
import { createGame } from './game.js';
import { initInput } from './input.js';
import { updatePlayer } from './player.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;
const ctx = canvas.getContext('2d');

let game = createGame(1);
initInput();

// Рестарт по R
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') game = createGame((Math.random() * 1e9) | 0);
});

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05); // сек, с защитой от «прыжка»
  last = now;

  update(dt);
  render(ctx, game);
  requestAnimationFrame(loop);
}

// Шаг симуляции. Бомбы/взрывы добавляются следующими инкрементами.
function update(dt) {
  if (game.status !== 'playing') return;
  for (const p of game.players) updatePlayer(game, p, dt);
}

requestAnimationFrame(loop);
