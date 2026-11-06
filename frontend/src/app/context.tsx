import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { applyCommand, todayLocal, type Command, type Store } from './domain';
import { createSeed } from './seed';
import { loadStore, saveStore } from './storage';
export const uid = () => crypto.randomUUID();
type Result = {ok:true}|{ok:false;error:string};
type AppContextValue={store:Store;loading:boolean;storageWarning:string;perform:(c:Command)=>Result;toast:(text:string)=>void;resetPreview:()=>void};
const Context=createContext<AppContextValue|null>(null);
export function AppProvider({children}:{children:ReactNode}) {
 const [store,setStore]=useState(()=>createSeed(todayLocal()));const current=useRef(store);const recoveryRequired=useRef(false);const [loading,setLoading]=useState(true);const [storageWarning,setStorageWarning]=useState('');const [message,setMessage]=useState('');const queue=useRef(Promise.resolve());
 useEffect(()=>{let live=true;loadStore().then(result=>{if(!live)return;recoveryRequired.current=!!result.recoveryRequired;const next=result.store??createSeed(todayLocal());current.current=next;setStore(next);setStorageWarning(result.warning??'');setLoading(false);}).catch(()=>{if(live){setStorageWarning('Browser storage is unavailable. Changes will last for this session only.');setLoading(false);}});return()=>{live=false;};},[]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),5000);return()=>clearTimeout(timer);},[message]);
 function commit(next:Store){current.current=next;setStore(next);queue.current=queue.current.catch(()=>{}).then(()=>saveStore(next)).then(()=>setStorageWarning('')).catch(()=>setStorageWarning('Could not save to this browser. Keep this tab open; your changes are available for this session.'));}
 function perform(command:Command):Result {if(recoveryRequired.current)return {ok:false,error:'Saved data needs recovery. It has not been overwritten.'};if(loading)return {ok:false,error:'Please wait while your saved preview loads.'};try{commit(applyCommand(current.current,command,{id:uid(),now:new Date().toISOString(),today:todayLocal()}));return {ok:true};}catch(error){return {ok:false,error:error instanceof Error?error.message:'Something went wrong. Please try again.'};}}
 return <Context.Provider value={{store,loading,storageWarning,perform,toast:setMessage,resetPreview:()=>{if(recoveryRequired.current){setMessage('Export and recover the saved snapshot before resetting. Existing data has been preserved.');return;}commit(createSeed(todayLocal()));setMessage('Preview reset.');}}}>{children}{message&&<div className="app-toast" role="status">{message}<button type="button" aria-label="Dismiss message" onClick={()=>setMessage('')}>×</button></div>}</Context.Provider>;
}
export function useApp(){const value=useContext(Context);if(!value)throw new Error('AppProvider is required.');return value;}
// For components that also render outside AppProvider (e.g. standalone Borrow screens).
export function useOptionalApp(){return useContext(Context);}
