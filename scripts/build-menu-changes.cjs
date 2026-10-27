/* Build the "What's changed in the menu" feed from the previous generated catalog.
   Run BEFORE overwriting js/menu-data.js; preserve changes between deployments. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const stable=c=>JSON.stringify({title:c.title,section:c.section,composition:c.composition||c.answerText||"",
  front:c.front||"",tags:[...(c.tags||[])].sort()});
const signature=v=>crypto.createHash('sha1').update(String(v)).digest('hex').slice(0,12);
function compare(previous,current,now=new Date()){
  const old=new Map(previous.map(c=>[c.id,c])),fresh=new Map(current.map(c=>[c.id,c]));
  const events=[];
  for(const c of current){
    const before=old.get(c.id);
    if(!before){events.push({cardId:c.id,title:c.title,type:'new',note:'Новая позиция'});continue;}
    if(stable(before)===stable(c))continue;
    const changed=[];
    if(before.title!==c.title)changed.push('название');
    if(before.section!==c.section)changed.push('раздел');
    if((before.composition||before.answerText||"")!==(c.composition||c.answerText||""))changed.push('состав');
    if(before.front!==c.front)changed.push('фото');
    if(JSON.stringify([...(before.tags||[])].sort())!==JSON.stringify([...(c.tags||[])].sort()))changed.push('категории состава');
    if(changed.length)events.push({cardId:c.id,title:c.title,type:changed.length===1&&changed[0]==='раздел'?'moved':'updated',
      note:'Изменено: '+changed.join(', ')});
  }
  for(const c of previous)if(!fresh.has(c.id))events.push({cardId:c.id,title:c.title,type:'removed',
    note:'Блюдо больше не опубликовано'});
  const date=now.toISOString();
  return events.map((e,i)=>({...e,date,id:signature(date+'|'+i+'|'+e.cardId+'|'+e.note)}));
}
function extractPrevious(file){
  if(!fs.existsSync(file))return null;
  const text=fs.readFileSync(file,'utf8');
  const prefix='window.GARAGE_MENU = ',start=text.indexOf(prefix);
  if(start<0)return null;
  const end=text.indexOf(';\n',start+prefix.length);
  if(end<0)return null;
  try{return JSON.parse(text.slice(start+prefix.length,end)).cards||null;}
  catch(e){throw new Error('Invalid existing menu-data.js, cannot safely track menu changes: '+e.message);}
}
function buildChanges(root,publicCards){
  const historyFile=path.join(root,'data','menu-change-history.json');
  const snapshot=path.join(root,'js','menu-data.js');
  const currentHistory=fs.existsSync(historyFile)?JSON.parse(fs.readFileSync(historyFile,'utf8')):[];
  const previous=extractPrevious(snapshot);
  const events=previous?compare(previous,publicCards):[];
  const previousIds=new Set(currentHistory.map(e=>e.id));
  const now=new Date(),cutoff=now.getTime()-120*86400000;
  const history=[...events.filter(e=>!previousIds.has(e.id)),...currentHistory]
    .filter(e=>Number.isFinite(Date.parse(e.date))&&Date.parse(e.date)>=cutoff).slice(0,250);
  fs.mkdirSync(path.join(root,'data'),{recursive:true});
  fs.writeFileSync(historyFile,JSON.stringify(history,null,2)+'\n','utf8');
  fs.writeFileSync(path.join(root,'js','menu-changes.js'),
    '/* Automatically generated from saved menu changes. */\nwindow.GARAGE_MENU_CHANGES = '+
    JSON.stringify(history)+';\n','utf8');
  console.log('Menu changes:',events.length,'new,',history.length,'stored');
  return events;
}
module.exports={compare,extractPrevious,buildChanges};
