const puppeteer = require("C:/nvm4w/nodejs/node_modules/puppeteer");
const EXEC = "C:/Users/hermes/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe";
const BASE = "http://127.0.0.1:8777/pk-preview.html";

(async () => {
  const b = await puppeteer.launch({
    headless: true, executablePath: EXEC,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle"],
  });
  const shots = [
    ["row", "?m=soldier&walk=0", 1000, 460, "row"],
    ["t1", "?m=soldier&t=1&s=0&walk=0&view=side", 620, 720, "t1-side"],
    ["t2", "?m=soldier&t=2&s=0&walk=0&view=side", 620, 720, "t2-side"],
    ["t3", "?m=soldier&t=3&s=1&walk=0&view=q", 620, 720, "t3-q"],
    ["castle", "?m=castle", 900, 700, "castle"],
    ["tree", "?m=tree", 900, 520, "tree"],
    ["wide", "?m=wide", 900, 620, "wide"],
  ];
  for (const [name, q, w, h, out] of shots) {
    const p = await b.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    await p.setViewport({ width: w, height: h });
    await p.goto(BASE + q, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 900));
    await p.screenshot({ path: "C:/deepseek/Elaine学英语/arcade/.pv-" + out + ".png" });
    console.log(name, "errs", JSON.stringify(errs.slice(0, 4)));
    await p.close();
  }
  await b.close();
})();
