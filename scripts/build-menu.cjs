const fs=require('fs'),path=require('path');
const base=path.resolve(__dirname,'..');
function read(dir){return fs.readdirSync(path.join(base,'content',dir)).filter(n=>n.endsWith('.json')).map(n=>{const x=JSON.parse(fs.readFileSync(path.join(base,'content',dir,n),'utf8'));if(!x.id)x.id=(dir==='cards'?'new-':'')+n.replace(/\\.json$/,'');if(!x.status)x.status='published';return x})}
const cards=read('cards').sort((a,b)=>(a.order??9999)-(b.order??9999)),sections=read('sections').sort((a,b)=>(a.order??9999)-(b.order??9999)),groups=read('groups').sort((a,b)=>(a.order??9999)-(b.order??9999)),tags=read('tags').sort((a,b)=>(a.order??9999)-(b.order??9999));
function unique(a,field){const v=a.map(x=>x[field]);if(new Set(v).size!==v.length)throw Error('Duplicate '+field)}
unique(cards,'id');unique(sections,'id');unique(groups,'id');unique(tags,'id');
for(const c of cards){if(!sections.some(s=>s.id===c.section))throw Error('Missing section '+c.id);if(!c.title||!c.front)throw Error('Incomplete '+c.id);for(const t of c.tags||[])if(!tags.some(x=>x.id===t))throw Error('Missing tag '+t)}
for(const s of sections)if(!groups.some(g=>g.id===s.group))throw Error('Missing group '+s.id);
for(const g of groups)g.sections=sections.filter(s=>s.group===g.id).sort((a,b)=>a.order-b.order).map(s=>s.id);
const publishedSections=new Set(sections.filter(s=>s.status==='published'&&groups.some(g=>g.id===s.group&&g.status==='published')).map(s=>s.id));
const publicCards=cards.filter(c=>c.status==='published'&&publishedSections.has(c.section));
const text='/* Generated from content/*.json. Do not edit manually. */\nwindow.GARAGE_MENU = '+JSON.stringify({sections,groups,tags,cards:publicCards})+';\n'+"\n(function(){\n  var root=new URL('../',document.currentScript.src);\n  const used=new Map();\n  for(const c of window.GARAGE_MENU.cards){\n    if(!used.has(c.section)) used.set(c.section,new Set());\n    if(Number.isInteger(c.legacyIndex)) used.get(c.section).add(c.legacyIndex);\n  }\n  for(const c of window.GARAGE_MENU.cards){\n    if(!Number.isInteger(c.legacyIndex)){\n      const numbers=used.get(c.section);\n      let n=1001;\n      while(numbers.has(n)) n+=2;\n      c.legacyIndex=n;\n      numbers.add(n);\n    }\n  }\n  for(const c of window.GARAGE_MENU.cards){\n    for(const key of ['front','back']){\n      if(c[key] && !/^(?:https?:|data:)/i.test(c[key])) c[key]=new URL(c[key].replace(/^\\/+/,''),root).href;\n    }\n  }\n})();\n";
fs.mkdirSync(path.join(base,'js'),{recursive:true});fs.writeFileSync(path.join(base,'js','menu-data.js'),text);console.log('Built',cards.length,'cards');
