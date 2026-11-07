import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCommand, type Store, type Command } from './domain.ts';
import { createSeed } from './seed.ts';
const env={id:'avatar-event',now:'2026-11-06T03:00:00Z',today:'2026-11-06'};const run=(s:Store,c:Command)=>applyCommand(s,c,env);
const face:[number,number][][]=[[[0.2,0.3],[0.25,0.4]],[[0.7,0.3]]];

test('the active account can save a colour with the default or a drawn face, and it can switch back',()=>{
 let s=run(createSeed(env.today),{type:'update-sprite',colour:'#c6f3a2',face:'default'});
 assert.deepEqual(s.people.find(p=>p.id==='eric')?.sprite,{colour:'#C6F3A2',headAssetId:'face-default',torsoAssetId:'plant',level:0});
 s=run(s,{type:'update-sprite',colour:'#BFE3FF',face:'drawn',strokes:face});
 const saved=s.people.find(p=>p.id==='eric')?.sprite;
 assert.equal(saved?.headAssetId,'face-drawn');assert.deepEqual(saved?.faceStrokes,face);
 s=run(s,{type:'update-sprite',colour:'#BFE3FF',face:'default'});assert.equal(s.people.find(p=>p.id==='eric')?.sprite?.faceStrokes,undefined);
});
test('avatar validation rejects bad colours, empty drawings and out-of-range strokes',()=>{
 const s=createSeed(env.today);
 assert.throws(()=>run(s,{type:'update-sprite',colour:'pink',face:'default'}),/colour/i);
 assert.throws(()=>run(s,{type:'update-sprite',colour:'#FFFFFF',face:'drawn',strokes:[]}),/draw/i);
 assert.throws(()=>run(s,{type:'update-sprite',colour:'#FFFFFF',face:'drawn',strokes:[[[5,5]]]}),/draw/i);
});

test('every colour maps onto the fixed sprite palette, so each sprite has a matching TV',async()=>{
 const { nearestSwatch, deriveTvPalette, SPRITE_SWATCHES } = await import('../components/sprites/palette.ts');
 for(const c of SPRITE_SWATCHES)assert.equal(nearestSwatch(c),c);
 assert.equal(nearestSwatch('#f7c8ff'),'#F7C8FF');
 for(const c of ['#808080','#123456','#FF0000','#6750A4','#00FF00'])assert.ok((SPRITE_SWATCHES as readonly string[]).includes(nearestSwatch(c)));
 for(const c of SPRITE_SWATCHES){const tv=deriveTvPalette(c);assert.equal(tv.bottom,c);for(const v of Object.values(tv))assert.match(v,/^#[0-9A-F]{6}$/);}
});
