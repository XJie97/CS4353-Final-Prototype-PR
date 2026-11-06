import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCommand, type Store, type Command } from './domain.ts';
import { createSeed } from './seed.ts';
import { decodeStore } from './storage.ts';
const env={id:'avatar-event',now:'2026-11-06T03:00:00Z',today:'2026-11-06'};const run=(s:Store,c:Command)=>applyCommand(s,c,env);
const face:[number,number][][]=[[[0.2,0.3],[0.25,0.4]],[[0.7,0.3]]];

test('saved data from before avatars existed still loads unchanged',()=>{
 const old=createSeed(env.today);for(const p of old.people)delete p.sprite;
 const loaded=decodeStore(JSON.stringify(old));assert.ok(loaded);assert.equal(loaded.people.length,old.people.length);assert.ok(loaded.people.every(p=>p.sprite===undefined));
});
test('a malformed saved avatar is dropped instead of failing the whole load',()=>{
 const s=createSeed(env.today) as Store;(s.people[0] as unknown as {sprite:unknown}).sprite={colour:'not-a-colour'};
 const loaded=decodeStore(JSON.stringify(s));assert.ok(loaded,'store should still load');assert.equal(loaded.people[0].sprite,undefined);
});
test('the active account can save a colour with the default or a drawn face, and it round-trips',()=>{
 let s=run(createSeed(env.today),{type:'update-sprite',colour:'#c6f3a2',face:'default'});
 assert.deepEqual(s.people.find(p=>p.id==='eric')?.sprite,{colour:'#C6F3A2',headAssetId:'face-default',torsoAssetId:'plant',level:0});
 s=run(s,{type:'update-sprite',colour:'#BFE3FF',face:'drawn',strokes:face});
 const saved=decodeStore(JSON.stringify(s))?.people.find(p=>p.id==='eric')?.sprite;
 assert.equal(saved?.headAssetId,'face-drawn');assert.deepEqual(saved?.faceStrokes,face);
 s=run(s,{type:'update-sprite',colour:'#BFE3FF',face:'default'});assert.equal(s.people.find(p=>p.id==='eric')?.sprite?.faceStrokes,undefined);
});
test('avatar validation rejects bad colours, empty drawings and out-of-range strokes',()=>{
 const s=createSeed(env.today);
 assert.throws(()=>run(s,{type:'update-sprite',colour:'pink',face:'default'}),/colour/i);
 assert.throws(()=>run(s,{type:'update-sprite',colour:'#FFFFFF',face:'drawn',strokes:[]}),/draw/i);
 assert.throws(()=>run(s,{type:'update-sprite',colour:'#FFFFFF',face:'drawn',strokes:[[[5,5]]]}),/draw/i);
});
