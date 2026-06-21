// Игрок: позиция в клетках (дробная — для плавного движения) и его раскладка.

import { CELL, MOVE_SPEED } from './config.js';
import { cellAt } from './game.js';
import { isDown } from './input.js';

const RADIUS = 0.4; // полуразмер игрока в клетках (для коллизий)

export function createPlayer(def) {
  return {
    id: def.id,
    color: def.color,
    keys: def.keys,
    col: def.spawn.col, // дробная координата по X в клетках
    row: def.spawn.row, // дробная координата по Y в клетках
    alive: true,
  };
}

// Можно ли стоять центром в (col,row): все 4 угла бокса — на проходимой клетке.
function canStand(game, col, row) {
  const cx = col + 0.5, cy = row + 0.5; // центр в клетках
  const corners = [
    [cx - RADIUS, cy - RADIUS], [cx + RADIUS, cy - RADIUS],
    [cx - RADIUS, cy + RADIUS], [cx + RADIUS, cy + RADIUS],
  ];
  for (const [x, y] of corners) {
    if (cellAt(game, Math.floor(x), Math.floor(y)) !== CELL.FLOOR) return false;
  }
  return true;
}

export function updatePlayer(game, p, dt) {
  if (!p.alive) return;
  const k = p.keys;
  let dx = (isDown(k.right) ? 1 : 0) - (isDown(k.left) ? 1 : 0);
  let dy = (isDown(k.down) ? 1 : 0) - (isDown(k.up) ? 1 : 0);
  if (dx === 0 && dy === 0) return;

  const step = MOVE_SPEED * dt;
  // Двигаем по осям раздельно — скольжение вдоль стен.
  const nx = p.col + dx * step;
  if (canStand(game, nx, p.row)) p.col = nx;
  const ny = p.row + dy * step;
  if (canStand(game, p.col, ny)) p.row = ny;
}
