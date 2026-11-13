const puppeteer = require("C:/nvm4w/nodejs/node_modules/puppeteer");
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:"C:/Users/hermes/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe",args:["--no-sandbox"]});
 const page=await browser.newPage();
 await page.goto("http://127.0.0.1:8765/arcade/index.html?arcade=1&tier=1&freeze=1",{waitUntil:"networkidle0"});
 await page.waitForFunction(()=>window.ARCADE&&window.ARCADE.on);
 const result=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=140;c.height=110;const ctx=c.getContext('2d');
   const diff=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if(a[i+3]!==b[i+3]||a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])n++;return n;};
   function shot(kind,pose,t,animT,hitT,dying){ctx.clearRect(0,0,c.width,c.height);window.Art.drawEnemy(ctx,{kind,elite:!!window.Art.SPECIES[kind]&&['carouselKing','boardGiant','snowPrincipal','iceDragon','sandPharaoh'].includes(kind),x:70,y:70,alive:true,hp:10,maxHp:10,anim:pose,animT,seed:2.3,facing:-1,flash:0,dying,hitT,ky:0,kx:0,deathMax:.46,segs:1},t);return ctx.getImageData(0,0,c.width,c.height).data;}
   const rows=[];
   for(const [kind,sp] of Object.entries(window.Art.SPECIES)){
     if(!sp.arcade)continue;
     const walk=diff(shot(kind,'walk',.1,.1,0,0),shot(kind,'walk',.24,.24,0,0));
     const attack=diff(shot(kind,'attack',.2,.08,0,0),shot(kind,'attack',.2,.25,0,0));
     const hit=diff(shot(kind,'hit',.2,.1,.04,0),shot(kind,'hit',.2,.1,.20,0));
     const defeat=diff(shot(kind,'idle',.2,0,0,.08),shot(kind,'idle',.2,0,0,.38));
     rows.push({kind,walk,attack,hit,defeat});
   }
   return rows;
 });
 console.log(JSON.stringify(result));
 const zero=result.filter(x=>!x.walk||!x.attack||!x.hit||!x.defeat);
 await browser.close(); if(zero.length){console.error('No visible change in one or more animation samples:',zero);process.exit(2);}
})().catch(e=>{console.error(e);process.exit(1)});

