// Константы игры — единственный источник чисел, чтобы не «зашивать» их по коду.

export const TILE = 48;          // размер клетки в пикселях
export const COLS = 15;          // ширина арены в клетках (нечётная — для сетки колонн)
export const ROWS = 13;          // высота арены в клетках (нечётная)

// Типы клеток сетки
export const CELL = {
  FLOOR: 0,   // пол — по нему ходят
  WALL: 1,    // несокрушимая стена (рамка + колонны)
  BLOCK: 2,   // разрушаемый блок — взрыв его убирает
};

// Доля случайных разрушаемых блоков на свободном полу (0..1)
export const BLOCK_DENSITY = 0.55;

// Бомбы
export const BOMB_FUSE = 2.0;    // сек до взрыва
export const FLAME_TIME = 0.5;   // сек, сколько держится пламя

// Стартовые параметры игрока (как в оригинале: 1 бомба, радиус 1)
export const START_BOMBS = 1;
export const START_RANGE = 1;

// Бонусы из разрушенных блоков
export const POWERUP_CHANCE = 0.32; // шанс выпадения бонуса из блока
export const SPEED_STEP = 0.6;      // прибавка скорости за бонус
export const MAX_SPEED = 8;         // потолок скорости
export const POWERUP = { BOMB: 'bomb', FIRE: 'fire', SPEED: 'speed' };

// Игроки: старт в противоположных углах, своя раскладка клавиш.
export const PLAYERS = [
  {
    id: 1, color: '#4fc3f7', spawn: { col: 1, row: 1 },
    keys: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', bomb: 'Space' },
  },
  {
    id: 2, color: '#ef5350', spawn: { col: COLS - 2, row: ROWS - 2 },
    keys: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', bomb: 'Enter' },
  },
];

export const MOVE_SPEED = 4.5;   // клеток в секунду
