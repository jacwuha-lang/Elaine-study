const puppeteer = require("C:/nvm4w/nodejs/node_modules/puppeteer");
(async () => {
  const browser = await puppeteer.launch({headless: true, executablePath: "C:/Users/hermes/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe", args: ["--no-sandbox", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"]});
  const report = [];
  for (let tier = 1; tier <= 5; tier++) {
    const page = await browser.newPage({viewport: {width: 1100, height: 740}, deviceScaleFactor: 1});
    await page.goto("http://127.0.0.1:8765/arcade/index.html?arcade=1&tier=" + tier + "&freeze=1", {waitUntil: "networkidle0"});
    await page.waitForFunction(() => window.ARCADE && window.ARCADE.on, {timeout: 10000});
    await page.evaluate(() => {
      const S = window.ARCADE.state();
      S.enemies = []; S.spawnQ = []; S.banner = null; S.waveState = "fight";
      window.__wfy.spawnEnemy(false, 0);
      const mob = S.enemies[S.enemies.length - 1];
      mob.x = 336; mob.targetX = 336; mob.y = 169; mob.facing = -1; mob.anim = "idle"; mob.animT = 0.3;
      window.__wfy.spawnEnemy(true, 1);
      const boss = S.enemies[S.enemies.length - 1];
      boss.x = 390; boss.targetX = 390; boss.y = 169; boss.facing = -1; boss.anim = "idle"; boss.animT = 0.6;
      window.__wfy.render();
    });
    await new Promise(resolve => setTimeout(resolve, 150));
    const canvas = await page.$("#game");
    await canvas.screenshot({path: `C:/deepseek/Elaine学英语/arcade/visual-tier-${tier}.png`});
    report.push(await page.evaluate(() => ({tier: window.ARCADE.tier, map: window.__wfy.worldOf(window.ARCADE.tier), enemies: window.ARCADE.state().enemies.map(e => ({kind: e.kind, elite: e.elite, x: e.x, y: e.y, facing: e.facing, anim: e.anim}))})));
    await page.close();
  }
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(e => {console.error(e); process.exit(1);});


