import { useState } from 'react';
import { appVersion } from '../app/version';
import { useApp } from '../app/context';
import { LOCKERS } from '../app/domain';
import { ErrorText, Modal, ProfilePhoto } from '../components/ui/shared';
import { PhotoField } from '../components/ui/PhotoField';
import { AvatarCarousel } from '../components/ui/AvatarCarousel';
import { PlantSprite, PlantTopper } from '../components/sprites';
import { spriteFor } from '../app/sprite';
import { ShelfStrip, currentLoan } from './ShelfStrip';
import { ListingForm } from './ListingForm';
import type { Item } from '../app/domain';
import { AvatarEditor } from './AvatarEditor';
import { localPreview } from '../services/backend';

export function ProfileScreen({onLoans,onShare,onLoan,editingAvatar=false,onEditAvatar,onCloseAvatar}:{onLoans:()=>void;onShare:()=>void;onLoan?:(id:string)=>void;editingAvatar?:boolean;onEditAvatar:()=>void;onCloseAvatar:()=>void}) {
 
    const {store,perform,toast,signOut,storageWarning,busy:saving}=useApp();
    const preview=localPreview;
    const me=store.people.find(p=>p.id===store.activeUserId)!;
    const [editing,setEditing]=useState(false);
    const [name,setName]=useState(me.name);
    const [username,setUsername]=useState(me.username);
    const [bio,setBio]=useState(me.bio);
    const [location,setLocation]=useState(me.location);
    const [avatar,setAvatar]=useState(me.avatar??'');
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
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

    const openShelfItem=(id:string)=>{const item=myItems.find(i=>i.id===id);if(!item)return;const loan=currentLoan(item,store.loans);if(loan&&onLoan)onLoan(loan.id);else setEditingItem(item);};

    if(editingAvatar)return <AvatarEditor onBack={onCloseAvatar}/>;

    return (
        <main className="app-scroll">
            <section className="profile-hero">
                <div className="profile-hero__sprite">
                    <AvatarCarousel label={`${me.name}'s avatar and profile photo`} slideLabels={['Show avatar','Show profile photo']} slides={[
                        <PlantSprite key="sprite" bodyColor={sprite.bodyColor} topper={sprite.topper} face={sprite.face} animation="squish" label={`${me.name}'s avatar`}/>,
                        ...(me.avatar?[<ProfilePhoto key="photo" src={me.avatar} bodyColor={sprite.bodyColor} size={104} label={`${me.name}'s profile photo`}/>]:[]),
                    ]}/>
                </div>
                <div className="profile-hero__main">
                    <div className="profile-hero__details">
                        <h2>{me.name}</h2>
                        <p className="profile-hero__meta">@{me.username} · {me.location}</p>
                        {me.bio&&<p className="profile-hero__bio">{me.bio}</p>}
                    </div>
                    <div className="profile-hero__actions">
                        <button disabled={saving} className="button" type="button" onClick={onEditAvatar}>Edit avatar</button>
                        <button disabled={saving} className="button" type="button" onClick={openEditor}>Edit profile</button>
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
                <p>{preview?.about??'This connected demo saves changes to the shared database. Sign in with your assigned account on each device. Locker handovers remain simulated.'}</p>
                {storageWarning&&<ErrorText text={storageWarning}/>}
                <button disabled={saving} className="button" type="button" onClick={()=>void signOut().catch(e=>setError(e.message))}>Sign out</button>
            </section>
            
            {editing&&<Modal title="Edit your profile" onClose={()=>setEditing(false)}>
                <form onSubmit={async e=>{
                    e.preventDefault();
                    const result=await perform({type:'update-profile',name,username,location,bio,...(avatar?{avatar}:{})});
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

                    <PhotoField label="Profile photo (optional)" value={avatar} onChange={setAvatar} onBusyChange={setBusy} rim={sprite.bodyColor}/>
                    
                    <ErrorText text={error}/>
                    
                    <div className="form-actions">
                        <button disabled={saving} className="button" type="button" onClick={()=>setEditing(false)}>Cancel</button>
                        <button className="button primary" type="submit" disabled={saving||busy}>Save profile</button>
                    </div>
                </form>
            </Modal>
        }
        {editingItem&&<ListingForm key={editingItem.id} item={editingItem} onClose={()=>setEditingItem(null)}/>}
    </main>
);}

