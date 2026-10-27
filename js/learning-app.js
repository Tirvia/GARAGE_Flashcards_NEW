/* GARAGE: assessment, daily spaced practice, mistakes and published menu updates.
   User progress is stored only in localStorage, never sent to GitHub. */
(function(){
  "use strict";
  const menu=window.GARAGE_MENU,core=window.GARAGE_Learning;
  const changes=window.GARAGE_MENU_CHANGES||[];
  if(!menu||!core)return;
  const STORAGE_KEY='garage-flashcards-learning-v1';
  const el=id=>document.getElementById(id);
  const cardById=new Map(menu.cards.map(c=>[c.id,c]));
  const sectionNames=new Map(menu.sections.map(s=>[s.id,s.name]));
  let state=loadProgress(),session=null,selected=new Set(),answered=false,imageTicket=0,recallTicket=0;
  const typeNames={
    photo:"По фотографии",ingredients:"По составу",missing:"Найди лишний ингредиент",
    compare:"Сравнение блюд",guest:"Вопрос от Гостя",
    recipe:"Угадай блюдо по составу",recall:"Вспомнить состав"
  };
  const modeNames={quiz:"Проверка знаний",daily:"5 минут на меню",mistakes:"Повторить ошибки",recall:"Вспомнить состав",updatesQuiz:"По изменениям меню"};
  function loadProgress(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      if(saved&&saved.version===1&&saved.cards&&typeof saved.cards==='object'){
        if(!saved.daily)saved.daily={};if(!Array.isArray(saved.history))saved.history=[];return saved;
      }
    }catch(e){/* Browsers may restrict storage. Training still works for this visit. */}
    return core.createProgress();
  }
  function saveProgress(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){/* storage unavailable */}
  }
  function showScreen(name){
    for(const id of ['dashboard','play','summary','updates'])el(id).hidden=id!==name;
    window.scrollTo({top:0,behavior:'instant'});
    if(name==="dashboard")updateDashboard();
  }
  function activeCards(){
    const section=el('sectionFilter').value;
    return menu.cards.filter(c=>c.status==='published'&&(!section||section===c.section));
  }
  function errorCards(){return activeCards().filter(c=>state.cards[c.id]?.needsRepeat);}
  function updatedCards(){
    const scope=new Set(activeCards().map(c=>c.id)),seen=new Set(),result=[];
    for(const entry of core.activeChanges(menu,changes,90)){
      if(!entry.available||!scope.has(entry.cardId)||seen.has(entry.cardId))continue;
      seen.add(entry.cardId);result.push(entry.cardId);
    }
    return result;
  }
  function updateDashboard(){
    const cards=activeCards(),ids=new Set(cards.map(c=>c.id)),today=core.localDate();
    el('studiedCount').textContent=cards.filter(c=>state.cards[c.id]?.attempts>0).length;
    el('mistakesCount').textContent=errorCards().length;
    el('dueCount').textContent=cards.filter(c=>state.cards[c.id]?.due<=today).length;
    el('mistakesStatus').textContent=errorCards().length+' блюд для повторения';
    const daily=state.daily[today];
    el('dailyStatus').textContent=daily?(daily+' тренировка за сегодня завершена'):'Тренировка на сегодня';
    const count=updatedCards().length;
    el('changesStatus').textContent=count?count+' блюд для изучения':'Изменений пока нет';
  }
  function sectionFilter(){
    const select=el('sectionFilter');
    for(const section of menu.sections.filter(s=>s.status==='published')){
      const option=document.createElement('option');
      option.value=section.id;option.textContent=section.name;select.append(option);
    }
    select.onchange=updateDashboard;
  }
  function questionFor(mode){
    const opts={mode,section:el('sectionFilter').value,limit:mode==='daily'?8:mode==='recall'?8:12};
    if(mode==='updatesQuiz'){
      opts.mode='quiz';opts.limit=10;opts.focusIds=updatedCards();
    }
    return core.makeSession(menu,state,opts);
  }
  function startMode(mode){
    if(mode==='changes'){showUpdates();return;}
    const questions=questionFor(mode);
    if(!questions.length){
      const msg=mode==='mistakes'?'Ошибок для повторения пока нет. Пройди проверку знаний.':
        mode==='updatesQuiz'?'Пока нет новых или изменённых блюд для проверки.':
        'В выбранном разделе пока нет подходящих вопросов.';
      window.alert(msg);return;
    }
    session={mode,questions,index:0,passed:0,failed:0,attempts:[],missed:new Map()};
    selected=new Set();answered=false;
    showScreen('play');showQuestion();
  }
  function prepareNext(){
    if(!session)return;
    const next=session.questions[session.index+1];
    if(next?.kind==='photo'&&next.image){const img=new Image();img.src=next.image;}
  }
  function clearControls(){
    // Cancel requests from the previous question before displaying a new one.
    imageTicket++;
    recallTicket++;
    for(const id of ['checkBtn','revealBtn','rememberBtn','repeatBtn','nextBtn'])el(id).hidden=true;
    el('feedback').hidden=true;
    el('feedback').className='feedback';
    el('choices').replaceChildren();
    el('recallCard').hidden=true;
    const recall=el('recallImage');
    recall.hidden=true;
    recall.removeAttribute('src');
    recall.removeAttribute('data-card-id');
    el('recallFallback').hidden=true;
    el('recallFallback').textContent='';
    el('recallArea').hidden=true;
    const photo=el('questionImage');
    photo.onload=null;
    photo.onerror=null;
    photo.hidden=true;
    photo.removeAttribute('src');
    el('questionNote').hidden=true;
    el('questionNote').textContent='';
    el('revealBtn').disabled=false;
    el('revealBtn').textContent='Показать состав';
  }
  function showQuestion(){
    const q=session?.questions[session.index];if(!q){finish();return;}
    selected=new Set();answered=false;clearControls();
    el('questionCounter').textContent='Вопрос '+(session.index+1)+' из '+session.questions.length;
    el('progressBar').style.width=(100*session.index/session.questions.length)+'%';
    el('questionType').textContent=typeNames[q.kind]||'Проверка знаний';
    el('questionPrompt').textContent=q.kind==='recall'?q.title:q.prompt;
    // Show a real photo in the photo quiz AND during recipe recall.
    // Never show the broken "Фото блюда" icon for other question types.
    if(q.kind==='photo'||q.kind==='recall'){
      const current=cardById.get(q.cardId);
      const src=q.kind==='photo'?q.image:current?.front;
      if(src){
        const img=el('questionImage'),ticket=++imageTicket;
        img.alt='Фото: '+(current?.title||'блюдо');
        img.onload=()=>{if(ticket===imageTicket&&session?.questions[session.index]===q)img.hidden=false;};
        img.onerror=()=>{
          if(ticket!==imageTicket||session?.questions[session.index]!==q)return;
          img.hidden=true;
          if(q.kind==='photo'){
            el('questionNote').hidden=false;
            el('questionNote').textContent='Не удалось загрузить фотографию.';
          }
        };
        img.src=src;
        if(img.complete&&img.naturalWidth>0)img.hidden=false;
      }
    }
    if(q.kind==='recall'){
      el('recallArea').hidden=false;
      el('revealBtn').hidden=false;
    }else{
      for(const option of q.choices){
        const btn=document.createElement('button');
        btn.type='button';btn.className='choice'+(q.multi?' multi':'');
        btn.dataset.id=option.id;btn.setAttribute('aria-pressed','false');
        const badge=document.createElement('span');badge.className='choice-symbol';badge.textContent=q.multi?'□':'○';
        const label=document.createElement('span');label.textContent=option.label;
        btn.append(badge,label);
        btn.onclick=()=>selectChoice(option.id,q.multi);
        el('choices').append(btn);
      }
      el('checkBtn').hidden=false;el('checkBtn').disabled=true;
    }
    prepareNext();
  }
  function selectChoice(id,multi){
    if(answered)return;
    if(!multi){selected.clear();selected.add(id);}
    else if(selected.has(id))selected.delete(id);
    else selected.add(id);
    for(const btn of el('choices').querySelectorAll('.choice')){
      const chosen=selected.has(btn.dataset.id);
      btn.classList.toggle('selected',chosen);
      btn.setAttribute('aria-pressed',String(chosen));
      btn.querySelector('.choice-symbol').textContent=chosen?'✓':multi?'□':'○';
    }
    el('checkBtn').disabled=selected.size===0;
  }
  function recordResult(correct,subjective=false){
    const q=session.questions[session.index],card=cardById.get(q.cardId);
    // The next test can use a different template for this same dish.
    core.updateProgress(state,q.cardId,correct,new Date(),q.kind);
    if(correct)session.passed++;
    else {
      session.failed++;
      session.missed.set(q.cardId,card?.title||'Блюдо');
    }
    session.attempts.push({cardId:q.cardId,kind:q.kind,correct,subjective});
    saveProgress();
    updateDashboard();
  }
  function markAnswer(){
    if(answered||selected.size===0||!session)return;
    const q=session.questions[session.index],correct=core.evaluate(q,selected);
    answered=true;recordResult(correct,false);
    const names=q.choices.filter(o=>q.correctIds.includes(o.id)).map(o=>o.label);
    for(const btn of el('choices').querySelectorAll('.choice')){
      btn.disabled=true;
      if(q.correctIds.includes(btn.dataset.id))btn.classList.add('correct');
      else if(selected.has(btn.dataset.id))btn.classList.add('incorrect');
    }
    const box=el('feedback');
    box.className='feedback '+(correct?'ok':'bad');
    box.replaceChildren();
    const title=document.createElement('strong');title.textContent=correct?'Верно!':'Есть ошибка — повторим это блюдо.';
    const detail=document.createElement('span');
    detail.textContent=correct?'Правильный ответ сохранён. Следующее повторение будет позже.':
      (q.multi?'Правильные ингредиенты: ':'Правильный ответ: ')+names.join(', ');
    box.append(title,detail);
    if(q.explanation){
      const explanation=document.createElement('p');
      explanation.className='answer-explanation';
      explanation.textContent=q.explanation;
      box.append(explanation);
    }
    box.hidden=false;
    el('checkBtn').hidden=true;
    el('nextBtn').hidden=false;
    el('nextBtn').textContent=session.index===session.questions.length-1?'Посмотреть результат':'Следующий вопрос →';
  }
  function revealRecall(){
    if(!session||answered)return;
    const q=session.questions[session.index];
    if(q.kind!=='recall')return;
    const card=cardById.get(q.cardId);
    const source=card?window.GARAGE_answerSrc(card):'';
    const ticket=++recallTicket;
    const button=el('revealBtn');
    button.disabled=true;
    button.textContent='Загружаем состав...';
    // Each answer belongs to a single card. Never reuse the previous image.
    const isCurrent=()=>ticket===recallTicket &&
      session?.questions[session.index]===q && card?.id===q.cardId;
    const finish=()=>{
      if(!isCurrent())return;
      const image=el('recallImage');
      image.src=source;
      image.dataset.cardId=card.id;
      image.alt='Состав: '+card.title;
      image.hidden=false;
      el('recallCard').hidden=false;
      el('recallFallback').hidden=true;
      button.hidden=true;
      button.disabled=false;
      el('rememberBtn').hidden=false;
      el('repeatBtn').hidden=false;
    };
    const fail=()=>{
      if(!isCurrent())return;
      if(card?.composition && !card.compositionNeedsReview){
        el('recallFallback').textContent=card.composition;
        el('recallFallback').hidden=false;
        el('recallCard').hidden=true;
        button.hidden=true;
        el('rememberBtn').hidden=false;
        el('repeatBtn').hidden=false;
      }else{
        el('questionNote').hidden=false;
        el('questionNote').textContent='Состав временно недоступен. Попробуй ещё раз.';
        button.disabled=false;
        button.textContent='Показать состав';
      }
    };
    if(!source){fail();return;}
    const loader=new Image();
    let done=false;
    loader.onload=()=>{
      if(done)return;
      done=true;
      if(typeof loader.decode==='function'){
        loader.decode().then(finish,()=>loader.naturalWidth>0?finish():fail());
      }else finish();
    };
    loader.onerror=()=>{
      if(done)return;
      done=true;
      fail();
    };
    loader.src=source;
  }
  function markRecall(correct){
    if(!session||answered)return;
    answered=true;recordResult(correct,true);
    el('rememberBtn').hidden=true;el('repeatBtn').hidden=true;
    el('nextBtn').hidden=false;
    el('nextBtn').textContent=session.index===session.questions.length-1?'Посмотреть результат':'Следующий вопрос →';
  }
  function nextQuestion(){
    if(!session)return;
    if(!answered)return;
    session.index++;
    if(session.index>=session.questions.length)finish();
    else showQuestion();
  }
  function finish(){
    if(!session)return;
    const completed=session,qty=completed.questions.length;
    const ratio=qty?Math.round(100*completed.passed/qty):0;
    if(completed.mode==='daily'){
      const day=core.localDate();
      state.daily[day]=(state.daily[day]||0)+1;
    }
    state.history.unshift({date:new Date().toISOString(),mode:completed.mode,correct:completed.passed,
      total:qty,subjective:completed.mode==='recall'});
    state.history=state.history.slice(0,70);
    saveProgress();
    el('resultScore').textContent=completed.mode==='recall'?completed.passed+' из '+qty+' вспомнил':ratio+'% · '+completed.passed+' из '+qty;
    el('resultMessage').textContent=completed.failed?
      'Есть '+completed.failed+' '+(completed.failed===1?'блюдо для повторения.':'блюд для повторения.')+' Они сохранены в личной подборке.':
      'Отлично! Ошибок в этой тренировке нет.';
    const list=el('resultList');list.replaceChildren();
    for(const [id,title] of completed.missed){
      const item=document.createElement('div');
      const name=document.createElement('span');name.textContent=title;
      const label=document.createElement('small');label.textContent='Повторить';
      item.append(name,label);list.append(item);
    }
    el('mistakesTitle').hidden=completed.missed.size===0;
    el('retryErrorsBtn').hidden=!errorCards().length;
    el('progressBar').style.width='100%';
    showScreen('summary');updateDashboard();
  }
  function showUpdates(){
    showScreen('updates');
    const list=el('changesList');list.replaceChildren();
    const items=core.activeChanges(menu,changes,90);
    if(!items.length){
      const p=document.createElement('p');
      p.className='sub';p.textContent='Пока новых опубликованных изменений нет. При следующем обновлении меню они появятся автоматически.';
      list.append(p);
    }else for(const event of items){
      const row=document.createElement('div');row.className='change-row';
      const column=document.createElement('div');
      const label=document.createElement('span');label.className='change-kind';
      label.textContent=event.type==='new'?'Новая позиция':event.type==='removed'?'Убрано из меню':
        event.type==='moved'?'Перенесено в другой раздел':'Обновление блюда';
      const name=document.createElement('strong');name.textContent=event.title;
      const note=document.createElement('span');note.className='muted';note.textContent=event.note||'';
      column.append(label,name,note);
      const date=document.createElement('time');date.className='change-date';
      date.dateTime=event.date;
      date.textContent=new Date(event.date).toLocaleDateString('ru-RU');
      row.append(column,date);list.append(row);
    }
    const focus=updatedCards();
    el('learnUpdatesBtn').disabled=focus.length===0;
    el('learnUpdatesBtn').textContent=focus.length?'Проверить обновлённые блюда · '+focus.length:'Нет блюд для тестирования';
  }
  function resetState(){
    if(!window.confirm('Удалить свой прогресс тренировок на этом устройстве? Это действие нельзя отменить.'))return;
    state=core.createProgress();saveProgress();updateDashboard();showScreen('dashboard');
  }
  function wire(){
    sectionFilter();
    for(const btn of document.querySelectorAll('[data-mode]'))btn.addEventListener('click',()=>startMode(btn.dataset.mode));
    el('exitBtn').onclick=()=>{session=null;showScreen('dashboard')};
    el('checkBtn').onclick=markAnswer;
    el('revealBtn').onclick=revealRecall;
    el('rememberBtn').onclick=()=>markRecall(true);
    el('repeatBtn').onclick=()=>markRecall(false);
    el('nextBtn').onclick=nextQuestion;
    el('retryErrorsBtn').onclick=()=>startMode('mistakes');
    el('againBtn').onclick=()=>startMode(session?.mode||'quiz');
    el('homeBtn').onclick=()=>{session=null;showScreen('dashboard')};
    el('backUpdatesBtn').onclick=()=>showScreen('dashboard');
    el('learnUpdatesBtn').onclick=()=>startMode('updatesQuiz');
    el('clearProgressBtn').onclick=resetState;
    updateDashboard();
    const param=new URLSearchParams(location.search);
    if(param.get('mode')==='daily')startMode('daily');
    else if(param.get('mode')==='changes')showUpdates();
  }
  wire();
})();