"""体型接触、双将军交战及远程攻城回归；不使用玩家档案。"""
import math
from pathlib import Path
import random
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from pk_combat_geometry import contact_distance, melee_reach


def room():
    r = server.PKRoom("contact-test", "preview")
    r.state = "playing"
    return r


def generals():
    for tiers in ((3, 3), (3, 0), (0, 3), (2, 2)):
        random.seed(701 + sum(tiers))
        r = room()
        a, b = [r.spawn(side, tier, force=True) for side, tier in enumerate(tiers)]
        for s, x in ((a, -3), (b, 3)):
            s.update(x=x, lane=0, home=0, cd=0, hp=99999, max=99999)
        minimum = 100
        for _ in range(240):
            r.step(.05)
            distance = math.hypot(a["x"] - b["x"], a["lane"] - b["lane"])
            minimum = min(minimum, distance)
            assert distance >= contact_distance(a, b) - .015, (tiers, distance)
        assert minimum <= melee_reach(a, b) + .05
        assert a["hp"] < a["max"] and b["hp"] < b["max"], tiers
    # 已重叠的出生或纠偏坐标也必须能分离。
    r = room()
    a, b = [r.spawn(side, 3, force=True) for side in (0, 1)]
    a.update(x=0, lane=0); b.update(x=0, lane=0)
    r._separate_soldiers()
    assert math.hypot(a["x"] - b["x"], a["lane"] - b["lane"]) >= contact_distance(a, b) - .01


def ranged_siege():
    for side in (0, 1):
        for kind in ("archer", "thrower", "spearman", "mage"):
            random.seed(91)
            r = room()
            s = r.spawn(side, 1, force=True, kind=kind)
            sign = 1 if side == 0 else -1
            gate_x = server.PK_RIGHT if side == 0 else server.PK_LEFT
            s.update(x=gate_x - sign * server.PK_KIND_RANGE[kind] * .85,
                     lane=0, home=0, cd=0, gate_warm=True)
            initial = r.hp[1 - side]
            launch = None
            for _ in range(50):
                r.step(.05)
                if launch is None:
                    launch = next((e for e in r.ev if e["k"] == "projectile"), None)
                if launch and r.t < launch["at"] + server.PK_PROJECTILE_FLY - 1e-6:
                    assert r.hp[1 - side] == initial, (kind, "damage before landing")
                if r.hp[1 - side] < initial:
                    assert abs(r.t - launch["at"] - server.PK_PROJECTILE_FLY) < 1e-6
                    break
            assert launch and launch["gate"] == 1 - side and launch["kind"] == kind
            assert launch["target"] == 0 and launch["tx"] == gate_x and launch["ty"] > 1
            assert r.hp[1 - side] == initial - s["atk"] * server.PK_GATE_MUL
            assert not any(e["k"] in ("smash_wind", "bash") for e in r.ev), kind
            assert abs(s["x"] - gate_x) > server.PK_GATE_RANGE, kind
            # 即使已经贴在门口，远程兵仍用本兵种射击动作。
            s.update(x=gate_x - sign * .4, st="walk", cd=0)
            r.step(.05)
            assert s["st"] == ("thrust" if kind == "spearman" else "shot")
            # 重新出现敌军时，正常恢复对人作战，不能残留攻城标记。
            enemy = r.spawn(1 - side, 0, force=True)
            enemy.update(x=s["x"] - sign * 1.5, lane=0)
            s.update(st="walk", cd=0)
            r.step(.05)
            assert not s["gate_attack"] and s["foe"] == enemy["id"]


if __name__ == "__main__":
    generals()
    ranged_siege()
    print("Contact checks passed: general spacing, mutual damage, overlap recovery, 8 ranged siege cases and landing timing.")
