import { Icon } from './Icon';

export function BottomNavigation() {
  return (
    <nav className="bottom-navigation" aria-label="Main navigation">
      <a className="navigation-tab navigation-tab--active" href="#borrow" aria-current="page" aria-label="Borrow">
        <Icon name="borrow-tab" width={86} height={48.5} />
      </a>
      <button className="navigation-tab" type="button" disabled title="Share is not available yet">
        <Icon name="share" width={31.433} height={23} /><span>Share</span>
      </button>
      <button className="navigation-tab" type="button" disabled title="Loans is not available yet">
        <Icon name="loans" width={23.852} height={23} /><span>Loans</span>
      </button>
      <button className="navigation-tab" type="button" disabled title="Friends is not available yet">
        <Icon name="friends" width={39.277} height={23} /><span>Friends</span>
      </button>
      <button className="navigation-tab" type="button" disabled title="Profile is not available yet">
        <Icon name="user" width={24} /><span>Me</span>
      </button>
    </nav>
  );
}
