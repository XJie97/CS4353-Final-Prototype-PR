import { useState } from 'react';
import { useApp } from '../app/context';
import { dateLabel, todayLocal } from '../app/domain';
import { calendarDays } from '../app/calendar';
import { Modal } from '../components/ui/shared';

export function DatePicker(
    {start,end,onDone,onClose} :
    {start:string; end:string; onDone:(start:string,end:string)=>void; onClose:()=>void}) {

    const {busy:saving}=useApp();
    const today=todayLocal();
    const [month,setMonth]=useState((start||today).slice(0,7));
    const [range,setRange]=useState({start,end});
    const changeMonth=(offset:number)=>{
        const date=new Date(month+'-01T12:00:00Z');
        date.setUTCMonth(date.getUTCMonth()+offset)
        setMonth(date.toISOString().slice(0,7));
    };

    return (
        <Modal title="Choose loan dates" onClose={onClose}>
            <p className="muted">Choose a receive date, then a return date.</p>
            <div className="calendar-title">
                <button disabled={saving} type="button" className="button" aria-label="Previous month" onClick={()=>changeMonth(-1)}>‹</button>
                <strong>{new Intl.DateTimeFormat('en-SG',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01'))}</strong>
                <button disabled={saving} type="button" className="button" aria-label="Next month" onClick={()=>changeMonth(1)}>›</button>
            </div>

            <div className="calendar-grid">
                {['Mo','Tu','We','Th','Fr','Sa','Su'].map(day=><span key={day}>{day}</span>)}
                {calendarDays(month).map(day=>
                    <button
                        type="button"
                        key={day}
                        disabled={saving||day<today}
                        className={
                                `${day.slice(0,7)!==month?'outside ':''}
                                ${day===range.start||day===range.end?'selected ':''}
                                ${day>range.start&&day<range.end?'in-range':''}
                                `}
                        aria-label={dateLabel(day)}
                        aria-pressed={day===range.start||day===range.end}
                        onClick={()=>
                            setRange(!range.start||range.end?{start:day,end:''} :
                                    day<range.start?{start:day,end:range.start} :
                                    {start:range.start,end:day})}
                    >
                        {Number(day.slice(-2))}
                    </button>
                )}
            </div>
            <p className="muted">
                {range.start?dateLabel(range.start):'Receive date'} →
                {range.end?dateLabel(range.end):'Return date'}
            </p>
            <button
                className="button primary wide"
                type="button"
                disabled={saving||!range.start||!range.end}
                onClick={()=>onDone(range.start,range.end)}
            >
                    Use these dates
            </button>
    </Modal>
);}
