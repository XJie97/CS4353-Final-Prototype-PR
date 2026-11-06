import { useState } from 'react';
import { useApp, uid } from '../app/context';
import { addDays, duration, LOCKERS, todayLocal, type Item, type Loan } from '../app/domain';
import { ErrorText, Glyph, Modal } from '../components/ui/shared';
import { DatePicker } from './DatePicker';


export function LoanForm( 
    {item,loan,onClose,onDone} : 
    {item:Item;loan?:Loan;onClose:()=>void;onDone:(id:string)=>void}) {

    const {perform,toast,busy:saving}=useApp();
    const [newId]=useState(uid);
    const today=todayLocal();
    const [start,setStart]=useState(loan?.start??addDays(today,1));
    const [end,setEnd]=useState(loan?.end??addDays(today,3));
    const [lockerId,setLockerId]=useState(loan?.lockerId??'');
    const [error,setError]=useState('');
    const [picker,setPicker]=useState<'dates'|'locker'|null>(null);
        
    return (
        <Modal title={loan?'Modify exchange plan':'Borrow item'} onClose={onClose}>
            <p className="form-item-name">{item.title??item.name}</p>
            <form onSubmit={async event=>{
                event.preventDefault();
                const id=loan?.id??newId;
                const result=await perform(loan ?
                    {type:'edit-plan',loanId:id,start,end,lockerId} : 
                    {type:'request-loan',id,itemId:item.id,start,end,lockerId}
                );
                    
                if (!result.ok) { 
                    setError(result.error);
                    return;
                }
                toast(loan?'New plan sent for approval.':'Borrow request sent.');
                onDone(id);
            }}>

                <div className="two-fields">
                    <label>Receive on
                        <input type="date" required min={today} value={start} onChange={e=>setStart(e.target.value)}/>
                    </label>
                    <label>Return on
                        <input type="date" required min={start||today} value={end} onChange={e=>setEnd(e.target.value)}/>
                    </label>
                </div>
    
                <button disabled={saving} type="button" className="button subtle" onClick={()=>setPicker('dates')}>
                    <Glyph name="calendar"/>Choose on calendar
                </button>

                {start&&end&&end>=start&&
                    <p className="muted">Duration: {duration(start,end)} days</p>
                }

                <label>Locker location
                    <button disabled={saving} type="button" className="select-button" onClick={()=>setPicker('locker')}>
                        {LOCKERS.find(l=>l.id===lockerId)?.label??'Choose a locker'}
                        <Glyph name="chevron" size={16}/>
                    </button>
                </label>
                
                <ErrorText text={error}/>
                <div className="form-actions">
                    <button disabled={saving} className="button" type="button" onClick={onClose}>Cancel</button>
                    <button disabled={saving} className="button primary" type="submit">{loan?'Propose changes':'Send request'}</button>
                </div>
            </form>

            {picker==='dates'&&
                <DatePicker start={start} end={end} onClose={()=>setPicker(null)} onDone={(s,e)=>{setStart(s);setEnd(e);setPicker(null);}}/>}
            
            {picker==='locker'&&
                <Modal title="Locker location" onClose={()=>setPicker(null)}>
                    <p className="muted">Use the same location to collect and return this item.</p>
                    <div className="location-list">{LOCKERS.map(locker=>
                        <button disabled={saving} className={`location-option ${lockerId===locker.id?'chosen':''}`} type="button" key={locker.id} onClick={()=>{setLockerId(locker.id);setPicker(null);}}>
                            <strong>{locker.label}</strong>
                            <span>{locker.name}</span>
                            {lockerId===locker.id&&<Glyph name="check"/>}</button>)}
                    </div>
                </Modal>}
        </Modal>
    );
}
