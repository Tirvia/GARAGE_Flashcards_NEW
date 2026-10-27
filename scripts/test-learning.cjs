/* Tests for four GARAGE learning modes and automatic published-menu change detection. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const engine=require('../js/learning-core.js');
const {compare}=require('./build-menu-changes.cjs');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js/menu-data.js'),'utf8');
const start=source.indexOf('window.GARAGE_MENU = ')+'window.GARAGE_MENU = '.length;
const end=source.indexOf(';\n',start);
assert(start>=0&&end>start,'Current catalog is missing');
const menu=JSON.parse(source.slice(start,end));
const approved=menu.cards.filter(c=>c.testIngredientsVerified&&!c.compositionNeedsReview);
assert(approved.length>=5,'Expected verified ingredients after Draniki review');
assert(menu.cards.length>=150,'Published catalog was unexpectedly reduced');
for(const c of approved)assert(engine.getIngredients(c).length>=2,'Missing ingredients for '+c.id);
const rng=()=>0.36;
const a=engine.photoQuestion(menu.cards[0],menu,rng);
assert.equal(a.kind,'photo');
assert.equal(a.choices.length,4);
assert.equal(new Set(a.choices.map(x=>x.id)).size,4);
assert(engine.evaluate(a,[menu.cards[0].id]));
assert(!engine.evaluate(a,[a.choices.find(x=>x.id!==menu.cards[0].id).id]));
let ingredients=0,guest=0;
for(const card of approved){
 const ing=engine.ingredientQuestion(card,menu,rng);
 if(ing){
   ingredients++;
   assert(ing.multi&&ing.choices.length>=5,'Invalid ingredient multiple-choice question');
   assert(engine.evaluate(ing,ing.correctIds),'Full correct set should pass');
   assert(!engine.evaluate(ing,[ing.correctIds[0]]),'Partial selection must not pass');
 }
 const q=engine.guestQuestion(card,menu,rng);
 if(q){guest++;assert.equal(q.choices.length,4);assert(engine.evaluate(q,[card.id]));}
}
assert(ingredients>0,'No objective ingredient questions are available');
assert(guest>0,'No guest-situation questions are available');

/* Diverse template bank: the correct answer must be unique, and no unverified
   dish may be used to make a claim about ingredients or their absence. */
const templateTypes=['ingredients','missing','compare','guest','recipe'];
const seenTypes=new Set();
for(const card of approved){
  for(const [type,fn] of [
    ['ingredients',engine.ingredientQuestion],['missing',engine.missingQuestion],
    ['compare',engine.compareQuestion],['guest',engine.guestQuestion],
    ['recipe',engine.recipeQuestion]
  ]){
    const question=fn(card,menu,rng);
    if(!question)continue;
    seenTypes.add(type);
    assert.equal(question.kind,type,'Question type mismatch');
    assert(question.explanation&&question.explanation.length>15,'Explanations required');
    assert.equal(question.cardId,card.id);
    assert.equal(new Set(question.choices.map(x=>x.id)).size,question.choices.length,'Duplicate choices');
    assert(engine.evaluate(question,question.correctIds),'Correct choices should be accepted');
    assert(!engine.evaluate(question,[question.choices.find(x=>!question.correctIds.includes(x.id))?.id].filter(Boolean)),
      'Wrong choice should be rejected');
    if(type==='missing'){
      assert.equal(question.choices.length,4);
      const absent=question.choices.find(x=>x.id===question.correctIds[0]);
      assert(!engine.isMentioned(card,absent.label),'A missing ingredient appears in the complete recipe');
      for(const choice of question.choices.filter(x=>x.id!==absent.id)){
        assert(engine.isMentioned(card,choice.label),'A claimed present ingredient is absent from recipe');
      }
    }
    if(type==='compare'){
      assert.equal(question.choices.length,2);
      const other=question.choices.find(x=>x.id!==card.id);
      assert(menu.cards.find(c=>c.id===other.id).testIngredientsVerified,
        'Comparison distractors must have an approved recipe');
    }
    if(type==='recipe')assert.equal(question.choices.length,4,'Guess-from-ingredients requires four choices');
    if(type==='guest'){
      assert.equal(question.choices.length,4,'Guest options must all be confirmed recipes');
      for(const option of question.choices){
        assert(menu.cards.find(c=>c.id===option.id)?.testIngredientsVerified,
          'No unreviewed recipe may appear in guest situations');
      }
    }
  }
}
for(const kind of templateTypes)assert(seenTypes.has(kind),'Missing automatically generated template: '+kind);
const unverified=menu.cards.find(c=>!c.testIngredientsVerified);
assert(unverified,'Test requires an unreviewed recipe');
for(const fn of [engine.ingredientQuestion,engine.missingQuestion,engine.compareQuestion,
  engine.guestQuestion,engine.recipeQuestion]){
  assert.equal(fn(unverified,menu,rng),null,'Unreviewed recipe must not generate ingredient claims');
}
const nested=approved.find(c=>c.id==='draniki-007');
assert(engine.isMentioned(nested,'Чеснок'),'Nested ingredients must count as present');
const parentheses=approved.find(c=>c.id==='draniki-005');
assert(engine.isMentioned(parentheses,'лук'),'Parenthesized ingredients must count as present');
const rotationState=engine.createProgress();
const sameRecipe=approved.find(c=>engine.missingQuestion(c,menu,rng) &&
  engine.compareQuestion(c,menu,rng)&&engine.recipeQuestion(c,menu,rng));
