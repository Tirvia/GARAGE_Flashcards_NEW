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
