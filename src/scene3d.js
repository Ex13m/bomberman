// 3D-рендер на Three.js. Состояние игры не меняет — только визуализирует.
// Игровая логика (game/player/bomb) общая с 2D-версией; здесь лишь сцена и меши.

import * as THREE from '../vendor/three.module.js';
import { COLS, ROWS, CELL, POWERUP } from './config.js';

// Координаты клетки (col,row, центр +0.5) в мировые, центр арены в (0,0).
const wc = (col) => col + 0.5 - COLS / 2;
const wr = (row) => row + 0.5 - ROWS / 2;

// Осветлить/затемнить hex-цвет → строка 'rgb(...)' (THREE.Color её понимает).
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (sh) => Math.max(0, Math.min(255, sh + amt));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

const DIR_Y = { down: 0, up: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 };

const PU_COLOR = {
  [POWERUP.BOMB]: 0xc879f5,
  [POWERUP.FIRE]: 0xff7a45,
  [POWERUP.SPEED]: 0x2bd4e8,
  [POWERUP.REMOTE]: 0xffd23f,
  [POWERUP.GHOST]: 0xbfefff,
  [POWERUP.TELEPORT]: 0x9b5de5,
  [POWERUP.SHIELD]: 0x4dd0e1,
  [POWERUP.FREEZE]: 0x80d8ff,
  [POWERUP.MAGNET]: 0xff5da2,
  [POWERUP.MEGA]: 0xff3d00,
  [POWERUP.BOMBRAIN]: 0xb0bec5,
  [POWERUP.QUAKE]: 0x8d6e63,
  [POWERUP.SWAP]: 0x00e676,
  [POWERUP.TIMEWARP]: 0xffca28,
  [POWERUP.JACKPOT]: 0xffd700,
};

// Пул переиспользуемых мешей: begin() → get()×N → end() прячет лишние.
function makePool(scene, factory) {
  const items = [];
  let used = 0;
  return {
    begin() { used = 0; },
    get() {
      let m = items[used];
      if (!m) { m = factory(); items.push(m); scene.add(m); }
      m.visible = true;
      used++;
      return m;
    },
    end() { for (let i = used; i < items.length; i++) items[i].visible = false; },
  };
}

