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
export const SECRET_CHANCE = 0.18;  // доля «секретных» среди выпавших бонусов
export const SPEED_STEP = 0.6;      // прибавка скорости за бонус
export const MAX_SPEED = 8;         // потолок скорости
// bomb/fire/speed — обычные; остальное — секреты (remote/ghost + 10 новых).
export const POWERUP = {
  BOMB: 'bomb', FIRE: 'fire', SPEED: 'speed',
  REMOTE: 'remote', GHOST: 'ghost',
  // 10 новых, которых не было в оригинале:
  TELEPORT: 'teleport',   // 🌀 мгновенный перенос в случайную клетку
  SHIELD: 'shield',       // 🛡 переживает один взрыв
  FREEZE: 'freeze',       // ❄ замораживает соперника
  MAGNET: 'magnet',       // 🧲 притягивает бонусы
  MEGA: 'mega',           // 💥 следующая бомба — на всю линию
  BOMBRAIN: 'bombrain',   // ☄ ливень бомб по арене
  QUAKE: 'quake',         // 🌋 рушит блоки вокруг
  SWAP: 'swap',           // 🔀 меняет игроков местами
  TIMEWARP: 'timewarp',   // ⏳ замедляет соперника
  JACKPOT: 'jackpot',     // 🍀 джекпот: сразу +2 бомбы/+2 огонь/+скорость
};

// Пул секретов для случайного выпадения.
export const SECRETS = [
  POWERUP.REMOTE, POWERUP.GHOST, POWERUP.TELEPORT, POWERUP.SHIELD, POWERUP.FREEZE,
  POWERUP.MAGNET, POWERUP.MEGA, POWERUP.BOMBRAIN, POWERUP.QUAKE, POWERUP.SWAP,
  POWERUP.TIMEWARP, POWERUP.JACKPOT,
];

// Параметры секретов
export const MAGNET_TIME = 10;     // сек действия магнита
export const MAGNET_RADIUS = 3.5;  // радиус притяжения бонусов (клетки)
export const FREEZE_TIME = 3;      // сек заморозки соперника
export const TIMEWARP_TIME = 6;    // сек замедления соперника
export const INVULN_TIME = 1.2;    // сек неуязвимости после щита
export const BOMBRAIN_COUNT = 5;   // бомб в ливне
export const QUAKE_RADIUS = 2;     // радиус разрушения землетрясения
export const MEGA_RANGE = 99;      // радиус мега-бомбы (упрётся в стены)

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
