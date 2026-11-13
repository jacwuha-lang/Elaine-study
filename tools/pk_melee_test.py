"""武道擂台混战回归：python tools/pk_melee_test.py"""
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server


def room():
    r = server.PKRoom('melee', 'a')
    r.state = 'playing'
    return r


def soldier(r, side, x, lane=0):
    s = r.spawn(side, 0, force=True)
    s.update(x=x, lane=lane, home=lane, hp=99999, max=99999, cd=0)
    return s


def track_attacks(r):
    attacks = {}
    old_emit = r._emit
    def emit(kind, s=None, **kwargs):
        if kind in ('wind', 'leap', 'aoe_wind') and s is not None:
            attacks[s['id']] = attacks.get(s['id'], 0) + 1
        return old_emit(kind, s, **kwargs)
    r._emit = emit
    return attacks


def surround(side):
    random.seed(10 + side)
    r = room()
    sign = 1 if side == 0 else -1
    group = [soldier(r, side, -sign * (4 + i * .7)) for i in range(4)]
    enemy = soldier(r, 1 - side, sign * 4)
    attacks = track_attacks(r)
    for _ in range(240):
        r.step(.05)
    assert all(attacks.get(s['id'], 0) >= 2 for s in group), attacks
    assert attacks.get(enemy['id'], 0) >= 2, attacks
    dx = [(s['x'] - enemy['x']) * sign for s in group]
    dz = [s['lane'] - enemy['lane'] for s in group]
    assert min(dx) < -.5 and max(dx) > .5, (dx, dz)
    assert min(dz) < -.5 and max(dz) > .5, (dx, dz)
    assert all(math.hypot(group[i]['x'] - group[j]['x'],
                          group[i]['lane'] - group[j]['lane']) > .45
               for i in range(4) for j in range(i + 1, 4))


def group_battle():
    random.seed(23)
    r = room()
    units = [soldier(r, side, (-1 if side == 0 else 1) * (4 + i * .7))
             for side in (0, 1) for i in range(4)]
    attacks = track_attacks(r)
    for _ in range(240):
        r.step(.05)
    assert all(attacks.get(s['id'], 0) >= 2 for s in units), attacks
    assert len({s['foe'] for s in units if s['side'] == 0}) >= 2
    assert len({s['foe'] for s in units if s['side'] == 1}) >= 2


def changing_target():
    random.seed(24)
    r = room()
    a = soldier(r, 0, -2)
    first = soldier(r, 1, 0)
    second = soldier(r, 1, 3, .5)
    attacks = track_attacks(r)
    for _ in range(100):
        r.step(.05)
    assert attacks.get(a['id'], 0) > 0
    first['hp'] = 0
    count = attacks[a['id']]
    for _ in range(160):
        r.step(.05)
    assert a['foe'] == second['id'] and attacks.get(a['id'], 0) > count


def intercept():
    r = room()
    a = soldier(r, 0, 0)
    old = soldier(r, 1, 4)
    close = soldier(r, 1, .7)
    a.update(foe=old['id'], slot=0)
    r._build_occ()
    target, _, slot = r._pick_target(a)
    assert target is close and slot >= 0


def hit_range():
    r = room()
    a = soldier(r, 0, 0)
    b = soldier(r, 1, 5)
    a.update(foe=b['id'], st='wind', st_t=server.PK_ACT['wind']['hit'] - .01,
             hit_done=False)
    hits = []
    r._resolve_hit = lambda attacker, target, kind: hits.append(target['id'])
    r._tick_soldier(a, .05)
    assert not hits


if __name__ == '__main__':
    surround(0)
    surround(1)
    group_battle()
    changing_target()
    intercept()
    hit_range()
    print('混战回归：双向四对一围攻、四对四、换目标及攻击距离均通过')
