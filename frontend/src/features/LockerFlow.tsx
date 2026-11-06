import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/context';
import { handoverCode, LOCKERS, nextProof, proofActor, PROOF_LABELS } from '../app/domain';
import { ErrorText, Glyph, Modal } from '../components/ui/shared';
import { PhotoField } from '../components/ui/PhotoField';
import { QrCode } from '../components/ui/QrCode';

function Scanner({onCode,onClose}:{onCode:(code:string)=>void;onClose:()=>void}) {
    const {busy:saving}=useApp();const video=useRef<HTMLVideoElement>(null);const [error,setError]=useState('');

    useEffect(
        ()=>{let stream:MediaStream|undefined;let live=true;let timer:ReturnType<typeof setTimeout>;
        const Constructor=(window as unknown as {
            BarcodeDetector?:new(options:{formats:string[]})=>{
                detect:(video:HTMLVideoElement)=>Promise<{rawValue:string}[]>}}).BarcodeDetector;
        
        async function start(){
            try {
                if (!Constructor)
                    throw new Error('QR scanning is not supported by this browser. Enter the code instead.');
                stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
                
                if (!live){
                    stream.getTracks().forEach(track=>track.stop()); return;
                }
                if (!video.current) return;
                
                video.current.srcObject=stream;
                await video.current.play();
                const detector=new Constructor({formats:['qr_code']});

                async function scan(){
                    if (!live||!video.current) return;
                    try { 
                        const codes=await detector.detect(video.current);
                        if (codes[0]) {
                            onCode(codes[0].rawValue);return;
                        }
                    }
                    catch{}
                    if (live)
                        timer=setTimeout(scan,250);
                }
                    
                void scan();
            }
            catch(error) {
                stream?.getTracks().forEach(track=>track.stop());
                if(live)setError(error instanceof Error&&error.message.startsWith('QR scanning')?
                error.message:'Camera unavailable. Allow camera access or enter the code instead.');
            }
        }

        void start();
        return()=>{
            live=false;
            clearTimeout(timer);
            stream?.getTracks().forEach(track=>track.stop());
        };
        },[]
    );

    return (
        <div className="scanner">
            <video ref={video} playsInline muted/>
            <ErrorText text={error}/>
            <button disabled={saving} type="button" className="button" onClick={onClose}>Close camera</button>
        </div>
    );
}

export function LockerFlow({loanId,onClose,onDone}:{loanId:string;onClose:()=>void;onDone:()=>void}) {
    const {store,perform,busy:saving}=useApp();
    const loan=store.loans.find(l=>l.id===loanId);
    const [step]=useState(()=>loan?nextProof(loan):undefined);
    const [phase,setPhase]=useState<'code'|'locker'|'photo'|'success'>('code');
    const [code,setCode]=useState('');
    const [photo,setPhoto]=useState('');
    const [photoBusy,setPhotoBusy]=useState(false);
    const [error,setError]=useState('');
    const [scanning,setScanning]=useState(false);
    const pickup=step==='borrowerPickup'||step==='ownerPickup';
    const previous=loan&&(step==='borrowerPickup'?loan.proofs.ownerDropoff:step==='ownerPickup'?loan.proofs.borrowerDropoff:undefined);
    const [lockerNumber,setLockerNumber]=useState(previous?.lockerNumber??LOCKERS.find(l=>l.id===loan?.lockerId)?.number??'12');
 
    if (!loan||
        !step||
        (!['ready','active','returning'].includes(loan.status)&&phase!=='success')||
        (proofActor(loan,step)!==store.activeUserId&&phase!=='success')
    ) {
        return <Modal title="Handover unavailable" onClose={onClose}>
            <p>Only the next participant can complete this handover. Open loan details for the current status.</p>
        </Modal>;
    }

    const expected=handoverCode(loan,step),item=store.items.find(i=>i.id===loan.itemId)!;
    return (
        <Modal title={phase==='success'?'Verified successfully':PROOF_LABELS[step]} onClose={onClose} className="locker-modal">
        <p className="preview-note">Locker preview: no physical locker is connected.</p>
 
        {phase==='code'&&<>
            <p className="form-item-name">{item.title??item.name}</p>
            <QrCode value={expected}/>
            <p className="handover-token">{expected}</p>
            <div className="button-row">
                <button disabled={saving} className="button" type="button" onClick={()=>setScanning(true)}>
                    <Glyph name="camera"/>Scan QR
                </button>
                <button disabled={saving} className="button" type="button" onClick={()=>setCode(expected)}>Use preview code</button>
            </div>
            
            {scanning&&
                <Scanner onClose={()=>setScanning(false)} onCode={value=>{setCode(value);setScanning(false);}}/>}
                <form onSubmit={async e=>{
                    e.preventDefault();
                    if(code.trim()!==expected){
                        setError('This code does not match this loan and handover step.');
                        return;
                    }
                    setError('');
                    setPhase('locker');}}>
                        <label>Handover code
                            <input value={code} onChange={e=>setCode(e.target.value)} autoComplete="off" required/>
                        </label>
                        <ErrorText text={error}/>
                        <button disabled={saving} className="button primary wide" type="submit">Verify code</button>
                </form>
            </>}

            {phase==='locker'&&<>
                <p className="locker-location">{LOCKERS.find(l=>l.id===loan.lockerId)?.label}</p>
                <div className="locker-number">Locker 
                    <strong>{lockerNumber.padStart(2,'0')}</strong>
                </div>
                <p>{pickup?'Collect the item from the locker shown above.'
                    :'Place the item in a locker, then record its number and condition.'}
                </p>
                <form onSubmit={async e=>{
                    e.preventDefault();
                    if(!/^\d{1,2}$/.test(lockerNumber)||Number(lockerNumber)<1){
                        setError('Enter a locker number from 1 to 99.');
                        return;
                    }
                    setError('');
                    setPhase('photo');
                }}>
                    <label>Locker number
                        <input type="text" inputMode="numeric" pattern="[0-9]{1,2}" maxLength={2} 
                        value={lockerNumber} readOnly={pickup} required onChange={e=>setLockerNumber(e.target.value)}/>
                    </label><ErrorText text={error}/>
                    <button disabled={saving} className="button primary wide" type="submit">Continue to item photo</button>
                </form>
            </>}

        {phase==='photo'&&<>
            <p>Record the item condition {pickup?'when collecting it':'before closing the locker'}.</p>
            <PhotoField label="Item condition photo" value={photo} onChange={setPhoto} 
            onBusyChange={setPhotoBusy} required/>
            <ErrorText text={error}/>
            <div className="form-actions">
                <button disabled={saving} className="button" type="button" onClick={()=>setPhase('locker')}>Back</button>
                <button className="button primary" type="button" disabled={saving||!photo||photoBusy} 
                    onClick={async()=>{
                        const result=await perform({type:'record-proof',loanId,step,photo,code,lockerNumber});
                        if (!result.ok) setError(result.error);
                        else setPhase('success');
                }}>Confirm {pickup?'pickup':'drop-off'}</button>
            </div>
        </>}

        {phase==='success'&&
            <div className="verification-success">
                <span className="success-icon">
                    <Glyph name="check" size={56}/>
                </span>
                <h3>{pickup?'Pickup verified':'Drop-off verified'}</h3>
                <p>{item.title??item.name} · Locker {lockerNumber.padStart(2,'0')}</p>
                <p className="muted">The loan has been updated and the other participant notified.</p>
                <button disabled={saving} className="button primary wide" type="button" onClick={onDone}>Back to loan</button>
            </div>}
            
        </Modal>
    );
}
