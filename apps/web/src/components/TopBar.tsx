import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import {
  CommandIcon,
  Logo,
  LogoutIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  ShieldIcon,
  SunIcon,
  UserIcon,
} from './Icons';

export function TopBar({
  onOpenCommand,
  onToggleSidebar,
}: {
  onOpenCommand: () => void;
  onToggleSidebar: () => void;
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings, resolvedTheme, update } = useSettings();
  const { show } = useToast();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}&record=1` : '/search');
  };

  const toggleTheme = () => {
    void update({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' });
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    show('已退出登录', 'success');
    navigate('/');
  };

  return (
    <header className="topbar">
      <button type="button" className="icon-btn sidebar-toggle" onClick={onToggleSidebar} aria-label="打开导航菜单">
        <MenuIcon />
      </button>

      <Link to="/" className="topbar-brand" aria-label="声屿首页">
        <Logo size={26} />
        <span>声屿</span>
      </Link>

      <form className="global-search" role="search" onSubmit={submitSearch}>
        <SearchIcon size={18} />
        <input
          id="global-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索歌曲、音乐人、专辑或播客…"
          aria-label="全局搜索"
          autoComplete="off"
        />
        <kbd aria-hidden="true">/</kbd>
      </form>

      <div className="topbar-actions">
        <button type="button" className="command-trigger" onClick={onOpenCommand} aria-label="打开命令面板">
          <CommandIcon size={17} />
          <span>命令</span>
          <kbd>⌘K</kbd>
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
          title={resolvedTheme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
        >
          {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        {user ? (
          <div className="user-menu" ref={menuRef}>
            <button
              type="button"
              className="avatar-btn"
              onClick={() => setMenuOpen((previous) => !previous)}
              aria-label={`账户菜单：${user.displayName}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              style={{ ['--avatar-hue' as string]: user.avatarHue }}
            >
              {user.displayName.slice(0, 1)}
            </button>
            {menuOpen ? (
              <div className="popover-menu user-popover" role="menu">
                <div className="user-popover-head">
                  <strong>{user.displayName}</strong>
                  <span>{user.email}</span>
                </div>
                <hr />
                <Link role="menuitem" className="menu-item" to="/account" onClick={() => setMenuOpen(false)}>
                  <UserIcon size={17} />
                  <span>账户与设置</span>
                </Link>
                <Link role="menuitem" className="menu-item" to="/plans" onClick={() => setMenuOpen(false)}>
                  <ShieldIcon size={17} />
                  <span>订阅方案</span>
                </Link>
                {user.role === 'admin' ? (
                  <Link role="menuitem" className="menu-item" to="/admin" onClick={() => setMenuOpen(false)}>
                    <CommandIcon size={17} />
                    <span>内容管理</span>
                  </Link>
                ) : null}
                <hr />
                <button type="button" role="menuitem" className="menu-item" onClick={() => void handleLogout()}>
                  <LogoutIcon size={17} />
                  <span>退出登录</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="auth-actions">
            <Link to="/login" className="btn btn-ghost btn-sm">
              登录
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              注册
            </Link>
          </div>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {settings.privateSession ? '隐私模式已开启' : ''}
      </span>
    </header>
  );
}