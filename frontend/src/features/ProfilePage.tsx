import { useState } from 'react';
import { appVersion } from '../app/version';
import { useApp } from '../app/context';
import { LOCKERS } from '../app/domain';
import { Confirm, ErrorText, Modal } from '../components/ui/shared';
import { PhotoField } from '../components/ui/PhotoField';
import { PlantSprite, PlantTopper } from '../components/sprites';
import { spriteFor } from '../app/sprite';
import { ShelfStrip, currentLoan } from './ShelfStrip';
import { ListingForm } from './ListingForm';
import type { Item } from '../app/domain';
import { AvatarEditor } from './AvatarEditor';

export function ProfilePage({onLoans,onShare,onReset,onLoan}:{onLoans:()=>void;onShare:()=>void;onReset:()=>void;onLoan?:(id:string)=>void}) {
 
    const {store,perform,toast,resetPreview,storageWarning}=useApp();
    const me=store.people.find(p=>p.id===store.activeUserId)!;
    const [editing,setEditing]=useState(false);
    const [reset,setReset]=useState(false);
    const [name,setName]=useState(me.name);
    const [username,setUsername]=useState(me.username);
    const [bio,setBio]=useState(me.bio);
    const [location,setLocation]=useState(me.location);
    const [avatar,setAvatar]=useState(me.avatar??'');
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const [editingAvatar,setEditingAvatar]=useState(false);
    const [editingItem,setEditingItem]=useState<Item|null>(null);
    const sprite=spriteFor(store,me.id);
    const completed=sprite.completed;
    const myItems=store.items.filter(i=>i.ownerId===me.id);
    const items=myItems.length;const friends=store.friends.filter(f=>f.status==='accepted'&&(f.to===me.id||f.from===me.id)).length;
    const openEditor=()=>{
        setName(me.name);
        setUsername(me.username);
        setBio(me.bio);
        setLocation(me.location);
        setAvatar(me.avatar??'');
        setError('');
        setEditing(true);
    };

    // A shelf thumbnail opens the item's current loan if it's out, otherwise its edit form.
    const openShelfItem=(id:string)=>{const item=myItems.find(i=>i.id===id);if(!item)return;const loan=currentLoan(item,store.loans);if(loan&&onLoan)onLoan(loan.id);else setEditingItem(item);};

    if(editingAvatar)return <AvatarEditor onBack={()=>setEditingAvatar(false)}/>;

    return (
        <main className="app-scroll">
            <section className="profile-hero">
                <div className="profile-hero__sprite">
                    <PlantSprite bodyColor={sprite.bodyColor} topper={sprite.topper} face={sprite.face} animation="squish" label={`${me.name}'s avatar`}/>
                </div>
                <div className="profile-hero__main">
                    <div className="profile-hero__details">
                        <h2>{me.name}</h2>
                        <p className="profile-hero__meta">@{me.username} · {me.location}</p>
                        {me.bio&&<p className="profile-hero__bio">{me.bio}</p>}
                    </div>
                    <div className="profile-hero__actions">
                        <button className="button" type="button" onClick={()=>setEditingAvatar(true)}>Edit avatar</button>
                        <button className="button" type="button" onClick={openEditor}>Edit profile</button>
                    </div>
                </div>
            </section>
            <section className="profile-growth" aria-label="Your stats">
                <div className="profile-growth__plant">
                    <PlantTopper bodyColor={sprite.bodyColor} topper={sprite.topper==='flower'?'flower':'sprout'} size={72}/>
                    <span>{sprite.topper==='flower'?'In bloom':sprite.toBloom===1?'1 more loan to bloom':`${sprite.toBloom} more loans to bloom`}</span>
                </div>
                <div className="profile-stats">
                    <span><strong>{items}</strong>Shared items</span>
                    <span><strong>{completed}</strong>Completed loans</span>
                    <span><strong>{friends}</strong>Friends</span>
                </div>
            </section>
            <div className="profile-links">
                <button type="button" onClick={onLoans}>Your loans 
                    <span>›</span>
                </button>
                <div className="profile-shelf">
                    <button type="button" onClick={onShare}>Your shelf 
                        <span>›</span>
                    </button>
                    <ShelfStrip items={myItems} loans={store.loans} onOpen={openShelfItem}/>
                </div>
            </div>
            <section className="preview-controls">
                <h3>About this preview</h3>
                <p>Version: <code>{appVersion}</code></p>
                <p>This prototype saves changes on this browser. Use the account selector below to try borrower and lender actions. Messages and locker handovers stay in the preview.</p>
                {storageWarning&&<ErrorText text={storageWarning}/>}
                <button className="button danger" type="button" onClick={()=>setReset(true)}>Reset preview data</button>
            </section>
            
            {editing&&<Modal title="Edit your profile" onClose={()=>setEditing(false)}>
                <form onSubmit={e=>{
                    e.preventDefault();
                    const result=perform({type:'update-profile',name,username,location,bio,...(avatar?{avatar}:{})});
                    if(!result.ok) { 
                        setError(result.error);
                        return;
                    }
                    toast('Profile updated.');setEditing(false);
                }}>
                    
                    <label>Display name
                        <input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required/>
                    </label>
                    <label>Username
                        <input value={username} onChange={e=>setUsername(e.target.value)} maxLength={24} minLength={3} required pattern="[A-Za-z0-9_]{3,24}"/>
                    </label>
                    <label>Community
                        <select value={location} onChange={e=>setLocation(e.target.value)}>
                            {LOCKERS.map(l=><option key={l.id}>{l.name}</option>)}
                        </select>
                    </label>
                    <label>About you
                        <textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={500}/>
                    </label>

                    <PhotoField label="Profile photo (optional)" value={avatar} onChange={setAvatar} onBusyChange={setBusy}/>
                    
                    <ErrorText text={error}/>
                    
                    <div className="form-actions">
                        <button className="button" type="button" onClick={()=>setEditing(false)}>Cancel</button>
                        <button className="button primary" type="submit" disabled={busy}>Save profile</button>
                    </div>
                </form>
            </Modal>
        }
        {editingItem&&<ListingForm key={editingItem.id} item={editingItem} onClose={()=>setEditingItem(null)}/>}
        {reset&&<Confirm 
            title="Reset this preview?" 
            text="This removes the messages, photos, listings, reviews and loan changes saved in this preview and restores the sample accounts. This cannot be undone." 
            onClose={()=>setReset(false)} 
            onConfirm={()=>{resetPreview();setReset(false);onReset();
        }}/>}
    </main>
);}
