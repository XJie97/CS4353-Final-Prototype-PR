import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Command, Store } from '../app/domain';
import { tabAuthOptions } from './auth.ts';
export type Identity={id:string;email:string};
export interface DemoServices {
 configured:boolean;
 observe(listener:(identity:Identity|null)=>void):()=>void;
 signIn(email:string,password:string):Promise<void>;
 signOut():Promise<void>;
 load():Promise<Store>;
 execute(command:Command,requestId:string,revision:number|null):Promise<void>;
 subscribe(refresh:()=>void):()=>void;
}
const tables=['profiles','items','loans','approvals','proofs','conditions','reviews','friendships','messages','notices','help_requests','offers'];
const url=import.meta.env?.VITE_SUPABASE_URL;
const key=import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured=Boolean(url&&key&&!key.includes('YOUR_'));
let singleton:DemoServices|undefined;
export function services():DemoServices {
 if(singleton)return singleton;
 if(!configured)throw new Error('Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for this demo deployment.');
 const client=createClient(url,key,{auth:tabAuthOptions(typeof window==='undefined'?undefined:window.sessionStorage)});
 return singleton=makeDemoServices(client);
}
export function makeDemoServices(client:SupabaseClient):DemoServices {
 // Keep paths separate from expiring display URLs, including across edit retries.
 const paths=new Map<string,string>();
 const uploads=new Map<string,Promise<string>>();
 const imageUrls=new Map<string,{expires:number;value:Promise<string>}>();
 let signing=0;
 const signingQueue:(()=>void)[]=[];
 async function signImage(path:string):Promise<string>{
  if(signing>=4)await new Promise<void>(resolve=>signingQueue.push(resolve));
  else signing++;
  try{
   const result=await client.storage.from('demo-images').createSignedUrl(path,600);
   if(result.error)throw result.error;
   paths.set(result.data.signedUrl,path);return result.data.signedUrl;
  }finally{
   const next=signingQueue.shift();if(next)next();else signing--;
  }
 }
 const resolvePath=(value:string)=>paths.get(value)||value;
 async function display(path:string):Promise<string>{
  if(!path||path.startsWith('/assets/'))return path;
  let cached=imageUrls.get(path);
  if(!cached||cached.expires<=Date.now()){
   cached={expires:Date.now()+540_000,value:signImage(path)};
   imageUrls.set(path,cached);
   const entry=cached;
   void entry.value.catch(()=>{if(imageUrls.get(path)===entry)imageUrls.delete(path);});
  }
  return cached.value;
 }
 async function upload(value:string,scope:string):Promise<string>{
  if(!value.startsWith('data:'))return resolvePath(value);
  const cacheKey=scope+value;
  let pending=uploads.get(cacheKey);
  if(!pending){pending=(async()=>{
   const {data,error}=await client.auth.getUser();if(error||!data.user)throw error||new Error('Sign in again.');
   const blob=await (await fetch(value)).blob();
   if(!['image/jpeg','image/png','image/webp'].includes(blob.type)||!blob.size||blob.size>5242880)throw new Error('Choose a JPEG, PNG or WebP image up to 5 MB.');
   const path=`${data.user.id}/${scope}/${crypto.randomUUID()}.${blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg'}`;
   const result=await client.storage.from('demo-images').upload(path,blob,{upsert:false,contentType:blob.type});
   if(result.error)throw result.error;return path;
  })();uploads.set(cacheKey,pending);pending.catch(()=>uploads.delete(cacheKey));}
  return pending;
 }
 return {
  configured:true,
  observe(listener){const {data}=client.auth.onAuthStateChange((_event,session)=>listener(session?{id:session.user.id,email:session.user.email||''}:null));return()=>data.subscription.unsubscribe();},
  async signIn(email,password){const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;},
  async signOut(){const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;paths.clear();uploads.clear();imageUrls.clear();},
  async load(){
   const {data,error}=await client.rpc('demo_state');if(error)throw error;
   const store=data as Store;
   if(!store.people.some(p=>p.id===store.activeUserId))throw new Error('This account has not been provisioned for the connected demo.');
   await Promise.all([
    ...store.people.map(async p=>{if(p.avatar)p.avatar=await display(p.avatar);}),
    ...store.items.map(async i=>{i.images=await Promise.all(i.images.map(display));i.image=i.images[0]||'/assets/item-placeholder.png';}),
    ...store.loans.map(async l=>{await Promise.all(Object.values(l.proofs).map(async p=>{if(p)p.photo=await display(p.photo);}));if(l.review?.photo)l.review.photo=await display(l.review.photo);}),
    ...(store.receivedReviews||[]).map(async r=>{if(r.review.photo)r.review.photo=await display(r.review.photo);}),
   ]);return store;
  },
  async execute(command,requestId,revision){
   const c=structuredClone(command) as Command;
   if(c.type==='record-proof')c.photo=await upload(c.photo,`proof/${c.loanId}`);
   if((c.type==='submit-review'||c.type==='edit-review')&&c.photo)c.photo=await upload(c.photo,'public');
   if(c.type==='update-profile'&&c.avatar)c.avatar=await upload(c.avatar,'public');
   if(c.type==='create-item'||c.type==='edit-item')c.images=await Promise.all(c.images.map(image=>upload(image,'public')));
   const {error}=await client.rpc('demo_command',{command:c,request_id:requestId,expected_revision:revision});
   if(error)throw new Error(error.code==='23P01'?'These dates overlap another loan. Choose different dates.':error.code==='23505'?'This record already exists, or another tester just completed this action. Refresh and check.':error.message);
  },
  subscribe(refresh){
   let active=true;
   let timer:ReturnType<typeof setTimeout>|undefined;
   const scheduleRefresh=()=>{if(!active||timer!==undefined)return;timer=setTimeout(()=>{timer=undefined;if(active)refresh();},150);};
   const channel=client.channel(`demo:${crypto.randomUUID()}`);
   for(const table of tables)channel.on('postgres_changes',{event:'*',schema:'public',table:`demo_${table}`},scheduleRefresh);
   void client.auth.getSession().then(async({data})=>{if(!active||!data.session)return;await client.realtime.setAuth(data.session.access_token);if(active)channel.subscribe(status=>{if(status==='SUBSCRIBED')scheduleRefresh();});}).catch(()=>{if(active)refresh();});
   return()=>{active=false;clearTimeout(timer);void client.removeChannel(channel);};
  },
 };
}
