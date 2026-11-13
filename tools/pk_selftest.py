#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pk_selftest.py — 武道擂台的服务端逻辑自测
=====================================================================
不联网、不启服务，直接把 server.py 里的对战引擎拉出来跑：

  · 出兵等级跟连击的对应关系
  · 兵会往前走、会互相砍、摸到城门会掉血
  · 城堡倒了以后「赢的是哪一边」（这里以前写反过，专门盯一下）
  · 赢家 +75、报名 -50、取消退 50，而且真的写进档案文件
  · 掉线 / 超时这些收尾分支

跑法：  python tools/pk_selftest.py
"""

import json
import math
import os
import random
import shutil
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import server  # noqa: E402

PASS = [0]
FAIL = []


def ok(name, cond):
    if cond:
        PASS[0] += 1
    else:
        FAIL.append(name)
        print("  x " + name)


def mkprofile(name, stars):
    d = {"sm_stars": stars, "sm_words": {},
         "arcade": {"runs": 0, "bestTier": 0, "runPending": None}}
    p = server.profile_path(name)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False)


def stars_of(name):
    with open(server.profile_path(name), encoding="utf-8") as f:
        return json.load(f)["sm_stars"]


def fresh_room(a="pk_a", b="pk_b"):
    server.PK_ROOMS.clear()
    r = server.PKRoom("1000", a)
    r.add(a, 0, 500)
    r.add(b, 1, 500)
    r.state = "playing"
    server.PK_ROOMS["1000"] = r
    return r


def answer(room, who, ok_):
    """绕过 250ms 限速直接调 pk_answer"""
    p = room.find(who)
    if p:
        p["last_at"] = 0
    return server.pk_answer(who, room.code, (p["seq"] if p else 0) + 1, ok_)


def main():
    tmp = tempfile.mkdtemp(prefix="pk_test_")
    old_dir = server.PROFILE_DIR
    server.PROFILE_DIR = tmp
    try:
        mkprofile("pk_a", 500)
        mkprofile("pk_b", 500)

        # ---------- 1. 建房扣 50 ----------
        r = server.pk_create("pk_a")
        ok("建房成功", r.get("ok") is True)
        ok("给了 4 位房间号", len(str(r.get("code"))) == 4)
        ok("扣了 50 星", stars_of("pk_a") == 450)
        ok("返回余额是 450", r.get("stars") == 450)
        ok("报名费写的是 50", r.get("entry") == 50)
        ok("奖励写的是 75", r.get("win") == 75)

        code = r["code"]
        # 同一个人不能自己跟自己打
        j = server.pk_join("pk_a", code)
        ok("自己进不了自己的房", j.get("ok") is False)

        # ---------- 2. 对手加入，比赛开始 ----------
        j = server.pk_join("pk_b", code)
        ok("对手加入成功", j.get("ok") is True)
        ok("对手是 1 号位", j.get("side") == 1)
        ok("对手也扣 50", stars_of("pk_b") == 450)
        room = server.PK_ROOMS[code]
        ok("状态变成 playing", room.state == "playing")

        # ---------- 3. 连击 → 出兵等级 ----------
        # 规则：3 的倍数出二级兵、8 的倍数出三级兵、20 的倍数出武将，
        # 同时踩中好几个取最高的那个（24 → 三级兵，60 → 武将）。
        want = {1: 0, 2: 0, 3: 1, 4: 0, 5: 0, 6: 1, 7: 0, 8: 2,
                9: 1, 15: 1, 16: 2, 20: 3, 24: 2, 40: 3, 60: 3}
        ok("连击 → 兵种对照表全对",
           all(server.tier_for_combo(c) == t for c, t in want.items()))
        ok("24 是 3 和 8 的公倍数，出三级兵", server.tier_for_combo(24) == 2)
        ok("60 是 3 和 20 的公倍数，出武将", server.tier_for_combo(60) == 3)

        room.players[0]["seq"] = 0
        room.players[0]["last_at"] = 0
        t1 = []
        for i in range(1, 9):
            res = server.pk_answer("pk_a", code, i, True)
            room.players[0]["last_at"] = 0
            t1.append(res.get("tier"))
        ok("第 1 个答对出 1 级兵", t1[0] == 1)
        ok("第 3 连击出 2 级兵", t1[2] == 2)
        ok("第 8 连击出 3 级兵", t1[7] == 3)
        ok("每次答对都出一个兵", len(room.soldiers) == 8)
        ok("连击数跟着涨", room.players[0]["combo"] == 8)

        res = server.pk_answer("pk_a", code, 9, False)
        ok("答错连击清零", res.get("combo") == 0)
        ok("答错不出兵", len(room.soldiers) == 8)
        ok("答错记了一次", room.players[0]["wrong"] == 1)

        # 重复的 seq 不重复出兵
        n0 = len(room.soldiers)
        server.pk_answer("pk_a", code, 9, True)
        ok("同一个 seq 不会重复出兵", len(room.soldiers) == n0)

        # ---------- 4. 兵会走、会砍门 ----------
        room.soldiers.clear()
        s = room.spawn(0, 0)
        x0 = s["x"]
        for _ in range(20):
            room.step(0.05)
        ok("兵往对面走", s["x"] > x0 + 0.5)
        ok("没到城门前不掉血", room.hp[1] == server.PK_CASTLE_HP)

        s["x"] = server.PK_RIGHT - 0.5
        hp_before = room.hp[1]
        for _ in range(40):          # 2 秒，够砍两下
            room.step(0.05)
        ok("贴到城门会砍城门", room.hp[1] < hp_before)

        # ---------- 5. 谁倒了谁是输家 ----------
        room.soldiers.clear()
        room.hp = [server.PK_CASTLE_HP, 0]
        room.step(0.05)
        ok("右城倒了，左（0 号位）获胜", room.over and room.over["win"] == 0)
        ok("状态变成 over", room.state == "over")
        ok("赢家拿了 75（450+75）", stars_of("pk_a") == 525)
        ok("输家没有补偿", stars_of("pk_b") == 450)
        ok("结算里有用时", "dur" in (room.over or {}))
        ok("结算原因是 castle", (room.over or {}).get("reason") == "castle")

        # 反过来：左城倒了，1 号位赢
        server.PK_ROOMS.clear()
        mkprofile("pk_a", 500)
        mkprofile("pk_b", 500)
        r = server.pk_create("pk_a")
        server.pk_join("pk_b", r["code"])
        room2 = server.PK_ROOMS[r["code"]]
        room2.hp = [0, server.PK_CASTLE_HP]
        room2.step(0.05)
        ok("左城倒了，右（1 号位）获胜", room2.over and room2.over["win"] == 1)
        ok("这次赢的是 pk_b（450+75）", stars_of("pk_b") == 525)

        # ---------- 6. 超时按血量判 ----------
        server.PK_ROOMS.clear()
        r = server.pk_create("pk_a")
        server.pk_join("pk_b", r["code"])
        room3 = server.PK_ROOMS[r["code"]]
        room3.hp = [300, 100]
        room3.t = server.PK_MAX_TIME - 0.01
        room3.step(0.05)
        ok("超时血多的一方赢", room3.over and room3.over["win"] == 0)
        ok("结算原因是 time", (room3.over or {}).get("reason") == "time")

        # ---------- 7. 取消退星 ----------
        server.PK_ROOMS.clear()
        mkprofile("pk_a", 500)
        r = server.pk_create("pk_a")
        code = r["code"]
        ok("开房后 450", stars_of("pk_a") == 450)
        c = server.pk_cancel("pk_a", code)
        ok("取消成功", c.get("ok") is True)
        ok("退回 50", stars_of("pk_a") == 500)
        ok("房间没了", code not in server.PK_ROOMS)
        ok("重复取消不会多退", server.pk_cancel("pk_a", code).get("ok") is True
           and stars_of("pk_a") == 500)

        # 已经开打就不能退
        r = server.pk_create("pk_a")
        server.pk_join("pk_b", r["code"])
        c = server.pk_cancel("pk_a", r["code"])
        ok("开打之后退不了", c.get("ok") is False)

        # ---------- 8. 星星不够 ----------
        mkprofile("pk_poor", 10)
        r = server.pk_create("pk_poor")
        ok("星星不够开不了房", r.get("ok") is False)
        ok("星星不够时余额不变", stars_of("pk_poor") == 10)

        # ---------- 9. 掉线判负 ----------
        server.PK_ROOMS.clear()
        mkprofile("pk_a", 500)
        mkprofile("pk_b", 500)
        r = server.pk_create("pk_a")
        server.pk_join("pk_b", r["code"])
        room4 = server.PK_ROOMS[r["code"]]
        room4.players[1]["seen"] = time.time() - 99
        server.PK_ROOMS.clear()      # 让 tick 不管别的房
        server.PK_ROOMS[r["code"]] = room4
        # 直接走一次掉线判定（tick 里的逻辑）
        for p in room4.players:
            if time.time() - p["seen"] > server.PK_DISCONNECT:
                room4.finish(1 - p["side"], "offline")
                break
        ok("掉线判负，对手赢", room4.over and room4.over["win"] == 0)
        ok("掉线结算写 offline", (room4.over or {}).get("reason") == "offline")

        # ---------- 10. 快照结构 ----------
        snap = room4.snapshot("pk_a")
        for k in ("v", "state", "t", "hp", "soldiers", "me", "op", "over", "max", "players"):
            ok("快照有 " + k, k in snap)
        ok("快照里认得出自己的位置", snap["me"]["side"] == 0)
        ok("快照里带着对手名字", snap["op"]["who"] == "pk_b")
        ok("城堡血量上限是 5000", snap["max"] == 5000)

        # ---------- 11. 对不上号的人 ----------
        server.PK_ROOMS.clear()
        mkprofile("pk_a", 500)
        mkprofile("pk_b", 500)
        rr = server.pk_create("pk_a")
        server.pk_join("pk_b", rr["code"])
        ok("陌生人不能答题", server.pk_answer("nobody", rr["code"], 1, True).get("ok") is False)
        ok("陌生人进不了房", server.pk_join("nobody", rr["code"]).get("ok") is False)
        ok("错的房间号进不去", server.pk_join("pk_a", "0000").get("ok") is False)

        # ---------- 12. 扣血买提示 ----------
        server.PK_ROOMS.clear()
        mkprofile("pk_a", 500)
        mkprofile("pk_b", 500)
        hr = server.pk_create("pk_a")
        server.pk_join("pk_b", hr["code"])
        hroom = server.PK_ROOMS[hr["code"]]
        base_hp = hroom.hp[0]

        stranger = server.pk_hint("nobody", hr["code"])
        ok("陌生人买不了提示", stranger.get("ok") is False)

        h1 = server.pk_hint("pk_a", hr["code"])
        ok("买得到第一次提示", h1.get("ok") is True)
        ok("第一次扣 25 血", h1.get("cost") == server.PK_HINT_COST)
        ok("客户端拿得到最新血量", h1.get("hp")[0] == base_hp - 25)
        ok("买提示不动对手的城堡", h1.get("hp")[1] == base_hp)

        hroom.players[0]["last_hint"] = 0        # 绕过 0.5s 的手速限制
        h2 = server.pk_hint("pk_a", hr["code"])
        ok("同一题买得到第二次", h2.get("ok") is True and h2.get("hints") == 2)
        hroom.players[0]["last_hint"] = 0
        h3 = server.pk_hint("pk_a", hr["code"])
        ok("同一题第三次被拒", h3.get("ok") is False)
        ok("被拒时不扣血", hroom.hp[0] == base_hp - 50)

        # 答一题（seq 前进）→ 新题重新给两次额度
        server.pk_answer("pk_a", hr["code"], 1, True)
        hroom.players[0]["last_hint"] = 0
        h4 = server.pk_hint("pk_a", hr["code"])
        ok("换题后额度恢复", h4.get("ok") is True and h4.get("hints") == 1)

        # 血快没的时候不能把自己点死
        hroom.hp[0] = 10
        hroom.players[0]["last_hint"] = 0
        hroom.players[0]["hint_seq"] = -1
        h5 = server.pk_hint("pk_a", hr["code"])
        ok("血少时只扣到剩 1 点", h5.get("ok") is True and hroom.hp[0] == 1)
        hroom.players[0]["last_hint"] = 0
        h6 = server.pk_hint("pk_a", hr["code"])
        ok("剩 1 点血就买不了了", h6.get("ok") is False)

        # ---------- 13. 面对面打架 ----------
        # 以前只比 |Δx|，两条道差 6 米也照砍，看着就是隔空挥剑。
        server.PK_ROOMS.clear()
        r = server.pk_create("pk_a")
        server.pk_join("pk_b", r["code"])
        crm = server.PK_ROOMS[r["code"]]
        crm.state = "playing"
        crm.soldiers.clear()
        a = crm.spawn(0, 0)
        b = crm.spawn(1, 0)
        a["x"], b["x"] = -2.0, 2.0
        a["lane"], b["lane"] = -3.0, 3.0          # 故意摆在路的两头
        near = 99.0
        for _ in range(400):                      # 20 秒
            crm.step(0.05)
            if a["hp"] > 0 and b["hp"] > 0:
                near = min(near, math.hypot(a["x"] - b["x"], a["lane"] - b["lane"]))
        ok("会各自换道走到一起（最近距离 <= 攻击距离）", near <= server.PK_REACH + 0.05)
        ok("确实打起来了（有人掉血）",
           a["hp"] < a["max"] or b["hp"] < b["max"])

        # 隔空不打：离得远的一刀不能掉血
        server.PK_ROOMS.clear()
        r = server.pk_create("pk_a")
        server.pk_join("pk_b", r["code"])
        crm2 = server.PK_ROOMS[r["code"]]
        crm2.state = "playing"
        crm2.soldiers.clear()
        s1 = crm2.spawn(0, 0)
        s2 = crm2.spawn(1, 0)
        s1["x"], s2["x"] = 0.0, 2.2               # 2.2 米开外
        s1["lane"], s2["lane"] = 0.0, 0.0
        hp0 = s2["hp"]
        s1["st"], s1["cd"], s1["foe"] = "wind", 0.0, s2["id"]
        for _ in range(20):
            crm2.step(0.05)
            if s1["x"] > 0.4:
                break                              # 让他往前走是可以的，别钉在原地
        ok("离着一米多挥空刀不掉血", s2["hp"] == hp0 or s1["x"] > 0.4)

        # 有来有回：连着打几场 1v1，格挡、闪避、命中都该出现
        server.PK_ROOMS.clear()
        r = server.pk_create("pk_a")
        server.pk_join("pk_b", r["code"])
        crm3 = server.PK_ROOMS[r["code"]]
        crm3.state = "playing"
        crm3.soldiers.clear()
        kinds = set()
        both_hurt = False
        for _trial in range(10):          # 格挡是概率触发的，多打几轮免得偶发不过
            crm3.soldiers.clear()
            x1 = crm3.spawn(0, 1)
            x2 = crm3.spawn(1, 1)
            x1["x"], x2["x"] = -0.45, 0.45
            x1["lane"] = x2["lane"] = 0.0
            for _ in range(600):
                crm3.step(0.05)
                if x1["hp"] <= 0 or x2["hp"] <= 0:
                    break
            kinds |= set(e["k"] for e in crm3.ev)
            if x1["hp"] < x1["max"] and x2["hp"] < x2["max"]:
                both_hurt = True
        ok("1v1 里出现了格挡", "block" in kinds)
        ok("1v1 里出现了闪避", "dodge" in kinds)
        ok("1v1 里出现了命中", "hit" in kinds)
        ok("两边都挨过刀（不是一边倒）", both_hurt)

        # 事件带坐标，客户端才按得按远近配音量
        e0 = crm3.ev[0]
        ok("事件里有位置和阵营", "x" in e0 and "l" in e0 and "s" in e0)
        ok("事件带自增 id", all(crm3.ev[i]["i"] < crm3.ev[i + 1]["i"]
                             for i in range(len(crm3.ev) - 1)))

        # 砸城门：贴到门下应该是 smash 动作，而不是空挥
        server.PK_ROOMS.clear()
        r = server.pk_create("pk_a")
        server.pk_join("pk_b", r["code"])
        crm4 = server.PK_ROOMS[r["code"]]
        crm4.state = "playing"
        crm4.soldiers.clear()
        g1 = crm4.spawn(0, 0)
        g1["x"] = server.PK_RIGHT - 0.4
        g1["cd"] = 0.0
        hp_gate = crm4.hp[1]
        seen_smash = False
        for _ in range(80):
            crm4.step(0.05)
            if g1["st"] == "smash":
                seen_smash = True
        ok("贴到城门会摆出砸门动作", seen_smash)
        ok("砸门真的掉血", crm4.hp[1] < hp_gate)
        ok("砸门有单独的音效事件", "smash" in set(e["k"] for e in crm4.ev))

        # 快照结构（字段只增不减：9 个基础字段 + 后面追加的 kind，
        # 所以断言用 >=，别写死个数，免得加一个字段就红）
        snap = crm4.snapshot("pk_a", 0)
        troop = snap["soldiers"][0]
        ok("快照里每个兵带动作码", len(troop) >= 9 and troop[8] == crm4.soldiers[0]["foe"])
        ok("快照里带事件流", "ev" in snap and "evn" in snap)
        # 只取增量：给一个大 id，就不该再有事件回来
        ok("事件支持增量拉取", crm4.snapshot("pk_a", crm4.evn)["ev"] == [])

        # ---------- 14. 宽正面：还是一條路，但四把刀能同时砍一个人 ----------
        server.PK_ROOMS.clear()
        r = server.pk_create("pk_a")
        server.pk_join("pk_b", r["code"])
        q = server.PK_ROOMS[r["code"]]
        q.state = "playing"
        q.soldiers.clear()
        qa1 = q.spawn(0, 0)
        qb1 = q.spawn(1, 0)
        qa1["x"], qb1["x"] = -1.0, 1.0
        gap = 99.0
        for _ in range(120):
            q.step(0.05)
            if qa1["hp"] > 0 and qb1["hp"] > 0:
                gap = min(gap, math.hypot(qa1["x"] - qb1["x"],
                                          qa1["lane"] - qb1["lane"]))
        ok("走到接触距离开打，身体不贴脸重叠",
           server.contact_distance(qa1, qb1) - .02 <= gap <= server.melee_reach(qa1, qb1) + .10)
        ok("七列都在同一条路上（|lane| <= 2.4）",
           all(abs(x["lane"]) <= 2.4 for x in q.soldiers))

        # 六个打一个：最多四个围上去，第五个得走开
        q.soldiers.clear()
        boss = q.spawn(1, 3)
        boss["x"] = 0.0
        boss["hp"] = boss["max"] = 9999      # 当靶子，别一轮就倒
        mine = [q.spawn(0, 2) for _ in range(6)]
        for i, m in enumerate(mine):
            m["x"] = -4.0 - i * 0.6
            m["hp"] = m["max"] = 9999     # 两边都不许死，只看站位
        for _ in range(140):                 # 7 秒，够他们全部就位
            q.step(0.05)
        onboss = [m for m in mine if m["foe"] == boss["id"] and m["slot"] >= 0]
        ok("一个敌人最多四个人同时砍", len(onboss) == server.PK_MAX_ATK)
        ok("挤不进来的在外圈等着（不硬往里挤）",
           all(m["slot"] == -1 for m in mine if m not in onboss))
        ds = []
        for i in range(len(onboss)):
            for j in range(i + 1, len(onboss)):
                ds.append(math.hypot(onboss[i]["x"] - onboss[j]["x"],
                                     onboss[i]["lane"] - onboss[j]["lane"]))
        ok("四个人是先后错开站，不是四个重影（最近也隔开 0.12 米）", min(ds) > 0.12)

        # ---------- 14b. 围攻圈：正面 / 侧翼 / 背后 ----------
        slots_used = set(m["slot"] for m in onboss)
        ok("四个人占的是四个不同的位子", len(slots_used) == len(onboss))
        ok("有人在侧面或背后砍（不只是排一条横线）",
           any(i >= 3 for i in slots_used))
        # 侧翼位上的人和敌人几乎并排 —— 屏幕上就是「背对/正对镜头」那个姿势
        flank = [m for m in onboss if m["slot"] in (3, 4)]
        ok("侧翼位站在按体型扩大的目标侧面",
           all(abs(m["x"] - boss["x"]) <= .45 * server.melee_reach(m, boss) for m in flank))
        ok("侧翼位在实际攻击范围内，且身体没有重叠",
           all(server.contact_distance(m, boss) - .03 <= math.hypot(m["x"] - boss["x"], m["lane"] - boss["lane"])
               <= server.melee_reach(m, boss) + .1 for m in flank))

        # 从侧面走过去的人，前面几格被占了就能占到「背后」那两格
        q.soldiers.clear()
        tgt = q.spawn(1, 3)
        tgt["x"], tgt["lane"] = 0.0, 0.0
        tgt["hp"] = tgt["max"] = 9999
        tgt["spd"] = 0.0                      # 靶子站定，方便看走位
        fill = []
        for i in (0, 1, 2):                   # 正面三格先占住（最多四人，只能占三格）
            f = q.spawn(0, 2)
            f["hp"] = f["max"] = 9999
            f["foe"], f["slot"] = tgt["id"], i
            sx, sz = q._slot_xy(tgt, i)
            f["x"], f["lane"] = sx, sz
            f["st"] = "wind"                  # 当作已经在砍，位子就算占了
            fill.append(f)
        flanker = q.spawn(0, 2)
        # 已经绕到靶子背后（靶子在 0，我方在左 → 背后就是 x > 0）
        flanker["x"], flanker["lane"] = 0.40, 0.20
        flanker["hp"] = flanker["max"] = 9999
        for _ in range(80):
            q.step(0.05)
        ok("正面三个位子都占满时，会绕到背后去砍（位子 5 或 6）",
           flanker["slot"] in (5, 6))

        # ---------- 14c. 防卡：让路机制 ----------
        u = q.spawn(0, 1)
        u["foe"], u["slot"] = tgt["id"], 0
        u["still"] = server.PK_STILL_MAX
        u["hits"] = 0
        q._unstick(u)
        ok("挤住了会把位子放开、横着让一段", u["detour"] > 0 and u["slot"] == -1)
        first = u["detour_sign"]
        u["still"] = server.PK_STILL_MAX
        u["hits"] = 1                          # 连续第二次
        q._unstick(u)
        ok("连着卡两次就暂时躲开这个目标（换个目标找机会）",
           u["avoid"] == tgt["id"] and u["avoid_t"] > 0)
        ok("让路方向有正有负（不会整队往同一边平移）",
           first in (1, -1) and u["detour_sign"] in (1, -1))

        # 真的被两个不走路的同伴堵死在同一条道上：得横着挪出去再往前
        q.soldiers.clear()
        wall_foe = q.spawn(1, 0)
        wall_foe["x"] = 6.0
        wall_foe["spd"] = 0.0
        wall_foe["hp"] = wall_foe["max"] = 9999
        me = q.spawn(0, 1)
        me["x"], me["lane"] = 0.0, 0.0
        me["hp"] = me["max"] = 9999
        for i in range(2):
            w = q.spawn(0, 1)
            w["x"], w["lane"] = 0.45 + i * 0.05, 0.02 * i
            w["spd"] = 0.0
            w["hp"] = w["max"] = 9999
        furthest_lane = 0.0
        for _ in range(60):                   # 3 秒
            q.step(0.05)
            furthest_lane = max(furthest_lane, abs(me["lane"]))
        ok("被同伴堵住时会横向绕行或挤开继续前进", furthest_lane > 0.15 or me["x"] > 1.5)
        ok("换道之后继续往敌人那边推", me["x"] > 1.5)

        # ---------- 14d. 接触：靠近就出手，不用先顶死在位子上 ----------
        q.soldiers.clear()
        f2 = q.spawn(1, 0)
        f2["x"], f2["lane"] = 0.0, 0.0
        f2["spd"] = 0.0
        f2["hp"] = f2["max"] = 9999
        near1 = q.spawn(0, 1)
        near1["x"], near1["lane"] = -0.85, 0.50    # 还没走到正对位（-0.86, 0）
        near1["hp"] = near1["max"] = 9999
        hit = []
        for _ in range(30):                         # 1.5 秒（出兵后有个随机冷却）
            q.step(0.05)
            hit.append(near1["st"] != "walk")
        ok("靠近就出手，不必先「站到位」", any(hit) and hit[0] is not None)

        # 两个已经顶在一起（0.54 米，比位子的 0.86 还近）：也要立刻开打，
        # 而不是各自往后退半步重新排队
        q.soldiers.clear()
        a1 = q.spawn(0, 1)
        a1["x"], a1["lane"] = 0.0, 0.0
        a1["hp"] = a1["max"] = 9999
        b1 = q.spawn(1, 1)
        b1["x"], b1["lane"] = 0.54, 0.10
        b1["hp"] = b1["max"] = 9999
        both_walk = True
        for _ in range(30):                         # 1.5 秒（出兵冷却最多 0.4 秒）
            q.step(0.05)
            if a1["st"] != "walk" or b1["st"] != "walk":
                both_walk = False
        ok("顶在一起也会开打（不是互相僵着）", not both_walk)

        # 场上敌人不止一个时，挤不进去的应该换目标，而不是干站着
        q.soldiers.clear()
        e1 = q.spawn(1, 2)
        e1["x"] = 0.0
        e1["hp"] = e1["max"] = 9999
        e2 = q.spawn(1, 2)
        e2["x"] = 2.2
        e2["lane"] = 0.9
        e2["hp"] = e2["max"] = 9999
        mine = [q.spawn(0, 2) for _ in range(6)]
        for i, m in enumerate(mine):
            m["x"] = -4.0 - i * 0.6
        for _ in range(260):                # 13 秒：要够他们绕过去占 e2 的位子
            q.step(0.05)
        a1n = len([m for m in mine if m["foe"] == e1["id"] and m["slot"] >= 0])
        a2n = len([m for m in mine if m["foe"] == e2["id"] and m["slot"] >= 0])
        ok("第一个目标只挂四个人", a1n <= server.PK_MAX_ATK)
        ok("多出来的去打另一个目标", a1n >= 1 and a2n >= 1)

        # 混战 + 中途补人 12 秒：任何一帧都不许两个人认领同一格。
        # 两个人占同一格 = 站在同一个点上，画面上就是「顶在一起谁也不动」，
        # 而且会顺带突破 PK_MAX_ATK（一帧里账本少记一个人，多的那个人就挤进去了）。
        q.soldiers.clear()
        random.seed(11)
        big = q.spawn(1, 2)
        big["x"], big["lane"] = 0.0, 0.0
        big["hp"] = big["max"] = 999999
        crowd = []
        for i in range(8):
            m = q.spawn(0, 2)
            m["x"] = -random.uniform(0.4, 5.0)
            m["lane"] = random.uniform(-1.2, 1.2)
            crowd.append(m)
        dup = []
        over = 0
        for fr in range(240):                       # 12 秒
            if fr in (60, 120, 180):                # 打着打着补人
                m = q.spawn(0, 2)
                m["x"] = -random.uniform(0.3, 2.0)
                m["lane"] = random.uniform(-1.2, 1.2)
                crowd.append(m)
            q.step(0.05)
            seen = {}
            for a in q.soldiers:
                if a["hp"] <= 0 or a["foe"] is None or a["slot"] < 0:
                    continue
                k = (a["foe"], a["slot"])
                if k in seen:
                    dup.append((fr, k))
                seen[k] = a["id"]
            if len([a for a in q.soldiers if a["foe"] == big["id"] and a["slot"] >= 0]) > server.PK_MAX_ATK:
                over += 1
        ok("混战里没有两个人占同一格", not dup)
        ok("围攻人数不会超过上限", over == 0)

        # ---------- 15. 先清兵，再攻城 ----------
        q.soldiers.clear()
        q.hp = [5000, 5000]
        atk = q.spawn(0, 0)
        atk["x"] = server.PK_RIGHT - 2.2
        guard = q.spawn(1, 0)
        guard["x"] = server.PK_RIGHT - 1.4
        for _ in range(40):                 # 2 秒
            q.step(0.05)
        ok("场上有敌兵时，到了城下也不砸门", q.hp[1] == 5000)
        q.soldiers = [x for x in q.soldiers if x["side"] == 0]
        for _ in range(60):
            q.step(0.05)
        ok("敌兵清光之后才开始砸门", q.hp[1] < 5000)

        # ---------- 16. 连击喂城堡：回血 + 升级 ----------
        q.hp = [4000, 5000]
        q.lv = [1, 1]
        q.combo_buff(0, 5)
        ok("5 连击回 250 血", q.hp[0] == 4250)
        q.hp[0] = 3000
        q.combo_buff(0, 10)
        ok("10 连击城堡升到 2 级", q.lv[0] == 2)
        ok("2 级城堡上限 5500", q.castle_max(0) == 5500)
        ok("升级补 500，再叠 5 连击的 250 血", q.hp[0] == 3750)
        q.hp[0] = 5500
        q.combo_buff(0, 20)
        ok("满血升级只补上限那 500", q.hp[0] == 6000 and q.lv[0] == 3)
        for c in (30, 40, 50, 60):
            q.combo_buff(0, c)
        ok("城堡最高 5 级", q.lv[0] == server.PK_CASTLE_MAXLV)
        ok("5 级城堡 7000 血", q.castle_max(0) == 7000)
        ok("满级后血不会超过上限", q.hp[0] == 7000)

        # ---------- 17. 阵营技能：箭雨 ----------
        q.soldiers.clear()
        q.pending.clear()
        q.hp = [5000, 5000]
        q.ev = []
        q.volley(0)
        ok("箭雨要飞 0.55 秒才结算", len(q.pending) == 1 and q.hp[1] == 5000)
        evv = [e for e in q.ev if e["k"] == "volley"]
        ok("一次射 10 支箭", evv and len(evv[-1]["a"]) == 10)
        for _ in range(14):
            q.step(0.05)
        ok("场上没敌人，箭打对面城堡", q.hp[1] < 5000)

        q.soldiers.clear()
        q.pending.clear()
        tgt = q.spawn(1, 2)                 # 三级兵 60 血，挨一轮不一定死
        tgt["lane"] = 1.35
        q.volley(0)
        volley_ev = q.ev[-1]
        ok("箭雨记录目标所在横向位置", all(a["l"] == 1.35 for a in volley_ev["a"]))
        ok("箭雨记录飞行时长和发射时间", volley_ev["fly"] == server.PK_ARROW_FLY
           and abs(volley_ev["at"] - q.t) < 0.01)
        for _ in range(16):
            q.step(0.05)
        ok("场上有敌人时箭打人", tgt["hp"] < tgt["max"])

        # 每连对 15 题自动放一次
        q.soldiers.clear()
        q.pending.clear()
        q.players[0]["combo"] = 14
        q.ev = []
        q.players[0]["seq"] = 100
        q.players[0]["last_at"] = 0
        res = server.pk_answer("pk_a", r["code"], 101, True)
        ok("连对 15 题触发箭雨", "volley" in res.get("buffs", []))
        ok("连对 15 题也出兵", res.get("soldier") is not None)

        # ---------- 18. 武将 ----------
        q.soldiers.clear()
        q.hp = [5000, 5000]
        q.pending.clear()
        boss = q.spawn(0, 3)
        ok("武将是 4 级兵、80 血、10 攻",
           boss["tier"] == 4 and boss["max"] == 80 and boss["atk"] == 10)
        boss["hp"] = 20
        q.step(0.05)
        ok("武将掉到 1/3 会自己回满一次", boss["hp"] == 80 and boss["healed"])
        boss["hp"] = 20
        q.step(0.05)
        ok("回血只有一次", boss["hp"] == 20)

        q.soldiers = [boss]
        boss["hp"] = boss["max"]
        boss["x"] = 0.0
        foes4 = [q.spawn(1, 2) for _ in range(4)]   # 四个靶子全摆进横扫范围
        for i, f in enumerate(foes4):
            f["x"] = 0.7 + i * 0.55
            f["lane"] = boss["lane"]
            f["hp"] = f["max"] = 200       # 撑住，别一轮就倒地，好数人头
        q._boss_aoe(boss)                   # 直接放一次横扫，不靠走位碰运气
        hurt = [f for f in foes4 if f["hp"] < 200]
        ok("武将群攻正好打 3 个", len(hurt) == 3)
        exp = q._dmg(4, 3, server.PK_BOSS_AOE_MUL)
        ok("群攻每人只吃 70%", all((200 - f["hp"]) >= exp - 0.5 for f in hurt))

        # ---------- 18b. 方士（远程魔法兵） ----------
        # 用户定的规则：每 10 连击必出、属性和三级远程兵一样、射程翻倍、
        # 一次最多打 3 个，打 1 个吃满 / 打 2 个各 60% / 打 3 个各 40%。
        q.soldiers.clear()
        q.pending.clear()
        q.ev = []
        mg = q.spawn(0, server.PK_FANGSHI_TIER, force=True, kind="mage")
        ar3 = q.spawn(0, 2, force=True, kind="archer")
        ok("方士能出在场上", mg is not None and mg["kind"] == "mage")
        ok("方士挂三级兵的名头", mg["tier"] == 3)
        ok("方士属性 = 三级远程兵",
           all(mg["stats"][k] == ar3["stats"][k]
               for k in ("hp", "atk", "df", "hit", "dodge", "spd")))
        ok("方士血是三级兵的一半（远程统一打五折）",
           mg["max"] == 30 and ar3["max"] == 30)
        ok("方士射程正好是弓箭手的两倍",
           server.PK_KIND_RANGE["mage"] == server.PK_KIND_RANGE["archer"] * 2)
        ok("方士出场会单独发一条事件",
           any(e["k"] == "fangshi_spawn" for e in q.ev))

        def mage_case(n, extra=0):
            """摆一个方士 + n(+extra) 个靶子，返回方士、靶子、这一发打中几个"""
            q.soldiers.clear()
            q.pending.clear()
            q.ev = []
            m = q.spawn(0, 2, force=True, kind="mage")
            m["x"], m["lane"] = 0.0, 0.0
            foes = []
            for i in range(n + extra):
                o = q.spawn(1, 0, force=True, kind="charge")
                o["x"] = 3.0 + (4.0 if i >= n else 0)     # 多出来的那个站远一档
                o["lane"] = i * 0.5
                o["hp"] = o["max"] = 400
                o["stats"]["dodge"] = 0.0
                o["stats"]["block"] = 0.0
                foes.append(o)
            return m, foes, q._fangshi_cast(m)

        m1, f1, got1 = mage_case(1)
        ok("射程内只有一个 → 打中 1 个", got1 == 1)
        ok("打 1 个吃满 100%",
           all(p.get("mul") == server.PK_FANGSHI_SPLIT[1] for p in q.pending))
        ok("一发法术只发一颗法球",
           len([e for e in q.ev if e["k"] == "projectile"]) == 1)

        m2, f2, got2 = mage_case(2)
        ok("射程内两个 → 同时打 2 个", got2 == 2)
        ok("打 2 个每人 60%",
           all(p.get("mul") == 0.6 for p in q.pending))
        ok("两个目标各发一颗法球",
           len([e for e in q.ev if e["k"] == "projectile"]) == 2
           and all(e.get("kind") == "mage" for e in q.ev if e["k"] == "projectile"))

        m3, f3, got3 = mage_case(3)
        ok("射程内三个 → 同时打 3 个", got3 == 3)
        ok("打 3 个每人 40%",
           all(p.get("mul") == 0.4 for p in q.pending))

        m4, f4, got4 = mage_case(3, extra=2)
        ok("最多只打 3 个，多的不管", got4 == 3 and len(q.pending) == 3)
        ok("挑的是最近的三个",
           all(p["target"] in [f["id"] for f in f4[:3]] for p in q.pending))

        # 超出射程一个都打不到（13 米外是弓箭手也够不着的地方）
        q.soldiers.clear()
        q.pending.clear()
        q.ev = []
        m5 = q.spawn(0, 2, force=True, kind="mage")
        m5["x"], m5["lane"] = 0.0, 0.0
        far = q.spawn(1, 0, force=True, kind="charge")
        far["x"], far["lane"] = server.PK_KIND_RANGE["mage"] + 1.0, 0.0
        ok("13 米外打不到", q._fangshi_cast(m5) == 0 and not q.pending)

        # 分摊比例要真的走到「算伤害」那一层，不能只是事件里写着好看
        seen = []
        orig_hit = q._resolve_hit
        q._resolve_hit = lambda s, foe, kind, mul=None: (seen.append(mul), "hit")[1]
        try:
            for n, want in ((1, 1.0), (2, 0.6), (3, 0.4)):
                m, foes, _ = mage_case(n)
                seen.clear()
                for _ in range(12):
                    q.step(0.05)
                ok("打 %d 人的比例传进了伤害结算" % n if n > 1 else "打 1 人吃满的传到伤害结算",
                   seen and all(abs(v - want) < 1e-9 for v in seen) and len(seen) == n)
        finally:
            q._resolve_hit = orig_hit

        # 站在后排自己就会放术（不用手动戳 _fangshi_cast）
        q.soldiers.clear()
        q.pending.clear()
        q.ev = []
        m6 = q.spawn(0, 2, force=True, kind="mage")
        m6["x"], m6["lane"] = 0.0, 0.0
        tgt6 = q.spawn(1, 0, force=True, kind="charge")
        tgt6["x"], tgt6["lane"] = 7.0, 0.0
        m6["stats"]["hit"] = 1
        tgt6["stats"]["dodge"] = 0
        for _ in range(40):
            q.step(0.05)
        ok("方士站定后会自己放术", any(e["k"] == "mage_cast" for e in q.ev))
        ok("法术打得掉血", tgt6["hp"] < tgt6["max"])

        # 每 10 连击必出，而且和当次该出的兵「同时」出，不占名额
        q.soldiers.clear()
        q.reserve[0].clear()
        q.players[0]["combo"] = 9
        q.players[0]["last_at"] = 0
        r10 = server.pk_answer("pk_a", r["code"], q.players[0]["seq"] + 1, True)
        ok("第 10 连击必出方士",
           r10.get("mage") is not None and r10["mage"][5] == "mage")
        ok("方士是三级兵", r10["mage"][2] == 3)
        ok("方士和普通兵同时出场（不占名额）",
           r10.get("soldier") is not None and r10["soldier"][0] != r10["mage"][0])
        ok("10 连击的普通兵按老规矩（10 不是 3/8/20 的倍数）出一级",
           r10.get("tier") == 1)
        ok("buffs 里报「出了方士」", "fangshi" in r10.get("buffs", []))

        q.players[0]["combo"] += 1                 # 11 连击，不该再出
        q.players[0]["last_at"] = 0
        r11 = server.pk_answer("pk_a", r["code"], q.players[0]["seq"] + 1, True)
        ok("不是 10 的倍数就不出方士", r11.get("mage") is None)

        # 20 连击：武将和方士一起出
        q.soldiers.clear()
        q.pending.clear()
        q.players[0]["combo"] = 19
        q.players[0]["last_at"] = 0
        r20 = server.pk_answer("pk_a", r["code"], q.players[0]["seq"] + 1, True)
        ok("20 连击同时出武将和方士",
           r20.get("mage") is not None and r20.get("tier") == 4)

        # ---------- 19. 人头与超时判定 ----------
        q.soldiers.clear()
        k0 = q.kills[0]
        d1 = q.spawn(1, 0)
        d1["hp"] = 0
        q.step(0.05)
        ok("砍倒对面一个兵会记下来", q.kills[0] == k0 + 1)

        server.PK_ROOMS.clear()
        r = server.pk_create("pk_a")
        server.pk_join("pk_b", r["code"])
        tq = server.PK_ROOMS[r["code"]]
        tq.soldiers.clear()
        tq.hp = [3000, 3000]                # 血量一样（同比例）
        tq.kills = [2, 7]                   # 但 1 号位砍得多
        tq.t = server.PK_MAX_TIME - 0.01
        tq.step(0.05)
        ok("超时平血时，砍人多的赢", tq.over and tq.over["win"] == 1)
        ok("结算里带人头数", (tq.over or {}).get("kills") == [2, 7])

        # ---------- 20. AI 练功房 ----------
        server.PK_ROOMS.clear()
        mkprofile("pk_a", 500)
        ai = server.pk_create("pk_a", ai="normal")
        ok("AI 局建房直接开打（没有等人这一步）",
           ai["ok"] and ai["state"] == "playing")
        ok("AI 局不扣星", ai["free"] and stars_of("pk_a") == 500)
        aq = server.PK_ROOMS[ai["code"]]
        ok("AI 占 1 号位", len(aq.players) == 2 and aq.players[1].get("bot"))
        snap = aq.snapshot("pk_a")
        ok("快照里带 AI 档位", snap["ai"] == "normal")
        ok("对手名字是 AI 的名字",
           snap["op"]["who"] == server.PK_AI["normal"]["name"])

        # 机器人的心跳：单独跑它的节奏（不推进战斗，免得城先被砸掉），
        # 60 秒足够连对十几题 —— 正好跨过「10 连击升一级」那条线
        aq.bot["acc"] = 1.0                 # 先按「全对」跑，看规则链是否走通
        for _ in range(int(60 / 0.05)):
            aq.bot_step(0.05)
        ok("AI 会自己出兵", len([s for s in aq.soldiers if s["side"] == 1]) > 0)
        ok("AI 的连击会涨", aq.bot["p"]["right"] >= 10)
        ok("AI 连对也会升城堡", aq.lv[1] >= 2)
        ok("AI 也吃同一套连击规则",
           aq.bot["p"]["combo"] == aq.bot["p"]["right"])

        # 练功房不能刷星：AI 赢了也一样
        before = stars_of("pk_a")
        aq.finish(1, "castle")
        ok("AI 赢了不给星", stars_of("pk_a") == before)

        # 掉线判定：机器人没有轮询，绝不能被当成掉线判负
        server.PK_ROOMS.clear()
        mkprofile("pk_a", 500)
        ai2 = server.pk_create("pk_a", ai="easy")
        bq = server.PK_ROOMS[ai2["code"]]
        now = time.time()
        ok("AI 没有轮询也不算掉线", bq.offline_side(now) is None)
        bq.players[0]["seen"] = now - 99
        ok("真人超时照样判掉线", bq.offline_side(now) == 1)
        ok("AI 档位一共四档", set(server.PK_AI) == {"easy", "normal", "hard", "boss"})
        ok("越难的 AI 手越快",
           server.PK_AI["boss"]["read"][0] < server.PK_AI["easy"]["read"][0]
           and server.PK_AI["boss"]["act"][1] < server.PK_AI["easy"]["act"][1]
           and server.PK_AI["boss"]["acc"] > server.PK_AI["easy"]["acc"])

        # 认不出来的档位不能变成「半个 AI 房」
        server.PK_ROOMS.clear()
        bad = server.pk_create("pk_a", ai="nope")
        ok("不认识的 AI 档位退回普通房",
           bad["ok"] and bad.get("ai") == "" and bad["state"] == "waiting")

    finally:
        server.PROFILE_DIR = old_dir
        shutil.rmtree(tmp, ignore_errors=True)

    print("")
    if FAIL:
        print("%d 项失败 / %d 项通过" % (len(FAIL), PASS[0]))
        for f in FAIL:
            print("  - " + f)
        sys.exit(1)
    print("%d 项通过" % PASS[0])


if __name__ == "__main__":
    main()
