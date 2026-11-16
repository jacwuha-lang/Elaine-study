/* ============================================================
   race.js — 比赛画面：Three.js 场景、追尾镜头、机器人动画
   ------------------------------------------------------------
   服务器每 50ms 给一次距离，这里做两件事：
     1. 把距离平滑成画面上的连续移动（避免一顿一顿）
     2. 按速度摆腿摆臂、摔倒放倒、冲线举手
   镜头始终在我方机器人后上方，能看到全身和前方约 20 米。
   ============================================================ */

import * as THREE from '../../vendor/three.module.min.js';
import { createTrack, pathPoint, drawMinimap, LANES, RACER_COLORS, TOTAL } from './track.js';
import { createRacer, animateRobot } from './robots.js';

export class RaceView {
  constructor(canvas, minimapCanvas, roomCode) {
    this.canvas = canvas;
    this.minimap = minimapCanvas;
    this.mctx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: true, powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
    this.camera.position.set(0, 4, 0);
    // 房间号随机生成，以其末位决定昼夜，让同场玩家看到一致的场景。
    // 测试时可用 ?raceTime=day/night 固定。
    const requestedTime = new URLSearchParams(location.search).get('raceTime');
    const lastDigit = Number(String(roomCode || '').slice(-1));
    const time = requestedTime === 'day' || requestedTime === 'night'
      ? requestedTime : (roomCode ? (lastDigit % 2 ? 'night' : 'day') : (Math.random() < .5 ? 'day' : 'night'));
    this.track = createTrack(this.scene, { time });
    this.renderer.toneMappingExposure = time === 'night' ? 1.05 : 1.0;

    this.racers = [];
    this.snap = null;
    this.clock = 0;
    this.over = false;
    this.overT = 0;
    this.raf = 0;
    this.running = false;
    this.shown = [];
    this.crashK = [];
    this.camPos = new THREE.Vector3(0, 4, 8);
    this.camLook = new THREE.Vector3(0, 1.2, 0);
    this.camInit = false;
    /* 跟随镜头的补光：不然背对太阳那一侧机器人只剩剪影 */
    this.camLight = new THREE.PointLight(0xe3efff, time === 'night' ? 55 : 24, 24, 2);
    this.scene.add(this.camLight);
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();
  }

  resize() {
    /* 分屏后画布只占右半边，必须按 canvas 自己的尺寸算，
       不能再量父元素（#app 是整个窗口）。 */
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.minimap) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const mr = this.minimap.getBoundingClientRect();
      this.minimap.width = Math.max(1, Math.round(mr.width * dpr));
      this.minimap.height = Math.max(1, Math.round(mr.height * dpr));
      this.mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  /** metas: [{robot, who, label, slot}] —— 第一个永远是「我」 */
  setPlayers(metas) {
    this.racers.forEach((r) => this.scene.remove(r.group));
    this.racers = [];
    metas.forEach((meta, i) => {
      const color = RACER_COLORS[i % RACER_COLORS.length];
      const lane = LANES[i % LANES.length];
      const r = createRacer(meta.robot || 'jifeng', meta.label || meta.who || '', color);
      r.slot = meta.slot != null ? meta.slot : i;
      r.lane = lane;
      r.color = color;
      r.group.position.set(0, 0, this.track.startZ + lane);
      this.scene.add(r.group);
      this.racers.push(r);
    });
    this.shown = this.racers.map(() => 0);
    this.crashK = this.racers.map(() => 0);
    this.over = false;
    this.overT = 0;
    this.camInit = false;
  }

  /** 答对时让看台沸腾一下 */
  cheer(k) {
    if (this.track && this.track.crowd) this.track.crowd.cheer(k || 0.5);
  }

