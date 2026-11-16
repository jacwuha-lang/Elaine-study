/* ============================================================
   track.js — 400 米标准跑道：几何、路径、看台、观众、小地图
   ------------------------------------------------------------
   赛道形状：两条直道 + 两个半圆，总长严格 400 米。
     R = 36.5 m（内圈半径），直道 L = (400 − 2πR) / 2 ≈ 85.33 m
   路径参数 s ∈ [0, 400)，distance / 400 直接映射到形状上。

   关键：四条跑道都按 400 米/圈算，所以 offset 只影响画面上
   的横向位置，不影响距离 —— 和 PRD 的「不因道次产生距离差」一致。
   ============================================================ */

import * as THREE from '../../vendor/three.module.min.js';

export const LAP = 400;
export const LAPS = 3;
export const TOTAL = LAP * LAPS;
export const R = 36.5;
export const STRAIGHT = (LAP - 2 * Math.PI * R) / 2;
const HALF = STRAIGHT / 2;
const TURN = Math.PI * R;

/** s: 沿跑道距离（米，可超过 400）；off: 横向偏移，正数向外 */
export function pathPoint(s, off) {
  const o = off || 0;
  const rr = R + o;
  let d = s % LAP;
  if (d < 0) d += LAP;
  if (d < STRAIGHT) {
    return { x: -HALF + d, z: rr, tx: 1, tz: 0, yaw: Math.PI / 2 };
  }
  if (d < STRAIGHT + TURN) {
    const t = (d - STRAIGHT) / R;
    return {
      x: HALF + rr * Math.sin(t),
      z: rr * Math.cos(t),
      tx: Math.cos(t), tz: -Math.sin(t),
      yaw: Math.atan2(Math.cos(t), -Math.sin(t))
    };
  }
  if (d < STRAIGHT * 2 + TURN) {
    const u = d - (STRAIGHT + TURN);
    return { x: HALF - u, z: -rr, tx: -1, tz: 0, yaw: -Math.PI / 2 };
  }
  const t = (d - (STRAIGHT * 2 + TURN)) / R;
  return {
    x: -HALF - rr * Math.sin(t),
    z: -rr * Math.cos(t),
    tx: -Math.cos(t), tz: Math.sin(t),
    yaw: Math.atan2(-Math.cos(t), Math.sin(t))
  };
}

/** 四个分道中心（白线之间），offset 越大越靠外 */
export const LANES = [-3.25, -0.65, 1.95, 4.55];
export const RACER_COLORS = ['#63e6ff', '#ffa63d', '#b18cff', '#4ade80'];

/* ---------- 几何工具 ---------- */

/** 沿跑道铺一条水平带：offset 从 a 到 b，高度统一是 y */
function ringStrip(a, b, material, y) {
  return ringSlope(a, b, y, y, material);
}

