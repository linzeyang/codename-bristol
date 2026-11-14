import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Playlist, Track } from '../api/types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { Modal } from '../components/Modal';
import { CoverArt } from '../components/CoverArt';
import { PlusIcon } from '../components/Icons';
import { EmptyState, Spinner } from '../components/ui';

interface PickerApi {
  openFor: (track: Track) => void;
}

const PickerContext = createContext<PickerApi | null>(null);

interface PlaylistSummary {
  id: string;
  title: string;
  trackCount: number;
  artSeed: number;
  accent: string;
  accent2: string;
}

export function PlaylistPickerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [track, setTrack] = useState<Track | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const openFor = useCallback(
    (next: Track) => {
      if (!user) {
        show('登录后即可创建歌单并收藏歌曲', 'info');
        navigate('/login');
        return;
      }
      setTrack(next);
      setNewTitle('');
      setLoading(true);
      api
        .get<{ playlists: PlaylistSummary[] }>('/playlists')
        .then((response) => setPlaylists(response.playlists))
        .catch(() => show('歌单加载失败', 'error'))
        .finally(() => setLoading(false));
    },
    [navigate, show, user],
  );

  const close = useCallback(() => setTrack(null), []);

  const addTo = useCallback(
    async (playlistId: string, playlistTitle: string) => {
      if (!track) return;
      setBusy(true);
      try {
        await api.post(`/playlists/${playlistId}/tracks`, { trackId: track.id });
        show(`已加入「${playlistTitle}」`, 'success');
        setTrack(null);
      } catch {
        show('加入歌单失败，请稍后再试', 'error');
      } finally {
        setBusy(false);
      }
    },
    [show, track],
  );

  const createAndAdd = useCallback(async () => {
    if (!track) return;
    const title = newTitle.trim();
    if (!title) {
      show('请先填写歌单名称', 'info');
      return;
    }
    setBusy(true);
    try {
      const created = await api.post<{ playlist: Playlist }>('/playlists', { title, description: '' });
      await api.post(`/playlists/${created.playlist.id}/tracks`, { trackId: track.id });
      show(`已新建「${title}」并加入`, 'success');
      window.dispatchEvent(new Event('sy:playlists-changed'));
      setTrack(null);
    } catch {
      show('新建歌单失败', 'error');
    } finally {
      setBusy(false);
    }
  }, [newTitle, show, track]);

  const value = useMemo(() => ({ openFor }), [openFor]);

  return (
    <PickerContext.Provider value={value}>
      {children}
      <Modal open={Boolean(track)} title="加入歌单" kicker="收藏到" onClose={close} size="small">
        {track ? (
          <div className="picker">
            <div className="picker-song">
              <div className="picker-cover">
                <CoverArt
                  seed={track.album.artSeed}
                  accent={track.album.accent}
                  accent2={track.album.accent2}
                  label={track.title}
                />
              </div>
              <div>
                <strong>{track.title}</strong>
                <span>{track.artist.name}</span>
              </div>
            </div>

            <div className="picker-create">
              <label htmlFor="new-playlist-title">新建歌单</label>
              <div className="inline-form">
                <input
                  id="new-playlist-title"
                  value={newTitle}
                  maxLength={60}
                  placeholder="例如：雨天写代码"
                  onChange={(event) => setNewTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void createAndAdd();
                  }}
                />
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void createAndAdd()}>
                  <PlusIcon size={18} />
                  新建并加入
                </button>
              </div>
            </div>

            <div className="picker-list">
              <p className="picker-label">我的歌单</p>
              {loading ? <Spinner label="正在读取歌单" /> : null}
              {!loading && playlists.length === 0 ? (
                <EmptyState title="还没有歌单" description="在上方输入名称，创建第一个歌单。" />
              ) : null}
              {!loading &&
                playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    className="picker-row"
                    disabled={busy}
                    onClick={() => void addTo(playlist.id, playlist.title)}
                  >
                    <span className="picker-row-art">
                      <CoverArt
                        seed={playlist.artSeed}
                        accent={playlist.accent}
                        accent2={playlist.accent2}
                        label={playlist.title}
                      />
                    </span>
                    <span className="picker-row-text">
                      <strong>{playlist.title}</strong>
                      <small>{playlist.trackCount} 首</small>
                    </span>
                    <span className="picker-row-add" aria-hidden="true">
                      <PlusIcon size={18} />
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </PickerContext.Provider>
  );
}

export function usePlaylistPicker(): PickerApi {
  const context = useContext(PickerContext);
  if (!context) throw new Error('usePlaylistPicker must be used within PlaylistPickerProvider');
  return context;
}