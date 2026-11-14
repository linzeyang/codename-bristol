import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import type { Settings } from '../api/types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const GUEST_KEY = 'sy:settings';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  audioQuality: 'standard',
  normalizeVolume: true,
  showNowPlaying: true,
  privateSession: false,
  autoplaySimilar: true,
  reduceMotion: false,
  notifyNewRelease: true,
  notifyEmail: false,
};

function readGuestSettings(): Settings {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function systemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

interface SettingsContextValue {
  settings: Settings;
  resolvedTheme: 'light' | 'dark';
  update: (patch: Partial<Settings>) => Promise<void>;
  syncing: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { show } = useToast();
  const [settings, setSettings] = useState<Settings>(readGuestSettings);
  const [systemPrefersDark, setSystemPrefersDark] = useState(systemDark);
  const [syncing, setSyncing] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (!user) {
      setSettings(readGuestSettings());
      return;
    }
    let cancelled = false;
    api
      .get<{ settings: Settings }>('/settings')
      .then(({ settings: next }) => {
        if (!cancelled) setSettings(next);
      })
      .catch(() => {
        if (!cancelled) show('设置加载失败，已使用本地默认值', 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, show]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const listener = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    settings.theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : settings.theme;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.motion = settings.reduceMotion ? 'reduced' : 'full';
    root.style.colorScheme = resolvedTheme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolvedTheme === 'dark' ? '#101820' : '#F6F1E7');
  }, [resolvedTheme, settings.reduceMotion]);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      const previous = settingsRef.current;
      const next = { ...previous, ...patch };
      setSettings(next);
      settingsRef.current = next;
      if (!user) {
        localStorage.setItem(GUEST_KEY, JSON.stringify(next));
        return;
      }
      setSyncing(true);
      try {
        const response = await api.patch<{ settings: Settings }>('/settings', patch);
        setSettings(response.settings);
        settingsRef.current = response.settings;
      } catch {
        setSettings(previous);
        settingsRef.current = previous;
        show('设置保存失败，已恢复原状', 'error');
      } finally {
        setSyncing(false);
      }
    },
    [show, user],
  );

  const value = useMemo(
    () => ({ settings, resolvedTheme, update, syncing }),
    [settings, resolvedTheme, update, syncing],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}