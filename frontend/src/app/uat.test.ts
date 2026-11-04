import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCommand, type Store, type Command } from './domain.ts';
import { createSeed } from './seed.ts';
import { decodeStore } from './storage.ts';
import { helpOutcome, visibleHelpRequests } from './help-view.ts';
const env={id:'uat',today:'2026-11-04',now:'2026-11-04T12:00:00Z'};
function fixture():Store {
 let s=createSeed(env.today);
 s=applyCommand(s,{type:'post-help',id:'h',title:'Stand',description:'For a cake',start:'2026-12-20',end:'2026-12-22'},env);
 s=applyCommand(s,{type:'switch-account',id:'sarah'},env);
 s=applyCommand(s,{type:'offer-help',id:'o',requestId:'h',itemId:'cake-stand'},env);
 return applyCommand(s,{type:'switch-account',id:'eric'},env);
}
function rejected(s:Store,c:Command){const before=JSON.stringify(s);assert.throws(()=>applyCommand(s,c,env));assert.equal(JSON.stringify(s),before);}
test('closed requests leave community, remain requester history, and reject offers',()=>{
 let s=fixture();assert.equal(visibleHelpRequests(s,false).length,1);
 s=applyCommand(s,{type:'close-help',id:'h'},env);
 assert.equal(visibleHelpRequests(s,false).length,0);assert.equal(visibleHelpRequests(s,true).length,1);assert.equal(helpOutcome(s,s.helpRequests![0]),'Request closed');
 s=applyCommand(s,{type:'switch-account',id:'sarah'},env);assert.equal(visibleHelpRequests(s,true).length,0);
 rejected(s,{type:'offer-help',id:'new',requestId:'h',itemId:'cake-large'});
});
for(const action of ['cancel-loan','decline-loan'] as const)test(`selected request remains historical after owner ${action} and reload`,()=>{
 let s=fixture();s=applyCommand(s,{type:'select-offer',id:'o',loanId:'l',lockerId:'clementi'},env);
 assert.equal(visibleHelpRequests(s,false).length,0);
 s=applyCommand(s,{type:'switch-account',id:'sarah'},env);
 s=applyCommand(s,{type:action,loanId:'l'},env);
 rejected(s,{type:'offer-help',id:'late',requestId:'h',itemId:'cake-large'});
 s=applyCommand(s,{type:'switch-account',id:'eric'},env);const notices=s.notices.length;
 s=decodeStore(JSON.stringify(s))!;assert.equal(visibleHelpRequests(s,false).length,0);assert.equal(visibleHelpRequests(s,true).length,1);
 assert.equal(helpOutcome(s,s.helpRequests![0]),action==='cancel-loan'?'Loan cancelled':'Loan declined');assert.equal(s.offers!.length,1);
 helpOutcome(s,s.helpRequests![0]);assert.equal(s.notices.length,notices);
});
test('borrower cancellation never reopens request or duplicates linked loans',()=>{
 let s=fixture();s=applyCommand(s,{type:'select-offer',id:'o',loanId:'l',lockerId:'clementi'},env);s=applyCommand(s,{type:'cancel-loan',loanId:'l'},env);
 rejected(s,{type:'select-offer',id:'o',loanId:'duplicate',lockerId:'clementi'});assert.equal(visibleHelpRequests(s,false).length,0);assert.equal(s.loans.filter(l=>l.id==='l').length,1);
});
test('wrong owner cannot withdraw and failed selection leaves original data intact',()=>{
 let s=fixture();rejected(s,{type:'withdraw-offer',id:'o'});s=applyCommand(s,{type:'switch-account',id:'ben'},env);rejected(s,{type:'select-offer',id:'o',loanId:'bad',lockerId:'clementi'});
});
test('legacy and extended snapshots retain messages, loans, reviews and offers',()=>{
 const old=createSeed(env.today);delete old.helpRequests;delete old.offers;
 old.loans.find(l=>l.status==='complete')!.review={rating:4,text:'Keep this review',compliments:[],at:env.now};
 const next=decodeStore(JSON.stringify(old))!;assert.deepEqual(next.messages,old.messages);assert.deepEqual(next.loans,old.loans);
 const extended=fixture();const loaded=decodeStore(JSON.stringify(extended))!;assert.deepEqual(loaded,extended);assert.equal(decodeStore('{invalid'),null);
});