function checkerTexture() {
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s * 2;
  const c = cv.getContext('2d');
  c.fillStyle = '#5b9a44'; c.fillRect(0, 0, s * 2, s * 2);
  c.fillStyle = '#4f8c3b'; c.fillRect(0, 0, s, s); c.fillRect(s, s, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(COLS / 2, ROWS / 2);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14161d);
  scene.fog = new THREE.Fog(0x14161d, 18, 32);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(0, ROWS * 1.05, ROWS * 0.92);
  camera.lookAt(0, 0, -0.4);

  // Свет
  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x3a5a2a, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.15);
  sun.position.set(6, 14, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const d = 12;
  sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
  sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // Пол
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(COLS, ROWS),
    new THREE.MeshStandardMaterial({ map: checkerTexture(), roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Общие геометрии/материалы
  const wallGeo = new THREE.BoxGeometry(1, 1, 1);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x767f91, roughness: 0.7, metalness: 0.1 });
  const blockGeo = new THREE.BoxGeometry(0.92, 0.86, 0.92);
  const blockMat = new THREE.MeshStandardMaterial({ color: 0xa8702f, roughness: 0.85 });

  const staticGroup = new THREE.Group();
  scene.add(staticGroup);
  const blockMap = new Map(); // "c,r" → mesh

  function buildStatics(game) {
    staticGroup.clear();
    blockMap.clear();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = game.grid[r][c];
        if (cell === CELL.WALL) {
          const m = new THREE.Mesh(wallGeo, wallMat);
          m.position.set(wc(c), 0.5, wr(r));
          m.castShadow = m.receiveShadow = true;
          staticGroup.add(m);
        } else if (cell === CELL.BLOCK) {
          const m = new THREE.Mesh(blockGeo, blockMat);
          m.position.set(wc(c), 0.43, wr(r));
          m.castShadow = m.receiveShadow = true;
          staticGroup.add(m);
          blockMap.set(`${c},${r}`, m);
        }
      }
    }
  }

  // Персонаж
  function makePlayer(color) {
    const g = new THREE.Group();
    const dark = shade(color, -55);
    const helmet = shade(color, 50);
    const std = (col, extra) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, ...extra });

    const footGeo = new THREE.SphereGeometry(0.12, 12, 10);
    const f1 = new THREE.Mesh(footGeo, std(dark)); f1.position.set(-0.15, 0.12, 0.04);
    const f2 = new THREE.Mesh(footGeo, std(dark)); f2.position.set(0.15, 0.12, 0.04);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.30, 22, 18), std(color));
    body.position.y = 0.36; body.scale.set(1, 1.05, 0.92);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 18), std(helmet));
    head.position.y = 0.64;

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.13, 0.14), std(0x10141f, { roughness: 0.3 }));
    visor.position.set(0, 0.62, 0.20);

    const eyeGeo = new THREE.SphereGeometry(0.05, 10, 8);
    const eyeMat = std(0xffffff, { emissive: 0x444444 });
    const e1 = new THREE.Mesh(eyeGeo, eyeMat); e1.position.set(-0.09, 0.63, 0.28);
    const e2 = new THREE.Mesh(eyeGeo, eyeMat); e2.position.set(0.09, 0.63, 0.28);

    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 8), std(dark));
    ant.position.set(0, 0.88, 0);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8),
      std(0xff4444, { emissive: 0xff2222, emissiveIntensity: 0.9 }));
    bulb.position.set(0, 0.99, 0);

    // 🛡 щит-пузырь (скрыт по умолчанию)
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0x4dd0e1, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    shield.position.y = 0.45;
    shield.visible = false;

    g.add(f1, f2, body, head, visor, e1, e2, ant, bulb, shield);
    g.traverse((o) => { if (o.isMesh && o !== shield) o.castShadow = true; });
    g.userData = { feet: [f1, f2], shield };
    return g;
  }

  let playerMeshes = [];
  function buildPlayers(game) {
    for (const m of playerMeshes) scene.remove(m);
    playerMeshes = game.players.map((p) => {
      const m = makePlayer(p.color);
      scene.add(m);
      return m;
    });
  }

  // Пулы динамики
  const bombPool = makePool(scene, () => {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.35, metalness: 0.4 }));
    ball.castShadow = true;
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe08a }));
    spark.position.set(0.05, 0.5, 0);
    g.add(ball, spark);
    g.userData = { spark };
    return g;
  });

  const flamePool = makePool(scene, () => new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 14),
    new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  ));

  const puPool = makePool(scene, () => {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.30, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222, emissiveIntensity: 0.6, roughness: 0.3 }));
    m.castShadow = true;
    return m;
  });

  const partPool = makePool(scene, () => new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  ));

  // Вспышка взрыва
  const blastLight = new THREE.PointLight(0xff7722, 0, 8, 2);
  scene.add(blastLight);

  function setGame(game) {
    buildStatics(game);
    buildPlayers(game);
  }

  function frame(game, t) {
    // Секрет: disco-режим перекрашивает свет в радугу
    if (game.discoT > 0) {
      const hue = (t * 0.25) % 1;
      hemi.color.setHSL(hue, 0.7, 0.7);
      sun.color.setHSL((hue + 0.5) % 1, 0.65, 0.6);
    } else {
      hemi.color.set(0xbfd4ff);
      sun.color.set(0xfff2d8);
    }

    // Снести меши разрушенных блоков
    for (const [key, mesh] of blockMap) {
      const [c, r] = key.split(',').map(Number);
      if (game.grid[r][c] !== CELL.BLOCK) {
        staticGroup.remove(mesh);
        blockMap.delete(key);
      }
    }

    // Игроки
    game.players.forEach((p, i) => {
      const m = playerMeshes[i];
      if (!m) return;
      m.visible = p.alive;
      if (!p.alive) return;
      const frozen = p.frozenT > 0;
      const bob = frozen ? 0 : (p.moving ? Math.abs(Math.sin(p.walk)) * 0.06 : Math.sin(t * 3) * 0.02);
      m.position.set(wc(p.col), bob, wr(p.row));
      m.rotation.y = DIR_Y[p.dir] ?? 0;
      const sw = p.moving && !frozen ? Math.sin(p.walk) * 0.12 : 0;
      m.userData.feet[0].position.z = 0.04 + sw;
      m.userData.feet[1].position.z = 0.04 - sw;
      // 🛡 щит виден, пока активен; ❄ заморозка — лёгкая пульсация щит-сферы голубым
      const sh = m.userData.shield;
      sh.visible = p.shield || frozen;
      sh.material.color.set(frozen ? 0x80d8ff : 0x4dd0e1);
      sh.material.opacity = frozen ? 0.35 : 0.22 + 0.1 * Math.sin(t * 6);
    });

    // Бомбы
    bombPool.begin();
    for (const b of game.bombs) {
      const g = bombPool.get();
      const pulse = 1 + 0.08 * Math.sin(t * 16 + b.col + b.row);
      g.position.set(wc(b.col), 0.32, wr(b.row));
      g.scale.set(pulse, 1 / pulse, pulse);
      g.userData.spark.scale.setScalar(0.7 + Math.abs(Math.sin(t * 26)) * 0.9);
    }
    bombPool.end();

    // Пламя
    flamePool.begin();
    let fx = 0, fz = 0, fn = 0;
    for (const f of game.flames) {
      const m = flamePool.get();
      const k = Math.max(0, Math.min(1, f.time / 0.5));
      const grow = 0.5 + 0.5 * (1 - k);
      m.position.set(wc(f.col), 0.5, wr(f.row));
      m.scale.setScalar(grow * (1 + 0.12 * Math.sin(t * 30 + f.col + f.row)));
      m.material.opacity = k;
      fx += m.position.x; fz += m.position.z; fn++;
    }
    flamePool.end();
    if (fn > 0) {
      blastLight.position.set(fx / fn, 1.2, fz / fn);
      blastLight.intensity = Math.min(6, fn * 1.2);
    } else {
      blastLight.intensity *= 0.8;
    }

    // Бонусы
    puPool.begin();
    for (const u of game.powerups) {
      const m = puPool.get();
      m.position.set(wc(u.col), 0.45 + Math.sin(t * 3 + u.col + u.row) * 0.08, wr(u.row));
      m.rotation.y = t * 1.6;
      m.material.color.set(PU_COLOR[u.type]);
      m.material.emissive.set(PU_COLOR[u.type]);
    }
    puPool.end();

    // Частицы (pt.x,pt.y — в клеточных координатах с уже учтённым центром)
    partPool.begin();
    for (const pt of game.particles) {
      const m = partPool.get();
      const a = Math.max(0, pt.life / pt.max);
      m.position.set(pt.x - COLS / 2, 0.15 + 0.6 * a, pt.y - ROWS / 2);
      m.scale.setScalar(0.5 + a);
      m.material.opacity = a;
      m.material.color.set(pt.color);
    }
    partPool.end();

    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  return { setGame, frame, resize };
}
