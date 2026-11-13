const puppeteer = require("C:/nvm4w/nodejs/node_modules/puppeteer");
const tiers = [
  {mobs:["candy","balloon","cupcake","lollipop"],boss:"carouselKing"},
  {mobs:["eraser","pencil","inkpot","ruler"],boss:"boardGiant"},
  {mobs:["snowball","scarf","broom","icicle"],boss:"snowPrincipal"},
  {mobs:["icecrystal","snowrabbit","icecone","frostflower"],boss:"iceDragon"},
  {mobs:["sandpuff","cactus","beetle","tumbleweed"],boss:"sandPharaoh"}
];
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:"C:/Users/hermes/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe",args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto("http://127.0.0.1:8765/arcade/index.html?arcade=1&tier=1&freeze=1",{waitUntil:"networkidle0"});
 await page.waitForFunction(()=>window.ARCADE&&window.ARCADE.on);
 await page.evaluate((tiers)=>{
   const c=document.createElement("canvas"); c.width=1200;c.height=1000;
   const x=c.getContext("2d");x.imageSmoothingEnabled=false;
   const poses=["idle","walk","attack","hit","defeat"];
   for(let r=0;r<10;r++){
     const tier=Math.floor(r/2), boss=r%2===1;
     const key=boss?tiers[tier].boss:tiers[tier].mobs[0];
     const color=["#28172d","#1c2c2a","#233244","#172941","#382719"][tier];
     for(let col=0;col<5;col++){
       const px=col*240,py=r*100;
       x.fillStyle=color;x.fillRect(px,py,240,100);
       x.fillStyle="#c3d2dd";x.font="12px monospace";x.textAlign="left";x.fillText(key+" / "+poses[col],px+8,py+16);
       const anim=poses[col];
       const e={kind:key,elite:boss,x:px+120,y:py+63,alive:true,hp:6,maxHp:10,anim,animT:anim==="attack"?.24:.12,seed:r*2+col+.5,facing:-1,flash:0,dying:anim==="defeat"?.15:0,hitT:anim==="hit"?.13:0,ky:0,kx:0,deathMax:.28,segs:1};
       window.Art.drawEnemy(x,e,1.4+col*.27+r*.15);
     }
   }
   document.body.innerHTML="";document.body.style.cssText="margin:0;background:#101018";c.style.cssText="width:1200px;height:1000px;display:block";document.body.appendChild(c);
 },tiers);
 const png=await page.evaluate(()=>document.querySelector("canvas").toDataURL("image/png"));require("fs").writeFileSync("C:/deepseek/Elaine学英语/arcade/.visual-actions.png",Buffer.from(png.split(",")[1],"base64"));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

