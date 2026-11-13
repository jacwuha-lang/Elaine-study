"""生成不读写玩家档案的真实混战快照，用于前端动作调试。"""
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server


def build_replay():
    random.seed(20261113)
    room = server.PKRoom("motion-preview", "preview")
    room.state = "playing"
    for side in (0, 1):
        sign = 1 if side == 0 else -1
        for i, kind in enumerate(("charge", "charge", "charge", "general", "spearman", "archer", "mage")):
            tier = 3 if kind == "general" else 2 if kind == "mage" else 1
            soldier = room.spawn(side, tier, force=True, kind=kind)
            soldier.update(x=-sign * (4.5 + (i // 3) * 1.4), lane=(i % 3 - 1) * 1.1,
                           home=(i % 3 - 1) * 1.1, hp=99999, max=99999, cd=.09 * i)
    frames, last_event = [], 0
    for _ in range(360):
        room.step(.05)
        snapshot = room.snapshot("preview", last_event)
        frames.append({"t": snapshot["t"], "soldiers": snapshot["soldiers"], "ev": snapshot["ev"]})
        last_event = snapshot["evn"]
    return frames


def build_siege_replay():
    random.seed(20261114)
    room = server.PKRoom("siege-preview", "preview")
    room.state = "playing"
    for i, kind in enumerate(("archer", "thrower", "spearman", "mage")):
        soldier = room.spawn(0, 1, force=True, kind=kind)
        soldier.update(x=server.PK_RIGHT - server.PK_KIND_RANGE[kind] * .85 - .6,
                       lane=(i - 1.5) * 1.05, home=(i - 1.5) * 1.05, cd=.15 * i)
    frames, last_event = [], 0
    for _ in range(240):
        room.step(.05)
        snapshot = room.snapshot("preview", last_event)
        frames.append({"t": snapshot["t"], "soldiers": snapshot["soldiers"], "ev": snapshot["ev"]})
        last_event = snapshot["evn"]
    return frames


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[1] / "assets" / "pk-motion-replay.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    frames = build_replay()
    target.write_text(json.dumps(frames, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Motion replay: {len(frames)} frames / {target.stat().st_size} bytes")
    target = target.with_name("pk-siege-replay.json")
    frames = build_siege_replay()
    target.write_text(json.dumps(frames, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Siege replay: {len(frames)} frames / {target.stat().st_size} bytes")
