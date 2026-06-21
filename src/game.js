// Состояние игры и генерация арены. Логика отделена от рендера.

import { COLS, ROWS, CELL, BLOCK_DENSITY, PLAYERS } from './config.js';
import { createPlayer } from './player.js';

// «Безопасные» клетки вокруг спавнов — там не ставим разрушаемые блоки,
// чтобы игрок не был замурован на старте.
function isSpawnSafe(col, row) {
  for (const p of PLAYERS) {
    const dc = Math.abs(col - p.spawn.col);
    const dr = Math.abs(row - p.spawn.row);
    if (dc + dr <= 2 && (dc === 0 || dr === 0)) return true;
  }
  return false;
}

// Стандартная Bomberman-сетка: рамка-стена + колонны на чётных клетках,
// остальное — пол, частично засыпанный разрушаемыми блоками.
function buildGrid(rng) {
  const grid = [];
  for (let row = 0; row < ROWS; row++) {
    const line = [];
    for (let col = 0; col < COLS; col++) {
      const border = col === 0 || row === 0 || col === COLS - 1 || row === ROWS - 1;
      const pillar = col % 2 === 0 && row % 2 === 0;
      if (border || pillar) {
        line.push(CELL.WALL);
      } else if (!isSpawnSafe(col, row) && rng() < BLOCK_DENSITY) {
        line.push(CELL.BLOCK);
      } else {
        line.push(CELL.FLOOR);
      }
    }
    grid.push(line);
  }
  return grid;
}

// Простой детерминируемый ГПСЧ (mulberry32) — чтобы арены были воспроизводимы при отладке.
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGame(seed = 1) {
  const rng = makeRng(seed);
  return {
    grid: buildGrid(rng),
    players: PLAYERS.map(createPlayer),
    bombs: [],     // активные бомбы
    flames: [],    // активные клетки пламени
    powerups: [],  // выпавшие бонусы {col,row,type}
    particles: [], // визуальные частицы взрывов {x,y,vx,vy,life,max,size,color}
    events: [],    // очередь событий для звука: 'place'|'explode'|'powerup'|'death'|'win'
    status: 'playing', // 'playing' | 'over'
    winner: null,      // id победителя или 'draw'
  };
}

// Раунд окончен, когда живых ≤ 1: победитель — последний живой, иначе ничья.
export function checkWinner(game) {
  if (game.status !== 'playing') return;
  const alive = game.players.filter((p) => p.alive);
  if (alive.length <= 1) {
    game.status = 'over';
    game.winner = alive.length === 1 ? alive[0].id : 'draw';
    game.events.push('win');
  }
}

export function cellAt(game, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return CELL.WALL;
  return game.grid[row][col];
}
