/* ============================================================
   robots.js — 六款机器人：数据、建模、跑步动画、选机预览
   ------------------------------------------------------------
   人形机体采用分体外壳、传感器、关节和不同的背部结构；
   跑步动画驱动髋、膝、脚踝、肩和肘，选机和赛场使用同一模型。
   ============================================================ */

import * as THREE from '../../vendor/three.module.min.js';

export const ROBOTS = [
  { id: 'jifeng', name: '疾风 · 天工', trait: '极速上限 +0.2 m/s',
    desc: '圆柱传感器搭配白色长腿，外露的金属关节清晰可见。',
    h: 1.86, torsoW: .39, torsoD: .22, shoulder: .43,
    colors: { body: 0xe8e7df, joint: 0x52585a, accent: 0x1c69aa, visor: 0x72dcff } },
  { id: 'bailu', name: '白鹭 · 银白', trait: '单次答对提速 +5%',
    desc: '银白色流线外壳，黑色面罩与修长双腿。',
    h: 1.67, torsoW: .36, torsoD: .23, shoulder: .40,
    colors: { body: 0xdce5ea, joint: 0x869ba8, accent: 0x57bfcb, visor: 0x92e4ea } },
  { id: 'tiexi', name: '铁犀 · 蓝白', trait: '摔倒重启快 0.5 秒',
    desc: '深蓝与白色分段护甲，点缀红色标记。',
    h: 1.73, torsoW: .43, torsoD: .25, shoulder: .48,
    colors: { body: 0xe5e9e9, joint: 0x092644, accent: 0xb31d36, visor: 0x7ab3d1 } },
  { id: 'youzhun', name: '游隼 · 闪电', trait: '答错少掉 0.2 m/s',
    desc: '铜色宽肩胸甲、青色灯带和外露机械长腿。',
    h: 1.90, torsoW: .47, torsoD: .27, shoulder: .51,
    colors: { body: 0x713a23, joint: 0x222a2b, accent: 0x6ee5e2, visor: 0x7ff6ed } },
  { id: 'chitu', name: '赤兔 · 元气仔', trait: '连击倍率每档 +0.05',
    desc: '银灰色流线身体，圆形黑色面罩与青色灯线。',
    h: 1.67, torsoW: .37, torsoD: .24, shoulder: .42,
    colors: { body: 0xabb9c2, joint: 0x414b52, accent: 0x59ced2, visor: 0x71f5f0 } },
  { id: 'xingchen', name: '星尘 · 星动', trait: '起跑前 10 秒 +0.3 m/s',
    desc: '黑银双色机身、外露髋关节与黑色机械小腿。',
    h: 1.77, torsoW: .40, torsoD: .23, shoulder: .43,
    colors: { body: 0xc7d2d7, joint: 0x151b20, accent: 0x8599a3, visor: 0xe7fbff } }
];

export function robotById(id) {
  for (let i = 0; i < ROBOTS.length; i++) {
    if (ROBOTS[i].id === id) return ROBOTS[i];
  }
  return ROBOTS[0];
}

function mat(color, opts) {
  return new THREE.MeshStandardMaterial(Object.assign({
    color: color, roughness: 0.55, metalness: 0.45
  }, opts || {}));
}

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  if (x != null) m.position.set(x, y, z);
  return m;
}

function cyl(r1, r2, h, material, x, y, z, seg) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 16), material);
  if (x != null) m.position.set(x, y, z);
  return m;
}

function capsule(radius, length, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 12), material);
  if (x != null) m.position.set(x, y, z);
  return m;
}

function ball(radius, material, x, y, z, seg) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, seg || 14, seg || 10), material);
  if (x != null) m.position.set(x, y, z);
  return m;
}

function glowRing(radius, tube, color) {
  return new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 8, 24),
    new THREE.MeshStandardMaterial({
      color: color, emissive: color, emissiveIntensity: 1.4,
      roughness: 0.35, metalness: 0.2
    })
  );
}

/** 脚下的软阴影：比光环更像真的站在地上 */
function contactShadow(radius) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,.55)');
  grad.addColorStop(0.55, 'rgba(0,0,0,.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, opacity: 0.9
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  return m;
}

/**
 * 造一台机器人。返回 { group, parts }
 * group 原点在脚底，正面朝 +Z。
 */
