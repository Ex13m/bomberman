// Игрок: позиция в клетках (дробная — для плавного движения) и его раскладка.

import { CELL, MOVE_SPEED, START_BOMBS, START_RANGE } from './config.js';
import { cellAt } from './game.js';
import { bombAt } from './bomb.js';
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
    maxBombs: START_BOMBS, // одновременных бомб (растёт от бонусов)
    range: START_RANGE,    // радиус взрыва (растёт от бонусов)
    speed: MOVE_SPEED,     // клеток/сек (растёт от бонусов)
    dir: 'down',           // направление взгляда: up|down|left|right
    walk: 0,               // фаза анимации шага
    moving: false,         // двигается ли сейчас (для walk-cycle)
    remote: false,         // секрет: ручной подрыв своих бомб
    bombPass: false,       // секрет: проходить сквозь бомбы (ghost)
  };
}

// Можно ли игроку p стоять центром в (col,row): все 4 угла бокса свободны
// (пол + нет блокирующей бомбы; свою бомбу можно проходить, пока с неё не сошёл).
function canStand(game, p, col, row) {
  const cx = col + 0.5, cy = row + 0.5; // центр в клетках
  const corners = [
    [cx - RADIUS, cy - RADIUS], [cx + RADIUS, cy - RADIUS],
    [cx - RADIUS, cy + RADIUS], [cx + RADIUS, cy + RADIUS],
  ];
  for (const [x, y] of corners) {
    const cc = Math.floor(x), cr = Math.floor(y);
    if (cellAt(game, cc, cr) !== CELL.FLOOR) return false;
    const b = bombAt(game, cc, cr);
    if (b && !b.pass.has(p.id) && !p.bombPass) return false; // ghost проходит сквозь
  }
  return true;
}

export function updatePlayer(game, p, dt) {
  if (!p.alive) { p.moving = false; return; }
  const k = p.keys;
  const dx = (isDown(k.right) ? 1 : 0) - (isDown(k.left) ? 1 : 0);
  const dy = (isDown(k.down) ? 1 : 0) - (isDown(k.up) ? 1 : 0);

  // Направление взгляда (горизонталь приоритетнее при диагонали).
  if (dx > 0) p.dir = 'right';
  else if (dx < 0) p.dir = 'left';
  else if (dy > 0) p.dir = 'down';
  else if (dy < 0) p.dir = 'up';

  if (dx === 0 && dy === 0) { p.moving = false; return; }

  const step = p.speed * dt;
  let moved = false;
  // Двигаем по осям раздельно — скольжение вдоль стен.
  const nx = p.col + dx * step;
  if (canStand(game, p, nx, p.row)) { p.col = nx; moved = true; }
  const ny = p.row + dy * step;
  if (canStand(game, p, p.col, ny)) { p.row = ny; moved = true; }

  p.moving = moved;
  if (moved) p.walk += dt * 11; // продвигаем walk-cycle
}
