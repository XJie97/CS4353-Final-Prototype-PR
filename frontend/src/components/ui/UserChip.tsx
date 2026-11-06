import { Icon } from '../Icon';
import { Avatar } from './shared';
import type { Person } from '../../app/domain';

// Reusable "who" row: avatar, name and an optional friend badge.
// Falls back to a plain name when the person record isn't available.
export function UserChip({ person, name, isFriend = false, size = 28 }: { person?: Person; name?: string; isFriend?: boolean; size?: number }) {
  const label = person?.name ?? name ?? 'Community member';
  return <span className="user-chip">
    {person ? <Avatar person={person} size={size} /> : <Icon name="owner" width={size * 0.66} />}
    <span className="user-chip__name">{label}</span>
    {isFriend && <span role="img" aria-label="Friend"><Icon name="owner-friend" width={25.615} height={15} /></span>}
  </span>;
}