/** 沿跑道铺一条斜面/立面带：内外两侧可以不同高度 */
function ringSlope(a, b, ya, yb, material) {
  const N = 360;
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * LAP;
    const p1 = pathPoint(s, a);
    const p2 = pathPoint(s, b);
    pos.push(p1.x, ya, p1.z);
    pos.push(p2.x, yb, p2.z);
    const u = (i / N) * 12;
    uv.push(u, 0, u, 1);
  }
  for (let i = 0; i < N; i++) {
    const k = i * 2;
    idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

/** 垂直于地面的环墙（看台立面、内场围栏） */
function ringWall(off, ya, yb, material) {
  const N = 360;
  const pos = [];
  const idx = [];
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * LAP;
    const p = pathPoint(s, off);
    pos.push(p.x, ya, p.z);
    pos.push(p.x, yb, p.z);
  }
  for (let i = 0; i < N; i++) {
    const k = i * 2;
    idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

/** 内场：从中心到内边缘的扇形 */
function infield(radius, material, y) {
  const N = 180;
  const pos = [0, y, 0];
  const uv = [0.5, 0.5];
  const idx = [];
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * LAP;
    const p = pathPoint(s, radius);
    pos.push(p.x, y, p.z);
    uv.push(p.x / 30 + 0.5, p.z / 30 + 0.5);
  }
  for (let i = 1; i <= N; i++) {
    idx.push(0, i, i + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

function checkerTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 4; y++) {
      g.fillStyle = (x + y) % 2 ? '#111' : '#f4f6f8';
      g.fillRect(x * 16, y * 16, 16, 16);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 1);
  return t;
}

/** 草坪条纹：内场别再是一块纯色 */
function grassTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  for (let i = 0; i < 16; i++) {
    g.fillStyle = i % 2 ? '#1c5734' : '#22643b';
    g.fillRect(0, i * 32, 512, 32);
  }
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.045).toFixed(3) + ')';
    g.fillRect(Math.random() * 512, Math.random() * 512, 2, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 塑胶跑道：细颗粒 + 轻微色差 */
function trackTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#a8342f';
  g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 12000; i++) {
    const a = Math.random();
    g.fillStyle = a > 0.5
      ? 'rgba(255,180,160,' + (Math.random() * 0.05).toFixed(3) + ')'
      : 'rgba(40,10,10,' + (Math.random() * 0.06).toFixed(3) + ')';
    g.fillRect(Math.random() * 512, Math.random() * 256, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 起终点拱门上的横幅：用 canvas 画字，省得加载图片 */
function bannerTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0, '#0b3a4d');
  grad.addColorStop(0.5, '#127d94');
  grad.addColorStop(1, '#0b3a4d');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 128);
  g.strokeStyle = 'rgba(120,235,255,.65)';
  g.lineWidth = 5;
  g.strokeRect(8, 8, 1008, 112);
  g.fillStyle = '#e9fbff';
  g.font = '900 62px "PingFang SC", "Microsoft YaHei", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('ROBOT MARATHON', 512, 66);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

/** 看台上的观众：体格 + 头 + 一部分举起的胳膊，用 InstancedMesh 撑数量 */
function makeCrowd(group, tiers) {
  const slots = [];
  const coats = [0x3f5873, 0x95534d, 0xc5ad84, 0x526b5d, 0x7b7285, 0xaaa9a2, 0x30445a, 0x8e765f];
  const skins = [0xe7b991, 0xd6a57b, 0xb87c56, 0x8e5b42];
  tiers.forEach((tier, row) => {
    const count = 360;
    for (let i = 0; i < count; i++) {
      if (Math.random() < .05) continue;
      const p = pathPoint((i + .15 + Math.random() * .65) / count * LAP,
        tier.off + .55 + Math.random() * .55);
      slots.push({ x: p.x, z: p.z, y: tier.y, yaw: Math.atan2(p.tz, -p.tx),
        scale: .92 + Math.random() * .18, phase: Math.random() * Math.PI * 2,
        pose: Math.random(), standing: Math.random() < .38,
        coat: coats[(i * 7 + row * 3) % coats.length], skin: skins[(i + row) % skins.length] });
    }
  });
  const material = new THREE.MeshStandardMaterial({ roughness: .9 });
  const shapes = [new THREE.SphereGeometry(1, 8, 6), new THREE.SphereGeometry(1, 8, 6),
    new THREE.SphereGeometry(1, 8, 6), new THREE.CylinderGeometry(1, 1, 1, 6),
    new THREE.CylinderGeometry(1, 1, 1, 6), new THREE.CylinderGeometry(1, 1, 1, 6),
    new THREE.CylinderGeometry(1, 1, 1, 6)];
  const meshes = shapes.map(geometry => new THREE.InstancedMesh(geometry, material, slots.length));
  const color = new THREE.Color();
  slots.forEach((s, i) => {
    [0, 3, 4].forEach(k => meshes[k].setColorAt(i, color.setHex(s.coat)));
    meshes[1].setColorAt(i, color.setHex(s.skin));
    meshes[2].setColorAt(i, color.setHex((i % 4) ? 0x302c29 : 0x766452));
    [5, 6].forEach(k => meshes[k].setColorAt(i, color.setHex(i % 3 ? 0x303b46 : 0x5b5a56)));
  });
  meshes.forEach(mesh => { mesh.instanceColor.needsUpdate = true; mesh.frustumCulled = false; group.add(mesh); });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3();
  const scale = new THREE.Vector3(), euler = new THREE.Euler(), local = new THREE.Vector3();
  function put(mesh, i, s, x, y, z, sx, sy, sz, rotation) {
    const cs = Math.cos(s.yaw), sn = Math.sin(s.yaw);
    local.set(x * cs + z * sn, y, -x * sn + z * cs).multiplyScalar(s.scale);
    pos.set(s.x + local.x, s.y + local.y, s.z + local.z);
    euler.set(0, s.yaw, rotation || 0); q.setFromEuler(euler);
    scale.set(sx * s.scale, sy * s.scale, sz * s.scale);
    m.compose(pos, q, scale); mesh.setMatrixAt(i, m);
  }
  let accumulator = 0, cheerBurst = 0;
  function write(t) {
    slots.forEach((s, i) => {
      const base = s.standing ? .12 : 0;
      const sway = Math.sin(t * 3.4 + s.phase);
      const bob = (s.pose < .85 ? Math.max(0, sway) * .13 : Math.sin(t * 2.2 + s.phase) * .04)
        + cheerBurst * Math.max(0, sway) * .055;
      const torsoTilt = Math.sin(t * 2.5 + s.phase) * .085;
      put(meshes[0], i, s, 0, .82 + base + bob, 0, .23, .32, .14, torsoTilt);
      put(meshes[1], i, s, 0, 1.28 + base + bob, 0, .145, .17, .135,
        torsoTilt * .6 + Math.sin(t * 2.8 + s.phase) * .065);
      put(meshes[2], i, s, 0, 1.38 + base + bob, -.025, .15, .085, .13, torsoTilt * .45);
      put(meshes[5], i, s, -.10, .31 + base * .5, .015, .085, .54 + base, .09, 0);
      put(meshes[6], i, s, .10, .31 + base * .5, .015, .085, .54 + base, .09, 0);

      const wave = Math.sin(t * 5.2 + s.phase) * .58;
      let leftArm = .12 + sway * .18, rightArm = -.12 - sway * .18;
      if (s.pose < .25) {
        leftArm = .65 + (sway + 1) * .32;
        rightArm = -leftArm;
      } else if (s.pose < .55) {
        if (s.phase < Math.PI) leftArm = -2.2 - wave;
        else rightArm = 2.2 + wave;
      } else if (s.pose < .85) {
        leftArm = -2.05 - Math.max(0, sway) * .65;
        rightArm = 2.05 + Math.max(0, sway) * .65;
      }
      const cheer = cheerBurst * (.55 + .45 * Math.max(0, sway));
      leftArm += (-2.55 - leftArm) * cheer;
      rightArm += (2.55 - rightArm) * cheer;
      // 手臂绕肩膀转动，避免大幅挥手时脱离身体。
      const shoulderY = 1.055 + base + bob, halfArm = .215;
      put(meshes[3], i, s, -.22 + Math.sin(leftArm) * halfArm,
        shoulderY - Math.cos(leftArm) * halfArm, 0, .065, .43, .065, leftArm);
      put(meshes[4], i, s, .22 + Math.sin(rightArm) * halfArm,
        shoulderY - Math.cos(rightArm) * halfArm, 0, .065, .43, .065, rightArm);
    });
    meshes.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
  }
  write(0);
  return { update(t, dt) { accumulator += dt || 0; if (accumulator < .08) return;
      cheerBurst = Math.max(0, cheerBurst - accumulator * .5); accumulator = 0; write(t); },
    cheer(k) { cheerBurst = Math.min(1, cheerBurst + (k || .5)); } };
}

/**
 * 建整座体育场，返回 { group, startX, startZ, crowd }
 * 场景单位是米，y 向上。
 */
export function createTrack(scene, options = {}) {
  const isNight = options.time === 'night';
  const group = new THREE.Group();
  scene.add(group);

  /* 天空和雾：傍晚体育场。底色别太黑，否则看台和观众都糊成一团 */
  scene.background = new THREE.Color(isNight ? 0x172b43 : 0x9bc8e4);
  scene.fog = new THREE.Fog(isNight ? 0x20354d : 0xbcd8e5, 230, 570);

  /* 渐变天空与轻云：远处仍能辨认白天和夜场的环境。 */
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024; skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext('2d');
  const skyGradient = skyCtx.createLinearGradient(0, 0, 0, 512);
  if (isNight) {
    skyGradient.addColorStop(0, '#09172b'); skyGradient.addColorStop(.55, '#263d59');
    skyGradient.addColorStop(1, '#526479');
  } else {
    skyGradient.addColorStop(0, '#4b9bd0'); skyGradient.addColorStop(.55, '#94c9e8');
    skyGradient.addColorStop(1, '#e1e9e4');
  }
  skyCtx.fillStyle = skyGradient; skyCtx.fillRect(0, 0, 1024, 512);
  if (!isNight) {
    for (let i = 0; i < 18; i++) {
      const x = (i * 191 + 37) % 1024, y = 130 + (i * 47) % 210;
      const cloud = skyCtx.createRadialGradient(x, y, 0, x, y, 65);
      cloud.addColorStop(0, 'rgba(255,255,255,.40)'); cloud.addColorStop(1, 'rgba(255,255,255,0)');
      skyCtx.fillStyle = cloud; skyCtx.fillRect(x - 65, y - 65, 130, 130);
    }
  }
  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(470, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, fog: false, depthWrite: false }));
  scene.add(sky);

  /* 灯光：球场灯打满，看台上的观众才能看清 */
  const hemi = new THREE.HemisphereLight(isNight ? 0xc7dcf7 : 0xeaf6ff, isNight ? 0x313e49 : 0x71816c, isNight ? 1.15 : 1.45);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(isNight ? 0xcadcf5 : 0xfff2dd, isNight ? .85 : 1.8);
  sun.position.set(-60, 90, 50);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(isNight ? 0xa8cbf3 : 0xd8eafa, isNight ? .8 : .55);
  fill.position.set(60, 40, -80);
  scene.add(fill);
  /* 头顶补一盏，压住观众和看台的暗面 */
  const top = new THREE.DirectionalLight(0xe2efff, isNight ? 1.3 : .35);
  top.position.set(0, 120, 0);
  scene.add(top);

  /* 大地面 */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshStandardMaterial({ color: 0x16241c, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  group.add(ground);

  /* 内场草坪 */
  group.add(infield(-5.25, new THREE.MeshStandardMaterial({
    map: grassTexture(), color: 0xa9c0a9, roughness: 0.96
  }), 0.005));

  /* 跑道 */
  group.add(ringStrip(-5.2, 5.2, new THREE.MeshStandardMaterial({
    map: trackTexture(), color: 0xffffff, roughness: 0.92, metalness: 0.02
  }), 0.02));

  /* 九条分道线 */
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xf2f4f6, roughness: 0.7, metalness: 0.05
  });
  for (let k = 0; k <= 8; k++) {
    const off = -5.2 + k * 1.3;
    group.add(ringStrip(off - 0.055, off + 0.055, lineMat, 0.035));
  }

  /* 起终点：方格线 */
  const start = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 10.4),
    new THREE.MeshBasicMaterial({ map: checkerTexture(), side: THREE.DoubleSide })
  );
  start.rotation.x = -Math.PI / 2;
  start.position.set(-HALF, 0.045, R);
  group.add(start);

  /* 起终点门架 */
  const postMat = new THREE.MeshStandardMaterial({ color: 0x27364a, roughness: 0.6, metalness: 0.5 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x35d0ff, emissive: 0x0d6b8c, emissiveIntensity: 0.7, roughness: 0.5
  });
  [-6.1, 6.1].forEach((off) => {
    const p = pathPoint(0, off);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, 6.2, 0.42), postMat);
    post.position.set(p.x, 3.1, p.z);
    group.add(post);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), accentMat);
    lamp.position.set(p.x, 6.0, p.z);
    group.add(lamp);
  });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 12.9), postMat);
  bar.position.set(-HALF, 6.45, R);
  group.add(bar);
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(10.6, 1.0),
    new THREE.MeshBasicMaterial({ map: bannerTexture(), side: THREE.DoubleSide })
  );
  banner.rotation.y = Math.PI / 2;
  banner.position.set(-HALF - 0.28, 6.45, R);
  group.add(banner);

  /* 看台：绕场一圈的碗形台阶，四边都能坐人。
     离跑道只留 9 米，跑起来观众就在眼前，而不是远远一条黑边。 */
  const seatColors = [0x2b4d6e, 0x36618a, 0x223f5c, 0x3d6f9e];
  const RISER_MAT = new THREE.MeshStandardMaterial({
    color: 0x24394f, roughness: 0.95, side: THREE.DoubleSide
  });
  const BOWL_R0 = 9.2;
  const TIER_D = 2.2;
  const TIER_H = 1.05;
  const tierCount = 6;
  const tiers = [];
  for (let t = 0; t < tierCount; t++) {
    const off = BOWL_R0 + t * TIER_D;
    const y = 0.9 + t * TIER_H;
    group.add(ringStrip(off, off + TIER_D, new THREE.MeshStandardMaterial({
      color: seatColors[t % seatColors.length], roughness: 0.88
    }), y));
    /* 台阶前沿的一条冷光边，远处也能看清看台轮廓 */
    const edge = new THREE.MeshStandardMaterial({
      color: 0x2f6f9c, emissive: 0x123c55, emissiveIntensity: 0.55, roughness: 0.6
    });
    group.add(ringStrip(off, off + 0.16, edge, y + 0.015));
    group.add(ringWall(off + TIER_D, y, y + TIER_H, RISER_MAT));
    tiers.push({ off: off, y: y });
  }
  group.add(ringWall(BOWL_R0 + tierCount * TIER_D, 0.9 + tierCount * TIER_H, 13.0,
    new THREE.MeshStandardMaterial({ color: isNight ? 0x344657 : 0x9ca8aa, roughness: 1 })));

  /* 看台屋檐、立柱和护栏，沿椭圆跑道布置。 */
  const outer = BOWL_R0 + tierCount * TIER_D;
  const concrete = new THREE.MeshStandardMaterial({ color: 0x87959c, roughness: .9, side: THREE.DoubleSide });
  const roof = new THREE.MeshStandardMaterial({ color: 0xc4cbd0, roughness: .72, metalness: .18, side: THREE.DoubleSide });
  const rail = new THREE.MeshStandardMaterial({ color: 0xb3bfc4, roughness: .45, metalness: .55, side: THREE.DoubleSide });
  group.add(ringSlope(outer - 1, outer + 4.5, 14.7, 16.1, roof));
  group.add(ringStrip(outer - 1.2, outer - .8, rail, 14.65));
  group.add(ringWall(BOWL_R0 - .25, .05, .8, concrete));
  group.add(ringStrip(BOWL_R0 - .3, BOWL_R0 + .05, rail, .82));
  for (let i = 0; i < 36; i++) {
    const p = pathPoint(i / 36 * LAP, outer + 2.5);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, 15, 8), concrete);
    column.position.set(p.x, 7.5, p.z); group.add(column);
  }
  /* 赛道外侧广告板，避免看台直接贴到跑道。 */
  const board = new THREE.MeshStandardMaterial({ color: 0xdbe4e6, roughness: .75, side: THREE.DoubleSide });
  const boardTrim = new THREE.MeshStandardMaterial({ color: 0x225e79, roughness: .7, side: THREE.DoubleSide });
  group.add(ringWall(6.4, .05, .9, board));
  group.add(ringStrip(6.35, 6.45, boardTrim, .91));

  const crowd = makeCrowd(group, tiers);

  /* 四角灯塔 */
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a5868, roughness: 0.5, metalness: 0.6 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfff4de, emissive: 0xffedc4, emissiveIntensity: isNight ? 1.6 : .08, roughness: 0.35
  });
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach((q) => {
    const x = q[0] * (HALF + 28);
    const z = q[1] * (R + 33);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, 26, 10), poleMat);
    pole.position.set(x, 13, z);
    group.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 1.0), lampMat);
    head.position.set(x, 26.5, z);
    head.lookAt(0, 0, 0);
    group.add(head);
    if (isNight) {
      const flood = new THREE.PointLight(0xe4efff, 2200, 125, 2);
      flood.position.set(x, 25, z); group.add(flood);
    }
  });

  /* 场边旗帜：一圈小彩旗，跑起来有风感 */
  const flags = [];
  const flagCols = [0xff5d6c, 0xffd24a, 0x48e0a0, 0x63e6ff, 0xb18cff];
  for (let i = 0; i < 28; i++) {
    const s = (i / 28) * LAP;
    const p = pathPoint(s, 7.2);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 3.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x8fa6bd, roughness: 0.6, metalness: 0.4 })
    );
    pole.position.set(p.x, 1.7, p.z);
    group.add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.62),
      new THREE.MeshStandardMaterial({
        color: flagCols[i % flagCols.length], side: THREE.DoubleSide,
        emissive: flagCols[i % flagCols.length], emissiveIntensity: 0.18, roughness: 0.9
      })
    );
    flag.position.set(p.x, 3.0, p.z);
    flag.rotation.y = p.yaw;
    group.add(flag);
    flags.push({ mesh: flag, phase: i * 0.7 });
  }

  /* 远处城市剪影 */
  const cityMat = new THREE.MeshStandardMaterial({ color: isNight ? 0x1c3042 : 0x9baeb4, roughness: 1 });
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2;
    const rad = 160 + (i % 5) * 18;
    const w = 8 + (i % 4) * 5;
    const h = 12 + ((i * 37) % 55);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), cityMat);
    b.position.set(Math.cos(a) * rad, h / 2 - 2, Math.sin(a) * rad);
    group.add(b);
  }

  /* 星星 */
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 320; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = Math.random() * 0.75;
    const rad = 300;
    sp.push(Math.cos(a) * rad * Math.cos(e), 80 + Math.sin(e) * 180, Math.sin(a) * rad * Math.cos(e));
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0x9fc7ff, size: 1.2, sizeAttenuation: true, transparent: true, opacity: 0.75
  }));
  stars.visible = isNight;
  group.add(stars);

  /* 旗帜轻摆，跟观众一起动 */
  crowd.update(0, 0);
  const update = crowd.update.bind(crowd);
  crowd.update = function (t, dt) {
    update(t, dt);
    for (let i = 0; i < flags.length; i++) {
      const f = flags[i];
      f.mesh.rotation.z = Math.sin(t * 2.2 + f.phase) * 0.14;
    }
  };

  return { group: group, startX: -HALF, startZ: R, crowd: crowd, time: isNight ? 'night' : 'day' };
}

