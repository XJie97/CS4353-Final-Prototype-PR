// Administrator-only CLI. Never import this script into the browser app.
import {createClient} from '@supabase/supabase-js';
import {readFile,writeFile,chmod} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {createSeed} from '../src/app/seed.ts';
import {todayLocal} from '../src/app/domain.ts';
const arg=(key:string)=>{const i=process.argv.indexOf(key);if(i<0||!process.argv[i+1])throw new Error(`Missing ${key}`);return process.argv[i+1];};
const key=(await readFile(arg('--key-file'),'utf8')).trim();
const env=Object.fromEntries((await readFile('.env','utf8')).split(/\r?\n/).filter(x=>x.includes('=')).map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1)]));
const client=createClient(env.VITE_SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=<T>(r:{data:T;error:unknown}):T=>{if(r.error)throw r.error;return r.data;};
const file=arg('--output');let credentials='';try{credentials=await readFile(file,'utf8');}catch{}
const seed=createSeed(todayLocal());const users=ok(await client.auth.admin.listUsers({perPage:1000})).users;
const ids:Record<string,string>={};
for(const p of seed.people){
 const email=`${p.id}@cs4353.example.test`;let user=users.find(u=>u.email===email);
 if(!user){const password=randomBytes(20).toString('base64url')+'aA9!';user=ok(await client.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:p.name}})).user!;credentials+=`\n${p.name}: ${email}\nPassword: ${password}\n`;await writeFile(file,credentials,{mode:0o600});await chmod(file,0o600);}
 ids[p.id]=user.id;const {id,...data}=p;ok(await client.from('demo_profiles').upsert({id:user.id,data},{onConflict:'id',ignoreDuplicates:true}));
}
if(ok(await client.from('demo_seed_versions').select('id').eq('id','styled-v1')).length){console.log('Accounts present; shared demo was already seeded. Existing data and passwords unchanged.');process.exit(0);}
const imageCache=new Map<string,string>();
async function image(source:string,owner:string,scope='public'){
 const cache=`${owner}/${scope}/${source}`;if(imageCache.has(cache))return imageCache.get(cache)!;
 const name=source.split('/').at(-1)!;const path=`${owner}/${scope}/seed-${name}`;
 const bytes=await readFile('public'+source);const result=await client.storage.from('demo-images').upload(path,bytes,{contentType:'image/png',upsert:false});
 if(result.error&&!/already exists|duplicate/i.test(result.error.message))throw result.error;
 imageCache.set(cache,path);return path;
}
for(const item of seed.items){
 const {id,ownerId,...data}=item;const images=await Promise.all(item.images.map(p=>image(p,ids[ownerId])));
 ok(await client.from('demo_items').upsert({id,owner_id:ids[ownerId],data:{...data,images,image:images[0]}},{onConflict:'id',ignoreDuplicates:true}));
}
const existingLoans=new Set(ok(await client.from('demo_loans').select('id')).map(l=>l.id));
for(const l of seed.loans){
 if(existingLoans.has(l.id))continue;
 const {id,itemId,ownerId,borrowerId,start,end,status,approvals,proofs,condition,review,...data}=l;
 ok(await client.from('demo_loans').insert({id,item_id:itemId,owner_id:ids[ownerId],borrower_id:ids[borrowerId],starts_on:start,ends_on:end,status,data}));
 for(const a of approvals)ok(await client.from('demo_approvals').insert({loan_id:id,user_id:ids[a]}));
 for(const [step,proof]of Object.entries(proofs)){if(!proof)continue;const {actor,...data}=proof;data.photo=await image(proof.photo,ids[actor],`proof/${id}`);ok(await client.from('demo_proofs').insert({loan_id:id,step,actor:ids[actor],data}));}
 if(condition)ok(await client.from('demo_conditions').insert({loan_id:id,data:condition}));
 if(review)ok(await client.from('demo_reviews').insert({loan_id:id,data:review}));
}
for(const f of seed.friends)ok(await client.from('demo_friendships').upsert({id:f.id,sender:ids[f.from],recipient:ids[f.to],status:f.status},{onConflict:'id',ignoreDuplicates:true}));
for(const m of seed.messages){const {id,from,to,...data}=m;ok(await client.from('demo_messages').upsert({id,sender:ids[from],recipient:ids[to],data},{onConflict:'id',ignoreDuplicates:true}));}
for(const n of seed.notices){const {id,to,...data}=n;ok(await client.from('demo_notices').upsert({id,recipient:ids[to],data},{onConflict:'id',ignoreDuplicates:true}));}
ok(await client.from('demo_seed_versions').insert({id:'styled-v1'}));
console.log('Shared demo accounts and examples provisioned. Credentials remain in the private output file.');
