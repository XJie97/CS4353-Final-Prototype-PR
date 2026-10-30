import { useEffect, useMemo, useState } from 'react';
import { AppProvider, useApp } from './app/context';
import { areFriends } from './app/domain';
import { parseRoute, type Page, type Route } from './app/routes';
import BorrowHome from './pages/borrow/BorrowHome';
import { BottomNavigation } from './components/BottomNavigation';
import { EmptyState, Header } from './components/ui/shared';
import { LoansPage, LoanDetails } from './features/LoansPage';
import { LoanForm } from './features/LoanForm';
import { LockerFlow } from './features/LockerFlow';
import { ChatsPage } from './features/ChatsPage';
import { NotificationsPage } from './features/NotificationsPage';
import './pages/borrow/borrow.css';
import './app/app.css';
function Application() {
 const {store,loading,perform,storageWarning,toast}=useApp();
 const [route,setRoute]=useState<Route>(()=>parseRoute(typeof window==='undefined'?'':window.location.hash));const [homeEpoch,setHomeEpoch]=useState(0);const [requestId,setRequestId]=useState<string|null>(null);const [handoverId,setHandoverId]=useState<string|null>(null);
 useEffect(()=>{const handle=()=>setRoute(parseRoute(window.location.hash));window.addEventListener('popstate',handle);return()=>window.removeEventListener('popstate',handle);},[]);
 const catalog=useMemo(()=>store.items.filter(item=>item.listed&&item.ownerId!==store.activeUserId).map(item=>({...item,owner:store.people.find(p=>p.id===item.ownerId)?.name,isFriend:areFriends(store,store.activeUserId,item.ownerId)})),[store]);
 function navigate(page:Page,id?:string){window.history.pushState(null,'',`#${page}${id?'/'+encodeURIComponent(id):''}`);setRoute({page,...(id?{id}:{})});if(page==='borrow'&&!id)setHomeEpoch(n=>n+1);}
 const me=store.people.find(p=>p.id===store.activeUserId)!;const requestItem=store.items.find(i=>i.id===requestId);
 const title=route.page==='loans'?(route.id?'Loan Details':'Your Loans'):route.page==='share'?'Your Shelf':route.page==='friends'?'Your Friends':route.page==='me'?'Your Profile':route.page==='chats'?(route.id?store.people.find(p=>p.id===route.id)?.name??'Chats':'Chats'):'Notifications';
 if(loading)return <div className="borrow-app"><main className="app-loading" role="status">Opening your community…</main></div>;
 return <div className="borrow-app"><div className="app-feature" hidden={route.page!=='borrow'}><BorrowHome key={`${me.id}-${homeEpoch}`} embedded catalog={catalog} onRequest={setRequestId} onChat={()=>navigate('chats')} onNotifications={()=>navigate('notifications')}/></div>
 {route.page!=='borrow'&&<><Header title={title} navigate={navigate} onBack={()=>navigate(route.id&&(route.page==='loans'||route.page==='chats')?route.page:'borrow')}/>{route.page==='loans'?(route.id?<LoanDetails key={route.id} id={route.id} onBack={()=>navigate('loans')} onChat={peer=>navigate('chats',peer)} onHandover={setHandoverId}/>:<LoansPage onOpen={id=>navigate('loans',id)} onHandover={setHandoverId}/>):route.page==='chats'?<ChatsPage key={route.id??'chats'} peerId={route.id} onOpen={id=>navigate('chats',id)} onLoan={id=>navigate('loans',id)}/>:route.page==='notifications'?<NotificationsPage navigate={navigate}/>:<main className="app-scroll"><EmptyState title={title} text="Your community is ready to share."/></main>}</>}
 <div className="preview-strip"><label>Preview account <select aria-label="Preview account" value={me.id} onChange={e=>{const result=perform({type:'switch-account',id:e.target.value});if(result.ok){setRequestId(null);navigate('borrow');}else toast(result.error);}}>{store.people.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><span>Local preview</span></div>
 {storageWarning&&<div className="storage-warning" role="status">{storageWarning}</div>}
 <BottomNavigation active={['chats','notifications'].includes(route.page)?'borrow':route.page} onNavigate={navigate}/>
 {handoverId&&<LockerFlow key={handoverId} loanId={handoverId} onClose={()=>setHandoverId(null)} onDone={()=>{setHandoverId(null);navigate('loans',handoverId);}}/>}
 {requestItem&&<LoanForm item={requestItem} onClose={()=>setRequestId(null)} onDone={id=>{setRequestId(null);navigate('loans',id);}}/>}
 </div>;
}
export default function App(){return <AppProvider><Application/></AppProvider>;}
