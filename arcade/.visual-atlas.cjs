const puppeteer = require("C:/nvm4w/nodejs/node_modules/puppeteer");
const tiers = [
  {theme:21, mobs:["candy","balloon","cupcake","lollipop"], boss:"carouselKing"},
  {theme:22, mobs:["eraser","pencil","inkpot","ruler"], boss:"boardGiant"},
  {theme:23, mobs:["snowball","scarf","broom","icicle"], boss:"snowPrincipal"},
  {theme:24, mobs:["icecrystal","snowrabbit","icecone","frostflower"], boss:"iceDragon"},
  {theme:25, mobs:["sandpuff","cactus","beetle","tumbleweed"], boss:"sandPharaoh"}
];
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:"C:/Users/hermes/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe",args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1100,height:740}});
 await page.goto("http://127.0.0.1:8765/arcade/index.html?arcade=1&tier=1&freeze=1",{waitUntil:"networkidle0"});
 await page.waitForFunction(()=>window.ARCADE&&window.ARCADE.on);
 await page.evaluate((tiers)=>{
   const c=document.createElement("canvas"); c.width=1200;c.height=800;
   const x=c.getContext("2d");x.imageSmoothingEnabled=false;
   const rows=["#28172d","#1c2c2a","#233244","#172941","#382719"];
   for(let r=0;r<5;r++){
     x.fillStyle=rows[r];x.fillRect(0,r*160,1200,160);
     x.fillStyle="rgba(255,255,255,.055)";x.fillRect(0,r*160,1200,1);
     for(let col=0;col<5;col++){
       const key=col<4?tiers[r].mobs[col]:tiers[r].boss;
       const boss=col===4, cx=col*240+120, cy=r*160+102;
       const e={kind:key,elite:boss,x:cx,y:cy,alive:true,hp:10,maxHp:10,anim:"idle",animT:.2,seed:r*7+col,facing:-1,flash:0,dying:0,hitT:0,ky:0,kx:0,deathMax:.28,segs:1};
       window.Art.drawEnemy(x,e,r*.31+col*.19);
       x.fillStyle=boss?"#ffe3a6":"#d7e8ec";x.font="bold 14px monospace";x.textAlign="center";x.fillText(key,cx,r*160+145);
       if(boss){x.strokeStyle="#ffd488";x.strokeRect(col*240+5,r*160+5,230,150);}
     }
   }
   document.body.innerHTML="";document.body.style.margin="0";document.body.style.background="#101018";c.style.cssText="width:1200px;height:800px;max-width:none;display:block";document.body.appendChild(c);
 },tiers);
 const image=await page.evaluate(()=>document.querySelector("canvas").toDataURL("image/png")); require("fs").writeFileSync("C:/deepseek/Elaine学英语/arcade/.visual-atlas.png",Buffer.from(image.split(",")[1],"base64"));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});



