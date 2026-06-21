// Бомбы и взрывы. Логика отделена от рендера.
// Поток: placeBomb → таймер в updateBombs → взрыв крестом → пламя/разрушение/гибель.

import {
  CELL, BOMB_FUSE, FLAME_TIME, COLS, ROWS,
  POWERUP, POWERUP_CHANCE, SECRET_CHANCE, SPEED_STEP, MAX_SPEED,
} from './config.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const R = 0.4; // полуразмер игрока в клетках (для перекрытий)

// Клетка, в которой центр игрока.
function playerCell(p) {
  return { col: Math.floor(p.col + 0.5), row: Math.floor(p.row + 0.5) };
}

// Клетки, которые перекрывает бокс игрока (4 угла).
function corners(p) {
  const cx = p.col + 0.5, cy = p.row + 0.5;
  return [
    [Math.floor(cx - R), Math.floor(cy - R)], [Math.floor(cx + R), Math.floor(cy - R)],
    [Math.floor(cx - R), Math.floor(cy + R)], [Math.floor(cx + R), Math.floor(cy + R)],
  ];
}

function overlapsCell(p, col, row) {
  return corners(p).some(([c, r]) => c === col && r === row);
}

// Бомба на клетке (col,row) или null.
export function bombAt(game, col, row) {
  return game.bombs.find((b) => b.col === col && b.row === row) || null;
}

// Ставит бомбу. Возвращает true, если поставлена (для remote-логики).
export function placeBomb(game, player) {
  if (!player.alive) return false;
  const active = game.bombs.filter((b) => b.owner === player.id).length;
  if (active >= player.maxBombs) return false; // лимит одновременных бомб
  const { col, row } = playerCell(player);
  if (bombAt(game, col, row)) return false; // не больше одной бомбы на клетку
  game.bombs.push({
    col, row,
    fuse: player.remote ? Infinity : BOMB_FUSE, // remote: ждёт ручного подрыва
    range: player.range,
    owner: player.id,
    pass: new Set([player.id]), // кто сейчас может пройти сквозь (стоит на ней)
  });
  game.events.push('place');
  return true;
}

// Секрет Remote: подрывает самую старую живую бомбу игрока.
export function detonateOldest(game, player) {
  const mine = game.bombs.filter((b) => b.owner === player.id);
  if (mine.length) mine[0].fuse = 0;
}

// Бонус выпадает из разрушенного блока. С шансом SECRET_CHANCE — секретный.
function maybeDropPowerup(game, col, row) {
  if (Math.random() > POWERUP_CHANCE) return;
  let type;
  if (Math.random() < SECRET_CHANCE) {
    type = Math.random() < 0.5 ? POWERUP.REMOTE : POWERUP.GHOST;
  } else {
    const t = [POWERUP.BOMB, POWERUP.FIRE, POWERUP.SPEED];
    type = t[Math.floor(Math.random() * t.length)];
  }
  game.powerups.push({ col, row, type });
}

function applyPowerup(p, type) {
  if (type === POWERUP.BOMB) p.maxBombs += 1;
  else if (type === POWERUP.FIRE) p.range += 1;
  else if (type === POWERUP.SPEED) p.speed = Math.min(MAX_SPEED, p.speed + SPEED_STEP);
  else if (type === POWERUP.REMOTE) p.remote = true;
  else if (type === POWERUP.GHOST) p.bombPass = true;
}

// Взрыв: крест из лучей, гаснет на стене, рушит первый блок, детонирует чужие бомбы.
function explode(game, bomb) {
  const cells = [{ col: bomb.col, row: bomb.row }];
  for (const [dc, dr] of DIRS) {
    for (let step = 1; step <= bomb.range; step++) {
      const col = bomb.col + dc * step;
      const row = bomb.row + dr * step;
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS) break;
      const cell = game.grid[row][col];
      if (cell === CELL.WALL) break; // несокрушимая стена гасит луч
      cells.push({ col, row });
      const other = bombAt(game, col, row);
      if (other && other !== bomb) other.fuse = 0; // цепная детонация
      if (cell === CELL.BLOCK) {
        game.grid[row][col] = CELL.FLOOR; // рушим первый блок и стоп
        maybeDropPowerup(game, col, row);
        break;
      }
    }
  }
  for (const c of cells) game.flames.push({ col: c.col, row: c.row, time: FLAME_TIME });
  spawnParticles(game, bomb.col, bomb.row);
  game.events.push('explode');
}

// Осколки-частицы из центра взрыва (чисто визуально).
const SPARK_COLORS = ['#fff3c4', '#ffd54f', '#ff8f3f', '#ff5722'];
function spawnParticles(game, col, row) {
  const cx = col + 0.5, cy = row + 0.5;
  for (let i = 0; i < 14; i++) {
    const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
    const sp = 1.6 + Math.random() * 3.2; // клеток/сек
    game.particles.push({
      x: cx, y: cy,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1,
      life: 0.4 + Math.random() * 0.35,
      max: 0.75,
      size: 2 + Math.random() * 3,
      color: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0],
    });
  }
}

export function updateBombs(game, dt) {
  for (const bomb of game.bombs) bomb.fuse -= dt;

  // Взрываем все дозревшие (включая детонированные цепочкой на этом же кадре).
  for (const bomb of game.bombs.filter((b) => b.fuse <= 0)) explode(game, bomb);
  game.bombs = game.bombs.filter((b) => b.fuse > 0);

  // Игрок сошёл с бомбы — она становится твёрдой и для него.
  for (const bomb of game.bombs) {
    for (const id of [...bomb.pass]) {
      const p = game.players.find((pl) => pl.id === id);
      if (!p || !overlapsCell(p, bomb.col, bomb.row)) bomb.pass.delete(id);
    }
  }

  // Частицы: движение с гравитацией и затухание.
  for (const pt of game.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += 7 * dt; // гравитация в клетках/сек²
    pt.life -= dt;
  }
  game.particles = game.particles.filter((pt) => pt.life > 0);

  // Пламя: таймер и урон.
  for (const f of game.flames) f.time -= dt;
  game.flames = game.flames.filter((f) => f.time > 0);
  const flameKeys = new Set(game.flames.map((f) => `${f.col},${f.row}`));
  for (const p of game.players) {
    if (p.alive && corners(p).some(([c, r]) => flameKeys.has(`${c},${r}`))) {
      p.alive = false;
      game.events.push('death');
    }
  }

  // Пламя сжигает бонусы.
  game.powerups = game.powerups.filter((u) => !flameKeys.has(`${u.col},${u.row}`));

  // Подбор бонусов: игрок встал центром на клетку с бонусом.
  for (const p of game.players) {
    if (!p.alive) continue;
    const { col, row } = playerCell(p);
    const idx = game.powerups.findIndex((u) => u.col === col && u.row === row);
    if (idx >= 0) {
      applyPowerup(p, game.powerups[idx].type);
      game.powerups.splice(idx, 1);
      game.events.push('powerup');
    }
  }
}
