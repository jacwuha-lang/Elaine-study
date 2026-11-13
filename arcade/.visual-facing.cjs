const puppeteer = require("C:/nvm4w/nodejs/node_modules/puppeteer");
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:"C:/Users/hermes/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe",args:["--no-sandbox"]});
 const page=await browser.newPage();
 await page.goto("http://127.0.0.1:8765/arcade/index.html?arcade=1&tier=2&freeze=1",{waitUntil:"networkidle0"});
 await page.waitForFunction(()=>window.ARCADE&&window.ARCADE.on);
 const report=await page.evaluate(()=>{
   const S=window.ARCADE.state(); S.enemies=[]; S.spawnQ=[]; S.waveState="fight";
   window.__wfy.spawnEnemy(false,0); window.__wfy.spawnEnemy(true,1);
   const es=S.enemies; es.forEach(e=>{e.x=e.targetX;e.frozen=1;});
   S.player.x=460;window.__wfy.update(1/60);const faceRight=es.map(e=>e.facing);
   S.player.x=80;window.__wfy.update(1/60);const faceLeft=es.map(e=>e.facing);
   return {kinds:es.map(e=>e.kind),faceRight,faceLeft,targets:es.map(e=>e.targetX)};
 });
 console.log(JSON.stringify(report)); await browser.close();
 if(report.faceRight.some(x=>x!==1)||report.faceLeft.some(x=>x!==-1)) process.exit(2);
})().catch(e=>{console.error(e);process.exit(1)});
