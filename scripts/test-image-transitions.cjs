/* Regression tests for rapid card switching and image decoding. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');

let allocations=0, renderCount=0;
class FakeImage {
  constructor(){this.naturalWidth=0;this.complete=false;this.onload=null;this.onerror=null;allocations++;}
  set src(value){
    this._src=value;
    const delay=String(value).startsWith('slow')?70:String(value).startsWith('fast')?3:8;
    setTimeout(()=>{
      if(String(value).startsWith('broken')){
        this.onerror?.(new Error('Not found'));return;
      }
      this.naturalWidth=800;this.complete=true;this.onload?.();
    },delay);
  }
  get src(){return this._src;}
  decode(){return Promise.resolve();}
}
const sandbox={window:{GARAGE_answerSrc(card){renderCount++;return 'data:image/svg+xml,'+card.id;}},Image:FakeImage,Map,Set,WeakMap,Promise};
vm.runInNewContext(fs.readFileSync(path.join(root,'js/card-image-loader.js'),'utf8'),sandbox);
const images=sandbox.window.GARAGE_cardImages;
function imageElement(){
  return {style:{visibility:'visible'},src:'previous',
    removeAttribute(k){if(k==='src')this.src='';}};
}

async function run(){
  const front=imageElement(),back=imageElement();
  const first=images.showPair(front,back,'first-front','first-back');
  assert.equal(front.style.visibility,'hidden','Previous front must hide synchronously');
  assert.equal(back.style.visibility,'hidden','Previous back must hide synchronously');
  assert.equal(await first,true);
  assert.equal(front.src,'first-front');
  assert.equal(back.src,'first-back');

  // A slow request must not overwrite a newer card.
  const old=images.showPair(front,back,'slow-front','slow-back');
  const current=images.showPair(front,back,'fast-front','fast-back');
  await Promise.all([old,current]);
  assert.equal(front.src,'fast-front','Late previous image must not flash');
  assert.equal(back.src,'fast-back','Late previous answer must not flash');
  assert.equal(front.style.visibility,'visible');
  assert.equal(back.style.visibility,'visible');

  // Repeated previews reuse the same Image rather than downloading duplicates.
  const count=allocations;
  await Promise.all([images.preload('fast-front'),images.preload('fast-back')]);
  assert.equal(allocations,count,'Previously decoded images should stay cached');

  const failed=images.showPair(front,back,'fast-front','broken-back');
  assert.equal(front.style.visibility,'hidden','Old front hidden even with failed new load');
  assert.equal(await failed,false);
  assert.equal(front.src,'fast-front');
  assert.equal(back.style.visibility,'hidden','Old answer must never remain visible');

  const card={id:'known-recipe'};
  assert.equal(images.answer(card),'data:image/svg+xml,known-recipe');
  assert.equal(images.answer(card),'data:image/svg+xml,known-recipe');
  assert.equal(renderCount,1,'Recipe SVG must be generated only once per card');
  images.prefetchNearby([{id:'first',front:'next-front',source:card}],0,1);
  await images.preload('next-front');
  console.log('Rapid transitions: last-request-wins, no old image, cached decoding, preview OK');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
