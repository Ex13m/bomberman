// Игрок: позиция в клетках (дробная — для плавного движения) и его раскладка.
// Движение/бомбы добавим следующими шагами; пока — данные и спавн.

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
