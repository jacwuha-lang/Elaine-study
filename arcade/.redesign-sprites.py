from pathlib import Path
p=Path('arcade/src/art.js')
s=p.read_text(encoding='utf-8')
start=s.index('    /* ================= 闯关模式：五张可爱地图的怪 =================')
end=s.index('\n  };\n\n  function spPal', start)
new=r'''    /* ================= Arcade：五套专属像素角色 ================= */
    candy: { arcade: true, arc: 'candy', arcSize: 1.28, pal: ['#883e70', '#e9579a', '#ffaad0', '#fff0f7'], eye: '#34203f' },
    balloon: { arcade: true, arc: 'balloon', arcSize: 1.22, pal: ['#964322', '#ed713c', '#ffc060', '#fff0bc'], eye: '#38252e' },
    cupcake: { arcade: true, arc: 'cupcake', arcSize: 1.27, pal: ['#80502e', '#c77d42', '#f3ba6c', '#fff0bd'], eye: '#35232d' },
    lollipop: { arcade: true, arc: 'lollipop', arcSize: 1.25, pal: ['#79234c', '#dd3f82', '#ff86ae', '#ffe8a8'], eye: '#33203a' },
    eraser: { arcade: true, arc: 'eraser', arcSize: 1.24, pal: ['#792f56', '#df5f88', '#ffabc1', '#ffeaf0'], eye: '#342139' },
    pencil: { arcade: true, arc: 'pencil', arcSize: 1.28, pal: ['#765015', '#d99a22', '#ffd34e', '#fff0a2'], eye: '#35261c' },
    inkpot: { arcade: true, arc: 'inkpot', arcSize: 1.25, pal: ['#172a45', '#2d6085', '#64a9cf', '#d8f3ff'], eye: '#e6fbff' },
    ruler: { arcade: true, arc: 'ruler', arcSize: 1.22, pal: ['#795727', '#c18a40', '#f0ca69', '#fff1b5'], eye: '#35261c' },
    snowball: { arcade: true, arc: 'snowball', arcSize: 1.23, pal: ['#496a81', '#9ac7da', '#e1f5fc', '#ffffff'], eye: '#243f58' },
    scarf: { arcade: true, arc: 'scarf', arcSize: 1.20, pal: ['#702634', '#c74254', '#f37a7d', '#ffe0b0'], eye: '#3c202a' },
    broom: { arcade: true, arc: 'broom', arcSize: 1.22, pal: ['#62442a', '#a7763e', '#e2bd69', '#fff0ad'], eye: '#34251d' },
    icicle: { arcade: true, arc: 'icicle', arcSize: 1.24, pal: ['#28627c', '#48a3c3', '#9de3f1', '#efffff'], eye: '#17455e' },
    icecrystal: { arcade: true, arc: 'crystal', arcSize: 1.23, pal: ['#174c72', '#2787a8', '#64d0dc', '#e0ffff'], eye: '#173b61' },
    snowrabbit: { arcade: true, arc: 'rabbit', arcSize: 1.18, pal: ['#536b83', '#a7c4d8', '#e8f4f8', '#ffffff'], eye: '#294157' },
    icecone: { arcade: true, arc: 'icecone', arcSize: 1.25, pal: ['#285a76', '#418fb1', '#8fd3e4', '#efffff'], eye: '#193c58' },
    frostflower: { arcade: true, arc: 'frostflower', arcSize: 1.22, pal: ['#245c7e', '#3b91bb', '#75d2e3', '#e5ffff'], eye: '#173c5b' },
    sandpuff: { arcade: true, arc: 'sandpuff', arcSize: 1.24, pal: ['#75502b', '#bd873d', '#efd078', '#fff0ad'], eye: '#402b20' },
    cactus: { arcade: true, arc: 'cactus', arcSize: 1.22, pal: ['#254d35', '#43874a', '#8fc45c', '#f7d26c'], eye: '#193526' },
    beetle: { arcade: true, arc: 'beetle', arcSize: 1.22, pal: ['#59371b', '#98602b', '#d49a42', '#ffe293'], eye: '#35251b' },
    tumbleweed: { arcade: true, arc: 'tumbleweed', arcSize: 1.22, pal: ['#654323', '#a97537', '#d9ac60', '#ffe8a3'], eye: '#35251b' },

    carouselKing: { arcade: true, arc: 'carouselKing', arcSize: 1.65, pal: ['#632453', '#cf3977', '#ff83ab', '#ffe6a6'], eye: '#301d3a' },
    boardGiant: { arcade: true, arc: 'boardGiant', arcSize: 1.62, pal: ['#173d37', '#286b59', '#63a678', '#f4db87'], eye: '#fff2bd' },
    snowPrincipal: { arcade: true, arc: 'snowPrincipal', arcSize: 1.62, pal: ['#34536c', '#7eabc0', '#d6eef6', '#fff4cf'], eye: '#263e59' },
    iceDragon: { arcade: true, arc: 'iceDragon', arcSize: 1.70, pal: ['#143e63', '#267da1', '#55bfd0', '#d9ffff'], eye: '#ffdf8b' },
    sandPharaoh: { arcade: true, arc: 'sandPharaoh', arcSize: 1.68, pal: ['#593618', '#a76b27', '#e4b84b', '#fff0a1'], eye: '#3a2419' }'''
