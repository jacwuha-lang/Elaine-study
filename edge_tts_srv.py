"""
edge_tts_srv.py — 微软 Edge TTS 封装（给小宠物配音）

为什么用它：
  · 不需要显卡，1~2 秒出一句，比本地 IndexTTS2（6~8 秒）快一个数量级
  · 音色多，有童声，中英文都自然
  · 缺点是必须联网；断网时由调用方降级到本地 IndexTTS2 / 浏览器语音

对外只有三个函数：
  available()                  → 依赖装没装
  synth(text, voice, rate, pitch) → mp3 字节（带磁盘缓存 + 失败重试）
  voices()                     → 可选音色清单
"""
import asyncio
import hashlib
import os
import threading
import time

try:
    import edge_tts
    _HAS = True
except Exception:                     # 没装就整体降级，不影响 App 启动
    edge_tts = None
    _HAS = False

ROOT = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(ROOT, ".cache", "edge")

# 默认音色：活泼少女感，和「鲸鱼尾巴女仆」这个形象最搭
DEFAULT_VOICE = "zh-CN-XiaoyiNeural"
DEFAULT_EN_VOICE = "en-US-AnaNeural"


def _voice_lang(v):
    """音色属于哪种语言：'zh' / 'en' / ..."""
    return (v or "")[:2].lower()


def _text_lang(t):
    """粗判文本语言：中文字符占两成以上就算中文。"""
    if not t:
        return "zh"
    han = sum(1 for c in t if "\u4e00" <= c <= "\u9fff")
    return "zh" if han >= max(1, len(t) * 0.2) else "en"

# 给界面用的候选音色
# 注意：只能列 Edge 免费接口真实存在的音色。
# 晓梦(Xiaomeng) / 晓双(Xiaoshuang) 是 Azure 付费版才有的儿童音色，
# Edge 会直接返回 502，所以不能放进来。
VOICES = [
    # ---- 中文：小鲸说话用 ----
    {"id": "zh-CN-XiaoyiNeural",           "name": "晓伊", "tag": "活泼少女",  "lang": "ZH"},
    {"id": "zh-CN-XiaoxiaoNeural",         "name": "晓晓", "tag": "温柔大姐姐", "lang": "ZH"},
    {"id": "zh-CN-YunxiaNeural",           "name": "云夏", "tag": "少年音",    "lang": "ZH"},
    {"id": "zh-CN-YunxiNeural",            "name": "云希", "tag": "清朗男声",  "lang": "ZH"},
    {"id": "zh-CN-liaoning-XiaobeiNeural", "name": "晓北", "tag": "东北话",    "lang": "ZH"},
    {"id": "zh-CN-shaanxi-XiaoniNeural",   "name": "晓妮", "tag": "陕西话",    "lang": "ZH"},
    # 粤语 Edge 只有三个，这里只留晓曼（最贴小鲸的声线）。
    # 注意：粤语音色念普通话文本会带粤语腔，适合本来就说粤语的家庭。
    {"id": "zh-HK-HiuMaanNeural",          "name": "晓曼", "tag": "粤语",      "lang": "ZH"},
    {"id": "zh-TW-HsiaoChenNeural",        "name": "晓臻", "tag": "台湾国语",  "lang": "ZH"},
    # ---- 英文：读题目和例句用，不参与中文台词 ----
    {"id": "en-US-AnaNeural",              "name": "Ana",   "tag": "英文童声", "lang": "EN"},
    {"id": "en-US-JennyNeural",            "name": "Jenny", "tag": "英文女声", "lang": "EN"},
    {"id": "en-GB-SoniaNeural",            "name": "Sonia", "tag": "英式女声", "lang": "EN"},
]

STATS = {"hit": 0, "miss": 0, "fail": 0}
_LOCK = threading.Lock()              # 只保护 STATS / 目录创建


def available():
    return _HAS


def cache_key(text, voice, rate, pitch):
    h = hashlib.md5()
    h.update(("%s|%s|%s|" % (voice, rate, pitch)).encode("utf-8"))
    h.update(text.encode("utf-8"))
    return h.hexdigest()