export function buildRobot(def) {
  const H = def.h, kind = def.id;
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const shell = mat(def.colors.body, { roughness: .37, metalness: .46 });
  const metal = mat(def.colors.joint, { roughness: .35, metalness: .72 });
  const black = mat(0x111a20, { roughness: .32, metalness: .42 });
  const soft = mat(0x232a30, { roughness: .7, metalness: .16 });
  const white = mat(0xe2e8e9, { roughness: .39, metalness: .35 });
  const accent = mat(def.colors.accent, { roughness: .38, metalness: .43 });
  const cyan = mat(def.colors.visor, { emissive: def.colors.visor, emissiveIntensity: .7, roughness: .3 });
  const visor = mat(0x07131a, { roughness: .12, metalness: .7 });
  const hipY = H * .50, torsoH = H * .27, torsoY = hipY + torsoH * .52;
  const shoulderY = hipY + torsoH * .97, headY = H * .91;
  const hipW = def.torsoW * .30, thigh = H * .235, shin = H * .215;
  const armU = H * .165, armL = H * .145, hs = H * .11;

  function ell(w, h, d, material, x, y, z) {
    const m = ball(1, material, x, y, z, 20);
    m.scale.set(w / 2, h / 2, d / 2); return m;
  }
  function panel(w, h, d, material, x, y, z, corner = .22) {
    const r = Math.min(w, h) * corner, bevel = Math.min(r * .3, d * .15);
    const p = new THREE.Shape();
    p.moveTo(-w/2+r, -h/2); p.lineTo(w/2-r, -h/2);
    p.quadraticCurveTo(w/2, -h/2, w/2, -h/2+r); p.lineTo(w/2, h/2-r);
    p.quadraticCurveTo(w/2, h/2, w/2-r, h/2); p.lineTo(-w/2+r, h/2);
    p.quadraticCurveTo(-w/2, h/2, -w/2, h/2-r); p.lineTo(-w/2, -h/2+r);
    p.quadraticCurveTo(-w/2, -h/2, -w/2+r, -h/2);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(p, { depth: Math.max(.001, d - 2*bevel),
      bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4 }), material);
    m.position.set(x, y, z - d/2 + bevel); return m;
  }
  // 旋转成型的护甲比椭球更接近照片中的修长、渐收外壳。
  function limbShell(width, height, depth, material, x, y, z) {
    const profile = [[0,-.5],[.32,-.49],[.46,-.43],[.5,-.28],
      [.49,.22],[.44,.42],[.30,.49],[0,.5]];
    const geometry = new THREE.LatheGeometry(profile.map(p =>
      new THREE.Vector2(p[0] * width, p[1] * height)), 20);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.z = depth / width;
    mesh.position.set(x, y, z);
    return mesh;
  }
  // 上宽下窄的多边形胸甲，形成肩、胸、腰之间的清晰转折。
  function chestPlate(w, h, d, material, x, y, z, lower = .68) {
    const shape = new THREE.Shape();
    shape.moveTo(-w*.40, h*.50); shape.lineTo(w*.40, h*.50);
    shape.quadraticCurveTo(w*.50, h*.50, w*.50, h*.35);
    shape.lineTo(w*lower*.50, -h*.36);
    shape.quadraticCurveTo(w*lower*.47, -h*.50, w*lower*.36, -h*.50);
    shape.lineTo(-w*lower*.36, -h*.50);
    shape.quadraticCurveTo(-w*lower*.47, -h*.50, -w*lower*.50, -h*.36);
    shape.lineTo(-w*.50, h*.35);
    shape.quadraticCurveTo(-w*.50, h*.50, -w*.40, h*.50);
    const bevel = Math.min(d*.15, .012);
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(.001, d-2*bevel), bevelEnabled: true,
      bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 5
    }), material);
    mesh.position.set(x, y, z-d/2+bevel);
    return mesh;
  }
  function bar(w, h, d, material, x, y, z) { return box(w, h, d, material, x, y, z); }
  function axle(parent, radius, length, material, x, y, z) {
    const m = cyl(radius, radius, length, material, x, y, z, 18);
    m.rotation.z = Math.PI / 2; parent.add(m); return m;
  }
  function rivet(parent, x, y, z, size = H*.006) {
    const m = cyl(size, size, H*.006, metal, x, y, z, 8);
    m.rotation.x = Math.PI/2; parent.add(m);
  }
  function stripe(parent, w, h, x, y, z, material = accent) {
    parent.add(panel(w, h, H*.008, material, x, y, z, .15));
  }

  const torso = new THREE.Group(); body.add(torso);
  const torsoBase = kind === 'xingchen' ? black : kind === 'tiexi' ? metal : shell;
  const roundTorso = kind === 'bailu' || kind === 'chitu';
  torso.add(chestPlate(def.torsoW, torsoH*1.12, def.torsoD, torsoBase, 0, torsoY, 0,
    kind === 'youzhun' ? .70 : roundTorso ? .72 : .82));
  const frontZ = def.torsoD*.51;
  if (kind === 'jifeng') {
    torso.add(panel(def.torsoW*.84, torsoH*.82, H*.018, white, 0, torsoY, frontZ, .12));
    [-1,1].forEach(side => {
      torso.add(panel(H*.045, H*.05, H*.015, black, side*def.torsoW*.31, torsoY+H*.06, frontZ+H*.014));
      rivet(torso, side*def.torsoW*.31, torsoY-H*.07, frontZ+H*.02);
    });
    torso.add(panel(def.torsoW*.64, torsoH*.12, H*.012, metal, 0, torsoY-torsoH*.39, frontZ+H*.01));
  } else if (kind === 'bailu') {
    torso.add(chestPlate(def.torsoW*.88, torsoH*.88, H*.045, white, 0, torsoY+H*.02, frontZ, .70));
    stripe(torso, def.torsoW*.35, H*.009, 0, torsoY+H*.115, frontZ+H*.018, metal);
  } else if (kind === 'tiexi') {
    torso.add(panel(def.torsoW*.82, torsoH*.45, H*.025, white, 0, torsoY+H*.065, frontZ));
    torso.add(panel(def.torsoW*.48, torsoH*.35, H*.03, white, 0, torsoY-H*.075, frontZ+H*.005));
    stripe(torso, H*.10, H*.018, 0, torsoY+H*.085, frontZ+H*.02, accent);
    [-1,1].forEach(side => stripe(torso, H*.018, H*.055, side*def.torsoW*.34, torsoY-H*.07, frontZ+H*.02));
  } else if (kind === 'youzhun') {
    torso.add(chestPlate(def.torsoW*.93, torsoH*.94, H*.045, shell, 0, torsoY, frontZ, .64));
    [-1,1].forEach(side => {
      const eye = panel(def.torsoW*.32, H*.018, H*.015, cyan, side*def.torsoW*.20, torsoY+H*.085, frontZ+H*.025);
      eye.rotation.z = -side*.3; torso.add(eye);
    });
    torso.add(panel(def.torsoW*.45, H*.08, H*.015, black, 0, torsoY-H*.075, frontZ+H*.025));
  } else if (kind === 'chitu') {
    torso.add(chestPlate(def.torsoW*.80, torsoH*.80, H*.04, shell, 0, torsoY, frontZ, .72));
    stripe(torso, H*.015, H*.12, 0, torsoY+H*.09, frontZ+H*.02, cyan);
  } else {
    torso.add(panel(def.torsoW*.77, torsoH*.63, H*.024, shell, 0, torsoY-H*.025, frontZ, .12));
    torso.add(panel(def.torsoW*.70, H*.08, H*.012, black, 0, torsoY+H*.13, frontZ+H*.02));
  }
  // 背部结构直接暴露在追尾镜头中。
  torso.add(panel(def.torsoW*.72, torsoH*.72, H*.045, kind === 'youzhun' ? black : metal,
    0, torsoY, -def.torsoD*.54));
  torso.add(panel(def.torsoW*.57, torsoH*.55, H*.018, torsoBase,
    0, torsoY+H*.005, -def.torsoD*.68));
  [-1,1].forEach(side => {
    stripe(torso, H*.012, H*.11, side*def.torsoW*.25, torsoY, -def.torsoD*.70,
      kind === 'youzhun' ? accent : metal);
    rivet(torso, side*def.torsoW*.26, torsoY+H*.07, -def.torsoD*.70);
  });
  if (kind === 'youzhun' || kind === 'xingchen') {
    const pack = kind === 'youzhun' ? black : metal;
    torso.add(panel(def.torsoW*.30, torsoH*.48, H*.026, pack,
      0, torsoY+H*.01, -def.torsoD*.82, .12));
    for (let n = 0; n < 3; n++) {
      stripe(torso, def.torsoW*.22, H*.012,
        0, torsoY+H*(.075-n*.045), -def.torsoD*.89,
        kind === 'youzhun' ? metal : black);
    }
  }
  body.add(cyl(H*.06, H*.07, H*.09, black, 0, hipY+H*.06, 0));
  body.add(ell(def.torsoW*.72, H*.11, def.torsoD*.85, kind === 'xingchen' || kind === 'youzhun' ? black : shell, 0, hipY, 0));

  const head = new THREE.Group(); head.position.set(0, headY, 0); body.add(head);
  head.add(cyl(H*.03, H*.04, H*.075, black, 0, -hs*.72, 0, 16));
  if (kind === 'jifeng') {
    head.add(cyl(hs*.49, hs*.49, hs*.88, metal, 0, hs*.02, 0, 28));
    head.add(cyl(hs*.54, hs*.54, hs*.25, shell, 0, hs*.53, 0, 28));
    head.add(cyl(hs*.52, hs*.52, hs*.15, accent, 0, hs*.33, 0, 28));
    head.add(cyl(hs*.50, hs*.50, hs*.10, black, 0, -hs*.44, 0, 28));
    [-1,1].forEach(side => head.add(cyl(H*.005, H*.005, H*.12, metal, side*hs*.62, -hs*.05, 0, 8)));
  } else if (kind === 'youzhun') {
    head.add(ell(hs*.55, hs*.75, hs*.60, black, 0, -hs*.02, hs*.02));
    head.add(ell(hs*.26, hs*.26, hs*.18, visor, 0, hs*.05, hs*.29));
    head.add(ell(hs*.10, hs*.11, hs*.08, cyan, 0, hs*.05, hs*.385));
  } else if (kind === 'bailu') {
    head.add(ell(hs*1.24, hs*1.48, hs*1.12, shell, 0, 0, 0));
    head.add(ell(hs*.76, hs*.70, hs*.20, black, 0, hs*.02, hs*.50));
    head.add(ell(hs*.25, hs*.25, hs*.07, cyan, 0, hs*.02, hs*.57));
    head.add(panel(hs*.65, hs*.16, H*.012, white, 0, -hs*.43, hs*.47, .35));
    [-1,1].forEach(side => axle(head, hs*.21, hs*.11, metal, side*hs*.56, -.03, 0));
  } else if (kind === 'chitu') {
    head.add(ell(hs*1.20, hs*1.36, hs*1.12, shell, 0, 0, 0));
    head.add(ell(hs*.98, hs*.68, hs*.21, black, 0, hs*.06, hs*.49));
    head.add(ell(hs*.72, hs*.10, hs*.055, cyan, 0, hs*.09, hs*.60));
    head.add(panel(hs*.54, hs*.20, H*.012, shell, 0, -hs*.40, hs*.49, .4));
    [-1,1].forEach(side => axle(head, hs*.22, hs*.12, metal, side*hs*.55, 0, 0));
  } else {
    head.add(ell(hs*1.16, hs*1.38, hs*1.10, shell, 0, 0, 0));
    head.add(ell(hs*.95, hs*.92, hs*.20, visor, 0, hs*.02, hs*.49));
    if (kind === 'tiexi') {
      const brow = panel(hs*.72, hs*.14, H*.012, accent, 0, hs*.48, hs*.48);
      brow.rotation.z = -.18; head.add(brow);
      head.add(panel(hs*.72, H*.012, H*.012, white, 0, -hs*.40, hs*.46));
    } else if (kind === 'xingchen') {
      head.add(panel(hs*.80, H*.016, H*.015, white, 0, hs*.18, hs*.59));
      head.add(panel(hs*.48, H*.015, H*.015, white, 0, -hs*.17, hs*.58));
    } else {
      head.add(panel(hs*.72, H*.012, H*.012, cyan, 0, hs*.12, hs*.60));
    }
    [-1,1].forEach(side => axle(head, hs*.15, hs*.11, metal, side*hs*.55, 0, 0));
  }

  const shoulderL = new THREE.Group(), shoulderR = new THREE.Group();
  shoulderL.position.set(-def.shoulder*.5, shoulderY, 0); shoulderR.position.set(def.shoulder*.5, shoulderY, 0);
  body.add(shoulderL, shoulderR);
  function arm(side, pivot) {
    axle(pivot, H*.047, H*.085, metal, 0, 0, 0);
    const slim = kind === 'jifeng' || kind === 'youzhun';
    if (kind === 'youzhun') {
      const pauldron = panel(H*.13, H*.15, H*.12, shell, side*H*.025, H*.005, 0, .08);
      pauldron.rotation.z = -side*.08; pivot.add(pauldron);
      const fin = new THREE.Mesh(new THREE.ConeGeometry(H*.036, H*.15, 5), shell);
      fin.position.set(side*H*.055, H*.105, 0);
      fin.rotation.z = -side*.24;
      pivot.add(fin);
      rivet(pivot, side*H*.035, -H*.045, H*.063, H*.005);
    }
    if (slim) {
      pivot.add(cyl(H*.019, H*.025, armU*.86, shell, 0, -armU*.50, 0, 10));
      pivot.add(ell(H*.08, H*.085, H*.085, shell, 0, -H*.015, 0));
    } else {
      pivot.add(ell(H*.12, H*.11, H*.12, shell, 0, 0, 0));
      pivot.add(limbShell(H*.088, armU*.96, H*.10, shell, 0, -armU*.50, 0));
    }
    const elbow = new THREE.Group(); elbow.position.y = -armU; pivot.add(elbow);
    axle(elbow, H*.035, H*.09, metal, 0, 0, 0);
    elbow.add(slim ? cyl(H*.016, H*.022, armL*.9, shell, 0, -armL*.49, 0, 10)
      : limbShell(H*.075, armL*.96, H*.075, kind === 'tiexi' ? metal : shell, 0, -armL*.48, 0));
    elbow.add(ell(H*.055, H*.075, H*.045, black, 0, -armL-H*.025, 0));
    // Separate fingers and thumb from the palm, as in the reference silhouettes.
    [-1, 0, 1].forEach(i => elbow.add(capsule(H*.006, H*.028, black,
      i*H*.012, -armL-H*.06, H*.006)));
    const thumb = capsule(H*.007, H*.024, black, side*H*.03, -armL-H*.035, H*.012);
    thumb.rotation.z = side*.45; elbow.add(thumb);
    if (kind === 'tiexi') stripe(elbow, H*.045, H*.018, 0, -armL*.42, H*.045);
    return { pivot, elbow };
  }
  const armLParts = arm(-1, shoulderL), armRParts = arm(1, shoulderR);
  function leg(side) {
    const pivot = new THREE.Group(); pivot.position.set(side*hipW, hipY, 0); body.add(pivot);
    axle(pivot, H*.055, H*.10, kind === 'jifeng' ? metal : black, 0, 0, 0);
    if (kind === 'youzhun' || kind === 'chitu') {
      axle(pivot, kind === 'youzhun' ? H*.077 : H*.061, H*.07,
        kind === 'youzhun' ? metal : shell, side*H*.025, -H*.025, 0);
      pivot.add(cyl(H*.012, H*.012, H*.11, cyan,
        side*H*.03, -H*.025, H*.054, 8));
    }
    const exposed = kind === 'jifeng' || kind === 'youzhun';
    const legMaterial = kind === 'xingchen' ? black : shell;
    if (exposed) {
      pivot.add(panel(H*.065, thigh*.86, H*.09, shell, 0, -thigh*.49, 0));
      pivot.add(cyl(H*.012, H*.012, thigh*.80, metal, side*H*.046, -thigh*.50, -H*.015, 10));
    } else {
      pivot.add(limbShell(H*.115, thigh*.98, H*.12, legMaterial, 0, -thigh*.49, 0));
      if (kind === 'xingchen') pivot.add(panel(H*.07, thigh*.77, H*.012, shell, side*H*.015, -thigh*.49, H*.07));
      if (kind === 'tiexi') {
        pivot.add(panel(H*.09, thigh*.70, H*.016, white, 0, -thigh*.43, H*.07));
        for (let n=0; n<3; n++) stripe(pivot, H*.018, H*.018, side*H*.023, -thigh*.30-n*H*.025, H*.08);
      }
    }
    const knee = new THREE.Group(); knee.position.y = -thigh; pivot.add(knee);
    axle(knee, H*.043, H*.105, metal, 0, 0, 0);
    axle(knee, H*.030, H*.115, black, 0, 0, 0);
    const shinMaterial = kind === 'xingchen' || kind === 'youzhun' ? black : kind === 'tiexi' ? metal : shell;
    knee.add(exposed ? panel(H*.06, shin*.85, H*.075, shinMaterial, 0, -shin*.49, 0)
      : limbShell(H*.087, shin*.98, H*.095, shinMaterial, 0, -shin*.49, 0));
    if (kind === 'tiexi') knee.add(panel(H*.065, shin*.68, H*.014, white, 0, -shin*.42, H*.052));
    if (kind === 'jifeng') knee.add(cyl(H*.01, H*.01, shin*.78, metal, side*H*.04, -shin*.5, 0, 8));
    if (kind === 'youzhun' || kind === 'jifeng') {
      // Thin struts, actuator caps and fastening points remain visible in the rear race camera.
      pivot.add(cyl(H*.008, H*.008, thigh*.66, metal, -side*H*.039, -thigh*.51, -H*.025, 8));
      axle(pivot, H*.033, H*.12, black, side*H*.025, -H*.025, 0);
      axle(knee, H*.023, H*.125, shell, 0, 0, 0);
      for (let n = 0; n < 3; n++) rivet(knee, side*H*.018, -shin*(.23+n*.20), H*.041, H*.0035);
    }
    const foot = new THREE.Group(); foot.position.y = -shin; knee.add(foot);
    foot.add(cyl(H*.028, H*.028, H*.05, black, 0, 0, 0, 12));
    foot.add(panel(H*.10, H*.052, H*.20, kind === 'jifeng' ? white : black, 0, -H*.02, H*.04));
    foot.add(bar(H*.10, H*.012, H*.19, soft, 0, -H*.05, H*.04));
    return { pivot, knee, foot };
  }
  const legL = leg(-1), legR = leg(1);
  group.add(contactShadow(H*.30));
  const halo = new THREE.Mesh(new THREE.RingGeometry(H*.19, H*.205, 32),
    new THREE.MeshBasicMaterial({ color: 0x6fe6ff, transparent: true, opacity: .4,
      side: THREE.DoubleSide, depthWrite: false }));
  halo.rotation.x = -Math.PI/2; halo.position.y = .02; group.add(halo);
  const label = makeLabel(def.name, '#6fe6ff'); label.position.y = H*1.13; group.add(label);
  return { group, halo, label, parts: { body, head, torso, shoulderL, shoulderR,
    armL: armLParts, armR: armRParts, legL, legR, baseY: 0 } };
}

