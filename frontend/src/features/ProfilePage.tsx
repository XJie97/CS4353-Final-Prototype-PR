import { useState } from 'react';
import { appVersion } from '../app/version';
import { useApp } from '../app/context';
import { LOCKERS } from '../app/domain';
import { Avatar, ErrorText, Modal } from '../components/ui/shared';
import { PhotoField } from '../components/ui/PhotoField';

export function ProfilePage({onLoans,onShare,onReset}:{onLoans:()=>void;onShare:()=>void;onReset:()=>void}) {

    const {store,perform,toast,signOut,storageWarning,busy:saving}=useApp();
    const me=store.people.find(p=>p.id===store.activeUserId)!;
    const [editing,setEditing]=useState(false);

    const [name,setName]=useState(me.name);
    const [username,setUsername]=useState(me.username);
    const [bio,setBio]=useState(me.bio);
    const [location,setLocation]=useState(me.location);
    const [avatar,setAvatar]=useState(me.avatar??'');
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const completed=store.loans.filter(l=>l.status==='complete'&&(l.ownerId===me.id||l.borrowerId===me.id)).length;
    const items=store.items.filter(i=>i.ownerId===me.id).length;const friends=store.friends.filter(f=>f.status==='accepted'&&(f.to===me.id||f.from===me.id)).length;

    return (
        <main className="app-scroll">
            <section className="profile-hero">
                <Avatar person={me} size={88}/>
                <h2>{me.name}</h2>
                <p>@{me.username} · {me.location}</p><p>{me.bio}</p>
                <button disabled={saving} className="button" type="button" onClick={()=>{
                    setName(me.name);
                    setUsername(me.username);
                    setBio(me.bio);
                    setLocation(me.location);
                    setAvatar(me.avatar??'');
                    setError('');
                    setEditing(true);
                }}>Edit profile</button>

            </section>
            <div className="profile-stats">
                <span><strong>{items}</strong>Shared items</span>
                <span><strong>{completed}</strong>Completed loans</span>
                <span><strong>{friends}</strong>Friends</span>
            </div>
            <div className="profile-links">
                <button disabled={saving} type="button" onClick={onLoans}>Your loans
                    <span>›</span>
                </button>
                <button disabled={saving} type="button" onClick={onShare}>Manage your shelf
                    <span>›</span>
                </button>
            </div>
            <section className="preview-controls">
                <h3>About this preview</h3>
                <p>Version: <code>{appVersion}</code></p>
                <p>This connected demo saves changes to the shared database. Sign in with your assigned account on each device. Locker handovers remain simulated.</p>
                {storageWarning&&<ErrorText text={storageWarning}/>}
                <button disabled={saving} className="button danger" type="button" onClick={()=>void signOut().catch(e=>setError(e.message))}>Sign out</button>
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

                    <PhotoField label="Profile photo (optional)" value={avatar} onChange={setAvatar} onBusyChange={setBusy}/>

                    <ErrorText text={error}/>

                    <div className="form-actions">
                        <button disabled={saving} className="button" type="button" onClick={()=>setEditing(false)}>Cancel</button>
                        <button className="button primary" type="submit" disabled={saving||busy}>Save profile</button>
                    </div>
                </form>
            </Modal>
        }
    </main>
);}
