import type { Store } from './domain.ts';
export function decodeStore(raw: string): Store | null {
 try {
  const s=JSON.parse(raw) as Store;
  if(s?.version!==1||!Array.isArray(s.people)||!Array.isArray(s.items)||!Array.isArray(s.loans)||!Array.isArray(s.messages)||!Array.isArray(s.friends)||!Array.isArray(s.notices))return null;
  if(!s.people.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&typeof p.username==='string'&&typeof p.location==='string'&&typeof p.bio==='string')||!s.people.some(p=>p.id===s.activeUserId))return null;
  if(!s.items.every(i=>i&&typeof i.id==='string'&&typeof i.name==='string'&&typeof i.image==='string'&&typeof i.category==='string'&&typeof i.location==='string'&&typeof i.listed==='boolean'&&Array.isArray(i.images)&&i.images.every(x=>typeof x==='string')&&s.people.some(p=>p.id===i.ownerId)))return null;
  if(!s.loans.every(l=>l&&s.items.some(i=>i.id===l.itemId)&&s.people.some(p=>p.id===l.ownerId)&&s.people.some(p=>p.id===l.borrowerId)&&typeof l.start==='string'&&typeof l.end==='string'&&typeof l.code==='string'&&typeof l.proofs==='object'&&l.proofs!==null&&Array.isArray(l.approvals)&&['requested','arranging','ready','active','returning','verifying','complete','cancelled','declined'].includes(l.status)))return null;
  if(!s.messages.every(m=>m&&typeof m.text==='string'&&typeof m.at==='string'&&s.people.some(p=>p.id===m.from)&&s.people.some(p=>p.id===m.to)))return null;
  if(!s.friends.every(f=>f&&s.people.some(p=>p.id===f.from)&&s.people.some(p=>p.id===f.to)&&['pending','accepted'].includes(f.status)))return null;
  if(!s.notices.every(n=>n&&typeof n.text==='string'&&typeof n.at==='string'&&s.people.some(p=>p.id===n.to)))return null;
  return s;
 }catch{return null;}
}
function database():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined'){reject(new Error('Browser storage is unavailable.'));return;}const request=indexedDB.open('cs4353-preview',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('state'))request.result.createObjectStore('state');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error??new Error('Could not open browser storage.'));request.onblocked=()=>reject(new Error('Close another app tab and try again.'));});
}
export async function loadStore():Promise<{store:Store|null;warning?:string}>{
 const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),request=tx.objectStore('state').get('current');request.onsuccess=()=>{const value=request.result;if(value===undefined)resolve({store:null});else{const store=decodeStore(value);resolve({store,warning:store?undefined:'Saved preview data could not be read. A fresh preview has been opened.'});}};tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error??new Error('Could not load saved data.'));};});
}
export async function saveStore(store:Store):Promise<void>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(JSON.stringify(store),'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error??new Error('Could not save preview data.'));};tx.onabort=()=>{db.close();reject(tx.error??new Error('Saving was interrupted.'));};});}
