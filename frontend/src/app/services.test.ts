import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDemoServices} from '../services/demo.ts';
import {createSeed} from './seed.ts';
import type {SupabaseClient} from '@supabase/supabase-js';
function fake(){
 const calls:{name:string;args:unknown}[]=[];let fail=false;let uploadCount=0;
 const client={
  rpc:async(name:string,args:unknown)=>{calls.push({name,args});return {data:name==='demo_state'?createSeed('2026-11-05'):null,error:fail?{message:'connection interrupted'}:null};},
  auth:{getUser:async()=>({data:{user:{id:'eric'}},error:null})},
  storage:{from:()=>({
   upload:async()=>{uploadCount++;return {error:null};},
   createSignedUrl:async(p:string)=>({data:{signedUrl:'https://images.example/'+p},error:null}),
  })},
 };
 return{service:makeDemoServices(client as unknown as SupabaseClient),calls,setFail:(value:boolean)=>{fail=value;},uploads:()=>uploadCount};
}
test('commands use the repository request ID/revision and never send a whole Store or active actor',async()=>{
 const f=fake();await f.service.execute({type:'approve-plan',loanId:'loan'},'request',4);
 assert.deepEqual(f.calls[0],{name:'demo_command',args:{command:{type:'approve-plan',loanId:'loan'},request_id:'request',expected_revision:4}});
});
test('failed remote saves reject rather than returning local success',async()=>{
 const f=fake();f.setFail(true);await assert.rejects(f.service.execute({type:'send-message',to:'sarah',text:'Hello'},'request',null),/connection interrupted/);
});
test('photo upload is reused when record finalization is retried',async()=>{
 const f=fake();const command={type:'record-proof' as const,loanId:'loan',step:'ownerDropoff' as const,code:'code',lockerNumber:'12',photo:'data:image/png;base64,eA=='};
 f.setFail(true);await assert.rejects(f.service.execute(command,'request',1));f.setFail(false);await f.service.execute(command,'request',1);
 assert.equal(f.uploads(),1);assert.deepEqual(f.calls[0].args,f.calls[1].args);
 assert.match((f.calls[1].args as {command:{photo:string}}).command.photo,/^eric\/proof\/loan\//);
});
test('loading uses shared repository state while static placeholder assets remain unchanged',async()=>{
 const f=fake();const store=await f.service.load();assert.equal(store.activeUserId,'eric');assert.equal(store.items[0].image.startsWith('/assets/'),true);assert.equal(f.calls[0].name,'demo_state');
});
