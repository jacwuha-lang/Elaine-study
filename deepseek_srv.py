"""
deepseek_srv.py — DeepSeek 对话代理

为什么不让浏览器直接调 DeepSeek：
  · 浏览器的 CORS 会拦（DeepSeek 不返回 Access-Control-Allow-Origin）
  · API Key 会暴露在页面源码 / localStorage 里，孩子误发截图就漏了

所以 Key 存在**服务端**的 .cache/deepseek.json（不进 git、不出本机），
浏览器只说「我要说什么」，服务端负责带 Key 去请求。

三种场景，各用一套 system prompt：
  chat     孩子随口聊 / 问英语问题
  explain  答错之后讲这道题
  praise   答对之后夸一句（默认不走 AI，留给固定台词省钱）
"""
import json
import os
import re
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
CONF_PATH = os.path.join(ROOT, ".cache", "deepseek.json")

ENDPOINT = "https://api.deepseek.com/chat/completions"
# 老的 deepseek-chat / deepseek-reasoner 已于 2026-07-24 退役，
# 现在要写 deepseek-v4-flash（快、便宜）或 deepseek-v4-pro（强、贵）
MODEL = "deepseek-v4-flash"

# ---------------------------------------------------------------- Key 管理
def load_key():
    """优先环境变量，其次 .cache/deepseek.json"""
    env = os.environ.get("DEEPSEEK_API_KEY", "").strip()
    if env:
        return env
    try:
        with open(CONF_PATH, encoding="utf-8") as f:
            return (json.load(f).get("key") or "").strip()
    except Exception:
        return ""


def save_key(key):
    key = (key or "").strip()
    os.makedirs(os.path.dirname(CONF_PATH), exist_ok=True)
    if not key:
        if os.path.isfile(CONF_PATH):
            os.remove(CONF_PATH)
        return
    tmp = CONF_PATH + ".part"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"key": key}, f)
    os.replace(tmp, CONF_PATH)
    try:
        os.chmod(CONF_PATH, 0o600)
    except Exception:
        pass


def mask(key):
    """只给前端看尾巴，方便确认「填的是哪把 Key」"""
    if not key:
        return ""
    if len(key) <= 10:
        return key[:2] + "***"
    return key[:6] + "…" + key[-4:]


# ---------------------------------------------------------------- 人格设定
BASE = (
    "你是「小鲸」，一只住在小朋友平板里的鲸鱼尾巴女仆精灵，"
    "蓝色长发、白围裙，尾巴会摇。你正在陪一个中国小学生练英语句子改写。\n"
    "说话规则（很重要）：\n"
    "1. 用中文说话，语气亲切、活泼，像姐姐陪妹妹写作业。\n"
    "2. 每次最多 2 句话、40 个字以内。说完就停，不要长篇大论。\n"
    "3. 需要举例时，英文句子要短（不超过 8 个词），并紧跟中文解释。\n"
    "4. 不要用 Markdown、不要列 1.2.3.、不要加粗星号，这是要念出来的语音。\n"
    "5. 绝对不聊和英语学习无关的敏感话题；孩子问奇怪的问题就温柔地把话题带回英语。\n"
    "6. 不要自称 AI 或语言模型，你就是小鲸。"
)

SCENE = {
    "chat": BASE + "\n现在是闲聊时间，孩子刚跟你说话，自然回应她。",

    "explain": BASE + (
        "\n现在孩子做错了一道英语改写题。请用最简单的话告诉她错在哪、"
        "正确形式为什么是这样。先给正确答案，再用一句话解释原因。"
        "不要重复题目全文。"
    ),

    "praise": BASE + "\n孩子答对了，夸她一句，具体一点（比如夸她记住了三单要加 s），不要空洞。",

    "hint": BASE + (
        "\n孩子卡住了，想要一点提示。只给提示，不要直接说出答案。"
        "提示要指向关键的那一步（比如「主语是 he，动词要不要加 s？」）。"
    ),
}