/** 名字牌：canvas 贴图，跟着 3D 场景走 */
export function makeLabel(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.font = '600 30px "PingFang SC", "Microsoft YaHei", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(8,16,26,.62)';
  const w = Math.min(236, g.measureText(text).width + 36);
  const x = (c.width - w) / 2;
  roundRect(g, x, 10, w, 44, 12);
  g.fill();
  g.fillStyle = color || '#6fe6ff';
  g.fillText(text, c.width / 2, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false
  }));
  sp.scale.set(1.5, 0.375, 1);
  return sp;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function setLabelText(label, text, color) {
  if (!label) return;
  const c = label.material.map.image;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.font = '600 30px "PingFang SC", "Microsoft YaHei", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(8,16,26,.62)';
  const w = Math.min(236, g.measureText(text).width + 36);
  roundRect(g, (c.width - w) / 2, 10, w, 44, 12);
  g.fill();
  g.fillStyle = color || '#6fe6ff';
  g.fillText(text, c.width / 2, 33);
  label.material.map.needsUpdate = true;
}

/**
 * 跑步动画
 * speed 0 时原地待机；speed 越大摆臂频率越快
 */
export function animateRobot(parts, clock, speed, opts) {
  const o = opts || {};
  const run = Math.max(0, Math.min(1, speed / 7));
  const freq = 1.25 + run * 1.35;
  const amp = speed > .1 ? 0.20 + run * 0.46 : 0;
  const ph = clock * freq * Math.PI * 2;
  const sw = Math.sin(ph);

  parts.legL.pivot.rotation.x = sw * amp;
  parts.legR.pivot.rotation.x = -sw * amp;
  parts.legL.knee.rotation.x = Math.max(0, -sw) * (0.35 + run * 0.65);
  parts.legR.knee.rotation.x = Math.max(0, sw) * (0.35 + run * 0.65);
  parts.legL.foot.rotation.x = -parts.legL.pivot.rotation.x * .35 - parts.legL.knee.rotation.x * .5;
  parts.legR.foot.rotation.x = -parts.legR.pivot.rotation.x * .35 - parts.legR.knee.rotation.x * .5;

  parts.armL.pivot.rotation.x = -sw * amp * 0.9;
  parts.armR.pivot.rotation.x = sw * amp * 0.9;
  parts.armL.elbow.rotation.x = -0.45 - Math.max(0, -sw) * 0.5;
  parts.armR.elbow.rotation.x = -0.45 - Math.max(0, sw) * 0.5;

  parts.body.position.y = Math.abs(sw) * 0.035 * (0.5 + run);
  parts.body.rotation.z = Math.sin(ph * 0.5) * 0.02;
  parts.head.rotation.y = Math.sin(ph * 0.25) * 0.05;

  if (o.crash) {
    const k = Math.max(0, Math.min(1, o.crash));
    parts.body.rotation.x = k * 1.32;
    parts.body.position.y = -k * 0.12;
    parts.legL.pivot.rotation.x = 0.35;
    parts.legR.pivot.rotation.x = -0.25;
    parts.armL.pivot.rotation.x = -0.9;
    parts.armR.pivot.rotation.x = 0.7;
  } else if (o.finish) {
    parts.body.rotation.x = -0.12;
    parts.armL.pivot.rotation.x = -2.3;
    parts.armR.pivot.rotation.x = -2.3;
    parts.armL.elbow.rotation.x = -0.2;
    parts.armR.elbow.rotation.x = -0.2;
  } else {
    parts.body.rotation.x = o.lean || 0;
  }
}

