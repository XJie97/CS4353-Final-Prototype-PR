/** 
 * AppShell() is meant to replace upstream's Application() in App.tsx, which is left exactly as upstream wrote it so the two
 * branches merge without conflicts; App.tsx's last line renders this instead.
 * Includes upstream's sign-in, loading and retry screens, so it works with both
 * the local preview and the connected demo (see services/backend.ts).
 * 
 * Changed some import statements
 * Added context-aware navigation (depth)
 */
import { HelpPage } from './features/HelpPage';
import { useEffect, useMemo, useState } from 'react';
// import { AppProvider, useApp } from './app/context';
import { useApp } from './app/context';
import { areFriends } from './app/domain';
// import { parseRoute, type Page, type Route } from './app/routes';
import { hidesTopBar, isTabRoot, parentRoute, parseRoute, routeHash, type Page, type Route } from './app/routes';
import BorrowHome from './pages/borrow/BorrowHome';
import { BottomNavigation } from './components/BottomNavigation';
import { EmptyState, Header } from './components/ui/shared';
import { LoansPage } from './features/LoansPage';
import { LoanForm } from './features/LoanForm';
import { LockerFlow } from './features/LockerFlow';
// import { ReviewForm } from './features/ReviewForm';
import { ReviewSheet } from './features/ReviewSheet';
import { SharePage } from './features/SharePage';
// import { FriendsPage } from './features/FriendsPage';
import { FriendsScreen } from './features/FriendsScreen';
// import { ProfilePage } from './features/ProfilePage';
import { ProfileScreen } from './features/ProfileScreen';
// import { ChatsPage } from './features/ChatsPage';
import { ChatsScreen } from './features/ChatsScreen';
import { SignIn } from './features/SignIn';
import { NotificationsPage } from './features/NotificationsPage';
import './pages/borrow/borrow.css';
import './app/app.css';
import { LoanDetails } from './features/LoanDetails';
// New: PersonProfileProvider, currentLoan, shelfState, localPreview
import { PersonProfileProvider } from './features/PersonProfile';
import { currentLoan, shelfState } from './features/ShelfStrip';
import { localPreview } from './services/backend';


// Added goBack() for context-aware nav
function RouteContent({route,navigate,goBack,onItem,onHandover,onReview}:{route:Route;navigate:(page:Page,id?:string)=>void;goBack:()=>void;onItem:(id:string)=>void;onHandover:(id:string)=>void;onReview:(id:string)=>void;}) {
 const {store}=useApp();
 switch(route.page){
  case 'loans':return route.id?<LoanDetails key={route.id} id={route.id} onBack={goBack} onChat={peer=>navigate('chats',peer)} onHandover={onHandover} onReview={onReview}/>:<LoansPage onOpen={id=>navigate('loans',id)} onHandover={onHandover}/>;
  case 'share':return <SharePage onLoan={id=>navigate('loans',id)}/>;
  case 'friends':return <FriendsScreen view={route.id} onView={view=>navigate('friends',view)} onChat={id=>navigate('chats',id)} onItem={onItem}/>;
  case 'me':return <ProfileScreen key={store.activeUserId} editingAvatar={route.id==='avatar'} onEditAvatar={()=>navigate('me','avatar')} onCloseAvatar={goBack} onLoans={()=>navigate('loans')} onShare={()=>navigate('share')} onLoan={id=>navigate('loans',id)}/>;
  case 'chats':return <ChatsScreen key={route.id??'chats'} peerId={route.id} onOpen={id=>navigate('chats',id)} onLoan={id=>navigate('loans',id)}/>;
  case 'notifications':return <NotificationsPage navigate={navigate}/>;
  case 'borrow':return null;
  default:return <main className="app-scroll"><EmptyState title="Page not found" text="Choose a section below."/></main>;
 }
}

