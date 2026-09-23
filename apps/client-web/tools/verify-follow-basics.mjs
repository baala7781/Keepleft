// Mobile input/render regression using only the synthetic local demo.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const [modulePath,out]=process.argv.slice(2);if(!modulePath||!out)throw Error('Pass Playwright module and output directory.');
const {chromium}=await import(modulePath);await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:1}),page=await context.newPage();
page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
const diag=()=>page.getByLabel('Camera diagnostics').evaluate(el=>({pitch:Number(el.dataset.pitch),bearing:Number(el.dataset.bearing),geometries:Number(el.dataset.geometries),text:el.textContent,performance:el.previousElementSibling?.textContent}));
const settle=async()=>{await page.waitForTimeout(1400);return diag();};
try{
  await page.goto('http://127.0.0.1:4173/');await page.getByRole('button',{name:'Start demo run',exact:true}).click();
  await page.waitForFunction(()=>Number(document.querySelector('.atlas-metric-grid article:nth-child(2) strong')?.textContent)>.06);
  await page.getByLabel('Camera mode').selectOption('follow');
  await page.getByRole('button',{name:'Adjust camera',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Drag to change angle'}).getAttribute('aria-pressed'),'true');
  const before=await settle();await page.getByRole('button',{name:'Tilt up',exact:true}).click();const tilted=await settle();
  assert(tilted.pitch>before.pitch+5,'manual tilt takes effect');const held=await settle();assert(Math.abs(held.pitch-tilted.pitch)<1,'automatic avoidance does not undo tilt');
  await page.getByRole('button',{name:'Adjust camera',exact:true}).click();
  // A real browser touch gesture, not synthetic JS events: one finger tilts in tracking modes.
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:370}]});
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190+i*4,y:370+i*4}]});await page.waitForTimeout(40);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const dragged=await settle();assert(dragged.pitch<held.pitch-4,`Touch should tilt: before ${held.pitch}, after ${dragged.pitch}`);assert.equal(await page.getByLabel('Camera mode').inputValue(),'follow');
  const heldAgain=await settle();assert(Math.abs(heldAgain.pitch-dragged.pitch)<1);
  await page.getByRole('button',{name:'Stop activity',exact:true}).click();await page.getByRole('button',{name:'Replay demo',exact:true}).click();
  await page.getByLabel('Camera mode').selectOption('chase');await settle();
  await page.getByRole('button',{name:'Adjust camera',exact:true}).click();
  const chaseBefore=await diag();await page.getByRole('button',{name:'Tilt down',exact:true}).click();const chaseTilt=await settle();
  assert(chaseTilt.pitch<chaseBefore.pitch-5,'third-person manual tilt takes effect');
  const chaseHeld=await settle();assert(Math.abs(chaseHeld.pitch-chaseTilt.pitch)<1,'third-person tilt is retained');
  await page.getByRole('button',{name:'Adjust camera',exact:true}).click();
  await page.screenshot({path:path.join(out,'third-person-manual.png')});
  await page.getByLabel('Camera mode').selectOption('follow');await settle();
  const full=await page.locator('.kl-dock').boundingBox();await page.getByRole('button',{name:'Collapse activity details',exact:true}).click();
  const small=await page.locator('.kl-dock').boundingBox();assert(small.height<full.height*.65,'collapse returns meaningful map space');
  assert.equal(await page.getByRole('region',{name:'Live activity metrics'}).isVisible(),false);
  assert(await page.getByRole('button',{name:'Play replay',exact:true}).isVisible());assert(await page.locator('.atlas-replay-controls [data-slot="slider-track"]').isVisible());
  await page.getByRole('slider',{name:'Replay position'}).press('End');await settle();
  await page.screenshot({path:path.join(out,'follow-collapsed.png')});
  await page.getByRole('button',{name:'Expand activity details',exact:true}).click();assert(await page.getByRole('button',{name:'Turn this run into a photo story'}).isVisible());
  await page.getByRole('button',{name:'Restart',exact:true}).click();await page.getByRole('button',{name:'Play replay',exact:true}).click();
  await page.getByRole('button',{name:'Collapse activity details',exact:true}).click();
  const memory=[];for(let i=0;i<5;i++){await page.waitForTimeout(1200);memory.push((await diag()).geometries);}
  assert(Math.max(...memory)-Math.min(...memory)<=2,'geometry count stays bounded through replay');
  const final=await diag();assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(out,'follow-running.png')});
  const result={passed:true,touchTilt:true,manualTiltHeld:true,thirdPersonTiltHeld:true,selectedModeRetained:true,dockHeight:{expanded:full.height,collapsed:small.height},geometrySamples:memory,camera:final,synthetic:true};
  await fs.writeFile(path.join(out,'acceptance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(e){await page.screenshot({path:path.join(out,'follow-failure.png')});console.error(await page.locator('body').innerText());console.error(await page.locator('.atlas-replay-controls [data-slot="slider"]').evaluateAll(elements=>elements.map(e=>e.outerHTML)));throw e;}
finally{await browser.close();}