s=s[:start]+new+s[end:]
point='  function drawCreature(ctx, e, t, sp) {'
idx=s.index(point)
helpers=r'''  function arcadeR(ctx, x, y, w, h, c, s) {
    R(ctx, Math.round(x * s), Math.round(y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)), c);
  }

  function arcadeL(ctx, x0, y0, x1, y1, c, th, s) {
    line(ctx, Math.round(x0 * s), Math.round(y0 * s), Math.round(x1 * s), Math.round(y1 * s), c, Math.max(1, Math.round((th || 1) * s)));
  }

  function arcadePoly(ctx, pts, c, edge, s, th) {
    var scaled = [];
    for (var i = 0; i < pts.length; i++) scaled.push([Math.round(pts[i][0] * s), Math.round(pts[i][1] * s)]);
    arcadePixelPoly(ctx, scaled, c, edge, Math.max(1, Math.round((th || 1) * s)));
  }

  function arcadeEllipse(ctx, x, y, rx, ry, c, s) {
    rx = Math.max(1, Math.round(rx * s)); ry = Math.max(1, Math.round(ry * s));
    var cx = Math.round(x * s), cy = Math.round(y * s);
    for (var dy = -ry; dy <= ry; dy++) {
      var half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      R(ctx, cx - half, cy + dy, half * 2 + 1, 1, c);
    }
  }

  function arcadeFace(ctx, C, s, y, fierce) {
    var ey = y - 1;
    arcadeR(ctx, -6, ey - 2, 5, 7, C.d, s); arcadeR(ctx, 2, ey - 2, 6, 7, C.d, s);
    arcadeR(ctx, -5, ey - 1, 3, 4, C.eye, s); arcadeR(ctx, 3, ey - 1, 4, 5, C.eye, s);
    arcadeR(ctx, -4, ey, 1, 1, '#ffffff', s); arcadeR(ctx, 4, ey, 1, 1, '#ffffff', s);
    if (fierce) {
      arcadeL(ctx, -7, ey - 3, -2, ey - 4, C.d, 1, s);
      arcadeL(ctx, 2, ey - 4, 8, ey - 3, C.d, 1, s);
      arcadeR(ctx, 1, y + 4, 5, 2, C.hi, s);
    } else {
      arcadeR(ctx, 1, y + 3, 5, 1, C.d, s);
      arcadeR(ctx, 2, y + 4, 3, 1, C.hi, s);
    }
    arcadeR(ctx, -9, y + 2, 3, 2, C.m, s); arcadeR(ctx, 8, y + 2, 3, 2, C.m, s);
  }

  function arcadeLeg(ctx, x, y, stride, C, s, length) {
    var endX = x + stride * 2.5;
    arcadeL(ctx, x, y, endX, y + length - 2, C.d, 3, s);
    arcadeL(ctx, x, y + 1, endX, y + length - 3, C.m, 1, s);
    arcadeR(ctx, endX - 1, y + length - 2, 5, 2, C.d, s);
    arcadeR(ctx, endX, y + length - 2, 3, 1, C.hi, s);
  }

  function drawArcadeDesign(ctx, art, t, e, s, C, stride, charge, boss) {
    var w = Math.sin(t * 3.2 + (e.seed || 0)), flap = Math.sin(t * 8 + (e.seed || 0));
    var arm = charge * 7, fierce = boss || art === 'beetle' || art === 'iceDragon';
    if (art === 'candy') {
      var squeeze = stride * 1.1;
      arcadeEllipse(ctx, 0, -4, 10 + squeeze, 8 - squeeze * 0.4, C.d, s);
      arcadeEllipse(ctx, 0, -5, 9 + squeeze, 7 - squeeze * 0.4, C.m, s);
      arcadeEllipse(ctx, -2, -9, 4, 2, C.h, s);
      arcadeEllipse(ctx, -9, -10 + w, 4, 4, C.d, s); arcadeEllipse(ctx, -9, -11 + w, 3, 3, C.hi, s);
      arcadeEllipse(ctx, 8, -10 - w, 4, 4, C.d, s); arcadeEllipse(ctx, 8, -11 - w, 3, 3, C.h, s);
      arcadeR(ctx, -6, 2, 4, 2, C.hi, s); arcadeR(ctx, 4, 1, 5, 2, C.hi, s);
      arcadeFace(ctx, C, s, -3, false);
    } else if (art === 'balloon') {
      arcadePoly(ctx, [[0,-19],[7,-17],[11,-11],[10,-4],[5,1],[1,3],[0,6],[-2,3],[-7,1],[-11,-4],[-12,-11],[-8,-17]], C.m, C.d, s, 2);
      arcadeL(ctx, -6, -15, -3, -7, C.h, 2, s); arcadeL(ctx, 3, -17, 4, -8, C.hi, 2, s);
      arcadeR(ctx, -2, 2, 4, 3, C.d, s); arcadePoly(ctx, [[0,4],[5,7],[1,8],[-1,6],[-4,8],[-3,5]], C.h, C.d, s, 1);
      for (var bt = 0; bt < 4; bt++) arcadeL(ctx, -1, 8 + bt * 2, Math.sin(t * 4 + bt) * 4, 10 + bt * 2, bt % 2 ? C.hi : C.m, 1, s);
      arcadeFace(ctx, C, s, -9, false);
    } else if (art === 'cupcake') {
      arcadePoly(ctx, [[-10,-3],[9,-3],[7,7],[-7,7]], C.m, C.d, s, 2);
      for (var rib = -4; rib <= 4; rib += 4) arcadeL(ctx, rib, -1, rib * 0.72, 6, C.hi, 1, s);
      arcadeEllipse(ctx, 0, -7, 10, 7, C.d, s); arcadeEllipse(ctx, 0, -9, 9, 6, C.h, s);
      arcadeEllipse(ctx, -5, -12, 4, 4, C.h, s); arcadeEllipse(ctx, 3, -14, 4, 5, C.hi, s);
      arcadeR(ctx, 0, -20 + Math.round(w), 4, 5, '#c93655', s); arcadeR(ctx, 1, -20 + Math.round(w), 1, 2, '#fff1a2', s);
      arcadeFace(ctx, C, s, -5, false);
    } else if (art === 'lollipop') {
      arcadeL(ctx, -1, -4, 3 + stride, 10, C.d, 5, s); arcadeL(ctx, 0, -4, 3 + stride, 9, C.hi, 2, s);
      arcadeEllipse(ctx, 0, -12, 10, 10, C.d, s); arcadeEllipse(ctx, 0, -12, 8, 8, C.m, s);
      for (var lp = -6; lp <= 6; lp += 6) arcadeL(ctx, lp, -18, lp + 5, -7, lp < 0 ? C.h : C.hi, 2, s);
      arcadeEllipse(ctx, -2, -17, 3, 2, C.h, s); arcadeFace(ctx, C, s, -10, false);
      arcadeL(ctx, -7, -1, -12, -5 - charge * 3, C.d, 3, s); arcadeL(ctx, 7, -1, 12, -4 - Math.sin(t * 5) * 2 - arm, C.m, 3, s);
    } else if (art === 'eraser') {
      arcadePoly(ctx, [[-12,-8],[-8,-12],[9,-12],[12,-8],[10,4],[6,8],[-9,7],[-12,3]], C.m, C.d, s, 2);
      arcadePoly(ctx, [[-9,-9],[7,-9],[9,-6],[7,-3],[-9,-3]], C.h, null, s);
      arcadeR(ctx, -8, 2, 16, 2, C.d, s); arcadeR(ctx, -6, 3, 11, 1, C.hi, s);
      arcadeL(ctx, -9, -1, -14, 2 + stride * 2, C.d, 3, s); arcadeL(ctx, 8, -1, 14, -2 - arm, C.d, 3, s);
      arcadeEllipse(ctx, -3, -15 + w, 2, 2, C.hi, s); arcadeFace(ctx, C, s, -3, false);
    } else if (art === 'pencil') {
      arcadePoly(ctx, [[-7,-19],[7,-19],[6,7],[0,15],[-6,7]], C.m, C.d, s, 2);
      arcadePoly(ctx, [[-5,-16],[4,-16],[4,3],[-4,3]], C.h, null, s);
      arcadePoly(ctx, [[-6,7],[6,7],[0,15]], '#d69d78', C.d, s, 1); arcadePoly(ctx, [[-2,12],[2,12],[0,16]], '#333346', null, s);
      arcadeR(ctx, -7, -19, 14, 3, C.hi, s); arcadeR(ctx, -3, -20, 6, 1, C.h, s);
      arcadeFace(ctx, C, s, -4, false);
      arcadeL(ctx, -6, -1, -12, 2 + stride * 2, C.d, 2, s); arcadeL(ctx, 6, -2, 12, -5 - arm, C.d, 2, s);
    } else if (art === 'inkpot') {
      arcadePoly(ctx, [[-10,-5],[-7,-11],[7,-11],[10,-5],[8,7],[-8,7]], C.m, C.d, s, 2);
      arcadeR(ctx, -12, -12, 24, 4, C.d, s); arcadeR(ctx, -9, -15, 18, 3, C.h, s);
      arcadeR(ctx, -7, -4, 14, 1, C.h, s); arcadeR(ctx, -8, 4, 3, 2, C.d, s);
      arcadeEllipse(ctx, 0, -16 + Math.round(Math.sin(t * 4) * 2), 3, 4, C.hi, s);
      arcadeFace(ctx, C, s, -2, false);
      for (var drop = 0; drop < 3; drop++) { var dy = (t * 8 + drop * 7) % 15; arcadeR(ctx, 12 + drop * 2, -12 + dy, 1, 2, C.hi, s); }
    } else if (art === 'ruler') {
      arcadePoly(ctx, [[-12,-17],[-5,-19],[9,5],[3,10],[-4,4]], C.m, C.d, s, 2);
      arcadeL(ctx, -8, -15, 4, 5, C.hi, 2, s);
      for (var tick = 0; tick < 6; tick++) arcadeL(ctx, -7 + tick * 2, -11 + tick * 3, -3 + tick * 2, -12 + tick * 3, C.d, 1, s);
      arcadeEllipse(ctx, 1, -3, 6, 7, C.h, s); arcadeFace(ctx, C, s, -4, false);
      arcadeLeg(ctx, -4, 7, stride, C, s, 5); arcadeLeg(ctx, 4, 7, -stride, C, s, 5);
      arcadeL(ctx, -6, -4, -13, -1 + stride, C.d, 2, s); arcadeL(ctx, 7, -3, 13, -7 - arm, C.d, 2, s);
    } else if (art === 'snowball') {
      arcadeLeg(ctx, -4, 3, stride, C, s, 5); arcadeLeg(ctx, 4, 3, -stride, C, s, 5);
      arcadeEllipse(ctx, 0, -1, 9, 8, C.d, s); arcadeEllipse(ctx, -1, -3, 7, 6, C.h, s);
      arcadeEllipse(ctx, 1, -12, 6, 6, C.d, s); arcadeEllipse(ctx, 0, -13, 5, 5, C.hi, s);
      arcadeL(ctx, -7, -5, -12, -11 + stride * 2, '#634633', 2, s); arcadeL(ctx, 7, -5, 12, -10 - stride * 2, '#634633', 2, s);
      arcadeR(ctx, -6, -6, 13, 2, C.m, s); arcadeR(ctx, -6, -5, 13, 1, C.hi, s);
      arcadeR(ctx, -1, -12, 6, 2, '#e98b56', s); arcadeFace(ctx, C, s, -13, false);
      PX(ctx, -8 * s, -3 * s, '#ffffff'); PX(ctx, 6 * s, -1 * s, '#ffffff');
    } else if (art === 'scarf') {
      arcadeEllipse(ctx, 0, -4, 8, 7, C.d, s); arcadeEllipse(ctx, 1, -5, 6, 5, C.m, s);
      arcadeR(ctx, -6, -3, 12, 3, C.h, s); arcadeFace(ctx, C, s, -5, fierce);
      var tail = Math.sin(t * 6 + (e.seed || 0)) * 3 + stride * 2;
      arcadePoly(ctx, [[-3,0],[-10,2],[-17,0],[-24,tail],[-20,tail+3],[-13,5],[-4,4]], C.h, C.d, s, 2);
      arcadePoly(ctx, [[4,0],[10,2],[16,0],[23,-tail], [20,-tail+3],[12,5],[5,4]], C.m, C.d, s, 2);
      arcadeR(ctx, -20, tail, 4, 2, C.hi, s); arcadeR(ctx, 19, -tail, 4, 2, C.hi, s);
      arcadeR(ctx, -8, -10, 6, 2, C.hi, s);
    } else if (art === 'broom') {
      arcadeL(ctx, -4, -19, 4 + stride, 8, C.d, 4, s); arcadeL(ctx, -3, -18, 2 + stride, 4, C.h, 1, s);
      arcadePoly(ctx, [[-7,3],[6,2],[12,8],[8,12],[-10,10],[-12,7]], C.m, C.d, s, 2);
      for (var br = -8; br <= 8; br += 4) arcadeL(ctx, br, 5, br + (br < 0 ? -2 : 2), 10 + Math.abs(br) * 0.15, C.hi, 2, s);
      arcadeEllipse(ctx, -1, -12, 6, 6, C.h, s); arcadeFace(ctx, C, s, -12, false);
      arcadeL(ctx, -4, -6, -10, -3 - stride * 2, C.d, 2, s); arcadeL(ctx, 4, -6, 11, -4 - arm, C.d, 2, s);
    } else if (art === 'icicle') {
      arcadePoly(ctx, [[-9,-16],[-3,-21],[0,-16],[4,-23],[8,-15],[6,3],[3,10],[-3,9],[-8,1]], C.m, C.d, s, 2);
      arcadePoly(ctx, [[-5,-14],[-2,-18],[0,-12],[3,-19],[5,-13],[3,1],[0,5],[-5,0]], C.h, null, s);
      arcadeFace(ctx, C, s, -4, false);
      for (var it = 0; it < 3; it++) { var iy = (t * 10 + it * 8) % 17; arcadeR(ctx, -9 + it * 8, -8 + iy, 2, 3, C.hi, s); }
      arcadeR(ctx, 7, -4, 3, 1, '#ffffff', s);
    } else if (art === 'crystal') {
      arcadePoly(ctx, [[0,-20],[8,-9],[12,-1],[6,9],[-5,8],[-12,-1],[-7,-11]], C.m, C.d, s, 2);
      arcadePoly(ctx, [[0,-18],[2,-2],[-7,-1]], C.h, null, s); arcadePoly(ctx, [[2,-2],[9,-8],[7,6],[1,7]], C.hi, null, s);
      arcadePoly(ctx, [[-6,4],[1,-2],[1,8]], '#4ab3cb', null, s);
      arcadeFace(ctx, C, s, -4, fierce);
      for (var shard = 0; shard < 3; shard++) { var a = t * 1.4 + shard * 2.09; arcadePoly(ctx, [[Math.cos(a)*15,Math.sin(a)*10-5],[Math.cos(a)*19,Math.sin(a)*10-11],[Math.cos(a)*21,Math.sin(a)*10+1]], C.hi, C.d, s, 1); }
    } else if (art === 'rabbit') {
      var earBend = Math.sin(t * 4 + (e.seed || 0)) * 2 + stride;
      arcadeLeg(ctx, -4, 3, stride, C, s, 6); arcadeLeg(ctx, 4, 3, -stride, C, s, 6);
      arcadeEllipse(ctx, -1, -1, 9, 7, C.d, s); arcadeEllipse(ctx, -2, -3, 7, 5, C.h, s);
      arcadePoly(ctx, [[-6,-11],[-10,-27-earBend],[-5,-25-earBend],[0,-11]], C.h, C.d, s, 1);
      arcadePoly(ctx, [[2,-11],[4,-27+earBend],[9,-24+earBend],[8,-9]], C.hi, C.d, s, 1);
      arcadeEllipse(ctx, 3, -12, 7, 6, C.d, s); arcadeEllipse(ctx, 3, -13, 6, 5, C.h, s);
      arcadeR(ctx, 8, -11, 2, 2, '#ee9caa', s); arcadeFace(ctx, C, s, -14, false);
      arcadeEllipse(ctx, -10, -1, 3, 3, C.hi, s);
    } else if (art === 'icecone') {
      arcadePoly(ctx, [[-10,-4],[10,-4],[5,13],[-4,13]], C.d, C.d, s, 1);
      arcadePoly(ctx, [[-8,-3],[8,-3],[4,10],[-3,10]], C.m, null, s);
      for (var waffle = -5; waffle <= 5; waffle += 5) arcadeL(ctx, waffle, -1, waffle * 0.3, 8, C.hi, 1, s);
      arcadeEllipse(ctx, 0, -9, 10, 7, C.d, s); arcadeEllipse(ctx, -1, -12, 7, 5, C.h, s);
      arcadeEllipse(ctx, 4, -17 + w, 4, 4, C.hi, s); arcadeFace(ctx, C, s, -9, false);
      arcadeR(ctx, -7, 2, 3, 2, '#ffffff', s);
    } else if (art === 'frostflower') {
      for (var pet = 0; pet < 8; pet++) {
        var pa = pet * Math.PI / 4 + t * 0.35;
        var px = Math.cos(pa) * 10, py = -8 + Math.sin(pa) * 9;
        arcadePoly(ctx, [[0,-8],[px-3,py-4],[px,py],[px+3,py-3]], pet % 2 ? C.h : C.hi, C.d, s, 1);
      }
      arcadeEllipse(ctx, 0, -7, 6, 6, C.d, s); arcadeEllipse(ctx, 0, -8, 4, 4, C.hi, s);
      arcadeFace(ctx, C, s, -9, false);
      arcadeL(ctx, 0, -1, 0, 10, C.d, 3, s); arcadeL(ctx, -1, 6, -9, 2 + stride * 2, C.m, 2, s); arcadeL(ctx, 1, 7, 8, 4 - stride * 2, C.m, 2, s);
      arcadeR(ctx, -10, 2 + Math.round(w), 4, 2, C.hi, s); arcadeR(ctx, 7, 3 - Math.round(w), 4, 2, C.hi, s);
    } else if (art === 'sandpuff') {
      arcadeEllipse(ctx, 0, -4, 11 + Math.round(stride), 8, C.d, s); arcadeEllipse(ctx, 0, -5, 9, 6, C.m, s);
      arcadePoly(ctx, [[-8,-9],[-5,-14],[-1,-12],[2,-17],[6,-13],[9,-10]], C.h, C.d, s, 1);
      arcadeR(ctx, -4, -11, 3, 2, C.hi, s); arcadeR(ctx, 5, -7, 3, 2, C.hi, s);
      arcadeFace(ctx, C, s, -4, false);
      for (var ds = 0; ds < 7; ds++) { var da = t * 1.5 + ds * 0.9; arcadeR(ctx, Math.cos(da)*15, -4 + Math.sin(da)*9, 2, 2, ds % 2 ? C.hi : C.h, s); }
    } else if (art === 'cactus') {
      arcadePoly(ctx, [[-6,8],[-7,-7],[-5,-13],[-1,-14],[2,-11],[3,-3],[6,-3],[6,-9],[10,-10],[12,-6],[11,5],[8,8]], C.m, C.d, s, 2);
      arcadeR(ctx, -2, -12, 2, 16, C.h, s); arcadeR(ctx, 4, -5, 1, 8, C.hi, s);
      for (var spine = 0; spine < 7; spine++) { var sy = -10 + spine * 3; arcadeR(ctx, -7 - (spine%2), sy, 2, 1, C.hi, s); }
      arcadeFace(ctx, C, s, -6, false);
      arcadePoly(ctx, [[-1,-14],[-5,-19],[-2,-21],[1,-18],[4,-22],[7,-18],[4,-13]], C.hi, C.d, s, 1);
      arcadeLeg(ctx, -3, 7, stride, C, s, 4); arcadeLeg(ctx, 5, 7, -stride, C, s, 4);
    } else if (art === 'beetle') {
      for (var bl = -1; bl <= 1; bl++) { arcadeL(ctx, -3 + bl*5, 0, -7 + bl*7 + stride*2, 6, C.d, 2, s); arcadeL(ctx, 1 + bl*5, 0, 5 + bl*6 - stride*2, 6, C.m, 2, s); }
      arcadeEllipse(ctx, -1, -5, 12, 9, C.d, s); arcadeEllipse(ctx, -2, -7, 10, 7, C.m, s);
      arcadeEllipse(ctx, -4, -10, 3, 2, C.h, s); arcadeEllipse(ctx, 3, -10, 3, 2, C.h, s);
      arcadeL(ctx, 7, -7, 12, -12 + flap*2, C.d, 2, s); arcadeL(ctx, 10, -7, 16, -9 - flap*2, C.d, 2, s);
      arcadeEllipse(ctx, 9, -4, 5, 5, C.d, s); arcadeEllipse(ctx, 10, -5, 4, 4, C.h, s);
      arcadeR(ctx, 8, -7, 2, 2, C.eye, s); arcadeR(ctx, 12, -6, 2, 2, C.eye, s);
      arcadeL(ctx, -3, -12, 0, 1, C.hi, 1, s);
    } else if (art === 'tumbleweed') {
      arcadeEllipse(ctx, 0, -4, 10, 10, C.d, s); arcadeEllipse(ctx, 0, -5, 8, 8, C.m, s);
      for (var tw = 0; tw < 9; tw++) { var ta = t * (2.2 + stride*0.5) + tw * Math.PI * 2 / 9; arcadeL(ctx, Math.cos(ta)*3, -5 + Math.sin(ta)*3, Math.cos(ta)*15, -5 + Math.sin(ta)*14, tw%2 ? C.h : C.d, 2, s); PX(ctx, Math.round(Math.cos(ta)*15*s), Math.round((-5 + Math.sin(ta)*14)*s), C.hi); }
      arcadeEllipse(ctx, 0, -5, 5, 5, C.h, s); arcadeFace(ctx, C, s, -7, false);
    } else if (art === 'carouselKing') {
      var spin = t * 1.4 + (e.seed || 0);
      arcadeL(ctx, 0, -28, 0, 7, '#75402d', 4, s); arcadeL(ctx, 0, -28, 0, 7, C.hi, 1, s);
      arcadePoly(ctx, [[-23,-27],[-16,-30],[16,-30],[23,-27],[20,-22],[16,-20],[-16,-20],[-20,-22]], C.m, C.d, s, 2);
      for (var canopy = -2; canopy <= 2; canopy++) { arcadeR(ctx, canopy*8-3, -29, 6, 3, canopy%2 ? C.hi : C.h, s); arcadeR(ctx, canopy*8-1, -32, 2, 3, C.hi, s); }
      arcadePoly(ctx, [[-15,-17],[-9,-21],[3,-20],[10,-15],[13,-9],[8,-4],[-9,-3],[-17,-8]], C.m, C.d, s, 2);
      arcadePoly(ctx, [[6,-17],[12,-24],[18,-24],[20,-19],[17,-14],[11,-13]], C.h, C.d, s, 2);
      arcadeR(ctx, 15, -23, 3, 2, C.d, s); arcadeR(ctx, 18, -23, 2, 2, C.hi, s);
      arcadePoly(ctx, [[10,-24],[9,-30],[13,-27],[16,-31],[17,-25]], C.hi, C.d, s, 1);
      arcadeEllipse(ctx, -10, -9, 4, 3, C.hi, s);
      arcadeLeg(ctx, -9, -5, Math.sin(t*8), C, s, 11); arcadeLeg(ctx, 6, -5, -Math.sin(t*8), C, s, 11);
      arcadeL(ctx, -13, -13, -19, -9 + flap*2, C.h, 3, s); arcadeL(ctx, -17, -9 + flap*2, -22, -13 + flap*2, C.hi, 2, s);
      arcadeFace(ctx, C, s, -19, false);
      for (var jewel = 0; jewel < 4; jewel++) { var ja = spin + jewel * 1.57; arcadeR(ctx, Math.cos(ja)*26, -15 + Math.sin(ja)*9, 2, 2, C.hi, s); }
    } else if (art === 'boardGiant') {
      arcadeLeg(ctx, -10, 5, stride, C, s, 8); arcadeLeg(ctx, 10, 5, -stride, C, s, 8);
      arcadeL(ctx, -15, -8, -23, -1 - arm, C.d, 5, s); arcadeL(ctx, 15, -8, 23, -16 - arm, C.d, 5, s);
      arcadeL(ctx, 22, -16-arm, 27, -21-arm, C.hi, 3, s); arcadeL(ctx, -22, -1-arm, -27, -5-arm, C.h, 3, s);
      arcadeR(ctx, -19, -24, 38, 30, '#633d2e', s); arcadeR(ctx, -16, -21, 32, 23, C.d, s);
      arcadeR(ctx, -14, -19, 28, 19, C.m, s); arcadeR(ctx, -12, -17, 2, 14, C.h, s);
      arcadeR(ctx, -10, -17, 2, 5, C.hi, s); arcadeR(ctx, 7, -17, 2, 5, C.hi, s);
      arcadeR(ctx, -8, -11, 16, 1, '#d7e7a5', s); arcadeR(ctx, -6, -7, 13, 1, '#d7e7a5', s);
      arcadeFace(ctx, C, s, -13, true);
      arcadeR(ctx, -20, 6, 40, 3, C.h, s);
    } else if (art === 'snowPrincipal') {
      arcadeLeg(ctx, -6, 6, stride, C, s, 5); arcadeLeg(ctx, 6, 6, -stride, C, s, 5);
      arcadeEllipse(ctx, 0, -3, 12, 11, C.d, s); arcadeEllipse(ctx, -1, -5, 10, 9, C.h, s);
      arcadeEllipse(ctx, 1, -18, 9, 9, C.d, s); arcadeEllipse(ctx, 0, -20, 7, 7, C.hi, s);
      arcadeR(ctx, -7, -30, 15, 3, '#38283d', s); arcadeR(ctx, -5, -39, 11, 10, '#332538', s); arcadeR(ctx, -7, -30, 15, 2, C.h, s);
      arcadeR(ctx, -5, -21, 3, 2, C.d, s); arcadeR(ctx, 3, -21, 3, 2, C.d, s); arcadeR(ctx, 6, -18, 4, 2, '#ed9055', s);
      arcadeR(ctx, -3, -6, 3, 3, '#513342', s); arcadeR(ctx, 1, -1, 3, 3, '#513342', s); arcadeR(ctx, -3, 4, 3, 3, '#513342', s);
      arcadeR(ctx, -12, -11, 25, 3, '#a42d48', s); arcadeL(ctx, 9, -10, 15, -2 + flap*2, '#a42d48', 3, s);
      arcadeL(ctx, -10, -5, -19, -1 - arm, '#6d4b3d', 3, s); arcadeL(ctx, 10, -5, 19, -11 - arm, '#6d4b3d', 3, s);
      arcadeR(ctx, 16, -15-arm, 5, 8, '#42657c', s); arcadeFace(ctx, C, s, -21, false);
    } else if (art === 'iceDragon') {
      arcadeLeg(ctx, -9, 3, stride, C, s, 8); arcadeLeg(ctx, 5, 1, -stride, C, s, 7);
      arcadeEllipse(ctx, -3, -4, 15, 9, C.d, s); arcadeEllipse(ctx, -4, -6, 13, 7, C.m, s);
      arcadeR(ctx, -9, -5, 15, 2, C.h, s);
      var wing = Math.sin(t * 8 + (e.seed || 0)) * 7 + charge * 5;
      arcadePoly(ctx, [[-7,-8],[-20,-27-wing],[-12,-23-wing],[-9,-31-wing],[-3,-20-wing],[2,-14]], C.m, C.d, s, 2);
      arcadeL(ctx, -7, -8, -17, -26-wing, C.hi, 1, s); arcadeL(ctx, -7, -8, -9, -29-wing, C.hi, 1, s);
      arcadePoly(ctx, [[-15,-4],[-22,-7+flap],[-27,-15+flap],[-22,-11+flap],[-16,-10]], C.m, C.d, s, 1);
      arcadeL(ctx, 3, -7, 10, -15, C.d, 6, s); arcadeL(ctx, 7, -12, 13, -18, C.m, 4, s);
      arcadePoly(ctx, [[8,-18],[14,-25],[22,-24],[26,-20],[23,-15],[14,-14]], C.h, C.d, s, 2);
      arcadePoly(ctx, [[17,-23],[20,-28],[22,-23]], C.hi, C.d, s, 1); arcadePoly(ctx, [[11,-24],[12,-28],[16,-23]], C.hi, C.d, s, 1);
      arcadeR(ctx, 20, -21, 2, 2, C.eye, s); arcadeR(ctx, 25, -18, 3, 2, C.d, s);
      arcadeL(ctx, 16, -14, 21, -11, C.hi, 2, s); arcadeEllipse(ctx, -19, -22-wing, 3, 2, C.hi, s);
    } else if (art === 'sandPharaoh') {
      arcadeLeg(ctx, -6, 5, stride, C, s, 8); arcadeLeg(ctx, 7, 5, -stride, C, s, 8);
      arcadePoly(ctx, [[-12,-23],[-8,-28],[8,-28],[13,-22],[11,-8],[18,-4],[15,5],[-16,5],[-19,-4],[-11,-9]], C.m, C.d, s, 2);
      for (var stripe = 0; stripe < 5; stripe++) arcadeL(ctx, -11, -22 + stripe*3, 10, -22 + stripe*3 + Math.sin(t*3+stripe)*1, stripe%2 ? C.hi : C.d, 2, s);
      arcadeR(ctx, -8, -28, 17, 8, C.h, s); arcadeR(ctx, -9, -32, 19, 4, C.d, s); arcadeR(ctx, -5, -35, 11, 4, C.hi, s);
      arcadeR(ctx, -6, -25, 14, 12, C.hi, s); arcadeR(ctx, -5, -23, 12, 8, C.m, s);
      arcadeR(ctx, -5, -20, 4, 3, C.d, s); arcadeR(ctx, 3, -20, 4, 3, C.d, s);
      arcadeR(ctx, -4, -19, 3, 2, C.eye, s); arcadeR(ctx, 4, -19, 3, 2, C.eye, s);
      arcadePoly(ctx, [[-1,-15],[4,-14],[3,-8],[0,-5],[-3,-9]], C.h, C.d, s, 1);
      arcadeR(ctx, -10, -7, 21, 3, C.hi, s); arcadeR(ctx, -7, -6, 3, 7, C.d, s); arcadeR(ctx, 0, -6, 3, 7, C.h, s); arcadeR(ctx, 6, -6, 3, 7, C.d, s);
      arcadeL(ctx, 12, -6, 20, 2 + stride*2, C.d, 4, s); arcadeR(ctx, 17, 0, 6, 3, C.hi, s);
      arcadeR(ctx, 18, -17, 3, 17, C.d, s); arcadeR(ctx, 17, -20, 5, 3, C.hi, s); arcadeFace(ctx, C, s, -20, true);
    }
  }

  function drawArcadeCreature(ctx, e, t, sp) {
    var action = e.dying > 0 ? 'defeat' : (e.anim || (e.hitT > 0 ? 'hit' : 'idle'));
    var phase = t * (action === 'walk' ? 8.5 : 2.2) + (e.seed || 0) * 2.7;
    var hitP = e.hitT > 0 ? Math.max(0, Math.min(1, 1 - e.hitT / 0.26)) : 0;
    var deathMax = e.deathMax || 0.28;
    var deathP = e.dying > 0 ? Math.max(0, Math.min(1, 1 - e.dying / deathMax)) : 0;
    var attackP = action === 'attack' ? Math.max(0, Math.min(1, (e.animT || 0) / 0.48)) : 0;
    var spawnP = action === 'spawn' ? Math.max(0.15, Math.min(1, (e.animT || 0) / 0.34)) : 1;
    var s = sp.arcSize || (e.elite ? 1.62 : 1.22), dir = e.facing === 1 ? 1 : -1;
    var bounce = action === 'walk' ? Math.abs(Math.sin(phase)) * 1.4 : Math.sin(phase) * (e.elite ? 0.8 : 0.55);
    if (action === 'attack') bounce -= Math.sin(Math.PI * attackP) * 1.1;
    if (action === 'hit') bounce -= Math.sin(Math.PI * hitP) * 0.8;
    if (action === 'defeat') bounce += deathP * 4;
    var x = Math.round(e.x + (e.kx || 0) + dir * Math.sin(Math.PI * attackP) * (e.elite ? 3.2 : 2.3));
    var y = Math.round(e.y + bounce + (e.ky || 0));
    var stride = action === 'walk' ? Math.sin(phase) : 0;
    var charge = action === 'attack' ? Math.sin(Math.PI * attackP) : 0;
    var rot = action === 'hit' ? dir * 0.08 * Math.sin(Math.PI * hitP) : 0;
    if (action === 'defeat') rot = dir * -0.42 * deathP;
    var sy = y + 9 * s;
    var shadowW = (e.elite ? 18 : 11) * s * (1 - deathP * 0.35);
    for (var sh = 0; sh < 3; sh++) arcadeR(ctx, x / 1 + (0), 0, 1, 1, '#00000000', 1);
    for (var band = 0; band < 3; band++) {
      var sw = shadowW - band * 3 * s;
      R(ctx, Math.round(x - sw), Math.round(sy + band), Math.round(sw * 2), 1, band === 0 ? 'rgba(8,12,20,0.30)' : 'rgba(8,12,20,0.16)');
    }
    if (e.elite && action !== 'defeat') {
      var auraR = 25 * s;
      for (var ai = 0; ai < 12; ai++) {
        var aa = t * 0.7 + ai * Math.PI / 6;
        if (ai % 2 === 0) PX(ctx, x + Math.cos(aa) * auraR, y - 12 * s + Math.sin(aa) * 13 * s, ai % 4 ? sp.pal[2] : sp.pal[3]);
      }
    }
    var C = e.flash > 0 ? { d:'#ffffff', m:'#ffffff', h:'#ffffff', hi:'#ffffff', eye:'#ffffff' }
      : { d:sp.pal[0], m:sp.pal[1], h:sp.pal[2], hi:sp.pal[3], eye:sp.eye };
    var drawX = x + dir * charge * 1.5 * s;
    ctx.save();
    ctx.translate(drawX, y);
    ctx.rotate(rot);
    ctx.scale(dir * spawnP, spawnP * (action === 'defeat' ? 1 - deathP * 0.30 : (1 + Math.sin(t * 2.1 + (e.seed || 0)) * 0.018)));
    drawArcadeDesign(ctx, sp.arc, t, e, s, C, stride, charge, !!e.elite);
    ctx.restore();
    if (action === 'attack') {
      ctx.save(); ctx.globalAlpha = 0.48 + charge * 0.42;
      for (var slash = 0; slash < 7; slash++) {
        var sx = drawX + dir * (10 + charge * 12 + slash * 1.4) * s;
        var sy2 = y - (4 + slash * 1.1) * s + Math.sin(attackP * Math.PI + slash) * 2;
        PX(ctx, sx, sy2, slash % 3 ? C.hi : C.h);
      }
      ctx.restore();
    }
    if (action === 'hit') {
      ctx.save(); ctx.globalAlpha = 0.72 * (1 - hitP);
      PX(ctx, x - 13 * s, y - 15 * s, C.hi); PX(ctx, x + 14 * s, y - 9 * s, C.hi); PX(ctx, x - 9 * s, y + 4 * s, C.hi);
      ctx.restore();
    }
    slashFx(ctx, e, x, y, e.elite ? 24 : 15);
    if (!e.elite && e.hp < e.maxHp) {
      var bw = 28, segs = Math.max(1, Math.min(6, e.segs || 1));
      R(ctx, x - bw/2 - 1, y - 31 * s, bw + 2, 4, 'rgba(8,10,14,0.82)');
      R(ctx, x - bw/2, y - 30 * s, bw * Math.max(0, e.hp / e.maxHp), 2, C.hi);
      for (var sg = 1; sg < segs; sg++) R(ctx, x - bw/2 + bw * sg/segs, y - 31 * s, 1, 4, '#18202d');
    }
  }

'''
s=s[:idx]+helpers+s[idx:]
old="""  function drawCreature(ctx, e, t, sp) {
    if (!sp) return;
    var fl = e.flash > 0;"""
new="""  function drawCreature(ctx, e, t, sp) {
    if (!sp) return;
    if (sp.arcade) { drawArcadeCreature(ctx, e, t, sp); return; }
    var fl = e.flash > 0;"""
if old not in s: raise SystemExit('drawCreature insertion point missing')
s=s.replace(old,new)
# remove a harmless placeholder line added to keep the function's alignment visible in review.
s=s.replace("    for (var sh = 0; sh < 3; sh++) arcadeR(ctx, x / 1 + (0), 0, 1, 1, '#00000000', 1);\n",'')
p.write_text(s,encoding='utf-8')
