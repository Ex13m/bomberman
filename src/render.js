// Отрисовка состояния игры на canvas. Только рисует — не меняет состояние.

import { TILE, COLS, ROWS, CELL } from './config.js';

const COLORS = {
  [CELL.FLOOR]: '#2c2f36',
  [CELL.WALL]: '#5a5f6b',
  [CELL.BLOCK]: '#8d6e63',
};

export function render(ctx, game) {
  ctx.clearRect(0, 0, COLS * TILE, ROWS * TILE);

  // Сетка
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = game.grid[row][col];
      ctx.fillStyle = COLORS[cell];
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      if (cell === CELL.BLOCK) {
        ctx.strokeStyle = '#5d4037';
        ctx.strokeRect(col * TILE + 3, row * TILE + 3, TILE - 6, TILE - 6);
      }
    }
  }

  // Игроки
  for (const p of game.players) {
    if (!p.alive) continue;
    const cx = (p.col + 0.5) * TILE;
    const cy = (p.row + 0.5) * TILE;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0008';
    ctx.font = `${TILE * 0.4}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(p.id), cx, cy);
  }
}
