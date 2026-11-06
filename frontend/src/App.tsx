import { HelpPage } from './features/HelpPage';
import { useEffect, useMemo, useState } from 'react';
import { AppProvider, useApp } from './app/context';
import { areFriends } from './app/domain';
import { parseRoute, type Page, type Route } from './app/routes';
import BorrowHome from './pages/borrow/BorrowHome';
import { BottomNavigation } from './components/BottomNavigation';
import { EmptyState, Header } from './components/ui/shared';
import { LoansPage } from './features/LoansPage';
import { LoanForm } from './features/LoanForm';
import { LockerFlow } from './features/LockerFlow';
import { ReviewForm } from './features/ReviewForm';
import { SharePage } from './features/SharePage';
import { FriendsPage } from './features/FriendsPage';
import { ProfilePage } from './features/ProfilePage';
import { ChatsPage } from './features/ChatsPage';
import { SignIn } from './features/SignIn';
import { NotificationsPage } from './features/NotificationsPage';
import './pages/borrow/borrow.css';
import './app/app.css';
import { LoanDetails } from './features/LoanDetails';
export function RouteContent({route,navigate,onItem,onHandover,onReview,onReset}:{route:Route;navigate:(page:Page,id?:string)=>void;onItem:(id:string)=>void;onHandover:(id:string)=>void;onReview:(id:string)=>void;onReset:()=>void}) {
 const {store}=useApp();
 switch(route.page){
  case 'loans':return route.id?<LoanDetails key={route.id} id={route.id} onBack={()=>navigate('loans')} onChat={peer=>navigate('chats',peer)} onHandover={onHandover} onReview={onReview}/>:<LoansPage onOpen={id=>navigate('loans',id)} onHandover={onHandover}/>;
  case 'share':return <SharePage onLoan={id=>navigate('loans',id)}/>;
  case 'friends':return <FriendsPage onChat={id=>navigate('chats',id)} onItem={onItem}/>;
  case 'me':return <ProfilePage key={store.activeUserId} onLoans={()=>navigate('loans')} onShare={()=>navigate('share')} onReset={onReset}/>;
  case 'chats':return <ChatsPage key={route.id??'chats'} peerId={route.id} onOpen={id=>navigate('chats',id)} onLoan={id=>navigate('loans',id)}/>;
  case 'notifications':return <NotificationsPage navigate={navigate}/>;
  case 'borrow':return null;
  default:return <main className="app-scroll"><EmptyState title="Page not found" text="Choose a section below."/></main>;
 }
}
function Application() {
 const {store,loading,identity,configured,storageWarning,refresh,signOut}=useApp();
 const [help,setHelp]=useState(false);
 const [route,setRoute]=useState<Route>(()=>parseRoute(typeof window==='undefined'?'':window.location.hash));const [homeEpoch,setHomeEpoch]=useState(0);const [requestId,setRequestId]=useState<string|null>(null);const [handoverId,setHandoverId]=useState<string|null>(null);const [reviewId,setReviewId]=useState<string|null>(null);
 useEffect(()=>{const handle=()=>{setRequestId(null);setHandoverId(null);setReviewId(null);setRoute(parseRoute(window.location.hash));};window.addEventListener('popstate',handle);return()=>window.removeEventListener('popstate',handle);},[]);
 const catalog=useMemo(()=>store.items.filter(item=>item.listed&&item.ownerId!==store.activeUserId).map(item=>({...item,owner:store.people.find(p=>p.id===item.ownerId)?.name,isFriend:areFriends(store,store.activeUserId,item.ownerId)})),[store]);
 function navigate(page:Page,id?:string){window.history.pushState(null,'',`#${page}${id?'/'+encodeURIComponent(id):''}`);setRoute({page,...(id?{id}:{})});if(page==='borrow'&&!id)setHomeEpoch(n=>n+1);}
 useEffect(()=>{setRequestId(null);setHandoverId(null);setReviewId(null);document.querySelector<HTMLElement>('.app-header h1')?.focus({preventScroll:true});},[route.page,route.id]);
 function viewItem(id:string){window.history.pushState({fromFriend:true},'',`#borrow/item/${encodeURIComponent(id)}`);setHomeEpoch(n=>n+1);setRoute({page:'borrow'});}
 const me=store.people.find(p=>p.id===store.activeUserId)!;const requestItem=store.items.find(i=>i.id===requestId);
 const title=route.page==='loans'?(route.id?'Loan Details':'Your Loans'):route.page==='share'?'Your Shelf':route.page==='friends'?'Your Friends':route.page==='me'?'Your Profile':route.page==='chats'?(route.id?store.people.find(p=>p.id===route.id)?.name??'Chats':'Chats'):'Notifications';
 if(!configured)return <SignIn setup/>;
 if(loading)return <div className="borrow-app"><main className="app-loading" role="status">Opening your community…</main></div>;
 if(!identity)return <SignIn/>;
 if(!me)return <div className="borrow-app"><main className="app-loading"><p role="alert">{storageWarning||'Unable to load your profile.'}</p><button className="button" onClick={()=>void refresh()}>Retry</button><button className="button" onClick={()=>void signOut()}>Sign out</button></main></div>;
 return <div className="borrow-app"><div className="app-feature" hidden={route.page!=='borrow'}><BorrowHome key={`${me.id}-${homeEpoch}`} embedded catalog={catalog} onRequest={setRequestId} onChat={()=>navigate('chats')} onNotifications={()=>navigate('notifications')}/></div>
 {route.page!=='borrow'&&<><Header title={title} navigate={navigate} onBack={()=>navigate(route.id&&(route.page==='loans'||route.page==='chats')?route.page:'borrow')}/>{route.page!=='friends'&&<RouteContent route={route} navigate={navigate} onItem={viewItem} onHandover={setHandoverId} onReview={setReviewId} onReset={()=>navigate('borrow')}/>}</>}
 <div className="app-feature" hidden={route.page!=='friends'}><FriendsPage active={route.page==='friends'} onChat={id=>navigate('chats',id)} onItem={viewItem}/></div>
 <div className="preview-strip"><span>Signed in as {me.name}</span><span>Shared demo</span></div>
 {storageWarning&&<div className="storage-warning" role="status">{storageWarning} <button onClick={()=>void refresh()}>Retry</button></div>}
 {['borrow','share'].includes(route.page)&&<button className="button" onClick={()=>setHelp(true)}>Ask for help / offers</button>}
 {help&&<HelpPage key={me.id} onClose={()=>setHelp(false)} onLoan={id=>{setHelp(false);navigate('loans',id);}}/>}
 <BottomNavigation active={['chats','notifications'].includes(route.page)?'borrow':route.page} onNavigate={navigate}/>
 {reviewId&&<ReviewForm loanId={reviewId} onClose={()=>setReviewId(null)}/>}
 {handoverId&&<LockerFlow key={handoverId} loanId={handoverId} onClose={()=>setHandoverId(null)} onDone={()=>{setHandoverId(null);navigate('loans',handoverId);}}/>}
 {requestItem&&<LoanForm item={requestItem} onClose={()=>setRequestId(null)} onDone={id=>{setRequestId(null);navigate('loans',id);}}/>}
 </div>;
}
export default function App(){return <AppProvider><Application/></AppProvider>;}
