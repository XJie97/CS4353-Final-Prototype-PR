import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCommand, handoverCode, type Command, type Store } from './domain.ts';
import { createSeed } from './seed.ts';
const photo='data:image/jpeg;base64,dGVzdA==';
test('the complete two-person flow survives serialization after every step',()=>{
 let state:Store=createSeed('2026-10-31');let counter=0;
 const run=(command:Command)=>{const next=applyCommand(state,command,{id:`event-${++counter}`,now:'2026-10-31T07:00:00Z',today:'2026-10-31'});const restored=JSON.parse(JSON.stringify(next));assert.ok(restored,'Every accepted command must remain reloadable');state=restored;};
 run({type:'request-loan',id:'journey',itemId:'cake-stand',start:'2026-11-03',end:'2026-11-06',lockerId:'clementi'});
 run({type:'send-message',to:'sarah',text:'Can we collect on the fourth?',loanId:'journey'});run({type:'switch-account',id:'sarah'});run({type:'read-thread',peerId:'eric'});
 run({type:'edit-plan',loanId:'journey',start:'2026-11-04',end:'2026-11-07',lockerId:'clementi'});run({type:'switch-account',id:'eric'});run({type:'approve-plan',loanId:'journey'});
 for(const [step,actor] of [['ownerDropoff','sarah'],['borrowerPickup','eric'],['borrowerDropoff','eric'],['ownerPickup','sarah']] as const){run({type:'switch-account',id:actor});run({type:'record-proof',loanId:'journey',step,photo,lockerNumber:'12',code:handoverCode(state.loans.find(l=>l.id==='journey')!,step)});}
 run({type:'verify-condition',loanId:'journey',condition:'good',note:'All good, thank you!'});run({type:'switch-account',id:'eric'});run({type:'submit-review',loanId:'journey',rating:5,text:'Easy collection and a lovely cake stand.',compliments:['Easy collection'],photo});
 const loan=state.loans.find(l=>l.id==='journey')!;assert.equal(loan.status,'complete');assert.equal(Object.keys(loan.proofs).length,4);assert.equal(loan.review?.rating,5);assert.equal(state.messages.at(-1)?.read,true);
});
