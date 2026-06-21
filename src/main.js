// Точка входа: настраивает canvas, запускает игровой цикл, связывает модули.

import { TILE, COLS, ROWS } from './config.js';
import { createGame, checkWinner } from './game.js';
import { initInput, consumePress } from './input.js';
import { updatePlayer } from './player.js';
import { placeBomb, updateBombs } from './bomb.js';
import { render, updateHud } from './render.js';
import { initAudio, play } from './audio.js';

const canvas = document.getElementById('game');
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;
const ctx = canvas.getContext('2d');

let game = createGame(1);
initInput();

// Звук стартует только после первого жеста (политика автоплея браузеров).
let audioReady = false;
window.addEventListener('keydown', (e) => {
  if (!audioReady) { audioReady = true; initAudio(); }
  if (e.code === 'KeyR') game = createGame((Math.random() * 1e9) | 0);
});

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05); // сек, с защитой от «прыжка»
  last = now;

  update(dt);
  render(ctx, game);
  updateHud(game);
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

  // Озвучиваем накопленные события и очищаем очередь.
  for (const ev of game.events) play(ev);
  game.events.length = 0;
}

requestAnimationFrame(loop);
