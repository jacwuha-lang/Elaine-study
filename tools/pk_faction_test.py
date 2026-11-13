"""阵营在真实建房、AI、好友加入、出兵与结算中保持一致。"""
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import server


def main():
    previous_dir = server.PROFILE_DIR
    assertions = 0

    def check(value, message):
        nonlocal assertions
        assert value, message
        assertions += 1

    with tempfile.TemporaryDirectory(prefix="pk_faction_") as directory:
        server.PROFILE_DIR = directory
        try:
            for name in ("faction_host", "faction_guest"):
                Path(server.profile_path(name)).write_text(json.dumps({"sm_stars": 500, "sm_words": {}}), encoding="utf-8")
            for faction, side in (("female", 0), ("male", 1), ("invalid", 0)):
                server.PK_ROOMS.clear()
                result = server.pk_create("faction_host", ai="normal", faction=faction)
                check(result["ok"] and result["side"] == side, "AI player faction")
                room = server.PK_ROOMS[result["code"]]
                check(room.bot["p"]["side"] == 1 - side, "AI occupies opposite faction")
                check({p["side"] for p in room.players} == {0, 1}, "Both camps occupied once")
                for i in range(1, 21):
                    room.find("faction_host")["last_at"] = 0
                    check(server.pk_answer("faction_host", room.code, i, True)["ok"], "Answer accepted")
                check(all(s["side"] == side for s in room.soldiers), "All player troops use selected camp")
                check(any(s["kind"] == "general" for s in room.soldiers), "Selected general spawns")
                check(any(s["kind"] == "mage" for s in room.soldiers), "Mage still spawns")
                mage = next(s for s in room.soldiers if s["kind"] == "mage")
                check(mage["max"] == server.PK_TIERS[2]["hp"] * .5, "Mage stats unchanged by visual size")
                snapshot = room.snapshot("faction_host")
                check(snapshot["me"]["side"] == side, "Snapshot uses selected camp")
                check(snapshot["me"]["faction"] == ("male" if side else "female"), "Snapshot identifies general")

            for faction, side in (("female", 0), ("male", 1)):
                server.PK_ROOMS.clear()
                result = server.pk_create("faction_host", free=True, faction=faction)
                joined = server.pk_join("faction_guest", result["code"], free=True)
                check(joined["ok"] and joined["side"] == 1 - side, "Guest uses available faction")
                room = server.PK_ROOMS[result["code"]]
                check(room.state == "playing", "Friend game starts")
                check(room.snapshot("faction_guest")["op"]["who"] == "faction_host", "Opponent identity preserved")
                for who in ("faction_host", "faction_guest"):
                    check(server.pk_answer(who, room.code, 1, True)["ok"], "Both players can deploy")
                check({s["side"] for s in room.soldiers} == {0, 1}, "Friend armies spawn on opposite sides")
                check(room.soldiers[0]["x"] * (1 if side == 0 else -1) < 0, "Selected army starts at own castle")

            # 四种组合都必须成立：红/蓝只决定模型，左/右只决定城堡与进攻方向。
            for faction in ("male", "female"):
                for deployment, side in (("left", 0), ("right", 1)):
                    server.PK_ROOMS.clear()
                    result = server.pk_create("faction_host", ai="normal", faction=faction, deployment=deployment)
                    room = server.PK_ROOMS[result["code"]]
                    check(result["side"] == side and result["faction"] == faction, "Faction and position are independent")
                    check(result["factions"][side] == faction and len(set(result["factions"])) == 2, "Each camp appears once")
                    check(room.bot["p"]["side"] == 1 - side, "AI uses opposite physical side")
                    check(server.pk_answer("faction_host", room.code, 1, True)["ok"], "Selected side can deploy")
                    soldier = room.soldiers[0]
                    check(soldier["side"] == side and soldier["x"] * (1 if side == 0 else -1) < 0, "Troop starts at selected castle")
                    snapshot = room.snapshot("faction_host")
                    check(snapshot["me"]["faction"] == faction and snapshot["factions"] == result["factions"], "Snapshot preserves room mapping")
                    room.finish(side, "castle")
                    check(room.snapshot("faction_host")["over"]["win"] == side, "Win remains attached to physical side")

                    server.PK_ROOMS.clear()
                    result = server.pk_create("faction_host", free=True, faction=faction, deployment=deployment)
                    joined = server.pk_join("faction_guest", result["code"], free=True)
                    check(joined["side"] == 1 - side and joined["faction"] != faction, "Friend uses available side and faction")
                    check(joined["factions"] == result["factions"], "Both clients receive identical room mapping")
            print(f"PK faction: {assertions} checks passed")
        finally:
            server.PROFILE_DIR = previous_dir
            server.PK_ROOMS.clear()


if __name__ == "__main__":
    main()
