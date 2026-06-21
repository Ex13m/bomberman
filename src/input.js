// Клавиатура: общий набор «нажатых сейчас» клавиш по их code.
// Это позволяет двум игрокам нажимать одновременно на одной клавиатуре.

const pressed = new Set();

export function initInput() {
  window.addEventListener('keydown', (e) => {
    // Стрелки и Space скроллят страницу — гасим, раз они игровые.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    pressed.add(e.code);
  });
  window.addEventListener('keyup', (e) => pressed.delete(e.code));
}

export function isDown(code) {
  return pressed.has(code);
}
