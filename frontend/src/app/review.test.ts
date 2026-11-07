import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCommand, type Store, type Command } from './domain.ts';
import { createSeed } from './seed.ts';
const env={id:'review-event',now:'2026-11-06T03:00:00Z',today:'2026-11-06'};const run=(s:Store,c:Command)=>applyCommand(s,c,env);

test('a review keeps its rating and compliments',()=>{
 const s=run(createSeed(env.today),{type:'submit-review',loanId:'demo-complete',rating:4,text:'Worked well',compliments:['Easy collection']});
 const loan=s.loans.find(l=>l.id==='demo-complete')!;
 assert.equal(loan.review?.rating,4);assert.deepEqual(loan.review?.compliments,['Easy collection']);
 assert.ok(s.notices.some(n=>n.to===loan.ownerId&&n.text.endsWith('left a review.')));
});

