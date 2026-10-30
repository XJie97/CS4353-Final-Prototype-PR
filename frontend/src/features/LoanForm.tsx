import { useState } from 'react';
import { useApp, uid } from '../app/context';
import { addDays, dateLabel, duration, LOCKERS, todayLocal, type Item, type Loan } from '../app/domain';
import { calendarDays } from '../app/calendar';
import { ErrorText, Glyph, Modal } from '../components/ui/shared';
export function DatePicker({start,end,onDone,onClose}:{start:string;end:string;onDone:(start:string,end:string)=>void;onClose:()=>void}) {
 const today=todayLocal();const [month,setMonth]=useState((start||today).slice(0,7));const [range,setRange]=useState({start,end});
 const changeMonth=(offset:number)=>{const date=new Date(month+'-01T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+offset);setMonth(date.toISOString().slice(0,7));};
 return <Modal title="Choose loan dates" onClose={onClose}><p className="muted">Choose a receive date, then a return date.</p><div className="calendar-title"><button type="button" className="button" aria-label="Previous month" onClick={()=>changeMonth(-1)}>‹</button><strong>{new Intl.DateTimeFormat('en-SG',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01'))}</strong><button type="button" className="button" aria-label="Next month" onClick={()=>changeMonth(1)}>›</button></div><div className="calendar-grid">{['Mo','Tu','We','Th','Fr','Sa','Su'].map(day=><span key={day}>{day}</span>)}{calendarDays(month).map(day=><button type="button" key={day} disabled={day<today} className={`${day.slice(0,7)!==month?'outside ':''}${day===range.start||day===range.end?'selected ':''}${day>range.start&&day<range.end?'in-range':''}`} aria-label={dateLabel(day)} aria-pressed={day===range.start||day===range.end} onClick={()=>setRange(!range.start||range.end?{start:day,end:''}:day<range.start?{start:day,end:range.start}:{start:range.start,end:day})}>{Number(day.slice(-2))}</button>)}</div><p className="muted">{range.start?dateLabel(range.start):'Receive date'} → {range.end?dateLabel(range.end):'Return date'}</p><button className="button primary wide" type="button" disabled={!range.start||!range.end} onClick={()=>onDone(range.start,range.end)}>Use these dates</button></Modal>;
}
export function LoanForm({item,loan,onClose,onDone}:{item:Item;loan?:Loan;onClose:()=>void;onDone:(id:string)=>void}) {
 const {perform,toast}=useApp();const today=todayLocal();const [start,setStart]=useState(loan?.start??addDays(today,1));const [end,setEnd]=useState(loan?.end??addDays(today,3));const [lockerId,setLockerId]=useState(loan?.lockerId??'');const [error,setError]=useState('');const [picker,setPicker]=useState<'dates'|'locker'|null>(null);
 return <Modal title={loan?'Modify exchange plan':'Borrow item'} onClose={onClose}>
  <p className="form-item-name">{item.title??item.name}</p>
  <form onSubmit={event=>{event.preventDefault();const id=loan?.id??uid();const result=perform(loan?{type:'edit-plan',loanId:id,start,end,lockerId}:{type:'request-loan',id,itemId:item.id,start,end,lockerId});if(!result.ok){setError(result.error);return;}toast(loan?'New plan sent for approval.':'Borrow request sent.');onDone(id);}}>
   <div className="two-fields"><label>Receive on<input type="date" required min={today} value={start} onChange={e=>setStart(e.target.value)}/></label><label>Return on<input type="date" required min={start||today} value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
   <button type="button" className="button subtle" onClick={()=>setPicker('dates')}><Glyph name="calendar"/>Choose on calendar</button>
   {start&&end&&end>=start&&<p className="muted">Duration: {duration(start,end)} days</p>}
   <label>Locker location<button type="button" className="select-button" onClick={()=>setPicker('locker')}>{LOCKERS.find(l=>l.id===lockerId)?.label??'Choose a locker'}<Glyph name="chevron" size={16}/></button></label>
   <ErrorText text={error}/><div className="form-actions"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit">{loan?'Propose changes':'Send request'}</button></div>
  </form>
  {picker==='dates'&&<DatePicker start={start} end={end} onClose={()=>setPicker(null)} onDone={(s,e)=>{setStart(s);setEnd(e);setPicker(null);}}/>}
  {picker==='locker'&&<Modal title="Locker location" onClose={()=>setPicker(null)}><p className="muted">Use the same location to collect and return this item.</p><div className="location-list">{LOCKERS.map(locker=><button className={`location-option ${lockerId===locker.id?'chosen':''}`} type="button" key={locker.id} onClick={()=>{setLockerId(locker.id);setPicker(null);}}><strong>{locker.label}</strong><span>{locker.name}</span>{lockerId===locker.id&&<Glyph name="check"/>}</button>)}</div></Modal>}
 </Modal>;
}
