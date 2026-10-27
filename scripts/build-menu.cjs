const fs=require('fs'),path=require('path'),crypto=require('crypto');
const base=path.resolve(__dirname,'..');
function read(dir){return fs.readdirSync(path.join(base,'content',dir)).filter(n=>n.endsWith('.json')).map(n=>{const x=JSON.parse(fs.readFileSync(path.join(base,'content',dir,n),'utf8'));let changed=false;if(!x.id){x.id=(dir==='cards'?'new-':'')+n.replace(/\.json$/,'');changed=true}if(!x.status){x.status='published';changed=true}if(changed)fs.writeFileSync(path.join(base,'content',dir,n),JSON.stringify(x,null,2)+'\n');return x})}
const cards=read('cards').sort((a,b)=>(a.order??9999)-(b.order??9999)),sections=read('sections').sort((a,b)=>(a.order??9999)-(b.order??9999)),groups=read('groups').sort((a,b)=>(a.order??9999)-(b.order??9999)),tags=read('tags').sort((a,b)=>(a.order??9999)-(b.order??9999));
// Store a one-time fingerprint of each OCR import. Future human edits are detected
// automatically, so an old low-confidence PNG stops overriding the corrected text.
const baselineFile=path.join(base,'data','composition-import-baseline.json');
const signature=s=>crypto.createHash('sha256').update(String(s||''),'utf8').digest('hex');
let baseline;
if(fs.existsSync(baselineFile)){
  baseline=JSON.parse(fs.readFileSync(baselineFile,'utf8'));
}else{
  fs.mkdirSync(path.dirname(baselineFile),{recursive:true});
  baseline=Object.fromEntries(cards.map(c=>[c.id,signature(c.composition||c.answerText||'')]));
  fs.writeFileSync(baselineFile,JSON.stringify(baseline,null,2)+'\n');
}
for(const card of cards){
  card.compositionEdited=Boolean(baseline[card.id] && baseline[card.id]!==signature(card.composition||card.answerText||''));
}

function unique(a,field){const v=a.map(x=>x[field]);if(new Set(v).size!==v.length)throw Error('Duplicate '+field)}
unique(cards,'id');unique(sections,'id');unique(groups,'id');unique(tags,'id');
for(const c of cards){if(!sections.some(s=>s.id===c.section))throw Error('Missing section '+c.id);if(!c.title||!c.front)throw Error('Incomplete '+c.id);for(const t of c.tags||[])if(!tags.some(x=>x.id===t))throw Error('Missing tag '+t)}
for(const s of sections)if(!groups.some(g=>g.id===s.group))throw Error('Missing group '+s.id);
for(const g of groups)g.sections=sections.filter(s=>s.group===g.id).sort((a,b)=>a.order-b.order).map(s=>s.id);
const publishedSections=new Set(sections.filter(s=>s.status==='published'&&groups.some(g=>g.id===s.group&&g.status==='published')).map(s=>s.id));
const publicCards=cards.filter(c=>c.status==='published'&&publishedSections.has(c.section));
require('./build-menu-changes.cjs').buildChanges(base,publicCards);
const text='/* Generated from content/*.json. Do not edit manually. */\nwindow.GARAGE_MENU = '+JSON.stringify({sections,groups,tags,cards:publicCards})+';\n'+"\n(function(){\n  var root=new URL('../',document.currentScript.src);\n  const used=new Map();\n  const all=window.GARAGE_MENU.cards;\n  function claim(c,n){if(!used.has(c.section))used.set(c.section,new Set());if(used.get(c.section).has(n))return false;c.runtimeIndex=n;used.get(c.section).add(n);return true;}\n  for(const c of all){if(c.section===c.legacySection&&Number.isInteger(c.legacyIndex))claim(c,c.legacyIndex);}\n  for(const c of all){if(!Number.isInteger(c.runtimeIndex)&&Number.isInteger(c.legacyIndex))claim(c,c.legacyIndex);}\n  for(const c of all){if(Number.isInteger(c.runtimeIndex))continue;let n=100001;for(const x of String(c.id||c.title)){n=(n*31+x.charCodeAt(0))%2000000000;}n=Math.max(100001,n);while(!claim(c,n))n++;}\n  for(const c of window.GARAGE_MENU.cards){\n    for(const key of ['front','back']){\n      if(c[key] && !/^(?:https?:|data:)/i.test(c[key])) c[key]=new URL(c[key].replace(/^\\/+/,''),root).href;\n    }\n  }\n})();\n";
fs.mkdirSync(path.join(base,'js'),{recursive:true});fs.writeFileSync(path.join(base,'js','menu-data.js'),text);console.log('Built',cards.length,'cards');
require('./sync-pages-cms.cjs');
