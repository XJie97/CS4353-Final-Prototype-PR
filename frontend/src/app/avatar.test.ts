import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCommand, type Store, type Command } from './domain.ts';
import { createSeed } from './seed.ts';
const env={id:'avatar-event',now:'2026-11-06T03:00:00Z',today:'2026-11-06'};const run=(s:Store,c:Command)=>applyCommand(s,c,env);
const face:[number,number][][]=[[[0.2,0.3],[0.25,0.4]],[[0.7,0.3]]];

test('the active account can save a colour with the default or a drawn face, and it can switch back',()=>{
 let s=run(createSeed(env.today),{type:'update-sprite',colour:'green',face:'default'});
 assert.deepEqual(s.people.find(p=>p.id==='eric')?.sprite,{colour:'green',headAssetId:'face-default',torsoAssetId:'plant',level:0});
 s=run(s,{type:'update-sprite',colour:'blue',face:'drawn',strokes:face});
 const saved=s.people.find(p=>p.id==='eric')?.sprite;
 assert.equal(saved?.headAssetId,'face-drawn');assert.deepEqual(saved?.faceStrokes,face);
 s=run(s,{type:'update-sprite',colour:'blue',face:'default'});assert.equal(s.people.find(p=>p.id==='eric')?.sprite?.faceStrokes,undefined);
});
test('avatar validation rejects bad colours, empty drawings and out-of-range strokes',()=>{
 const s=createSeed(env.today);
 assert.throws(()=>run(s,{type:'update-sprite',colour:'#F7C8FF' as never,face:'default'}),/colour/i);
 assert.throws(()=>run(s,{type:'update-sprite',colour:'magenta' as never,face:'default'}),/colour/i);
 assert.throws(()=>run(s,{type:'update-sprite',colour:'grey',face:'drawn',strokes:[]}),/draw/i);
 assert.throws(()=>run(s,{type:'update-sprite',colour:'grey',face:'drawn',strokes:[[[5,5]]]}),/draw/i);
});

//  Each colour name has a hex to draw with (and a TV palette), and people without a saved colour get a stable one.
test('every sprite colour name has a hex and a TV palette, and defaults are stable',async()=>{
 const { SWATCH_HEX, deriveTvPalette } = await import('../components/sprites/palette.ts');
 const { SPRITE_COLOURS, defaultSpriteColour } = await import('./domain.ts');
 assert.deepEqual(Object.keys(SWATCH_HEX).sort(),[...SPRITE_COLOURS].sort());
 for(const c of SPRITE_COLOURS){const hex=SWATCH_HEX[c];assert.match(hex,/^#[0-9A-F]{6}$/);const tv=deriveTvPalette(hex);assert.equal(tv.bottom,hex);for(const v of Object.values(tv))assert.match(v,/^#[0-9A-F]{6}$/);}
 for(const id of ['eric','sarah','ben','maya']){assert.ok(SPRITE_COLOURS.includes(defaultSpriteColour(id)));assert.equal(defaultSpriteColour(id),defaultSpriteColour(id));}
});
