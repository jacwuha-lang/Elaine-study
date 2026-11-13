const puppeteer = require("C:/nvm4w/nodejs/node_modules/puppeteer");
const fs = require("fs");

const EXEC = "C:/Users/hermes/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe";
const BASE = "http://127.0.0.1:8777";
const PROF = "C:/deepseek/Elaine学英语/profiles/Elaine.json";

function stars() {
  try { return JSON.parse(fs.readFileSync(PROF, "utf8")).sm_stars; } catch (e) { return "?"; }
}

(async () => {
  const before = stars();
  const browser = await puppeteer.launch({
    headless: true, executablePath: EXEC,
    args: ["--no-sandbox", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--mute-audio"]
  });
  const report = [];

  async function run(label, url, vp, mobile) {
    console.log("== " + label + " " + url);
    const page = await browser.newPage();
    await page.setViewport(Object.assign({ deviceScaleFactor: 1 }, vp, mobile ? { isMobile: true, hasTouch: true } : {}));
    const errs = [], posts = [];
    page.on("pageerror", e => errs.push("pageerror: " + e.message));
    page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
    page.on("request", r => { if (r.method() === "POST") posts.push(r.url()); });

    await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 20000 });
    let entered = true;
    try {
      await page.waitForFunction(() => {
        const l = document.getElementById("arcadeLayer");
        return l && l.classList.contains("on") && window.ARCADE && window.ARCADE.state();
      }, { timeout: 15000 });
    } catch (e) { entered = false; }

    const info = await page.evaluate(() => {
      const l = document.getElementById("arcadeLayer");
      const c = document.getElementById("game");
      const st = window.ARCADE && window.ARCADE.state ? window.ARCADE.state() : null;
      return {
        url: location.pathname + location.search,
        htmlClass: document.documentElement.className,
        layerOn: !!(l && l.classList.contains("on")),
        vail: !!document.getElementById("bootVail"),
        canvas: !!(c && c.width === 480),
        keypad: !!document.querySelector(".arc-keys"),
        hudStars: (document.getElementById("arcStars") || {}).textContent || "",
        scene: st && st.scene,
        words: st && st.word && (st.word.w || st.word),
        tier: st && st.tier,
        hasApp: !!document.getElementById("app"),
        appHidden: document.getElementById("app")
          ? getComputedStyle(document.getElementById("app")).visibility : "no-app",
        bodyText: (document.body.innerText || "").slice(0, 120)
      };
    });

    await page.screenshot({ path: "arcade/.play-" + label + ".png" });

    /* 点 ✕ 退出 → 应该出练习局结算（.res-free），星数不动、不写档案 */
    let result = null;
    if (entered) {
      try {
        await page.click("#arcBack");
        await page.waitForSelector(".res-free", { timeout: 4000 });
        result = await page.evaluate(() => ({
          free: (document.querySelector(".res-free") || {}).innerText || "",
          hudStars: (document.getElementById("arcStars") || {}).textContent || "",
          doneLabel: (document.getElementById("arcDone") || {}).textContent || "",
          homeBtn: !!document.getElementById("arcHome2")
        }));
        await page.screenshot({ path: "arcade/.play-" + label + "-result.png" });
      } catch (e) { result = { err: e.message }; }
    }

    report.push({ label, entered, errs, posts: posts.length, info, result });
    console.log(JSON.stringify(report[report.length - 1], null, 1));
    await page.close();
  }

  await run("phone", "/play.html", { width: 390, height: 844 }, true);
  await run("ipad", "/play-ipad.html", { width: 1180, height: 820 }, true);
  await run("short", "/play", { width: 390, height: 844 }, true);
  await run("short-ipad", "/play-ipad", { width: 1180, height: 820 }, true);

  await browser.close();
  fs.writeFileSync("arcade/.play-report.json", JSON.stringify({ before, after: stars(), report }, null, 2));
  console.log("stars before/after:", before, stars());
})().catch(e => { console.error("FATAL", e); process.exit(1); });
