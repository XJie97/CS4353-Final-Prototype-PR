import { useApp } from '../app/context';
import type { Page } from '../app/routes';
import { EmptyState } from '../components/ui/shared';
export function NotificationsPage({navigate}:{navigate:(page:Page,id?:string)=>void}) {
 const {store,perform}=useApp();const notices=store.notices.filter(n=>n.to===store.activeUserId);
 return <main className="app-scroll"><div className="section-heading"><h2>Updates</h2>{notices.some(n=>!n.read)&&<button type="button" className="button" onClick={()=>perform({type:'read-notices'})}>Mark all read</button>}</div>{notices.length?<div className="notification-list">{notices.map(notice=><button className={`notification-row ${notice.read?'':'unread'}`} key={notice.id} type="button" onClick={()=>{perform({type:'read-notices',id:notice.id});notice.loanId?navigate('loans',notice.loanId):notice.peerId?navigate('chats',notice.peerId):navigate('friends');}}><span className="notification-dot"/><span><strong>{notice.text}</strong><time dateTime={notice.at}>{new Intl.DateTimeFormat('en-SG',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(new Date(notice.at))}</time></span></button>)}</div>:<EmptyState title="You're all caught up" text="Loan requests, messages and community updates will appear here."/>}</main>;
}