# judge 不套 BASE 人设 —— 这里要的是一个不带感情的判分器，
# 不是「小鲸」。让它扮演角色只会让输出变成解释，没法解析。
JUDGE = (
    "你是小学英语老师，正在复核一道题的判分。\n"
    "任务：判断学生的答案能不能算对。\n\n"
    "判断标准：\n"
    "1. 只看语法和意思是否成立，不要求和标准答案措辞一样\n"
    "2. 大小写、标点、缩写（can't / can not / cannot、he's / he is）都不算错\n"
    "3. 学生答案语法正确、意思也对，只是不如标准答案自然 —— 算对\n"
    "4. 学生答案有语法错误、意思变了、或漏了关键成分 —— 算错\n"
    "5. 拿不准的时候判算错\n\n"
    "只输出一个词：RIGHT 或 WRONG。不要输出任何解释、标点或换行。"
)
SCENE["judge"] = JUDGE

MAX_TOKENS = 200
TIMEOUT = 15


def _post(payload, key):
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + key,
        },
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read().decode("utf-8"))


def _clean(text):
    """把 AI 偶尔漏出来的 Markdown / 引号收拾干净，免得 TTS 念出「星号星号」"""
    s = str(text or "")
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"[`*_#>]", "", s)
    s = re.sub(r"^\s*[-•]\s*", "", s, flags=re.M)
    s = re.sub(r"\n{2,}", "\n", s)
    return s.strip()


def chat(scene, messages, key=None, temperature=0.8):
    """
    messages: [{"role":"user"/"assistant","content":"..."}]
    返回 (文本, 错误信息)
    """
    key = key or load_key()
    if not key:
        return None, "还没有填 DeepSeek API Key"

    scene = scene if scene in SCENE else "chat"
    msgs = [{"role": "system", "content": SCENE[scene]}]
    for m in (messages or [])[-8:]:          # 只留最近 8 轮，控制 token
        role = m.get("role")
        content = (m.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            msgs.append({"role": role, "content": content[:600]})

    # 判分要稳定、要短：温度归零，只要一个词。
    # 但 max_tokens 不能真的只给 8 —— deepseek-v4-flash 是推理模型，
    # 它先写 reasoning_content 再写 content，8 个 token 会被思考过程吃光，
    # content 永远是空串（finish_reason=length）。留够思考的余量，
    # 真正输出的仍然只有 RIGHT / WRONG 一个词。
    if scene == "judge":
        temperature = 0.0
        max_tokens = 512
    else:
        max_tokens = MAX_TOKENS

    payload = {
        "model": MODEL,
        "messages": msgs,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }

    try:
        data = _post(payload, key)
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read().decode("utf-8", "replace")[:200]
        except Exception:
            pass
        if e.code == 401:
            return None, "API Key 不对，或者已失效"
        if e.code == 402:
            return None, "DeepSeek 账户余额不足"
        if e.code == 429:
            return None, "请求太快了，等一秒再说"
        return None, "DeepSeek 返回 %d %s" % (e.code, detail)
    except Exception as e:
        return None, "连不上 DeepSeek：%s" % e

    try:
        text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        return None, "DeepSeek 返回的格式看不懂"

    text = _clean(text)
    # max_tokens 撞顶时 content 可能是空的，别把空串当成成功往下传
    if not text:
        return None, "小鲸这次没想出话，再点一次试试"
    return text, None


def balance(key=None):
    """查余额，设置页用来确认 Key 可用"""
    key = key or load_key()
    if not key:
        return None, "no key"
    req = urllib.request.Request(
        "https://api.deepseek.com/user/balance",
        headers={"Authorization": "Bearer " + key},
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            d = json.loads(r.read().decode("utf-8"))
        infos = d.get("balance_infos") or []
        if not infos:
            return None, "no balance info"
        i = infos[0]
        return {"currency": i.get("currency"), "total": i.get("total_balance")}, None
    except Exception as e:
        return None, str(e)[:120]
