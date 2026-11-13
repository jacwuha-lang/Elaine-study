from pathlib import Path
p = Path('arcade/src/art.js')
s = p.read_text(encoding='utf-8')
s = s.replace("cloud: cfg.cloud || cfg.t2, cloud2: cfg.cloud2 || cfg.t3,\n      cloudN: cfg.cloudN || 3, horizon: cfg.horizon,", "cloud: null, cloud2: null, cloudN: 0, horizon: cfg.horizon,", 1)
s = s.replace("arcade: true,\n      sky: sky", "arcade: true, arcadeScene: scene,\n      sky: sky", 1)
s = s.replace("21: { arcade: 'candy',   /* 梦幻乐园：棉花糖云、糖果路、气球色 */\n      seed: 211, kind: 'maple', stops: sky4('#ffe8f4', '#ffd3e8', '#ffc4dc', '#fff2da'),", "21: { arcade: 'candy',   /* 梦幻乐园：棉花糖云、糖果路、气球色 */\n      seed: 211, kind: 'maple', stops: sky4('#56345e', '#9a5b89', '#df8eaa', '#ffd7a4'),", 1)
s = s.replace("22: { arcade: 'school',   /* 学习天地：书本山、黑板书架、暖黄灯光 */\n      seed: 221, kind: 'maple', stops: sky4('#fff8e8', '#ffefc8', '#ffe0a0', '#fff6e0'),", "22: { arcade: 'school',   /* 学习天地：书本山、黑板书架、暖黄灯光 */\n      seed: 221, kind: 'maple', stops: sky4('#344959', '#687e78', '#d29a5b', '#f4d188'),", 1)
s = s.replace("23: { arcade: 'winter',   /* 冬日校园：雪覆操场、雪松、晴空 */\n      seed: 231, kind: 'pine', stops: sky4('#e8f4ff', '#cfe8ff', '#b8dcff', '#f4faff'),", "23: { arcade: 'winter',   /* 冬日校园：雪覆操场、雪松、晴空 */\n      seed: 231, kind: 'pine', stops: sky4('#355473', '#6d96b4', '#afd1e1', '#eaf5fa'),", 1)
s = s.replace("24: { arcade: 'ice',   /* 冰雪天地：极光、冰晶洞、青紫夜 */\n      seed: 241, kind: 'pine', stars: 80, stops: sky4('#d8f0ff', '#a8d8f0', '#88c0e8', '#e8f8ff'),", "24: { arcade: 'ice',   /* 冰雪天地：极光、冰晶洞、青紫夜 */\n      seed: 241, kind: 'pine', stars: 110, stops: sky4('#101c3c', '#1b3b68', '#34799a', '#72c9d5'),", 1)
s = s.replace("25: { arcade: 'desert',   /* 炙热沙漠：沙丘、金字塔远景、橙黄 */\n      seed: 251, kind: 'maple', stops: sky4('#ffe8c0', '#ffd090', '#ffb860', '#ffeac8'),", "25: { arcade: 'desert',   /* 炙热沙漠：沙丘、金字塔远景、橙黄 */\n      seed: 251, kind: 'maple', stops: sky4('#613b4d', '#a75d43', '#e58d48', '#ffdb86'),", 1)
old = """    blit(ctx, L.props, camX * 0.75);
    blit(ctx, L.fore, camX * 1.22);
  }

  function drawVignette(ctx) {"""
new = """    blit(ctx, L.props, camX * 0.75);
    blit(ctx, L.fore, camX * 1.22);
    if (L.arcade) drawArcadeAtmosphere(ctx, L.arcadeScene, t, camX);
  }

  function drawArcadeAtmosphere(ctx, scene, t, camX) {
    var colors = scene === 'candy' ? ['#fff0ad', '#ff9dc5']
      : scene === 'school' ? ['#d7e8a0', '#f2d18a']
      : scene === 'winter' ? ['#ffffff', '#b7e6f5']
      : scene === 'ice' ? ['#8bf2f0', '#d2f6ff']
      : ['#ffe0a0', '#e8a34b'];
    for (var i = 0; i < 18; i++) {
      var speed = scene === 'winter' ? 3 : (scene === 'desert' ? 8 : 5);
      var x = ((hash2(i * 17 + 3, 29) * 520 + t * speed * (i % 2 ? 1 : -1) + camX * 0.08) % 500 + 500) % 500 - 10;
      var y = 36 + hash2(i * 31 + 9, 47) * 158 + Math.sin(t * 1.3 + i * 2.2) * 5;
      ctx.globalAlpha = 0.42 + 0.32 * Math.sin(t * 2 + i);
      PX(ctx, x, y, colors[i % 2]);
      if (scene === 'ice' && i % 4 === 0) {
        PX(ctx, x - 1, y, colors[i % 2]); PX(ctx, x + 1, y, colors[i % 2]);
        PX(ctx, x, y - 1, colors[i % 2]); PX(ctx, x, y + 1, colors[i % 2]);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawVignette(ctx) {"""
assert old in s
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
