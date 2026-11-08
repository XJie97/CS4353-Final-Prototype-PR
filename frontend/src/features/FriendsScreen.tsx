import { useState, type ReactNode } from 'react';
import { faCircleNodes, faEllipsisVertical, faUser, faUserClock, faUserMinus, faUserPlus } from '../components/ui/icons';
import { useApp, uid } from '../app/context';
import { Avatar, Confirm, EmptyState, ErrorText, Modal } from '../components/ui/shared';
import { FaIcon } from '../components/ui/CategoryIcon';
import { useOpenProfile } from './PersonProfile';
import { FriendshipIsland } from './FriendshipIsland';
import { FriendNetwork } from './FriendNetwork';
import { LoanPills } from './LoanPills';

export type FriendsView = 'requests' | 'find' | 'network';

export function FriendsScreen({ view, onView, onChat, onItem, onLoan, onHelp, active = true }: {
  view?: string; onView: (view?: FriendsView) => void; onChat: (id: string) => void;
  onItem?: (id: string) => void; onLoan?: (id: string) => void; onHelp?: () => void; active?: boolean;
}) {
  const { store, perform, toast, busy: saving } = useApp();
  const openProfile = useOpenProfile();
  const [query, setQuery] = useState('');
  const [menuFor, setMenuFor] = useState<{ personId: string; friendshipId: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const me = store.activeUserId;
  const friendRecords = store.friends.filter(f => f.status === 'accepted' && (f.from === me || f.to === me));
  const friends = friendRecords.map(f => store.people.find(p => p.id === (f.from === me ? f.to : f.from))!).filter(Boolean);
  const incoming = store.friends.filter(f => f.to === me && f.status === 'pending');
  const outgoing = store.friends.filter(f => f.from === me && f.status === 'pending');

  const act = async (command: Parameters<typeof perform>[0], message: string) => {
    const result = await perform(command);
    if (result.ok) { setError(''); toast(message); } else setError(result.error);
    return result.ok;
  };

  const together = (id: string) => <LoanPills store={store} me={me} other={id} onLoan={onLoan} />;

  const personRow = (id: string, actions: ReactNode, options?: { friendshipId?: string; extra?: ReactNode }) => {
    const p = store.people.find(person => person.id === id);
    if (!p) return null;
    return <article className="friend-row" key={id}>
      <button type="button" className="friend-row__avatar" aria-label={`View ${p.name}'s profile`} onClick={() => openProfile?.(id)}>
        <Avatar person={p} size={56} />
      </button>
      <div className="friend-row__body">
        <button type="button" className="friend-row__person" onClick={() => openProfile?.(id)}>
          <strong>{p.name}</strong>
          <small>@{p.username} · {p.location}</small>
        </button>
        {options?.extra}
        <div className="friend-row__actions">{actions}</div>
      </div>
      {options?.friendshipId && <button type="button" className="friend-row__menu" aria-label={`More options for ${p.name}`} aria-haspopup="dialog"
        onClick={() => setMenuFor({ personId: id, friendshipId: options.friendshipId! })}>
        <FaIcon icon={faEllipsisVertical} size={18} />
      </button>}
    </article>;
  };

  const prefix = query.trim().toLowerCase();
  const suggestions = store.people.filter(p => p.id !== me
    && !store.friends.some(f => (f.from === me && f.to === p.id) || (f.to === me && f.from === p.id))
    && (p.name.toLowerCase().startsWith(prefix) || p.username.toLowerCase().startsWith(prefix)));
  const menuPerson = menuFor && store.people.find(p => p.id === menuFor.personId);

  let content: ReactNode;
  if (view === 'network') {
    content = <FriendNetwork />;
  } else if (view === 'requests') {
    content = <>
      <section>
        <h2>Received</h2>
        {incoming.length ? incoming.map(f => personRow(f.from, <>
          <button disabled={saving} className="button" type="button" onClick={() => act({ type: 'decline-friend', id: f.id }, 'Friend request declined.')}>Decline</button>
          <button disabled={saving} className="button primary" type="button" onClick={() => act({ type: 'accept-friend', id: f.id }, 'Friend request accepted.')}>Accept</button>
        </>)) : <p className="muted">No new friend requests.</p>}
      </section>
      <section>
        <h2>Sent</h2>
        {outgoing.length ? outgoing.map(f => personRow(f.to,
          <button disabled={saving} className="button" type="button" onClick={() => act({ type: 'decline-friend', id: f.id }, 'Friend request cancelled.')}>Cancel request</button>))
          : <p className="muted">You haven't sent any requests that are still waiting.</p>}
      </section>
    </>;
  } else if (view === 'find') {
    content = <section>
      <label className="people-search">Name or username
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Start typing a name…" />
      </label>
      {suggestions.map(p => personRow(p.id,
        <button disabled={saving} className="button primary" type="button" onClick={() => act({ type: 'request-friend', id: uid(), to: p.id }, 'Friend request sent.')}>Add friend</button>))}
      {!suggestions.length && <p className="muted">No other matching people. Friends and pending requests aren't listed here.</p>}
    </section>;
  } else {
    content = <section>
      <nav className="friends-tools" aria-label="Friends tools">
        <button type="button" className="friends-tool" onClick={() => onView('network')}>
          <FaIcon icon={faCircleNodes} size={15} /><span>Network</span>
        </button>
        <button type="button" className="friends-tool badge-button" onClick={() => onView('requests')}
          aria-label={`Friend requests${incoming.length ? `, ${incoming.length} new` : ''}`}>
          <FaIcon icon={faUserClock} size={15} /><span>Requests</span>
          {incoming.length > 0 && <span className="badge">{incoming.length > 9 ? '9+' : incoming.length}</span>}
        </button>
        <button type="button" className="friends-tool" onClick={() => onView('find')}>
          <FaIcon icon={faUserPlus} size={15} /><span>Find people</span>
        </button>
      </nav>
      <h2 className="friends-heading">Your friends{friends.length ? <span className="friends-heading__count"> ({friends.length})</span> : null}</h2>
      {friendRecords.length
        ? friendRecords.map(f => {
          const id = f.from === me ? f.to : f.from;
          return personRow(id, <button className="button" type="button" onClick={() => onChat(id)}>Message</button>, { friendshipId: f.id, extra: together(id) });
        })
        : <EmptyState title="Meet your neighbours" text="Add a friend to find the things they share more easily.">
          <button className="button primary" type="button" onClick={() => onView('find')}>Find people</button>
        </EmptyState>}
    </section>;
  }

  return <>
    <main className={`app-scroll friends-scroll${view ? '' : ' friends-scroll--island'}`}>
      <ErrorText text={error} />
      {content}
    </main>
    {!view && <FriendshipIsland friends={friends} onItem={onItem} onHelp={onHelp} />}

    {active && menuFor && menuPerson && <Modal title={menuPerson.name} className="bottom-sheet action-sheet" onClose={() => setMenuFor(null)}>
      <ul className="action-sheet__list">
        <li><button type="button" className="action-sheet__option" onClick={() => { setMenuFor(null); openProfile?.(menuPerson.id); }}>
          <FaIcon icon={faUser} size={18} />View profile</button></li>
        <li><button type="button" className="action-sheet__option action-sheet__option--danger" onClick={() => { setRemoving(menuFor.friendshipId); setMenuFor(null); }}>
          <FaIcon icon={faUserMinus} size={18} />Remove friend</button></li>
      </ul>
    </Modal>}

    {active && removing &&
      <Confirm title="Remove this friend?" text="You can add them again later. Your existing loans and conversations will stay available."
        onClose={() => setRemoving(null)} onConfirm={async () => { if (await act({ type: 'remove-friend', id: removing }, 'Friend removed.')) setRemoving(null); }} />}
  </>;
}
