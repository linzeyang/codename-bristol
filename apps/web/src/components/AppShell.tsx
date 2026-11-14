import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PlaylistPickerProvider } from '../context/PlaylistPickerContext';
import { usePlayer } from '../context/PlayerContext';
import { CommandPalette } from './CommandPalette';
import { MobileNav } from './MobileNav';
import { NowPlaying } from './NowPlaying';
import { PlayerBar } from './PlayerBar';
import { ShortcutSheet } from './ShortcutSheet';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const player = usePlayer();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const playerRef = useRef(player);
  playerRef.current = player;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tag = element.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const typing = isTyping(event.target);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((previous) => !previous);
        return;
      }
      if (event.key === 'Escape') {
        setCommandOpen(false);
        setShortcutsOpen(false);
        setSidebarOpen(false);
        return;
      }
      if (typing) return;

      const current = playerRef.current;
      const interactive = (event.target as HTMLElement | null)?.closest('button, a, [role="button"]');

      if (event.key === ' ' && !interactive) {
        if (current.current) {
          event.preventDefault();
          current.toggle();
        }
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        if (!current.current) return;
        event.preventDefault();
        if (event.shiftKey) {
          if (event.key === 'ArrowRight') current.next();
          else current.previous();
        } else {
          const delta = event.key === 'ArrowRight' ? 5 : -5;
          current.seek(current.position + delta);
        }
        return;
      }
      if (event.key.toLowerCase() === 'l') {
        event.preventDefault();
        void current.toggleLikeCurrent();
        return;
      }
      if (event.key.toLowerCase() === 'q') {
        event.preventDefault();
        if (current.current) current.openNowPlaying('queue');
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        navigate('/search');
        window.setTimeout(() => document.getElementById('global-search')?.focus(), 60);
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  return (
    <PlaylistPickerProvider>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <div className="app-shell">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="app-main">
          <TopBar onOpenCommand={() => setCommandOpen(true)} onToggleSidebar={() => setSidebarOpen(true)} />
          <main id="main-content" className="main-content" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {player.current ? `${player.isPlaying ? '正在播放' : '已暂停'}：${player.current.title}，${player.current.subtitle}` : ''}
      </div>

      <PlayerBar />
      <MobileNav />
      <NowPlaying />
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onOpenShortcuts={() => {
          setCommandOpen(false);
          setShortcutsOpen(true);
        }}
      />
      <ShortcutSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </PlaylistPickerProvider>
  );
}