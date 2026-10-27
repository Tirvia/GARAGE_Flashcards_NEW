/* GARAGE learning engine. Pure browser/Node logic; no user data is sent to GitHub. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root)root.GARAGE_Learning=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const intervals=[1,3,7,14,30,60];
  const shuffle=(array,rng=Math.random)=>{
    const a=[...array];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
  };
  const normalize=t=>String(t||"").trim().toLocaleLowerCase("ru").replace(/ё/g,"е").replace(/[.:;!,]+$/g,"").replace(/\s+/g," ");
  function getIngredients(card){
    if(!card || card.testIngredientsVerified!==true || card.compositionNeedsReview===true)return [];
    const result=[];
    for(const line of String(card.composition||"").split(/\r?\n/)){
      const m=/^[-*+]\s+(.+)/.exec(line);if(!m)continue;
      const text=m[1].trim().replace(/:$/,"").replace(/\*\*/g,"").trim();
      const key=normalize(text);
      if(text.length>2&&!result.some(x=>x.key===key))result.push({id:key,label:text});
    }
    return result;
  }
  const cardsInScope=(menu,section="")=>menu.cards.filter(c=>c.status==="published"&&(!section||c.section===section));
  function optionsForPhoto(card,menu,rng=Math.random){
    const others=menu.cards.filter(c=>c.id!==card.id&&c.title!==card.title&&c.status==="published");
    const direct=shuffle(others.filter(c=>c.section===card.section),rng);
    const group=menu.sections.find(s=>s.id===card.section)?.group;
    const near=shuffle(others.filter(c=>c.section!==card.section&&menu.sections.find(s=>s.id===c.section)?.group===group),rng);
    const remaining=shuffle(others.filter(c=>c.section!==card.section&&!(menu.sections.find(s=>s.id===c.section)?.group===group)),rng);
    const seen=new Set([normalize(card.title)]);
    const picked=[];
    for(const candidate of [...direct,...near,...remaining]){
      const key=normalize(candidate.title);if(seen.has(key))continue;
      seen.add(key);picked.push(candidate);if(picked.length===3)break;
    }
    if(picked.length<3)return null;
    return shuffle([card,...picked].map(c=>({id:c.id,label:c.title})),rng);
  }
  function photoQuestion(card,menu,rng=Math.random){
    const choices=optionsForPhoto(card,menu,rng);if(!choices)return null;
    return {kind:"photo",cardId:card.id,prompt:"Как называется блюдо на фотографии?",image:card.front,
      choices,correctIds:[card.id],multi:false};
  }
  function ingredientQuestion(card,menu,rng=Math.random){
    const included=getIngredients(card);
    if(included.length<2)return null;
    const mine=new Set(included.map(i=>i.id));
    const reviewed=menu.cards.filter(c=>c.id!==card.id&&c.status==="published"&&c.testIngredientsVerified&& !c.compositionNeedsReview);
    const source=new Map();
    for(const c of reviewed)for(const item of getIngredients(c))if(!mine.has(item.id)&&!source.has(item.id))source.set(item.id,item);
    const different=shuffle([...source.values()],rng);
    if(different.length<3)return null;
    const frequency=new Map();
    for(const c of reviewed)for(const item of getIngredients(c))frequency.set(item.id,(frequency.get(item.id)||0)+1);
    const specific=shuffle(included.filter(x=>(frequency.get(x.id)||0)<reviewed.length),rng);
    const correct=(specific.length>=2?specific:shuffle(included,rng)).slice(0,Math.min(3,included.length));
    return {kind:"ingredients",cardId:card.id,prompt:"Какие из перечисленных ингредиентов входят в «"+card.title+"»?",
      choices:shuffle([...correct,...different.slice(0,3)],rng),correctIds:correct.map(x=>x.id),multi:true,
      note:"Выбери все подходящие варианты."};
  }
  function guestQuestion(card,menu,rng=Math.random){
    const mine=getIngredients(card);if(mine.length<2)return null;
    const verified=menu.cards.filter(c=>c.testIngredientsVerified && !c.compositionNeedsReview && c.status==="published" && c.id!==card.id);
    const variants=shuffle(mine,rng);
    for(const ingredient of variants){
      const wrong=shuffle(verified.filter(c=>!getIngredients(c).some(x=>x.id===ingredient.id)),rng);
      if(wrong.length<3)continue;
      const candidates=shuffle([card,...wrong.slice(0,3)].map(c=>({id:c.id,label:c.title})),rng);
      return {kind:"guest",cardId:card.id,
        prompt:"Гость просит предложить блюдо, в состав которого входит «"+ingredient.label+"». Какое блюдо подойдёт?",
        choices:candidates,correctIds:[card.id],multi:false,
        note:"Вопрос составлен по проверенным ингредиентам. При реальном заказе всегда сверяй актуальную информацию."};
    }
    return null;
  }
  function recallQuestion(card){return {kind:"recall",cardId:card.id,prompt:"Попробуй вспомнить состав блюда",title:card.title};}
  function makeQuestion(card,menu,preferred,rng=Math.random){
    const list=preferred==="ingredients"?["ingredients","guest","photo"]:preferred==="guest"?["guest","ingredients","photo"]:
      preferred==="photo"?["photo"]:["photo","ingredients","guest"];
    for(const name of list){
      const question=name==="photo"?photoQuestion(card,menu,rng):name==="ingredients"?ingredientQuestion(card,menu,rng):guestQuestion(card,menu,rng);
      if(question)return question;
    }
    return null;
  }
  function evaluate(question,ids){
    const actual=new Set(ids),expected=new Set(question.correctIds||[]);
    return actual.size===expected.size && [...actual].every(id=>expected.has(id));
  }
  const localDate=(date=new Date())=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
  const plusDays=(date,n)=>{const d=new Date(date.getFullYear(),date.getMonth(),date.getDate()+n);return localDate(d)};
  function createProgress(){return {version:1,cards:{},daily:{},history:[]};}
  function updateProgress(state,cardId,correct,now=new Date()){
    const prior=state.cards[cardId]||{step:0,attempts:0,correct:0,wrong:0};
    const step=correct?Math.min(prior.step+1,intervals.length):0;
    const next={step,attempts:prior.attempts+1,correct:prior.correct+(correct?1:0),
      wrong:prior.wrong+(correct?0:1),due:plusDays(now,correct?intervals[Math.max(0,step-1)]:1),
      last:localDate(now),needsRepeat:!correct};
    state.cards[cardId]=next;return next;
  }
  function dueCards(cards,state,now=new Date(),rng=Math.random){
    const today=localDate(now),random=shuffle(cards,rng);
    return random.sort((a,b)=>{
      const p=state.cards[a.id],q=state.cards[b.id];
      const rank=x=>x?.needsRepeat?0:x?.due<=today?1:!x?2:3;
      return rank(p)-rank(q);
    });
  }
  function selectCards(menu,state,opts={}){
    const rng=opts.rng||Math.random,now=opts.now||new Date(),limit=Math.max(1,opts.limit||12);
    let pool=cardsInScope(menu,opts.section||"");
    if(opts.focusIds){const allowed=new Set(opts.focusIds);pool=pool.filter(c=>allowed.has(c.id));}
    if(opts.mode==="mistakes")pool=pool.filter(c=>state.cards[c.id]?.needsRepeat);
    if(!pool.length)return [];
    const ranked=dueCards(pool,state,now,rng);
    // Ensure objective tests offer some ingredient / guest questions from approved recipes.
    const wanted=opts.mode==="quiz"||opts.mode==="daily"?Math.min(3,Math.floor(limit/4)):0;
    const verified=ranked.filter(c=>getIngredients(c).length>=2).slice(0,wanted);
    const seen=new Set(verified.map(x=>x.id));
    return [...verified,...ranked.filter(c=>!seen.has(c.id))].slice(0,limit);
  }
  function makeSession(menu,state,opts={}){
    const selected=selectCards(menu,state,opts),rng=opts.rng||Math.random,mode=opts.mode||"quiz";
    const preferred=["photo","photo","ingredients","guest","photo","ingredients","photo","guest"];
    let list=selected.map((card,i)=>{
      if(mode==="recall")return recallQuestion(card);
      const hint=i%4===0?"ingredients":i%4===1?"guest":preferred[i%preferred.length];
      return makeQuestion(card,menu,hint,rng);
    }).filter(Boolean);
    if(mode==="quiz"||mode==="daily")list=shuffle(list,rng);
    return list;
  }
  function activeChanges(menu,history,days=60,now=new Date()){
    const active=new Set(menu.cards.map(c=>c.id));
    const cutoff=now.getTime()-days*86400000;
    return (history||[]).filter(c=>Date.parse(c.date)>=cutoff)
      .map(c=>({...c,available:active.has(c.cardId)}))
      .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  }
  return {shuffle,normalize,getIngredients,photoQuestion,ingredientQuestion,guestQuestion,recallQuestion,
    makeQuestion,evaluate,createProgress,updateProgress,localDate,plusDays,dueCards,selectCards,
    makeSession,activeChanges};
});