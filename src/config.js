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
export const BOMB_RANGE = 2;     // длина луча взрыва в клетках
export const FLAME_TIME = 0.5;   // сек, сколько держится пламя

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