assert(sameRecipe,'Need at least one verified recipe with several valid templates');
const makeSingle=()=>engine.makeSession(menu,rotationState,{
  mode:'quiz',focusIds:[sameRecipe.id],limit:1,rng
})[0];
const firstTemplate=makeSingle();
engine.updateProgress(rotationState,sameRecipe.id,true,new Date(2026,9,27),firstTemplate.kind);
const nextTemplate=makeSingle();
assert.notEqual(nextTemplate.kind,firstTemplate.kind,
  'A previously used question type should rotate for the same dish');
assert(rotationState.cards[sameRecipe.id].recentKinds.includes(firstTemplate.kind));

const state=engine.createProgress(),date=new Date(2026,9,27);
const first=menu.cards[0].id;
const wrong=engine.updateProgress(state,first,false,date);
assert.equal(wrong.needsRepeat,true);
assert.equal(wrong.due,'2026-10-28');
const repeated=engine.selectCards(menu,state,{mode:'mistakes',limit:12,now:date,rng});
assert(repeated.some(c=>c.id===first),'Wrong card should appear in repetition');
const right=engine.updateProgress(state,first,true,date);
assert.equal(right.needsRepeat,false);
assert.equal(right.due,'2026-10-28');
const next=engine.updateProgress(state,first,true,date);
assert.equal(next.due,'2026-10-30','Spaced repetition interval should grow from 1 to 3 days');
const notWrong=engine.selectCards(menu,state,{mode:'mistakes',limit:12,now:date,rng});
assert(!notWrong.some(c=>c.id===first),'Corrected card should leave the mistakes queue');
for(const mode of ['quiz','daily','recall']){
 const count=mode==='daily'?8:mode==='recall'?8:12;
 const session=engine.makeSession(menu,state,{mode,limit:count,now:date,rng});
 assert.equal(session.length,count,'Unexpected question count in '+mode);
 for(const q of session){
   assert(menu.cards.some(c=>c.id===q.cardId),'Question refers to a deleted card');
   if(mode==='recall')assert.equal(q.kind,'recall');
   else {
     assert(q.correctIds.length>=1&&q.choices.length>=(q.kind==='compare'?2:4),
     'Objective question missing options');
     assert(engine.evaluate(q,q.correctIds),'Expected correct answers should pass');
   }
 }
}
const changed=[{id:'a',title:'Пицца',section:'Pizza',composition:'- Сыр',front:'/images/1.png',tags:[]}];
assert.equal(compare(changed,changed,date).length,0,'Unchanged catalog should not generate news');
const news=compare(changed,[{...changed[0],composition:'- Сыр\n- Базилик'},{id:'b',title:'Новый напиток',section:'Chaj'}],date);
assert(news.some(c=>c.cardId==='a'&&c.type==='updated'));
assert(news.some(c=>c.cardId==='b'&&c.type==='new'));
assert(compare(changed,[{...changed[0],section:'Salaty'}],date).some(c=>c.type==='moved'));
assert(compare(changed,[],date).some(c=>c.type==='removed'));
const {reconcile,fingerprint}=require('./ingredient-approvals.cjs');
const example={id:'recipe-one',composition:'- Картофель',testIngredientsVerified:true,compositionNeedsReview:false};
const initially=reconcile([{...example}],{});
assert.equal(initially.approvals['recipe-one'],fingerprint(example.composition),'Approval fingerprint must be recorded');
const revised={...example,composition:'- Картофель\n- Чеснок'};
const approvalChanged=reconcile([revised],initially.approvals);
assert.equal(revised.testIngredientsVerified,false,'Recipe edit must invalidate ingredient tests');
assert.deepEqual(approvalChanged.invalidated,['recipe-one']);
const approvedAgain={...revised,testIngredientsVerified:true};
const reapproved=reconcile([approvedAgain],approvalChanged.approvals);
assert.equal(approvedAgain.testIngredientsVerified,true,'Manual reapproval should restore tests');
assert.equal(reapproved.approvals['recipe-one'],fingerprint(revised.composition));
const history=[...news,{id:'older',date:'2020-01-01T00:00:00.000Z',cardId:'a',type:'updated'}];
const active=engine.activeChanges({cards:[{id:'a'},{id:'b'}]},history,90,date);
assert.equal(active.length,2,'Change feed should ignore stale news');
const page=fs.readFileSync(path.join(root,'training.html'),'utf8');
const app=fs.readFileSync(path.join(root,'js/learning-app.js'),'utf8');
for(const section of ['dashboard','play','summary','updates'])assert(page.includes('id="'+section+'"'));
for(const mode of ['quiz','daily','mistakes','recall','changes'])assert(page.includes('data-mode="'+mode+'"'));
for(const script of ['js/menu-data.js','js/menu-changes.js','js/learning-core.js','js/learning-app.js'])assert(page.includes('src="'+script+'"'));
new (require('vm').Script)(app,{filename:'js/learning-app.js'});
new (require('vm').Script)(fs.readFileSync(path.join(root,'js/learning-core.js'),'utf8'));
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(index.includes('href="training.html" class="test-button">Проверить знания по всему меню'));
console.log('OK: templates:',[...seenTypes].join(', '),'verified ingredients:',ingredients,'guest situations:',guest,
 '12-question checks, daily practice, spaced mistakes, safe distractors, template rotation and original homepage copy.');