def cache_path(text, voice, rate, pitch):
    return os.path.join(CACHE_DIR, cache_key(text, voice, rate, pitch) + ".mp3")


def _clamp_rate(rate):
    """限幅，防止把语速调成 0.01 倍听不清"""
    try:
        v = int(str(rate).replace("%", "").strip())
    except (TypeError, ValueError):
        v = 0
    return max(-50, min(50, v))


def _clamp_pitch(pitch):
    try:
        v = int(str(pitch).replace("Hz", "").replace("+", "").strip())
    except (TypeError, ValueError):
        v = 0
    return max(-50, min(50, v))


async def _synth_async(text, voice, rate, pitch):
    """真正去连微软，把音频收齐"""
    comm = edge_tts.Communicate(
        text, voice,
        rate="%+d%%" % rate,
        pitch="%+dHz" % pitch,
    )
    buf = bytearray()
    async for chunk in comm.stream():
        if chunk.get("type") == "audio" and chunk.get("data"):
            buf.extend(chunk["data"])
    if not buf:
        raise RuntimeError("no audio received")
    return bytes(buf)


def synth(text, voice=None, rate=0, pitch=0):
    """
    取音频：先查缓存，没有再联网合成并落盘。
    失败会重试一次 —— 微软接口偶发 403/超时，第二次基本都能过。
    如果指定的音色压根不存在（比如浏览器里存了个旧音色 ID），
    会自动退回默认音色再试一次，不至于整句没声音。
    """
    if not _HAS:
        raise RuntimeError("edge-tts 未安装（pip install edge-tts）")

    text = (text or "").strip()
    if not text:
        raise RuntimeError("empty text")

    voice = voice or DEFAULT_VOICE
    rate = _clamp_rate(rate)
    pitch = _clamp_pitch(pitch)

    # 音色和文本语言不匹配就直接换默认音色。
    # 不这么做的话，Edge 会拿错音色试两轮（每轮都等超时），
    # 一句话要 4~5 秒才回退，前端早放弃了 ——
    # 这就是「选了英文音色反而不发声」的真正原因。
    tl = _text_lang(text)
    if _voice_lang(voice) != tl:
        voice = DEFAULT_EN_VOICE if tl == "en" else DEFAULT_VOICE

    os.makedirs(CACHE_DIR, exist_ok=True)
    p = cache_path(text, voice, rate, pitch)
    if os.path.isfile(p):
        with _LOCK:
            STATS["hit"] += 1
        with open(p, "rb") as f:
            return f.read()

    def attempt(v):
        last = None
        for i in range(2):
            try:
                t0 = time.time()
                data = asyncio.run(_synth_async(text, v, rate, pitch))
                tmp = p + ".part"
                with open(tmp, "wb") as f:
                    f.write(data)
                os.replace(tmp, p)
                with _LOCK:
                    STATS["miss"] += 1
                print("[edge] %.2fs  %s  %s" % (time.time() - t0, v, text[:32]), flush=True)
                return data, None
            except Exception as e:
                last = e
                if i == 0:
                    time.sleep(0.5)
        return None, last

    data, err = attempt(voice)
    if data is not None:
        return data

    # 音色不对就换默认的再试一次（缓存键也要跟着换）
    if voice != DEFAULT_VOICE:
        print("[edge] %s 合成失败，改用默认音色重试：%s" % (voice, err), flush=True)
        p = cache_path(text, DEFAULT_VOICE, rate, pitch)
        data, err2 = attempt(DEFAULT_VOICE)
        if data is not None:
            return data
        err = err2

    with _LOCK:
        STATS["fail"] += 1
    raise RuntimeError(str(err))


def voices():
    return [dict(v) for v in VOICES]


def cached_count():
    if not os.path.isdir(CACHE_DIR):
        return 0
    return len([x for x in os.listdir(CACHE_DIR) if x.endswith(".mp3")])