/* ---------- 小地图 ---------- */

const MINI_PTS = (() => {
  const arr = [];
  for (let i = 0; i <= 120; i++) {
    const p = pathPoint((i / 120) * LAP, 0);
    arr.push(p);
  }
  return arr;
})();

/**
 * 在右上角画椭圆跑道和所有参赛者
 * racers: [{dist, color, me, lane}]
 */
export function drawMinimap(ctx, w, h, racers) {
  ctx.clearRect(0, 0, w, h);
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  MINI_PTS.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  });
  const pad = 12;
  const sc = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxZ - minZ));
  const cx = w / 2, cz = h / 2;
  const mx = (x) => cx + (x - (minX + maxX) / 2) * sc;
  const mz = (z) => cz + (z - (minZ + maxZ) / 2) * sc;

  ctx.beginPath();
  MINI_PTS.forEach((p, i) => {
    if (i === 0) ctx.moveTo(mx(p.x), mz(p.z));
    else ctx.lineTo(mx(p.x), mz(p.z));
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(10,24,38,.55)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(180,210,235,.7)';
  ctx.stroke();

  (racers || []).forEach((r) => {
    const p = pathPoint(r.dist, r.lane != null ? r.lane : 0);
    ctx.beginPath();
    ctx.arc(mx(p.x), mz(p.z), r.me ? 5.5 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = r.color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.stroke();
  });

  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.font = '10px "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('400m × 3', w / 2, h - 3);
}