/** 选机页的小预览：一个独立 renderer，只负责转圈展示 */
export function createPreview(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  camera.position.set(0, 1.15, 4.3);
  camera.lookAt(0, 0.95, 0);

  scene.add(new THREE.HemisphereLight(0xdfefff, 0x223044, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(2.4, 4, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4fc3ff, 1.2);
  rim.position.set(-3, 2, -2);
  scene.add(rim);

  const rig = new THREE.Group();
  scene.add(rig);

  let built = null;
  let def = null;
  let raf = 0;
  let t0 = performance.now();

  function releaseRobot(robot) {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    robot.group.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).filter(Boolean).forEach((m) => {
        materials.add(m);
        Object.values(m).forEach((value) => { if (value && value.isTexture) textures.add(value); });
      });
    });
    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    geometries.forEach((geometry) => geometry.dispose());
  }

  function setRobot(id) {
    def = robotById(id);
    if (built) {
      rig.remove(built.group);
      releaseRobot(built);
    }
    built = buildRobot(def);
    built.label.visible = false;
    built.halo.visible = false;
    built.group.position.y = 0;
    camera.position.set(0, def.h * 0.58, Math.max(3.0, def.h * 1.9));
    camera.lookAt(0, def.h * 0.58, 0);
    rig.add(built.group);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    // 比赛期间选机面板被隐藏，停止多余的 WebGL 绘制。
    if (!canvas.getClientRects().length) return;
    const t = (now - t0) / 1000;
    if (built) {
      rig.rotation.y = Math.sin(t * 0.5) * 0.65 + 0.2;
      animateRobot(built.parts, t, 2.2, {});
    }
    renderer.render(scene, camera);
  }

  resize();
  requestAnimationFrame(loop);
  window.addEventListener('resize', resize);
  return {
    setRobot: setRobot,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      if (built) releaseRobot(built);
    }
  };
}

/** 给赛道用的简单身影：一台机器人 + 平滑位置状态 */
export function createRacer(id, labelText, haloColor) {
  const def = robotById(id);
  const built = buildRobot(def);
  setLabelText(built.label, labelText, haloColor);
  built.halo.material.color.set(haloColor);
  built.group.renderOrder = 1;
  return {
    def: def,
    group: built.group,
    parts: built.parts,
    halo: built.halo,
    label: built.label,
    shown: 0,
    target: 0,
    crash: 0,
    speed: 0,
    finish: false
  };
}