export function AppShell() {
 const {store,loading,identity,configured,storageWarning,refresh,signOut}=useApp();
 const preview=localPreview;
 const [help,setHelp]=useState(false);
 const [route,setRoute]=useState<Route>(()=>parseRoute(typeof window==='undefined'?'':window.location.hash));const [homeEpoch,setHomeEpoch]=useState(0);const [requestId,setRequestId]=useState<string|null>(null);const [handoverId,setHandoverId]=useState<string|null>(null);const [reviewId,setReviewId]=useState<string|null>(null);
 useEffect(()=>{const handle=()=>{setRequestId(null);setHandoverId(null);setReviewId(null);setDepth(Number(window.history.state?.depth??0));setRoute(parseRoute(window.location.hash));};window.addEventListener('popstate',handle);return()=>window.removeEventListener('popstate',handle);},[]);
 const catalog=useMemo(()=>store.items.filter(item=>item.listed&&item.ownerId!==store.activeUserId).map(item=>{const state=shelfState(item,store.loans);return {...item,owner:store.people.find(p=>p.id===item.ownerId)?.name,isFriend:areFriends(store,store.activeUserId,item.ownerId),availability:state==='hidden'?'available' as const:state,...(state==='on-loan'?{backOn:currentLoan(item,store.loans)?.end}:{})};}),[store]);

 // Context-aware navigation. Each history entry records how many in-app steps it is
 // from a tab page ("depth"). Tabs start a fresh trail at depth 0 and show no back
 // button; anything opened from a page is one step deeper and its back button returns
 // to where the user came from. With no trail (a shared link or a refresh), back goes to the page it naturally sits under instead.
 const [depth,setDepth]=useState<number>(()=>typeof window==='undefined'?0:Number(window.history.state?.depth??0));
 const currentDepth=()=>Number(window.history.state?.depth??0);
 function go(page:Page,id:string|undefined,nextDepth:number,extra?:object){window.history.pushState({...extra,depth:nextDepth},'',routeHash({page,...(id?{id}:{})}));setDepth(nextDepth);setRoute({page,...(id?{id}:{})});if(page==='borrow'&&!id)setHomeEpoch(n=>n+1);}
 function navigate(page:Page,id?:string){go(page,id,currentDepth()+1);}
 function openTab(page:Page){go(page,undefined,0);}
 function goBack(){if(currentDepth()>0){window.history.back();return;}const parent=parentRoute(route);window.history.replaceState({depth:0},'',routeHash(parent));setDepth(0);setRoute(parent);if(parent.page==='borrow')setHomeEpoch(n=>n+1);}
 const showBack=depth>0||!isTabRoot(route);
 useEffect(()=>{setRequestId(null);setHandoverId(null);setReviewId(null);document.querySelector<HTMLElement>('.app-header h1')?.focus({preventScroll:true});},[route.page,route.id]);
 function viewItem(id:string){window.history.pushState({fromFriend:true,depth:currentDepth()+1},'',`#borrow/item/${encodeURIComponent(id)}`);setHomeEpoch(n=>n+1);setRoute({page:'borrow'});}
 const me=store.people.find(p=>p.id===store.activeUserId);const requestItem=store.items.find(i=>i.id===requestId);
 const title=route.page==='loans'?(route.id?'Loan Details':'Your Loans'):route.page==='share'?'Your Shelf':route.page==='friends'?(route.id==='requests'?'Friend Requests':route.id==='find'?'Find People':route.id==='network'?'Friend Network':'Your Friends'):route.page==='me'?(route.id==='avatar'?'Edit Avatar':'Your Profile'):route.page==='chats'?(route.id?store.people.find(p=>p.id===route.id)?.name??'Chats':'Chats'):'Notifications';
 // mergescript Upstream's gates: demo setup, loading, sign-in, and a retry when the profile can't load.
 if(!configured)return <SignIn setup/>;
 // mergescript The local preview knows its account straight away, so it skips the sign-in flash while AppProvider catches up.
 if(loading||(!identity&&preview?.account()))return <div className="borrow-app"><main className="app-loading" role="status">Opening your community…</main></div>;
 if(!identity)return <SignIn/>;
 if(!me)return <div className="borrow-app"><main className="app-loading"><p role="alert">{storageWarning||'Unable to load your profile.'}</p><button className="button" onClick={()=>void refresh()}>Retry</button><button className="button" onClick={()=>void signOut()}>Sign out</button></main></div>;
 return <PersonProfileProvider onChat={id=>navigate('chats',id)} onItem={viewItem} onLoan={id=>navigate('loans',id)}><div className="borrow-app"><div className="app-feature" hidden={route.page!=='borrow'}><BorrowHome key={`${me.id}-${homeEpoch}`} embedded catalog={catalog} onRequest={setRequestId} onChat={()=>navigate('chats')} onChatOwner={id=>navigate('chats',id)} onViewLoan={id=>navigate('loans',id)} onNotifications={()=>navigate('notifications')}/></div>
 {route.page!=='borrow'&&<>{!hidesTopBar(route)&&<Header title={title} navigate={navigate} onBack={showBack?goBack:undefined}/>}{route.page!=='friends'&&<RouteContent route={route} navigate={navigate} goBack={goBack} onItem={viewItem} onHandover={setHandoverId} onReview={setReviewId}/>}</>}
 {/* Kept hidden so search text survives tab switches, placed after the header so it renders below it. */}
 <div className="app-feature" hidden={route.page!=='friends'}><FriendsScreen active={route.page==='friends'} view={route.page==='friends'?route.id:undefined} onView={view=>navigate('friends',view)} onChat={id=>navigate('chats',id)} onItem={viewItem} onLoan={id=>navigate('loans',id)} onHelp={()=>setHelp(true)}/></div>
 {/* Local preview (if present on this machine): its own strip with the account switcher and reset. Otherwise upstream's signed-in strip. */}
 {preview
  ?<preview.Strip onSwitch={()=>{setRequestId(null);openTab('borrow');}}/>
  :<div className="preview-strip"><span>Signed in as {me.name}</span><span>Shared demo</span></div>}
 {storageWarning&&<div className="storage-warning" role="status">{storageWarning} <button onClick={()=>void refresh()}>Retry</button></div>}
 {['borrow','share'].includes(route.page)&&<button className="button" onClick={()=>setHelp(true)}>Ask for help / offers</button>}
 {help&&<HelpPage key={me.id} onClose={()=>setHelp(false)} onLoan={id=>{setHelp(false);navigate('loans',id);}}/>}
 <BottomNavigation active={['chats','notifications'].includes(route.page)?'borrow':route.page} onNavigate={openTab}/>
 {reviewId&&<ReviewSheet loanId={reviewId} onClose={()=>setReviewId(null)}/>}
 {handoverId&&<LockerFlow key={handoverId} loanId={handoverId} onClose={()=>setHandoverId(null)} onDone={()=>{setHandoverId(null);navigate('loans',handoverId);}}/>}
 {requestItem&&<LoanForm item={requestItem} onClose={()=>setRequestId(null)} onDone={id=>{setRequestId(null);navigate('loans',id);}}/>}
 </div></PersonProfileProvider>;
}
