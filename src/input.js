// Клавиатура: общий набор «нажатых сейчас» клавиш по их code.
// Это позволяет двум игрокам нажимать одновременно на одной клавиатуре.

const pressed = new Set(); // клавиши, зажатые прямо сейчас
const fresh = new Set();   // нажатия, ещё не «прочитанные» через consumePress

export function initInput() {
  window.addEventListener('keydown', (e) => {
    // Стрелки и Space скроллят страницу — гасим, раз они игровые.
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!pressed.has(e.code)) fresh.add(e.code); // только первое нажатие, без автоповтора
    pressed.add(e.code);
  });
  window.addEventListener('keyup', (e) => pressed.delete(e.code));
}

export function isDown(code) {
  return pressed.has(code);
}

// true ровно один раз на каждое физическое нажатие (для постановки бомбы).
export function consumePress(code) {
  if (fresh.has(code)) { fresh.delete(code); return true; }
  return false;
}
