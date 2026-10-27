/* Guard objective recipe questions against changes to a previously approved composition. */
'use strict';
const crypto=require('node:crypto');
const fingerprint=text=>crypto.createHash('sha256').update(String(text||'').trim(),'utf8').digest('hex');
function reconcile(cards,oldApprovals={}){
  const approvals={...oldApprovals},invalidated=[];
  for(const card of cards){
    const clean=Boolean(card.composition&&String(card.composition).trim()&&!card.compositionNeedsReview);
    if(!card.testIngredientsVerified||!clean){
      if(card.testIngredientsVerified){card.testIngredientsVerified=false;invalidated.push(card.id);}
      delete approvals[card.id];
      continue;
    }
    const current=fingerprint(card.composition);
    if(approvals[card.id]&&approvals[card.id]!==current){
      card.testIngredientsVerified=false;
      delete approvals[card.id];
      invalidated.push(card.id);
    }else if(!approvals[card.id])approvals[card.id]=current;
  }
  for(const id of Object.keys(approvals))if(!cards.some(card=>card.id===id))delete approvals[id];
  return {approvals,invalidated};
}
module.exports={fingerprint,reconcile};
