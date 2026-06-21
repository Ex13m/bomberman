// HUD: статы игроков под сценой. Обновляет DOM-элемент #hud.

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

// Текст экрана конца раунда (показывается оверлеем поверх 3D-сцены).
export function updateBanner(game) {
  let el = document.getElementById('banner');
  if (!el) return;
  if (game.status !== 'over') { el.style.display = 'none'; return; }
  const draw = game.winner === 'draw';
  const color = draw ? '#eaeaea'
    : (game.players.find((p) => p.id === game.winner)?.color ?? '#eaeaea');
  el.style.display = 'flex';
  el.innerHTML = `<div class="title" style="color:${color}">`
    + `${draw ? 'Ничья!' : `Игрок ${game.winner} победил!`}</div>`
    + `<div class="sub">Нажми R — играть снова</div>`;
}
