// Бомбы и взрывы. Логика отделена от рендера.
// Поток: placeBomb → таймер в updateBombs → взрыв крестом → пламя/разрушение/гибель.

import {
  CELL, BOMB_FUSE, FLAME_TIME, COLS, ROWS,
  POWERUP, POWERUP_CHANCE, SECRET_CHANCE, SECRETS, SPEED_STEP, MAX_SPEED,
  MAGNET_TIME, MAGNET_RADIUS, FREEZE_TIME, TIMEWARP_TIME, INVULN_TIME,
  BOMBRAIN_COUNT, QUAKE_RADIUS, MEGA_RANGE,
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
    range: player.megaNext ? MEGA_RANGE : player.range, // 💥 мега-бомба на всю линию
    owner: player.id,
    pass: new Set([player.id]), // кто сейчас может пройти сквозь (стоит на ней)
  });
  player.megaNext = false;
  game.events.push('place');
  return true;
}

// Секрет Remote: подрывает самую старую живую бомбу игрока.
export function detonateOldest(game, player) {
  const mine = game.bombs.filter((b) => b.owner === player.id);
  if (mine.length) mine[0].fuse = 0;
}

// Бонус выпадает из разрушенного блока. С шансом SECRET_CHANCE — секретный (из пула).
function maybeDropPowerup(game, col, row) {
  if (Math.random() > POWERUP_CHANCE) return;
  let type;
  if (Math.random() < SECRET_CHANCE) {
    type = SECRETS[(Math.random() * SECRETS.length) | 0];
  } else {
    const t = [POWERUP.BOMB, POWERUP.FIRE, POWERUP.SPEED];
    type = t[(Math.random() * t.length) | 0];
  }
  game.powerups.push({ col, row, type });
}

// Свободные клетки пола без бомб (для телепорта / ливня бомб).
function freeCells(game) {
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (game.grid[r][c] === CELL.FLOOR && !bombAt(game, c, r)) out.push({ col: c, row: r });
    }
  }
  return out;
}

const others = (game, p) => game.players.filter((o) => o !== p && o.alive);

function applyPowerup(game, p, type) {
  switch (type) {
    // обычные
    case POWERUP.BOMB: p.maxBombs += 1; break;
    case POWERUP.FIRE: p.range += 1; break;
    case POWERUP.SPEED: p.speed = Math.min(MAX_SPEED, p.speed + SPEED_STEP); break;
    // ранее добавленные секреты
    case POWERUP.REMOTE: p.remote = true; break;
    case POWERUP.GHOST: p.bombPass = true; break;
    // 10 новых секретов
    case POWERUP.SHIELD: p.shield = true; break;
    case POWERUP.MAGNET: p.magnetT = MAGNET_TIME; break;
    case POWERUP.MEGA: p.megaNext = true; break;
    case POWERUP.JACKPOT:
      p.maxBombs += 2; p.range += 2;
      p.speed = Math.min(MAX_SPEED, p.speed + 1.2);
      break;
    case POWERUP.FREEZE: others(game, p).forEach((o) => { o.frozenT = FREEZE_TIME; }); break;
    case POWERUP.TIMEWARP: others(game, p).forEach((o) => { o.slowT = TIMEWARP_TIME; }); break;
    case POWERUP.TELEPORT: {
      const f = freeCells(game);
      if (f.length) { const c = f[(Math.random() * f.length) | 0]; p.col = c.col; p.row = c.row; }
      break;
    }
    case POWERUP.SWAP: {
      const o = others(game, p)[0];
      if (o) { const c = p.col, r = p.row; p.col = o.col; p.row = o.row; o.col = c; o.row = r; }
      break;
    }
    case POWERUP.BOMBRAIN: {
      const f = freeCells(game);
      for (let i = f.length - 1; i > 0; i--) { // перемешать
        const j = (Math.random() * (i + 1)) | 0; [f[i], f[j]] = [f[j], f[i]];
      }
      for (const c of f.slice(0, BOMBRAIN_COUNT)) {
        game.bombs.push({ col: c.col, row: c.row, fuse: BOMB_FUSE, range: 2, owner: p.id, pass: new Set() });
      }
      break;
    }
    case POWERUP.QUAKE: {
      const { col, row } = playerCell(p);
      for (let dr = -QUAKE_RADIUS; dr <= QUAKE_RADIUS; dr++) {
        for (let dc = -QUAKE_RADIUS; dc <= QUAKE_RADIUS; dc++) {
          const c = col + dc, r = row + dr;
          if (c >= 0 && r >= 0 && c < COLS && r < ROWS && game.grid[r][c] === CELL.BLOCK) {
            game.grid[r][c] = CELL.FLOOR;
            maybeDropPowerup(game, c, r);
          }
        }
      }
      break;
    }
    default: break;
  }
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
    if (!p.alive || p.invulnT > 0) continue;
    if (corners(p).some(([c, r]) => flameKeys.has(`${c},${r}`))) {
      if (p.shield) { p.shield = false; p.invulnT = INVULN_TIME; } // 🛡 спасает один раз
      else { p.alive = false; game.events.push('death'); }
    }
  }

  // Пламя сжигает бонусы (по клетке, в которой бонус сейчас находится).
  game.powerups = game.powerups.filter(
    (u) => !flameKeys.has(`${Math.round(u.col)},${Math.round(u.row)}`),
  );

  // 🧲 Магнит: бонусы тянутся к игроку.
  for (const p of game.players) {
    if (!p.alive || p.magnetT <= 0) continue;
    for (const u of game.powerups) {
      const ddx = (p.col - u.col), ddy = (p.row - u.row);
      const d = Math.hypot(ddx, ddy);
      if (d > 0.05 && d < MAGNET_RADIUS) {
        const m = Math.min(4 * dt, d);
        u.col += (ddx / d) * m;
        u.row += (ddy / d) * m;
      }
    }
  }

  // Подбор бонусов: игрок близко к центру бонуса (устойчиво к дробным позициям).
  for (const p of game.players) {
    if (!p.alive) continue;
    const idx = game.powerups.findIndex((u) => Math.hypot(p.col - u.col, p.row - u.row) < 0.7);
    if (idx >= 0) {
      applyPowerup(game, p, game.powerups[idx].type);
      game.powerups.splice(idx, 1);
      game.events.push('powerup');
    }
  }
}
