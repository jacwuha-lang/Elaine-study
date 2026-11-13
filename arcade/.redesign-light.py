from pathlib import Path

art = Path('arcade/src/art.js')
s = art.read_text(encoding='utf-8')
old = """    return {
      sky: sky, mountains: mountains.c, far: far.c, mid: mid.c, near: near.c,
      shafts: bakeShaftsEx(cfg.shaft || cfg.t3, cfg.shaftA || 0.05),"""
new = """    return {
      arcade: true,
      sky: sky, mountains: mountains.c, far: far.c, mid: mid.c, near: near.c,
      shafts: bakeShaftsEx(cfg.shaft || cfg.t3, cfg.shaftA || 0.05),"""
assert old in s
s = s.replace(old, new, 1)
old = """    /* 暖光 */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.5 + Math.sin(t * 0.5) * 0.06) * (L.warmK || 1);
    ctx.drawImage(L.warm, 0, 0);
    ctx.restore();

    /* 光柱（轻微呼吸） */
    ctx.globalAlpha = (0.55 + Math.sin(t * 0.7) * 0.18) * (L.shaftK || 1);
    ctx.drawImage(L.shafts, 0, 0);
    ctx.globalAlpha = 1;

    /* 流动雾带 */
    var mk = L.mistK || 1;
    ctx.globalAlpha = 0.16 * mk;
    blit(ctx, L.mist, camX * 0.35 + mt * 6, 116);
    ctx.globalAlpha = 0.11 * mk;
    blit(ctx, L.mist, camX * 0.52 + mt * 10, 154);
    ctx.globalAlpha = 0.08 * mk;
    blit(ctx, L.mist, camX * 0.72 + mt * 14, 190);
    ctx.globalAlpha = 1;"""
new = """    /* Arcade 的场景本身已经高饱和；把光效压低，保住像素边界和前后景对比。 */
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
assert old in s
s = s.replace(old, new, 1)
art.write_text(s, encoding='utf-8')

game = Path('arcade/src/game.js')
s = game.read_text(encoding='utf-8')
old = """    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.14;
    ctx.imageSmoothingEnabled = true;"""
new = """    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = arcOn() ? 0.018 : 0.14;
    ctx.imageSmoothingEnabled = true;"""
assert old in s
s = s.replace(old, new, 1)
game.write_text(s, encoding='utf-8')
