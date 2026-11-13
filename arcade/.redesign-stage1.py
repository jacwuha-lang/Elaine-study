from pathlib import Path
p=Path('arcade/src/art.js')
s=p.read_text(encoding='utf-8')
s=s.replace("""  function bakeArcadeWorld(cfg) {
    var scene = cfg.arcade;
    var sky = bakeSkyEx({
      seed: cfg.seed || 5, stars: cfg.stars || 0,
      cloud: null, cloud2: null, cloudN: 0, horizon: cfg.horizon,
      stops: cfg.stops, orb: cfg.orb
    });""", """  function bakeArcadeWorld(cfg) {
    var scene = cfg.arcade;
    var sky = bakeSkyEx({
      seed: cfg.seed || 5, stars: cfg.stars || 0,
      cloud: null, cloud2: null, cloudN: 0, horizon: null,
      stops: cfg.stops, orb: null
    });
    drawArcadeOrb(sky.getContext('2d'), cfg.orb);
""")
old="""    /* 所有 Arcade 背景都保留硬边像素、清晰的地平线和一处高亮焦点。 */
    var vig = scene === 'ice' ? [2, 8, 18] : scene === 'desert' ? [24, 14, 4] : [12, 10, 16];"""
new="""    drawArcadeLandmark(scene, mx, fx, md, px, gx, sky.getContext('2d'));

    /* 所有 Arcade 背景都保留硬边像素、清晰的地平线和一处高亮焦点。 */
    var vig = scene === 'ice' ? [2, 8, 18] : scene === 'desert' ? [24, 14, 4] : [12, 10, 16];"""
