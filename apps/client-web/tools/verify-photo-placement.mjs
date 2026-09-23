// Isolated browser acceptance: synthetic demo only, never a user's browser profile or GPS.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const [playwrightModule,out]=process.argv.slice(2);
if(!playwrightModule||!out)throw Error('Pass a Playwright module path and acceptance output directory.');
const {chromium}=await import(playwrightModule);
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
const state=()=>page.getByRole('button',{name:'Move route on photo',exact:true}).evaluate(el=>({left:el.style.left,top:el.style.top,width:el.style.width,height:el.style.height}));
try{
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button',{name:'Start demo run',exact:true}).click();
  await page.waitForFunction(()=>Number(document.querySelector('.atlas-metric-grid article:nth-child(2) strong')?.textContent)>0.02);
  await page.getByRole('button',{name:'Stop activity',exact:true}).click();
  await page.getByRole('button',{name:'Create photo story',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles('/private/tmp/keepleft-assets/export-test.png');
  const move=page.getByRole('button',{name:'Move route on photo',exact:true});
  await move.waitFor();await move.scrollIntoViewIfNeeded();
  const initial=await state();
  assert.equal(await page.getByRole('slider').count(),0,'placement slider removed');
  const cdp=await context.newCDPSession(page);
  const touchDrag=async(locator,dx,dy)=>{
    const box=await locator.boundingBox();assert(box);const x=box.x+box.width/2,y=box.y+box.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  const scroll=await page.getByRole('dialog').evaluate(el=>el.scrollTop);
  await touchDrag(move,12,55);
  const dragged=await state();assert.notEqual(dragged.left,initial.left);assert.notEqual(dragged.top,initial.top);assert.equal(dragged.width,initial.width);
  assert.equal(await page.getByRole('dialog').evaluate(el=>el.scrollTop),scroll,'drag does not scroll the page');
  await touchDrag(page.getByRole('button',{name:'Resize route on photo',exact:true}),-38,-38);
  const resized=await state();assert(Number.parseFloat(resized.width)<Number.parseFloat(dragged.width));assert.equal(resized.left,dragged.left);assert.equal(resized.top,dragged.top);
  await move.press('ArrowLeft');const nudged=await state();assert(Number.parseFloat(nudged.left)<Number.parseFloat(resized.left));
  await move.press('Home');assert.deepEqual(await state(),initial);
  // Mouse/trackpad input uses the same interaction as touch.
  const box=await move.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-12,box.y+box.height/2-30,{steps:5});await page.mouse.up();
  assert.notDeepEqual(await state(),initial);
  await page.getByRole('button',{name:'Reset placement',exact:true}).click();assert.deepEqual(await state(),initial);
  await move.scrollIntoViewIfNeeded();await touchDrag(page.getByRole('button',{name:'Resize route on photo',exact:true}),-45,-45);await touchDrag(move,-20,35);
  const chosen=await state();
  await page.screenshot({path:path.join(out,'mobile-direct-placement.png')});
  await page.getByRole('button',{name:'Create photo video',exact:true}).click();
  assert.equal(await move.count(),0,'editing controls hidden during export');
  await page.getByText('Your MP4 is ready.',{exact:true}).waitFor({timeout:30000});
  const video=page.getByLabel('Exported story video');
  await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
  const metadata=await video.evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,error:v.error?.message??null}));
  assert.equal(metadata.width,720);assert.equal(metadata.height,1280);assert(metadata.duration>11&&metadata.duration<13);assert.equal(metadata.error,null);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'Download video',exact:true}).click();
  const download=await downloadPromise;await download.saveAs(path.join(out,'synthetic-repositioned-story.mp4'));
  await page.getByRole('button',{name:'Back to editing',exact:true}).click();assert.deepEqual(await state(),chosen,'chosen placement survives export');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,touchDrag:true,touchResize:true,mouseDrag:true,keyboard:true,reset:true,chosenPlacementRetained:true,video:metadata,synthetic:true}));
}catch(error){await page.screenshot({path:path.join(out,'placement-failure.png')});console.error(await page.locator('body').innerText());throw error;}
finally{await browser.close();}
