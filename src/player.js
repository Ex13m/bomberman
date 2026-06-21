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
    // новые секреты:
    shield: false,         // 🛡 переживает один взрыв
    megaNext: false,       // 💥 следующая бомба — гигантский радиус
    magnetT: 0,            // 🧲 притягивает бонусы (сек)
    frozenT: 0,            // ❄ заморожен, не двигается (сек)
    slowT: 0,              // ⏳ замедлен (сек)
    invulnT: 0,            // неуязвимость после срабатывания щита (сек)
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
  // Таймеры секретов тикают всегда.
  p.frozenT = Math.max(0, p.frozenT - dt);
  p.slowT = Math.max(0, p.slowT - dt);
  p.magnetT = Math.max(0, p.magnetT - dt);
  p.invulnT = Math.max(0, p.invulnT - dt);

  if (!p.alive) { p.moving = false; return; }
  if (p.frozenT > 0) { p.moving = false; return; } // ❄ заморожен

  const k = p.keys;
  const dx = (isDown(k.right) ? 1 : 0) - (isDown(k.left) ? 1 : 0);
  const dy = (isDown(k.down) ? 1 : 0) - (isDown(k.up) ? 1 : 0);

  // Направление взгляда (горизонталь приоритетнее при диагонали).
  if (dx > 0) p.dir = 'right';
  else if (dx < 0) p.dir = 'left';
  else if (dy > 0) p.dir = 'down';
  else if (dy < 0) p.dir = 'up';

  if (dx === 0 && dy === 0) { p.moving = false; return; }

  const step = p.speed * (p.slowT > 0 ? 0.45 : 1) * dt;
  let moved = false;
  // Двигаем по осям раздельно — скольжение вдоль стен.
  const nx = p.col + dx * step;
  if (canStand(game, p, nx, p.row)) { p.col = nx; moved = true; }
  const ny = p.row + dy * step;
  if (canStand(game, p, p.col, ny)) { p.row = ny; moved = true; }

  // Авто-выравнивание в коридор: при движении по одной оси мягко тянем игрока
  // к центру дорожки по другой оси, чтобы он сам проскальзывал в проёмы.
  const align = 8 * dt;
  if (dx !== 0 && dy === 0) {
    const target = Math.round(p.row);
    const nr = p.row + Math.sign(target - p.row) * Math.min(align, Math.abs(target - p.row));
    if (canStand(game, p, p.col, nr)) { p.row = nr; if (nr !== p.row) moved = true; }
  } else if (dy !== 0 && dx === 0) {
    const target = Math.round(p.col);
    const nc = p.col + Math.sign(target - p.col) * Math.min(align, Math.abs(target - p.col));
    if (canStand(game, p, nc, p.row)) { p.col = nc; }
  }

  p.moving = moved;
  if (moved) p.walk += dt * 11; // продвигаем walk-cycle
}
