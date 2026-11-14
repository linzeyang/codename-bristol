import { NavLink } from 'react-router-dom';
import { CompassIcon, HomeIcon, LibraryIcon, SparklesIcon, UserIcon } from './Icons';

export function MobileNav() {
  const item = ({ isActive }: { isActive: boolean }) => `mobile-nav-item${isActive ? ' is-active' : ''}`;
  return (
    <nav className="mobile-nav" aria-label="移动端导航">
      <NavLink to="/" end className={item}>
        <HomeIcon size={21} />
        <span>发现</span>
      </NavLink>
      <NavLink to="/search" className={item}>
        <CompassIcon size={21} />
        <span>搜索</span>
      </NavLink>
      <NavLink to="/guide" className={item}>
        <SparklesIcon size={21} />
        <span>向导</span>
      </NavLink>
      <NavLink to="/library" className={item}>
        <LibraryIcon size={21} />
        <span>音乐库</span>
      </NavLink>
      <NavLink to="/account" className={item}>
        <UserIcon size={21} />
        <span>账户</span>
      </NavLink>
    </nav>
  );
}