if old not in s: raise SystemExit('landmark insertion point missing')
s=s.replace(old,new)
start=s.index('  function bakeArcadeWorld(cfg) {')
insert=s.index('  function bakeArcadeWorld(cfg) {')
helpers=r'''  function drawArcadeOrb(ctx, orb) {
    if (!orb || !ctx) return;
    function disk(cx, cy, r, color) {
      for (var yy = -r; yy <= r; yy++) {
        var hw = Math.floor(Math.sqrt(Math.max(0, r * r - yy * yy)));
        R(ctx, cx - hw, cy + yy, hw * 2 + 1, 1, color);
      }
    }
    var rings = orb.rings || [];
    for (var i = 0; i < rings.length; i++) disk(Math.round(orb.x), Math.round(orb.y), Math.round(rings[i][0]), rings[i][1]);
    var r0 = rings.length ? Math.round(rings[0][0]) : 18;
    for (var ray = 0; ray < 8; ray++) {
      var a = ray * Math.PI / 4, x0 = orb.x + Math.cos(a) * (r0 + 2), y0 = orb.y + Math.sin(a) * (r0 + 2);
      PX(ctx, x0, y0, rings[0] ? rings[0][1] : '#fff0a0');
      if (ray % 2 === 0) PX(ctx, x0 + Math.cos(a), y0 + Math.sin(a), rings[0] ? rings[0][1] : '#fff0a0');
    }
    R(ctx, orb.x - 2, orb.y - 1, 5, 1, '#ffffff');
  }

  function arcadeArch(ctx, cx, baseY, w, h, frame, face, edge, inside) {
    for (var yy = 0; yy < h; yy++) {
      var curve = Math.sin((yy / Math.max(1, h - 1)) * Math.PI / 2);
      var half = Math.round(w * (0.22 + 0.28 * curve));
      R(ctx, cx - half - 3, baseY - h + yy, half * 2 + 6, 1, frame);
      R(ctx, cx - half, baseY - h + yy, half * 2, 1, face);
      if (half > 8) {
        R(ctx, cx - half + 3, baseY - h + yy, 2, 1, edge);
        R(ctx, cx + half - 5, baseY - h + yy, 2, 1, edge);
      }
      if (yy > 12 && yy < h - 2) {
        var gap = Math.max(3, Math.round(half * 0.38));
        R(ctx, cx - gap, baseY - h + yy, gap * 2, 1, inside);
      }
    }
    R(ctx, cx - w * 0.22 - 4, baseY - 3, w * 0.44 + 8, 3, frame);
    R(ctx, cx - w * 0.22 - 1, baseY - 2, w * 0.44 + 2, 1, edge);
  }

  function arcadePixelPoly(ctx, pts, fill, outline, thickness) {
    var minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    for (var y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      var xs = [], scan = y + 0.5;
      for (var j = 0; j < pts.length; j++) {
        var a = pts[j], b = pts[(j + 1) % pts.length];
        if ((a[1] <= scan && b[1] > scan) || (b[1] <= scan && a[1] > scan)) xs.push(a[0] + (scan - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort(function (a, b) { return a - b; });
      for (var k = 0; k + 1 < xs.length; k += 2) {
        var left = Math.ceil(xs[k] - 0.5), right = Math.floor(xs[k + 1] - 0.5);
        if (right >= left) R(ctx, left, y, right - left + 1, 1, fill);
      }
    }
    if (outline) for (var n = 0; n < pts.length; n++) {
      var p0 = pts[n], p1 = pts[(n + 1) % pts.length];
      line(ctx, p0[0], p0[1], p1[0], p1[1], outline, thickness || 2);
    }
  }

  function drawArcadeLandmark(scene, mx, fx, md, px, gx, sky) {
    if (scene === 'candy') {
      arcadeArch(fx, 205, 138, 76, '#71355c', '#e75e9b', '#ffd48a', '#332443');
      R(fx, 174, 196, 132, 4, '#472747'); R(fx, 185, 154, 4, 48, '#ffe19a'); R(fx, 291, 154, 4, 48, '#ffe19a');
      for (var c = 0; c < 9; c++) { PX(fx, 190 + c * 12, 140 + (c % 2) * 3, c % 3 ? '#fff0c2' : '#ff9ec9'); }
      R(fx, 215, 159, 50, 37, '#39233f'); R(fx, 221, 165, 38, 31, '#201d35');
      for (var cb = 0; cb < 6; cb++) R(md, 178 + cb * 24, 214 - (cb % 2) * 3, 10, 2, cb % 2 ? '#fff0bb' : '#ff81ad');
    } else if (scene === 'school') {
      arcadePixelPoly(fx, [[115, 154], [142, 119], [292, 119], [319, 154]], '#4b3c43', '#2a292f', 2);
      R(fx, 124, 151, 186, 52, '#8c563c'); R(fx, 130, 157, 174, 41, '#e6bf76');
      R(fx, 145, 165, 28, 24, '#345860'); R(fx, 184, 165, 28, 24, '#345860');
      R(fx, 223, 165, 28, 24, '#345860'); R(fx, 262, 165, 28, 24, '#345860');
      for (var w = 0; w < 4; w++) { R(fx, 157 + w * 39, 164, 2, 26, '#ffe9a4'); R(fx, 144 + w * 39, 176, 28, 2, '#ffe9a4'); }
      R(fx, 219, 178, 22, 25, '#5a382d'); R(fx, 220, 180, 20, 22, '#302833');
      disc(fx, 220, 139, 10, '#5a3d38'); disc(fx, 220, 139, 7, '#e8d08b');
      R(fx, 219, 133, 2, 6, '#46352e'); R(fx, 220, 138, 5, 2, '#46352e');
      for (var flag = 0; flag < 7; flag++) arcadePixelPoly(md, [[170 + flag * 17, 125], [180 + flag * 17, 128], [170 + flag * 17, 137]], flag % 2 ? '#f4d57c' : '#d96d64', null);
    } else if (scene === 'winter') {
      arcadePixelPoly(fx, [[125, 156], [154, 128], [286, 128], [315, 156]], '#537488', '#2d4b61', 2);
      R(fx, 134, 151, 172, 53, '#b4d4e2'); R(fx, 140, 157, 160, 40, '#547890');
      for (var wi = 0; wi < 4; wi++) { R(fx, 151 + wi * 39, 163, 25, 21, '#f3d79d'); R(fx, 153 + wi * 39, 165, 21, 17, '#42677f'); R(fx, 163 + wi * 39, 163, 2, 21, '#cbe8f1'); }
      R(fx, 212, 176, 24, 28, '#304c60'); R(fx, 219, 183, 10, 21, '#e8b967');
      arcadePixelPoly(fx, [[130, 153], [154, 131], [285, 131], [309, 153]], '#edf8fb', '#ffffff', 1);
      for (var snow = 0; snow < 14; snow++) PX(fx, 142 + snow * 12, 151 + (snow % 3), '#ffffff');
    } else if (scene === 'ice') {
      arcadeArch(fx, 266, 208, 164, 101, '#17395d', '#286d88', '#80e9ed', '#101d3c');
      for (var ic = 0; ic < 9; ic++) {
        var ix = 196 + ic * 17, iy = 194 - (ic % 3) * 5;
        arcadePixelPoly(fx, [[ix - 5, iy], [ix, iy - 20 - (ic % 3) * 5], [ix + 5, iy]], ic % 2 ? '#4ba8c2' : '#83e1e6', '#1e5b78', 1);
        R(fx, ix - 1, iy - 16, 1, 11, '#d5ffff');
      }
      for (var au = 0; au < 4; au++) {
        var ax = au * 19;
        for (var ay = 0; ay < 27; ay++) {
          if ((ay + au) % 3 !== 1) R(sky, ax + Math.floor(ay * 0.46), 52 + ay, 3, 1, au % 2 ? '#55d5c4' : '#6783d0');
        }
      }
      for (var run = 0; run < 28; run++) PX(sky, 82 + run * 10, 77 + Math.round(Math.sin(run * 0.19) * 3), run % 3 ? '#42b8b9' : '#b0f4ed');
    } else {
      arcadePixelPoly(fx, [[122, 196], [134, 149], [150, 149], [160, 196]], '#c38b42', '#684026', 2);
      R(fx, 129, 156, 26, 7, '#e4b45e'); R(fx, 136, 153, 12, 3, '#f5d88c');
      arcadePixelPoly(fx, [[172, 197], [184, 128], [199, 128], [211, 197]], '#b87b3a', '#63402d', 2);
      R(fx, 181, 145, 20, 7, '#dda851'); R(fx, 187, 141, 8, 4, '#f6d77d');
      R(fx, 215, 174, 126, 29, '#8e512d'); R(fx, 221, 164, 114, 10, '#d19449');
      for (var co = 0; co < 5; co++) { var xx = 228 + co * 24; R(fx, xx, 169, 7, 30, '#f0c16a'); R(fx, xx + 2, 170, 2, 26, '#ffe2a0'); }
      R(fx, 220, 201, 118, 4, '#54352b');
      for (var tile = 0; tile < 32; tile++) PX(gx, 170 + tile * 19, 238 + (tile % 2) * 5, tile % 3 ? '#f4ce7a' : '#ac693b');
    }
  }

'''
s=s[:insert]+helpers+s[insert:]
old="""    /* Arcade 的场景本身已经高饱和；把光效压低，保住像素边界和前后景对比。 */
    var arcadeScene = !!L.arcade;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (arcadeScene ? 0.12 : 0.5 + Math.sin(t * 0.5) * 0.06) * (L.warmK || 1);
    ctx.drawImage(L.warm, 0, 0);
    ctx.restore();

    ctx.globalAlpha = (arcadeScene ? 0.10 : 0.55 + Math.sin(t * 0.7) * 0.18) * (L.shaftK || 1);
    ctx.drawImage(L.shafts, 0, 0);
    ctx.globalAlpha = 1;

    var mk = L.mistK || 1;
    ctx.globalAlpha = (arcadeScene ? 0.055 : 0.16) * mk;
    blit(ctx, L.mist, camX * 0.35 + mt * 6, 116);
    ctx.globalAlpha = (arcadeScene ? 0.035 : 0.11) * mk;
    blit(ctx, L.mist, camX * 0.52 + mt * 10, 154);
    ctx.globalAlpha = (arcadeScene ? 0.02 : 0.08) * mk;
    blit(ctx, L.mist, camX * 0.72 + mt * 14, 190);
    ctx.globalAlpha = 1;"""
