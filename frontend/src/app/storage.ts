import { validDate, spriteColourValid, strokesValid, type Store } from './domain.ts';
export function decodeStore(raw:string):Store|null {
 try {
  const s=JSON.parse(raw) as Store;
  const text=(v:unknown)=>typeof v==='string';const timestamp=(v:unknown)=>text(v)&&Number.isFinite(Date.parse(v as string));
  const unique=(rows:{id:string}[])=>rows.every(v=>v&&text(v.id))&&new Set(rows.map(v=>v.id)).size===rows.length;
  if(s?.version!==1||!Array.isArray(s.people)||!Array.isArray(s.items)||!Array.isArray(s.loans)||!Array.isArray(s.messages)||!Array.isArray(s.friends)||!Array.isArray(s.notices))return null;
  if(![s.people,s.items,s.loans,s.messages,s.friends,s.notices].every(rows=>unique(rows)))return null;
  const person=(id:unknown)=>s.people.some(p=>p.id===id);
  // Avatars are optional and newer than saved data: a missing one is normal, and a
  // malformed one is dropped (the person falls back to the default) rather than failing the load.
  for(const p of s.people){const sp=p?.sprite;if(sp!==undefined&&!(sp&&spriteColourValid(sp.colour)&&['face-default','face-drawn'].includes(sp.headAssetId)&&text(sp.torsoAssetId)&&Number.isInteger(sp.level)&&(sp.headAssetId!=='face-drawn'||strokesValid(sp.faceStrokes))))delete p.sprite;}
  if(!s.people.every(p=>p&&text(p.name)&&text(p.username)&&text(p.location)&&text(p.bio)&&text(p.colour))||!person(s.activeUserId))return null;
  if(!s.items.every(i=>i&&text(i.name)&&text(i.image)&&text(i.category)&&text(i.location)&&typeof i.listed==='boolean'&&typeof i.isFriend==='boolean'&&Array.isArray(i.images)&&i.images.every(text)&&person(i.ownerId)))return null;
  if(!s.loans.every(l=>{
   if(!l||!s.items.some(i=>i.id===l.itemId)||!person(l.ownerId)||!person(l.borrowerId)||l.ownerId===l.borrowerId||!text(l.start)||!validDate(l.start)||!validDate(l.end)||l.end<l.start||!text(l.code)||!text(l.lockerId)||!timestamp(l.createdAt)||typeof l.proofs!=='object'||l.proofs===null||!Array.isArray(l.approvals)||!l.approvals.every(id=>id===l.ownerId||id===l.borrowerId)||!['requested','arranging','ready','active','returning','verifying','complete','cancelled','declined'].includes(l.status))return false;
   if(!Object.entries(l.proofs).every(([key,p])=>p&&['ownerDropoff','borrowerPickup','borrowerDropoff','ownerPickup'].includes(key)&&timestamp(p.at)&&text(p.photo)&&person(p.actor)&&text(p.lockerNumber)&&/^\d{1,2}$/.test(p.lockerNumber)))return false;
   if(l.condition&&(!['good','issue'].includes(l.condition.result)||!text(l.condition.note)||!timestamp(l.condition.at)||(l.condition.resolution!==undefined&&!text(l.condition.resolution))))return false;
   if(l.review&&(!Number.isInteger(l.review.rating)||l.review.rating<1||l.review.rating>5||!text(l.review.text)||!Array.isArray(l.review.compliments)||!l.review.compliments.every(text)||!timestamp(l.review.at)||(l.review.photo!==undefined&&!text(l.review.photo))))return false;
   return true;
  }))return null;
  if(!s.messages.every(m=>m&&text(m.text)&&timestamp(m.at)&&person(m.from)&&person(m.to)&&typeof m.read==='boolean'))return null;
  if(!s.friends.every(f=>f&&person(f.from)&&person(f.to)&&['pending','accepted'].includes(f.status)))return null;
  if(!s.notices.every(n=>n&&text(n.text)&&timestamp(n.at)&&person(n.to)&&typeof n.read==='boolean'))return null;
  s.helpRequests??=[];s.offers??=[];
  if(!Array.isArray(s.helpRequests)||!Array.isArray(s.offers)||!unique(s.helpRequests)||!unique(s.offers))return null;
  if(!s.helpRequests.every(r=>person(r.borrowerId)&&text(r.title)&&text(r.description)&&validDate(r.start)&&validDate(r.end)&&r.end>=r.start&&['open','closed','selected'].includes(r.status)&&(r.loanId===undefined||s.loans.some(l=>l.id===r.loanId))))return null;
  if(!s.offers.every(o=>person(o.ownerId)&&s.helpRequests!.some(r=>r.id===o.requestId)&&s.items.some(i=>i.id===o.itemId&&i.ownerId===o.ownerId)&&typeof o.withdrawn==='boolean'))return null;
  if(!s.loans.every(l=>!l.previousPlan||(validDate(l.previousPlan.start)&&validDate(l.previousPlan.end)&&l.previousPlan.end>=l.previousPlan.start&&text(l.previousPlan.lockerId))))return null;
  return s;
 }catch{return null;}
}
function database():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined'){reject(new Error('Browser storage is unavailable.'));return;}const request=indexedDB.open('cs4353-preview',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('state'))request.result.createObjectStore('state');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error??new Error('Could not open browser storage.'));request.onblocked=()=>reject(new Error('Close another app tab and try again.'));});
}
export async function loadStore():Promise<{store:Store|null;warning?:string;recoveryRequired?:boolean}>{
 const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),request=tx.objectStore('state').get('current');request.onsuccess=()=>{const value=request.result;if(value===undefined)resolve({store:null});else{const store=decodeStore(value);resolve({store,recoveryRequired:!store,warning:store?undefined:'Saved preview data could not be read and has been preserved. Changes are disabled; export the IndexedDB snapshot before recovery.'});}};tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error??new Error('Could not load saved data.'));};});
}
export async function saveStore(store:Store):Promise<void>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(JSON.stringify(store),'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error??new Error('Could not save preview data.'));};tx.onabort=()=>{db.close();reject(tx.error??new Error('Saving was interrupted.'));};});}