  setSnapshot(snap) {
    this.snap = snap;
    if (!snap) return;
    const list = snap.racers || (snap.me ? [snap.me, snap.op].filter(Boolean) : []);
    this.racers.forEach((r, i) => {
      const d = list.filter((q) => q.slot === r.slot)[0] || list[i];
      if (!d) return;
      r.target = d.dist;
      r.speed = d.speed;
      r.crash = d.crash || 0;
      r.finish = d.dist >= TOTAL - 0.5;
      r.left = !!d.left;
    });
    if (snap.state === 'over' && !this.over) {
      this.over = true;
      this.overT = 0;
      if (this.track && this.track.crowd) this.track.crowd.cheer(1.2);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    let last = performance.now();
    const loop = (now) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.frame(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  frame(dt) {
    this.clock += dt;
    if (this.over) this.overT += dt;

    for (let i = 0; i < this.racers.length; i++) {
      const r = this.racers[i];
      /* 平滑位移：服务器 20Hz，画面 60fps，这里补中间帧 */
      const gap = r.target - this.shown[i];
      const k = Math.min(1, dt * (gap > 8 ? 3.5 : 10));
      this.shown[i] += gap * k;
      if (this.shown[i] > TOTAL) this.shown[i] = TOTAL;

      const p = pathPoint(this.shown[i], r.lane);
      const bounce = r.crash > 0 ? 0 : Math.abs(Math.sin(this.clock * 8 + i)) * 0.02;
      r.group.position.set(p.x, bounce, p.z);
      r.group.rotation.y = p.yaw;

      const crashTarget = r.crash > 0 ? 1 : 0;
      this.crashK[i] += (crashTarget - this.crashK[i]) * Math.min(1, dt * 6);
      animateRobot(r.parts, this.clock + i * 0.37, r.speed, {
        crash: this.crashK[i],
        finish: r.finish && r.crash <= 0,
        lean: r.def.id === 'youzhun' ? 0.09 : 0.03
      });

      /* 摔倒时脚下光环暗一点 */
      r.halo.material.opacity = r.crash > 0 ? 0.2 : 0.55;
    }

    this.updateCamera(dt);
    if (this.track && this.track.crowd) this.track.crowd.update(this.clock, dt);

    const w = this.minimap ? this.minimap.clientWidth : 0;
    const h = this.minimap ? this.minimap.clientHeight : 0;
    if (this.mctx && w > 0) {
      drawMinimap(this.mctx, w, h, this.racers.map((r, i) => ({
        dist: this.shown[i], color: r.color, me: i === 0, lane: r.lane
      })));
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateCamera(dt) {
    const me = this.racers[0];
    if (!me) return;
    const dist = this.shown[0];
    const p = pathPoint(dist, me.lane);
    const speed = me.speed || 0;
    const back = 4.6 + Math.min(1.4, speed * 0.12);
    const height = 2.45 + Math.min(0.6, speed * 0.05);

    let cx, cy, cz, lx, ly, lz;
    if (this.over && this.overT > 0.2) {
      /* 结束后绕到侧前方定格 */
      const ahead = pathPoint(dist + 7, me.lane);
      cx = p.x + (ahead.x - p.x) * 0.55;
      cz = p.z + (ahead.z - p.z) * 0.55;
      cy = 2.2;
      const side = pathPoint(dist, me.lane - 7.5);
      cx = side.x;
      cz = side.z;
      lx = p.x; ly = 1.0; lz = p.z;
    } else {
      cx = p.x - p.tx * back;
      cz = p.z - p.tz * back;
      cy = height;
      const ahead = pathPoint(dist + 13, me.lane);
      lx = ahead.x;
      ly = 1.0;
      lz = ahead.z;
    }

    /* 摔倒/重启时轻微震动 */
    if (me.crash > 0) {
      const shake = Math.min(0.16, me.crash * 0.08);
      cx += (Math.random() - 0.5) * shake;
      cy += (Math.random() - 0.5) * shake;
    }

    if (!this.camInit) {
      this.camInit = true;
      this.camPos.set(cx, cy, cz);
      this.camLook.set(lx, ly, lz);
    }

    const k = 1 - Math.pow(0.0015, dt);
    this.camPos.x += (cx - this.camPos.x) * k;
    this.camPos.y += (cy - this.camPos.y) * k;
    this.camPos.z += (cz - this.camPos.z) * k;

    const lk = 1 - Math.pow(0.0008, dt);
    this.camLook.x += (lx - this.camLook.x) * lk;
    this.camLook.y += (ly - this.camLook.y) * lk;
    this.camLook.z += (lz - this.camLook.z) * lk;

    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    this.camLight.position.set(this.camPos.x, this.camPos.y + 1.4, this.camPos.z);

    /* 速度越快视野越宽，超频时更明显 */
    const targetFov = 58 + Math.min(13, speed * 1.5);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 3);
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    window.removeEventListener('resize', this._onResize);
    // 每次再赛都会新建场景，释放模型、贴图和材质，避免显存逐局增长。
    const geometries = new Set(), materials = new Set(), textures = new Set();
    this.scene.traverse((obj) => {
      if (obj.geometry) geometries.add(obj.geometry);
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.filter(Boolean).forEach((m) => {
        materials.add(m);
        Object.values(m).forEach((value) => { if (value && value.isTexture) textures.add(value); });
      });
    });
    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    geometries.forEach((geometry) => geometry.dispose());
    this.renderer.dispose();
  }
}
