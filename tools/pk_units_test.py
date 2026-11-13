"""武道擂台兵种、远程攻击和武将回归。"""
import random
import sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server


def room():
    r = server.PKRoom('test', 'a')
    a = r.add('a', 0, 0)
    b = r.add('b', 1, 0)
    r.state = 'playing'
    return r, a, b


def cycling():
    r, a, b = room()
    for p in (a, b):
        for tier, combo in ((0, 1), (1, 3), (2, 8)):
            got = []
            for _ in range(4):
                p['combo'] = combo - 1
                out = r.do_answer(p, True)
                got.append(out['soldier'][5])
            assert got == list(server.PK_KINDS), (p['side'], tier, got)
    r, a, b = room()
    for _ in range(server.PK_MAX_ALIVE):
        r.spawn(0, 0)
    a['combo'] = 19
    out = r.do_answer(a, True)
    assert out['tier'] == 4 and out['soldier'] is None
    assert r.reserve[0] == [(3, 'general'), (server.PK_FANGSHI_TIER, 'mage')]
    r.soldiers[0]['hp'] = 0
    r.step(.05)
    general = [s for s in r.soldiers if s['kind'] == 'general']
    assert len(general) == 1 and any(e['k'] == 'general_spawn' for e in r.ev)


def attributes_and_ranges():
    for tier in range(3):
        r, _, _ = room()
        charge = r.spawn(0, tier)
        for kind in server.PK_KINDS[1:]:
            s = r.spawn(0, tier, kind=kind)
            for key in ('hp', 'atk', 'df', 'hit', 'dodge', 'block', 'crit', 'spd'):
                assert s['stats'][key] == charge['stats'][key] * .5, (tier, kind, key)
            assert s['max'] == charge['max'] * .5
            assert server.PK_KIND_RANGE[kind] > server.PK_REACH


def attacks():
    for kind in server.PK_KINDS[1:]:
        r, _, _ = room()
        s = r.spawn(0, 1, kind=kind)
        target = r.spawn(1, 0)
        s.update(x=0, lane=0, cd=0)
        target.update(x=server.PK_KIND_RANGE[kind] - .3, lane=0, spd=0, hp=9999, max=9999, cd=999)
        hits = []
        real = r._resolve_hit
        def record(a, b, k, mul=None):
            hits.append((a['id'], b['id'], k))
            with patch('server.random.random', side_effect=(0.1, 0.99, 0.99, 0.99)):
                return real(a, b, k, mul)
        r._resolve_hit = record
        for _ in range(40): r.step(.05)
        assert target['hp'] < target['max'], kind
        assert hits and hits[0][1] == target['id'], (kind, hits)
        assert any(e['k'] == 'projectile' and e['kind'] == kind for e in r.ev), kind
        assert abs(s['x'] - target['x']) > 1.1, kind


def projectile_timing():
    for kind in ('archer', 'thrower', 'spearman'):
        r, _, _ = room()
        a = r.spawn(0, 0, kind=kind)
        b = r.spawn(1, 0)
        a.update(x=0, lane=0, cd=0)
        b.update(x=server.PK_KIND_RANGE[kind] - .3, lane=0, cd=999, hp=9999, max=9999)
        observed = []
        r._resolve_hit = lambda attacker, target, attack, mul=None: observed.append((r.t, attack))
        for _ in range(40):
            r.step(.05)
            launches = [e for e in r.ev if e['k'] == 'projectile']
            if launches and observed:
                break
        assert launches and observed, kind
        assert abs(observed[0][0] - launches[0]['at'] - server.PK_PROJECTILE_FLY) < 1e-6
        assert observed[0][1] == ('thrust' if kind == 'spearman' else 'shot')


def close_combat():
    for kind in server.PK_KINDS[1:]:
        r, _, _ = room()
        s = r.spawn(0, 2, kind=kind)
        target = r.spawn(1, 0)
        s.update(x=0, lane=0, cd=0, hp=9999, max=9999)
        target.update(x=.8, lane=0, cd=999, hp=9999, max=9999)
        target['stats']['df'] = 0
        real = r._resolve_hit
        def controlled_hit(a, b, k, mul=None):
            with patch('server.random.random', side_effect=(0.0, 1.0, 1.0, 1.0)):
                return real(a, b, k, mul)
        r._resolve_hit = controlled_hit
        for _ in range(8): r.step(.05)
        close_dmg = target['max'] - target['hp']
        assert any(e['k'] == 'bash' for e in r.ev), kind
        assert not any(e['k'] == 'projectile' for e in r.ev), kind
        assert close_dmg > 0, kind
        target['hp'] = target['max']
        r._resolve_hit(s, target, 'shot' if kind != 'spearman' else 'thrust')
        ranged_dmg = target['max'] - target['hp']
        assert abs(close_dmg * 3 - ranged_dmg) < 1e-8, (kind, close_dmg, ranged_dmg)


def combat_event_attribution():
    r, _, _ = room()
    attacker = r.spawn(0, 0)
    target = r.spawn(1, 0)
    target['stats']['dodge'] = 0
    target['stats']['block'] = 0
    with patch('server.random.random', side_effect=(0.0, 1.0, 1.0)):
        r._resolve_hit(attacker, target, 'wind')
    hit = next(e for e in reversed(r.ev) if e['k'] == 'hit')
    assert hit['id'] == target['id'] and hit['attacker'] == attacker['id']

    target['stats']['block'] = 1
    with patch('server.random.random', side_effect=(0.0, 1.0, 0.0)):
        r._resolve_hit(attacker, target, 'wind')
    block = next(e for e in reversed(r.ev) if e['k'] == 'block')
    assert block['id'] == target['id'] and block['attacker'] == attacker['id']

    attacker.update(x=0, lane=0)
    target.update(x=1, lane=0, hp=target['max'])
    r._boss_aoe(attacker)
    aoehit = next(e for e in reversed(r.ev) if e['k'] == 'aoehit')
    assert aoehit['id'] == target['id'] and aoehit['attacker'] == attacker['id']


def general():
    r, a, _ = room()
    a['combo'] = 19
    out = r.do_answer(a, True)
    general = next(s for s in r.soldiers if s['kind'] == 'general')
    assert out['tier'] == 4 and general['kind'] == 'general'
    assert general['stats']['atk'] == server.PK_TIERS[3]['atk']
    assert any(e['k'] == 'general_spawn' for e in r.ev)
    general['hp'] = general['max'] / 3
    general['aoe_cd'] = 0
    enemy = r.spawn(1, 0)
    general.update(x=0, lane=0)
    enemy.update(x=.9, lane=0, hp=9999, max=9999, cd=999)
    for _ in range(40): r.step(.05)
    kinds = [e['k'] for e in r.ev]
    assert general['healed'] and 'bossheal' in kinds
    assert 'aoe' in kinds and 'aoehit' in kinds


if __name__ == '__main__':
    random.seed(4)
    cycling(); attributes_and_ranges(); attacks(); projectile_timing(); close_combat(); combat_event_attribution(); general()
    print('兵种回归通过：分等级轮换、后备武将、全部属性、远近程攻击与武将技能')
