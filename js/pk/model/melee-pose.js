import { clamp, ease, mix, samplePose } from './pose-curves.js';

const KEYS = ['armR', 'foreR', 'lean', 'roty', 'bodyX', 'bodyY', 'legR', 'legL', 'kneeR', 'kneeL', 'bladeAngle', 'armDepth'];
const IDLE = [.28, 1, .015, 0, 0, 0, .12, -.14, -.06, -.10, -1.25, -.08];
// 砍下去靠肩膀把胳膊带下来。剑在手里的转角保持正握，不能靠翻腕把刀拧过去。
const CUT = [.50, .48, .22, .16, .08, -.02, .36, -.26, -.28, -.08, -1.42, .10];
const LOAD = [1.55, .66, -.10, -.25, -.04, -.015, .14, -.20, -.16, -.10, .38, -.18];
const CLIPS = {
  wind: [[0, ...IDLE], [.60, ...LOAD], [.73, ...LOAD], [1, ...CUT]],
  leap: [[0, ...IDLE],
    [.23, 1.42, .7, -.10, -.18, -.035, -.025, .32, -.24, -.42, -.35, .27, -.18],
    [.40, 1.58, .58, -.08, -.20, .045, .32, .3, -.12, -.65, -.40, .42, -.12],
    [.42 / .76, ...CUT],
    [.67, .55, .60, .12, .16, .06, -.02, .32, -.24, -.28, -.16, -1.15, .08], [1, ...IDLE]],
  smash: [[0, ...IDLE], [.34, ...LOAD], [.51, ...LOAD],
    [.62 / .94, ...CUT],
    [1, .55, .50, .10, .10, .02, 0, .22, -.18, -.14, -.08, -1.23, .06]],
  aoe: [[0, ...IDLE],
    [.30, .9, .7, -.08, -.55, -.04, -.02, .27, -.30, -.23, -.16, -.45, -.4],
    [.5 / .9, .62, .46, .16, .4, .06, -.02, .30, -.28, -.22, -.16, -1.28, .12],
    [.76, .52, .55, .10, .2, .04, 0, .26, -.24, -.18, -.12, -1.31, .08], [1, ...IDLE]],
};

export function meleePose(p, st, k, data) {
  const frames = CLIPS[st];
  if (frames) {
    samplePose(p, KEYS, frames, k);
    if (st === 'wind' && data.attackVariant === 1) {
      p.roty *= -.7; p.armDepth *= -.65; p.bladeAngle += Math.sin(k * Math.PI) * .18;
    }
    p.hipTurn = -p.roty * .25;
    p.headNod = -p.lean * .12;
    p.roll = Math.sin(k * Math.PI) * .035;
    return;
  }
  if (st === 'recover') {
    const from = data.recoverFrom;
    if (from) for (const key of KEYS) p[key] = mix(from[key] ?? p[key], p[key], ease(k));
    p.hipTurn = -p.roty * .25;
  } else if (st === 'hurt') {
    const w = k < .16 ? ease(k / .16) : Math.pow(1 - clamp((k - .16) / .84), 2);
    p.lean = -.19 * w; p.bodyTilt = -.055 * w; p.bodyX = -.07 * w;
    p.headNod = .13 * w; p.roty = -.10 * w;
    p.legR = mix(.12, -.16, w); p.legL = mix(-.14, .22, w);
    p.kneeR = -.26 * w; p.kneeL = -.12 * w;
  } else if (st === 'block') {
    const w = ease(Math.min(k / .18, (1 - k) / .25));
    p.armL = mix(p.armL, data.hasShield ? .82 : .68, w);
    p.foreL = mix(p.foreL, data.hasShield ? 1.85 : 1.15, w);
    p.armR = mix(p.armR, .5, w); p.foreR = mix(p.foreR, 1.18, w);
    p.bladeAngle = mix(p.bladeAngle, -.38, w);
    p.bodyX = -.035 * w; p.lean = .10 * w;
    p.legR = .24; p.legL = -.3; p.kneeR = -.23; p.kneeL = -.17;
  } else if (st === 'dodge') {
    const w = Math.sin(clamp(k) * Math.PI);
    p.bodyX = -.16 * w; p.bodyTilt = -.08 * w; p.lean = -.08 * w;
    p.legR = mix(.12, -.2, w); p.legL = mix(-.14, .34, w);
    p.kneeR = -.30 * w; p.kneeL = -.15 * w;
  }
}
