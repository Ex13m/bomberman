// Отрисовка состояния игры на canvas. Только рисует — не меняет состояние.

import { TILE, COLS, ROWS, CELL, POWERUP } from './config.js';

const COLORS = {
  [CELL.FLOOR]: '#2c2f36',
  [CELL.WALL]: '#5a5f6b',
  [CELL.BLOCK]: '#8d6e63',
};

const PU = {
  [POWERUP.BOMB]: { color: '#ab47bc', label: 'B' },
  [POWERUP.FIRE]: { color: '#ff7043', label: 'F' },
  [POWERUP.SPEED]: { color: '#26c6da', label: 'S' },
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

  // Бонусы — цветные плитки с буквой
  for (const u of game.powerups) {
    const meta = PU[u.type];
    const x = u.col * TILE, y = u.row * TILE;
    ctx.fillStyle = meta.color;
    ctx.fillRect(x + TILE * 0.22, y + TILE * 0.22, TILE * 0.56, TILE * 0.56);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${TILE * 0.34}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.label, x + TILE * 0.5, y + TILE * 0.54);
  }

  // Бомбы — тёмные сферы с пульсацией и фитилём
  for (const b of game.bombs) {
    const cx = (b.col + 0.5) * TILE, cy = (b.row + 0.5) * TILE;
    const pulse = 0.30 + 0.05 * Math.sin(b.fuse * 12);
    ctx.fillStyle = '#15151a';
    ctx.beginPath();
    ctx.arc(cx, cy, TILE * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e53935';
    ctx.fillRect(cx - 2, cy - TILE * 0.42, 4, TILE * 0.12);
  }

  // Пламя — яркий крест поверх пола
  for (const f of game.flames) {
    ctx.fillStyle = '#ff7043';
    ctx.fillRect(f.col * TILE + 2, f.row * TILE + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(f.col * TILE + TILE * 0.28, f.row * TILE + TILE * 0.28, TILE * 0.44, TILE * 0.44);
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

  // Экран конца раунда
  if (game.status === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = (COLS * TILE) / 2, cy = (ROWS * TILE) / 2;
    const msg = game.winner === 'draw' ? 'Ничья!' : `Игрок ${game.winner} победил!`;
    const color = game.winner === 'draw'
      ? '#eee'
      : (game.players.find((p) => p.id === game.winner)?.color ?? '#eee');
    ctx.fillStyle = color;
    ctx.font = `bold ${TILE * 0.9}px system-ui`;
    ctx.fillText(msg, cx, cy - TILE * 0.4);
    ctx.fillStyle = '#cdd';
    ctx.font = `${TILE * 0.42}px system-ui`;
    ctx.fillText('Нажми R — играть снова', cx, cy + TILE * 0.7);
  }
}

// HUD: статы игроков под полем. Обновляет DOM-элемент #hud.
let hudEl = null;
export function updateHud(game) {
  if (!hudEl) hudEl = document.getElementById('hud');
  if (!hudEl) return;
  hudEl.innerHTML = game.players
    .map((p) => {
      const dead = p.alive ? '' : ' 💀';
      return `<span class="p" style="color:${p.color}">P${p.id}</span> `
        + `💣${p.maxBombs} 🔥${p.range} ⚡${p.speed.toFixed(1)}${dead}`;
    })
    .join('<span class="sep">·</span>');
}
