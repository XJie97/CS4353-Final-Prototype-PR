import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCommand, handoverCode, nextProof, type Command, type Store } from './domain.ts';
import { createSeed } from './seed.ts';
import { decodeStore } from './storage.ts';
const env = { id: 'test-event', now: '2026-10-31T04:00:00.000Z', today: '2026-10-31' };
const photo = 'data:image/jpeg;base64,dGVzdA==';
function run(s: Store, c: Command) { return applyCommand(s, c, env); }
function requested() { return run(createSeed(env.today), { type: 'request-loan', id: 'new-loan', itemId: 'cake-stand', start: '2026-11-03', end: '2026-11-06', lockerId: 'clementi' }); }
function accepted() { let s=requested();s=run(s,{type:'switch-account',id:'sarah'});return run(s,{type:'approve-plan',loanId:'new-loan'}); }

test('a dated request is pending, notifies the owner, and does not mutate the catalog', () => {
 const original=createSeed(env.today);const s=run(original,{type:'request-loan',id:'new-loan',itemId:'cake-stand',start:'2026-11-03',end:'2026-11-06',lockerId:'clementi'});
 assert.equal(s.loans.find(l=>l.id==='new-loan')?.status,'requested');assert.ok(s.notices.some(n=>n.to==='sarah'&&n.loanId==='new-loan'));assert.equal(original.loans.length+1,s.loans.length);
});
test('requests reject past/reversed dates, self borrowing and overlapping bookings', () => {
 const s=requested();const base={type:'request-loan',id:'other',itemId:'cake-stand',start:'2026-11-03',end:'2026-11-06',lockerId:'clementi'} as const;
 assert.throws(()=>run(s,base),/overlap/i);assert.throws(()=>run(s,{...base,start:'2026-10-01'}),/past/i);assert.throws(()=>run(s,{...base,end:'2026-11-01'}),/after/i);
 assert.throws(()=>run(s,{...base,itemId:'my-projector'}),/own item/i);
});
test('only the owner accepts a request; changing the plan requires renewed approval', () => {
 let s=requested();assert.throws(()=>run(s,{type:'approve-plan',loanId:'new-loan'}),/owner/i);
 s=accepted();assert.equal(s.loans.find(l=>l.id==='new-loan')?.status,'ready');
 s=run(s,{type:'edit-plan',loanId:'new-loan',start:'2026-11-04',end:'2026-11-07',lockerId:'toa-payoh'});
 assert.deepEqual(s.loans.find(l=>l.id==='new-loan')?.approvals,['sarah']);
 s=run(s,{type:'switch-account',id:'eric'});s=run(s,{type:'approve-plan',loanId:'new-loan'});assert.equal(s.loans.find(l=>l.id==='new-loan')?.status,'ready');
});
test('four photo-backed handovers enforce actor, code and stage order', () => {
 let s=accepted();let loan=s.loans.find(l=>l.id==='new-loan')!;assert.equal(nextProof(loan),'ownerDropoff');
 assert.throws(()=>run(s,{type:'record-proof',loanId:loan.id,step:'borrowerPickup',photo,code:handoverCode(loan,'borrowerPickup'),lockerNumber:'12'}),/next|order/i);
 assert.throws(()=>run(s,{type:'record-proof',loanId:loan.id,step:'ownerDropoff',photo,code:'wrong',lockerNumber:'12'}),/code/i);
 for(const [step,actor,status] of [['ownerDropoff','sarah','ready'],['borrowerPickup','eric','active'],['borrowerDropoff','eric','returning'],['ownerPickup','sarah','verifying']] as const){
  s=run(s,{type:'switch-account',id:actor});loan=s.loans.find(l=>l.id==='new-loan')!;
  assert.throws(()=>run(s,{type:'record-proof',loanId:loan.id,step,photo:'',code:handoverCode(loan,step),lockerNumber:'12'}),/photo/i);
  s=run(s,{type:'record-proof',loanId:loan.id,step,photo,code:handoverCode(loan,step),lockerNumber:'12'});assert.equal(s.loans.find(l=>l.id===loan.id)?.status,status);
 }
 assert.throws(()=>run(s,{type:'cancel-loan',loanId:'new-loan'}),/cancel/i);
 s=run(s,{type:'verify-condition',loanId:'new-loan',condition:'good',note:''});assert.equal(s.loans.find(l=>l.id==='new-loan')?.status,'complete');
 s=run(s,{type:'switch-account',id:'eric'});s=run(s,{type:'submit-review',loanId:'new-loan',rating:5,text:'Lovely cake stand!',compliments:['Great communication']});assert.equal(s.loans.find(l=>l.id==='new-loan')?.review?.rating,5);
 assert.throws(()=>run(s,{type:'submit-review',loanId:'new-loan',rating:5,text:'Again',compliments:[]}),/already/i);
});
test('unrelated accounts cannot modify another loan', () => {let s=accepted();s=run(s,{type:'switch-account',id:'maya'});assert.throws(()=>run(s,{type:'edit-plan',loanId:'new-loan',start:'2026-11-04',end:'2026-11-07',lockerId:'clementi'}),/participant/i);});
test('stored state round-trips and rejects corrupt versions and missing records', () => {
 const s=requested();assert.deepEqual(decodeStore(JSON.stringify(s)),s);assert.equal(decodeStore('broken'),null);assert.equal(decodeStore(JSON.stringify({...s,version:99})),null);assert.equal(decodeStore(JSON.stringify({...s,people:[]})),null);
});
test('corrupt saved handover and review records are rejected before rendering',()=>{
 const brokenProof=createSeed(env.today);(brokenProof.loans.find(l=>l.id==='demo-active')!.proofs as Record<string,unknown>).ownerDropoff=null;assert.equal(decodeStore(JSON.stringify(brokenProof)),null);
 const brokenReview=createSeed(env.today);(brokenReview.loans.find(l=>l.id==='demo-complete') as unknown as {review:unknown}).review={rating:9,text:null,compliments:[],at:env.now};assert.equal(decodeStore(JSON.stringify(brokenReview)),null);
});
