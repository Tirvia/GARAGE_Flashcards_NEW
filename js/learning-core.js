/* GARAGE quiz generator: question templates are built from the canonical menu.
   Objective ingredient questions are available ONLY for explicitly approved recipes.
   Pure JavaScript; it works in a browser or in Node tests, without an AI API. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.GARAGE_Learning=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";

  const intervals=[1,3,7,14,30,60];
  const shuffle=(array,rng=Math.random)=>{
    const result=[...array];
    for(let i=result.length-1;i>0;i--){
      const j=Math.min(i,Math.max(0,Math.floor(rng()*(i+1))));
      [result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  };
  const normalize=text=>String(text||"").trim().toLocaleLowerCase("ru")
    .replace(/ё/g,"е").replace(/[.:;!,]+$/g,"").replace(/\s+/g," ");
  const normalizeWords=text=>normalize(text).replace(/[()«»"']/g," ")
    .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
  const verified=card=>Boolean(card&&card.status==="published"&&
    card.testIngredientsVerified===true&&card.compositionNeedsReview!==true&&
    String(card.composition||"").trim());

  // Only actual, approved list items become quiz choices. Parenthesised descriptions,
  // unreviewed OCR and guessed allergens are not treated as verified structured data.
  function readIngredients(card,includeNested=false){
    if(!verified(card))return [];
    const result=[],seen=new Set();
    for(const row of String(card.composition).split(/\r?\n/)){
      const found=(includeNested?/^\s*[-*+]\s+(.+)/:/^[-*+]\s+(.+)/).exec(row);
      if(!found)continue;
      const label=found[1].trim().replace(/:$/,"").replace(/\*\*/g,"").trim();
      const id=normalizeWords(label);
      if(id.length<3||seen.has(id))continue;
      seen.add(id);result.push({id,label});
    }
    return result;
  }
  const getIngredients=card=>readIngredients(card,false);
  const allIngredients=card=>readIngredients(card,true);

  // Conservative guard: a distractor must be absent from the entire approved
  // recipe text, including nested ingredients and parenthesised descriptions.
  function isMentioned(card,ingredient){
    const phrase=normalizeWords(ingredient);
    if(!phrase)return false;
    const hay=" "+normalizeWords(card.composition||"")+" ";
    return hay.includes(" "+phrase+" ");
  }
  function falseIngredientPool(card,menu,rng=Math.random){
    const choices=new Map();
    for(const other of menu.cards){
      if(other.id===card.id||!verified(other))continue;
      for(const item of getIngredients(other)){
        if(!isMentioned(card,item.label)&&!choices.has(item.id))choices.set(item.id,item);
      }
    }
    return shuffle([...choices.values()],rng);
  }
  function cardsInScope(menu,section=""){
    return menu.cards.filter(c=>c.status==="published"&&(!section||c.section===section));
  }
  function peerCards(card,menu,rng=Math.random){
    const eligible=menu.cards.filter(c=>c.id!==card.id&&verified(c)&&normalize(c.title)!==normalize(card.title));
    const group=menu.sections.find(s=>s.id===card.section)?.group;
    return [...shuffle(eligible.filter(c=>c.section===card.section),rng),
      ...shuffle(eligible.filter(c=>c.section!==card.section&&
        menu.sections.find(s=>s.id===c.section)?.group===group),rng),
      ...shuffle(eligible.filter(c=>c.section!==card.section&&
        menu.sections.find(s=>s.id===c.section)?.group!==group),rng)];
  }
  function optionsForPhoto(card,menu,rng=Math.random){
    const eligible=menu.cards.filter(c=>c.id!==card.id&&c.status==="published");
    const group=menu.sections.find(s=>s.id===card.section)?.group;
    const direct=shuffle(eligible.filter(c=>c.section===card.section),rng);
    const nearby=shuffle(eligible.filter(c=>c.section!==card.section&&
      menu.sections.find(s=>s.id===c.section)?.group===group),rng);
    const remainder=shuffle(eligible.filter(c=>c.section!==card.section&&
      menu.sections.find(s=>s.id===c.section)?.group!==group),rng);
    const seen=new Set([normalize(card.title)]),picked=[];
    for(const candidate of [...direct,...nearby,...remainder]){
      const key=normalize(candidate.title);if(seen.has(key))continue;
      seen.add(key);picked.push(candidate);if(picked.length===3)break;
    }
    if(picked.length<3)return null;
    return shuffle([card,...picked].map(c=>({id:c.id,label:c.title})),rng);
  }

  const photoTexts={
    food:["Как называется блюдо на фотографии?","Выбери правильное название блюда.","Какую позицию меню ты видишь на фото?"],
    drink:["Как называется напиток на фотографии?","Выбери правильное название напитка.","Какой напиток изображён на фото?"]
  };
  function photoQuestion(card,menu,rng=Math.random){
    const choices=optionsForPhoto(card,menu,rng);
    if(!choices)return null;
    const group=menu.sections.find(s=>s.id===card.section)?.group;
    const prompts=photoTexts[group==="bar"?"drink":"food"];
    return {kind:"photo",cardId:card.id,
      prompt:prompts[Math.floor(rng()*prompts.length)]||prompts[0],
      image:card.front,choices,correctIds:[card.id],multi:false,
      explanation:"На фотографии — «"+card.title+"»."};
  }
  function ingredientQuestion(card,menu,rng=Math.random){
    const correctCandidates=shuffle(getIngredients(card),rng);
    const absent=falseIngredientPool(card,menu,rng);
    if(correctCandidates.length<2||absent.length<3)return null;
    const correct=correctCandidates.slice(0,Math.min(3,correctCandidates.length));
    return {kind:"ingredients",cardId:card.id,
      prompt:shuffle([
        "Какие из перечисленных ингредиентов входят в состав «"+card.title+"»?",
        "Выбери все ингредиенты, указанные в составе блюда «"+card.title+"»."
      ],rng)[0],
      choices:shuffle([...correct,...absent.slice(0,3)],rng),
      correctIds:correct.map(x=>x.id),multi:true,
      note:"Можно выбрать несколько вариантов.",
      explanation:"В подтверждённом составе указаны: "+correct.map(x=>x.label).join(", ")+"."};
  }

  // Exactly one answer is absent; the other three are confirmed ingredients.
  function missingQuestion(card,menu,rng=Math.random){
    const present=shuffle(getIngredients(card),rng);
    const absent=falseIngredientPool(card,menu,rng);
    if(present.length<3||!absent.length)return null;
    const included=present.slice(0,3),missing=absent[0];
    return {kind:"missing",cardId:card.id,
      prompt:shuffle([
        "Какой ингредиент НЕ указан в подтверждённом составе «"+card.title+"»?",
        "Найди лишний ингредиент для блюда «"+card.title+"»."
      ],rng)[0],
      choices:shuffle([...included,missing],rng),correctIds:[missing.id],multi:false,
      explanation:"В составе перечислены: "+included.map(i=>i.label).join(", ")+
        ". «"+missing.label+"» в подтверждённой карточке этого блюда не указан."};
  }

  // A real comparison with precisely two confirmed recipes, not an unverified
  // claim that an ingredient is absent from the menu as a whole.
  function compareQuestion(card,menu,rng=Math.random){
    const mine=shuffle(getIngredients(card),rng),peers=peerCards(card,menu,rng);
    if(!mine.length||!peers.length)return null;
    for(const item of mine){
      for(const peer of peers){
        if(isMentioned(peer,item.label))continue;
        const choices=shuffle([{id:card.id,label:card.title},{id:peer.id,label:peer.title}],rng);
        return {kind:"compare",cardId:card.id,
          prompt:shuffle([
            "Сравни два блюда: в каком из них указан ингредиент «"+item.label+"»?",
            "В составе какого блюда есть «"+item.label+"»?"
          ],rng)[0],
          choices,correctIds:[card.id],multi:false,
          explanation:"В «"+card.title+"» указан ингредиент «"+item.label+
            "», а в подтверждённом составе «"+peer.title+"» он не указан."};
      }
    }
    return null;
  }
  function guestQuestion(card,menu,rng=Math.random){
    const ingredients=shuffle(getIngredients(card),rng),peers=peerCards(card,menu,rng);
    for(const ingredient of ingredients){
      const negatives=peers.filter(c=>!isMentioned(c,ingredient.label));
      if(negatives.length<3)continue;
      const choices=shuffle([card,...negatives.slice(0,3)].map(c=>({id:c.id,label:c.title})),rng);
      return {kind:"guest",cardId:card.id,
        prompt:shuffle([
          "Гость спрашивает: «В каком блюде есть "+ingredient.label+"?» Что можно предложить?",
          "Гость хочет блюдо с ингредиентом «"+ingredient.label+"». Какую позицию выбрать?",
          "Гость уточняет состав: в каком из этих блюд указан ингредиент «"+ingredient.label+"»?"
        ],rng)[0],
        choices,correctIds:[card.id],multi:false,
        note:"Ответ основан на проверенных карточках. Для пищевых ограничений состав нужно дополнительно уточнить.",
        explanation:"По подтверждённому составу ингредиент «"+ingredient.label+"» есть в «"+card.title+"»."};
    }
    return null;
  }

  // Find clues that distinguish the target from every other displayed recipe.
  function recipeQuestion(card,menu,rng=Math.random){
    const peers=peerCards(card,menu,rng).slice(0,3);
    const mine=shuffle(getIngredients(card),rng);
    if(peers.length<3||mine.length<2)return null;
    const distinctive=mine.filter(item=>peers.every(peer=>!isMentioned(peer,item.label)));
    if(!distinctive.length)return null;
    const clues=[distinctive[0]];
    for(const item of mine){
      if(clues.some(x=>x.id===item.id))continue;
      clues.push(item);if(clues.length===3)break;
    }
    if(clues.length<2)return null;
    return {kind:"recipe",cardId:card.id,
      prompt:shuffle([
        "Угадай блюдо по сочетанию ингредиентов: "+clues.map(x=>x.label).join(", ")+".",
        "Какому блюду соответствует состав: "+clues.map(x=>x.label).join(", ")+"?"
      ],rng)[0],
      choices:shuffle([card,...peers].map(c=>({id:c.id,label:c.title})),rng),
      correctIds:[card.id],multi:false,
      explanation:"Это «"+card.title+"». В его подтверждённом составе указаны: "+clues.map(x=>x.label).join(", ")+"."};
  }

  function recallQuestion(card){return {kind:"recall",cardId:card.id,prompt:"Попробуй вспомнить состав блюда",title:card.title};}
  const templates={photo:photoQuestion,ingredients:ingredientQuestion,missing:missingQuestion,
    compare:compareQuestion,guest:guestQuestion,recipe:recipeQuestion};
  const advancedKinds=["ingredients","missing","compare","guest","recipe"];
  function makeQuestion(card,menu,preferred,rng=Math.random){
    const order=preferred&&templates[preferred]?
      [preferred,...advancedKinds.filter(kind=>kind!==preferred),"photo"]:
      [...advancedKinds,"photo"];
    for(const kind of order){
      const question=templates[kind](card,menu,rng);
      if(question)return question;
    }
    return null;
  }
  function evaluate(question,ids){
    const actual=new Set(ids),expected=new Set(question.correctIds||[]);
    return actual.size===expected.size&&[...actual].every(id=>expected.has(id));
  }

  const localDate=(date=new Date())=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
  const plusDays=(date,n)=>{const d=new Date(date.getFullYear(),date.getMonth(),date.getDate()+n);return localDate(d)};
  function createProgress(){return {version:1,cards:{},daily:{},history:[]};}
  function updateProgress(state,cardId,correct,now=new Date(),kind){
    const prior=state.cards[cardId]||{step:0,attempts:0,correct:0,wrong:0};
    const step=correct?Math.min((prior.step||0)+1,intervals.length):0;
    const recentKinds=Array.isArray(prior.recentKinds)?prior.recentKinds:[];
    const revisedKinds=kind?[kind,...recentKinds.filter(x=>x!==kind)].slice(0,3):recentKinds;
    const next={step,attempts:(prior.attempts||0)+1,correct:(prior.correct||0)+(correct?1:0),
      wrong:(prior.wrong||0)+(correct?0:1),due:plusDays(now,correct?intervals[Math.max(0,step-1)]:1),
      last:localDate(now),needsRepeat:!correct,lastKind:kind||prior.lastKind||null,recentKinds:revisedKinds};
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
    // Sprinkle only due/new confirmed recipes into daily practice.
    const wanted=opts.mode==="quiz"||opts.mode==="daily"?Math.min(3,Math.floor(limit/4)):0;
    const today=localDate(now);
    const priority=ranked.filter(c=>getIngredients(c).length>=2 &&
      (opts.mode!=="daily"||!state.cards[c.id]||state.cards[c.id].due<=today||state.cards[c.id].needsRepeat)).slice(0,wanted);
    const seen=new Set(priority.map(x=>x.id));
    return [...priority,...ranked.filter(c=>!seen.has(c.id))].slice(0,limit);
  }
  // Variety is selected automatically, never configured in Pages CMS:
  // prefer a new type for this dish and types not yet used in this session.
  function makeSession(menu,state,opts={}){
    const selected=selectCards(menu,state,opts),rng=opts.rng||Math.random,mode=opts.mode||"quiz";
    const counts=Object.fromEntries(Object.keys(templates).map(key=>[key,0]));
    const questions=[];
    for(const card of selected){
      if(mode==="recall"){questions.push(recallQuestion(card));continue;}
      let choice=null;
      if(verified(card)){
        const candidates=shuffle(advancedKinds,rng)
          .map(kind=>templates[kind](card,menu,rng)).filter(Boolean);
        const history=state.cards[card.id]?.recentKinds||[];
        candidates.sort((a,b)=>{
          const weight=q=>(counts[q.kind]||0)*10+
            (history.indexOf(q.kind)===0?50:history.indexOf(q.kind)>0?15:0);
          return weight(a)-weight(b);
        });
        choice=candidates[0]||null;
      }
      if(!choice)choice=photoQuestion(card,menu,rng);
      if(choice){questions.push(choice);counts[choice.kind]=(counts[choice.kind]||0)+1;}
    }
    if(mode==="quiz"||mode==="daily")return shuffle(questions,rng);
    return questions;
  }
  function activeChanges(menu,history,days=60,now=new Date()){
    const active=new Set(menu.cards.map(c=>c.id));
    const cutoff=now.getTime()-days*86400000;
    return (history||[]).filter(c=>Date.parse(c.date)>=cutoff)
      .map(c=>({...c,available:active.has(c.cardId)}))
      .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  }
  return {shuffle,normalize,getIngredients,allIngredients,isMentioned,verified,
    photoQuestion,ingredientQuestion,missingQuestion,compareQuestion,guestQuestion,recipeQuestion,
    recallQuestion,makeQuestion,evaluate,createProgress,updateProgress,localDate,plusDays,
    dueCards,selectCards,makeSession,activeChanges};
});