new="""    var arcadeScene = !!L.arcade;
    if (!arcadeScene) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.5 + Math.sin(t * 0.5) * 0.06) * (L.warmK || 1);
      ctx.drawImage(L.warm, 0, 0);
      ctx.restore();
      ctx.globalAlpha = (0.55 + Math.sin(t * 0.7) * 0.18) * (L.shaftK || 1);
      ctx.drawImage(L.shafts, 0, 0);
      ctx.globalAlpha = 1;
      var mk = L.mistK || 1;
      ctx.globalAlpha = 0.16 * mk; blit(ctx, L.mist, camX * 0.35 + mt * 6, 116);
      ctx.globalAlpha = 0.11 * mk; blit(ctx, L.mist, camX * 0.52 + mt * 10, 154);
      ctx.globalAlpha = 0.08 * mk; blit(ctx, L.mist, camX * 0.72 + mt * 14, 190);
      ctx.globalAlpha = 1;
    }"""
if old not in s: raise SystemExit('light block missing')
s=s.replace(old,new)
s=s.replace("ctx.globalAlpha = 0.42 + 0.32 * Math.sin(t * 2 + i);", "ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 2 + i);")
s=s.replace("seed: 211, kind: 'maple', stops: sky4('#56345e', '#9a5b89', '#df8eaa', '#ffd7a4')", "seed: 211, kind: 'maple', stops: sky4('#332448', '#704064', '#b14e80', '#f194a7')")
s=s.replace("seed: 221, kind: 'maple', stops: sky4('#344959', '#687e78', '#d29a5b', '#f4d188')", "seed: 221, kind: 'maple', stops: sky4('#203a3c', '#356450', '#927041', '#e5bb68')")
s=s.replace("seed: 231, kind: 'pine', stops: sky4('#355473', '#6d96b4', '#afd1e1', '#eaf5fa')", "seed: 231, kind: 'pine', stops: sky4('#233c54', '#4c7595', '#9abdd2', '#deeff5')")
s=s.replace("seed: 241, kind: 'pine', stars: 110, stops: sky4('#101c3c', '#1b3b68', '#34799a', '#72c9d5')", "seed: 241, kind: 'pine', stars: 150, stops: sky4('#101a38', '#172f5d', '#255d78', '#56a7b0')")
s=s.replace("seed: 251, kind: 'maple', stops: sky4('#613b4d', '#a75d43', '#e58d48', '#ffdb86')", "seed: 251, kind: 'maple', stops: sky4('#39243c', '#7c4037', '#cc6338', '#f2ab4e')")
p.write_text(s,encoding='utf-8')
