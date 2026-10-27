/* Dynamic GARAGE sections. Leaves all existing start-page copy and styling unchanged. */
(function(){
const M=window.GARAGE_MENU;if(!M)return;
const byId=new Map(M.sections.map(s=>[s.id,s]));
const groups=new Map(M.groups.map(g=>[g.id,g]));
const isLive=s=>s&&s.status==="published"&&groups.get(s.group)?.status==="published";
const anchors=[...document.querySelectorAll('a[href*="section="]')];
const listed=new Set();
const targets=new Map();
for(const card of document.querySelectorAll(".category-card")){
 const groupLink=card.querySelector('a[href*="group="],a[href*="section="]');
 if(!groupLink)continue;
 const params=new URL(groupLink.href,location.href).searchParams;
 const groupId=params.get("group")||byId.get(params.get("section"))?.group;
 if(groupId)targets.set(groupId,card);
}
for(const a of anchors){
 const section=new URL(a.href,location.href).searchParams.get("section");
 if(!section)continue;
 const record=byId.get(section);
 const li=a.closest("li.subcategory-item"),card=a.closest(".category-card");
 if(!isLive(record)){if(li)li.remove();else if(card)card.hidden=true;continue}
 if(a.classList.contains("subcategory-link")){
   a.textContent=record.name;
   const desired=targets.get(record.group)?.querySelector(".subcategory-list");
   if(li&&desired&&li.parentElement!==desired)desired.append(li);
   listed.add(section);
 }
}
for(const group of M.groups){
 if(group.status!=="published")continue;
 const card=targets.get(group.id);
 if(!card)continue;
 const ul=card.querySelector(".subcategory-list");
 if(!ul)continue;
 for(const section of M.sections.filter(s=>s.group===group.id&&isLive(s)&&!listed.has(s.id)).sort((a,b)=>(a.order||0)-(b.order||0))){
   const li=document.createElement("li");li.className="subcategory-item";
   const link=document.createElement("a");link.className="subcategory-link";
   link.href="flashcards/flashcards.html?section="+encodeURIComponent(section.id);
   link.textContent=section.name;
   li.append(link);ul.append(li);
 }
}
})();