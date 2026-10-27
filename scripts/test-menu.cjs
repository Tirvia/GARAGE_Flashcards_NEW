const fs=require("fs"),vm=require("vm"),path=require("path");
const root=path.resolve(__dirname,"..");
for(const p of ["js/menu-data.js","js/text-answer.js","js/flashcards.js","js/menu-navigation.js"]){
 new (require("vm").Script)(fs.readFileSync(path.join(root,p),"utf8"),{filename:p});
}
const window={},document={currentScript:{src:"https://tirvia.github.io/GARAGE_Flashcards_NEW/js/menu-data.js"}};
vm.runInNewContext(fs.readFileSync(path.join(root,"js/menu-data.js"),"utf8"),{window,document,URL,Map,Set,String,Number,Math});
const data=window.GARAGE_MENU;
if(!data || !Array.isArray(data.cards))throw Error("Missing catalog");
const slots=new Set();
for(const c of data.cards){
 if(!c.title||!c.front||!Number.isInteger(c.runtimeIndex))throw Error("Incomplete runtime card "+c.id);
 const key=c.section+":"+c.runtimeIndex;if(slots.has(key))throw Error("Duplicate section slot "+key);slots.add(key);
 const picture=c.front.startsWith("https://tirvia.github.io/GARAGE_Flashcards_NEW/images/");
 if(!picture)throw Error("Broken Github Pages image root "+c.front);
}
let ocr=0,files=0;
for(const f of fs.readdirSync(path.join(root,"content/cards")).filter(f=>f.endsWith(".json"))){
 files++;const c=JSON.parse(fs.readFileSync(path.join(root,"content/cards",f)));
 if(c.composition)ocr++;
}
if(ocr!==files)console.log("Recipe text missing on",files-ocr,"cards; legacy images remain available");
console.log("OK:",data.cards.length,"published cards,",ocr,"editable recipes, unique slots, valid paths");


/* Regression: every published composition must render without losing its content.
   In particular, prior bug showed only black bullet dots on a blank flip side. */
const measureCtx={font:"43px Arial",measureText(s){
  const m=/([\d.]+)px/.exec(this.font);
  return {width:[...String(s)].length*Number(m?m[1]:43)*.55};
}};
const renderSandbox={
  window:{},
  document:{createElement:()=>({getContext:()=>measureCtx})},
  encodeURIComponent
};
vm.runInNewContext(fs.readFileSync(path.join(root,"js/text-answer.js"),"utf8"),renderSandbox);
const render=renderSandbox.window.GARAGE_answerSrc;
let rendered=0,legacy=0;
for(const card of data.cards){
  const src=render(card);
  if(!src)throw Error("Blank composition "+card.id);
  if(src.startsWith("data:image/svg+xml")){
    const svg=decodeURIComponent(src.slice(src.indexOf(",")+1));
    if(!svg.startsWith("<svg ")||!svg.endsWith("</svg>")||!svg.includes("<tspan"))throw Error("Invalid composition SVG "+card.id);
    rendered++;
  }else if(card.compositionNeedsReview&&!card.compositionEdited&&src===card.back){
    legacy++;
  }else if(src===card.back&&!(card.composition||"").trim()){
    legacy++;
  }else{
    throw Error("Unexpected composition source "+card.id);
  }
}
for(const id of ["draniki-001","draniki-003","draniki-005","draniki-007","draniki-009"]){
  const c=data.cards.find(x=>x.id===id);
  if(!c || !render(c).startsWith("data:image/svg+xml"))throw Error("Draники should use corrected text: "+id);
}
console.log("Composition test:",rendered,"text cards,",legacy,"originals awaiting review");
