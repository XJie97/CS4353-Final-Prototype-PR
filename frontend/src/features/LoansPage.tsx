import { useState } from 'react';
import { useApp } from '../app/context';
import { dateLabel, loanGroup, LOCKERS, nextProof, proofActor, PROOF_LABELS, type Loan } from '../app/domain';
import { Icon } from '../components/Icon';
import { Glyph } from '../components/ui/shared';

export const statusLabel:Record<Loan['status'],string>={
    requested:'Pending',
    arranging:'Plan approval',
    ready:'Active',
    active:'On loan',
    returning:'Returning',
    verifying:'Verify condition',
    complete:'Complete',
    cancelled:'Cancelled',
    declined:'Declined'
};


export function LoansPage(
    {onOpen,onHandover}:
    {onOpen:(id:string)=>void;onHandover?:(id:string)=>void}) {

    const {store,busy:saving}=useApp();
    const [tab,setTab]=useState<'Pending'|'Active'|'Complete'>('Pending');
    const group=(direction:'borrow'|'share')=>
        store.loans.filter(l=>loanGroup(l)===tab&&(
            direction==='borrow'?l.borrowerId===store.activeUserId:l.ownerId===store.activeUserId));

    return <>
        <div className="section-tabs" role="tablist" aria-label="Loan status">
            {(['Pending','Active','Complete'] as const).map(t=>
                <button disabled={saving} role="tab" type="button" aria-selected={tab===t} key={t} onClick={()=>setTab(t)}>{t}</button>
            )}</div>
            
            <main className="app-scroll loan-list">{(['borrow','share'] as const).map(direction=>
                <section key={direction}>
                    <h2>{direction==='borrow'?'Borrowing':'Sharing'}</h2>
                    {group(direction).length?group(direction).map(loan=>{
                        const item=store.items.find(i=>i.id===loan.itemId)!;
                        const step=nextProof(loan);
                        return (
                            <article className="loan-card" key={loan.id}>
                                <div className="loan-card-heading">
                                    <button disabled={saving} type="button" onClick={()=>onOpen(loan.id)}>
                                        <strong>{item.title??item.name}</strong>
                                    </button>
                                    <span className="status-label">{statusLabel[loan.status]}</span>
                                </div>
                                <div className="loan-card-body">
                                    <div>
                                        <p><Glyph name="calendar" size={18}/>{dateLabel(loan.start)} – {dateLabel(loan.end)}</p>
                                        <p><Icon name="map-pin" width={18}/>{LOCKERS.find(l=>l.id===loan.lockerId)?.name}</p>
                                    </div>
                                    <div>
                                        <p className="muted">{['cancelled','declined'].includes(
                                            loan.status)?`This loan was ${loan.status}.`:
                                            loan.status==='requested'?'Waiting for the owner to accept.':
                                            loan.status==='arranging'?'An exchange plan is awaiting approval.':
                                            loan.status==='complete'?
                                                loan.review?'Reviewed. Thank you for sharing!':
                                                'Return verified. Leave a review.':step==='borrowerPickup'?`${item.title??item.name} has been dropped off at 
                                                ${LOCKERS.find(l=>l.id===loan.lockerId)?.label}.`:step?PROOF_LABELS[step]:statusLabel[loan.status]}
                                        </p>
                                        
                                        {onHandover&&step&&['ready','active','returning'].includes(loan.status)&&proofActor(loan,step)===store.activeUserId?
                                            <button disabled={saving} className="button" type="button" onClick={()=>onHandover(loan.id)}>
                                                <Glyph name="qr"/>Show QR
                                            </button> : 
                                            <button disabled={saving} className="button" type="button" onClick={()=>onOpen(loan.id)}>View details</button>
                                        }
                                    </div>
                                </div>
                            </article>
                        );}) : 
                        
                        <p className="section-empty">
                            {direction==='borrow'?`No ${tab.toLowerCase()} borrowing requests.`:'No items shared currently'}
                        </p>
                    }
                </section>
            )}
        </main>
    </>;
}

