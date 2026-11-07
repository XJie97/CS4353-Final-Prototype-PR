import { Icon } from '../Icon';
import { Avatar } from './shared';
import { useOpenProfile } from '../../features/PersonProfile';
import type { Person } from '../../app/domain';

/** Mention of a person: their sprite avatar, name and an optional friend badge
 */
export function UserChip({ person, name, isFriend = false, size = 28, detail, className }: { person?: Person; name?: string; isFriend?: boolean; size?: number; detail?: string; className?: string }) {
  const openProfile = useOpenProfile();
  const label = person?.name ?? name ?? 'Community member';
  const content = <>
    {person ? <Avatar person={person} size={size} /> : <Icon name="owner" width={size * 0.66} />}
    <span className="user-chip__text">
      <span className="user-chip__name">{label}</span>
      {detail && <span className="user-chip__detail">{detail}</span>}
    </span>
    {isFriend && <span role="img" aria-label="Friend"><Icon name="owner-friend" width={25.615} height={15} /></span>}
  </>;
  const classes = ['user-chip', className].filter(Boolean).join(' ');
  return person && openProfile
    ? <button type="button" className={`${classes} user-chip--button`} aria-label={`${label}${isFriend ? ', friend' : ''}${detail ? `, ${detail}` : ''}. View profile`} onClick={() => openProfile(person.id)}>{content}</button>
    : <span className={classes}>{content}</span>;
}
