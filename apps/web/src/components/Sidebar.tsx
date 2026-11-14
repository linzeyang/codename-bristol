import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Playlist } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { Modal } from './Modal';
import { CoverArt } from './CoverArt';
import {
  CompassIcon,
  HeartIcon,
  HomeIcon,
  LibraryIcon,
  Logo,
  PlusIcon,
  RadioIcon,
  SparklesIcon,
  UserIcon,
} from './Icons';

const PLAN_LABELS: Record<string, string> = { free: '漫步', plus: '靠岸 Plus', studio: '共听 Studio' };

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, reload } = useFetch<{ playlists: Playlist[] }>(user ? '/playlists' : null, [user?.id]);
  const playlists = data?.playlists ?? [];

  useEffect(() => {
    const onChange = () => reload();
    window.addEventListener('sy:playlists-changed', onChange);
    return () => window.removeEventListener('sy:playlists-changed', onChange);
  }, [reload]);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const create = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      show('请填写歌单名称', 'info');
      return;
    }
    setCreating(true);
    try {
      const response = await api.post<{ playlist: Playlist }>('/playlists', { title: trimmed, description: '' });
      show('歌单已创建', 'success');
      setCreateOpen(false);
      setTitle('');
      reload();
      window.dispatchEvent(new Event('sy:playlists-changed'));
      navigate(`/playlist/${response.playlist.id}`);
    } catch {
      show('创建歌单失败', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className={`sidebar-scrim${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label="主导航">
        <Link to="/" className="brand" aria-label="声屿首页">
          <span className="brand-mark">
            <Logo size={34} />
          </span>
          <span className="brand-type">
            <strong>声屿</strong>
            <small>SONORA ISLE</small>
          </span>
        </Link>

        <nav className="side-nav" aria-label="主要导航">
          <NavLink to="/" end className={({ isActive }) => `side-link${isActive ? ' is-active' : ''}`}>
            <HomeIcon size={20} />
            <span>发现</span>
          </NavLink>
          <NavLink to="/search" className={({ isActive }) => `side-link${isActive ? ' is-active' : ''}`}>
            <CompassIcon size={20} />
            <span>搜索</span>
          </NavLink>
          <NavLink to="/library" className={({ isActive }) => `side-link${isActive ? ' is-active' : ''}`}>
            <LibraryIcon size={20} />
            <span>音乐库</span>
          </NavLink>
          <NavLink to="/guide" className={({ isActive }) => `side-link${isActive ? ' is-active' : ''}`}>
            <SparklesIcon size={20} />
            <span>声屿向导</span>
            <span className="side-new">新</span>
          </NavLink>
          <NavLink to="/plans" className={({ isActive }) => `side-link${isActive ? ' is-active' : ''}`}>
            <RadioIcon size={20} />
            <span>订阅方案</span>
          </NavLink>
        </nav>

        <div className="side-library">
          <div className="side-library-head">
            <span>我的音乐库</span>
            {user ? (
              <button type="button" className="icon-btn small" onClick={() => setCreateOpen(true)} aria-label="新建歌单">
                <PlusIcon size={17} />
              </button>
            ) : null}
          </div>

          {user ? (
            <div className="side-lists">
              <NavLink to="/library?tab=liked" className="side-list-link">
                <span className="side-mini-icon like">
                  <HeartIcon size={15} />
                </span>
                <span>喜欢的歌</span>
              </NavLink>
              {playlists.slice(0, 7).map((playlist) => (
                <NavLink key={playlist.id} to={`/playlist/${playlist.id}`} className="side-list-link">
                  <span className="side-mini-cover">
                    <CoverArt
                      seed={playlist.artSeed}
                      accent={playlist.accent}
                      accent2={playlist.accent2}
                      label={playlist.title}
                    />
                  </span>
                  <span className="side-list-title">{playlist.title}</span>
                </NavLink>
              ))}
              <button type="button" className="side-create" onClick={() => setCreateOpen(true)}>
                <PlusIcon size={16} />
                新建歌单
              </button>
            </div>
          ) : (
            <div className="side-guest-card">
              <p className="kicker">从收藏开始</p>
              <strong>把喜欢的歌留在这里</strong>
              <p>登录后可创建歌单、关注音乐人，并获得有理由的推荐。</p>
              <Link to="/login" className="btn btn-on-accent btn-sm">
                登录 / 注册
              </Link>
            </div>
          )}
        </div>

        <div className="side-foot">
          {user ? (
            <Link to="/account" className="side-user">
              <span className="avatar small" style={{ ['--avatar-hue' as string]: user.avatarHue }}>
                {user.displayName.slice(0, 1)}
              </span>
              <span className="side-user-text">
                <strong>{user.displayName}</strong>
                <small>{PLAN_LABELS[user.planId] ?? user.planId} · {user.role === 'admin' ? '管理员' : '听众'}</small>
              </span>
              <UserIcon size={17} />
            </Link>
          ) : null}
          <p className="side-note">原创原型 · 离线可用 · 声屿 1.0</p>
        </div>

        <button type="button" className="icon-btn side-close" onClick={onClose} aria-label="关闭导航">
          <span aria-hidden="true">×</span>
        </button>
      </aside>

      <Modal
        open={createOpen}
        title="新建歌单"
        kicker="把声音收好"
        size="small"
        onClose={() => setCreateOpen(false)}
        initialFocusSelector="#playlist-title"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>
              取消
            </button>
            <button type="button" className="btn btn-primary" disabled={creating} onClick={() => void create()}>
              {creating ? '创建中…' : '创建歌单'}
            </button>
          </>
        }
      >
        <label className="field">
          <span>歌单名称</span>
          <input
            id="playlist-title"
            value={title}
            maxLength={60}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：深夜靠岸"
            onKeyDown={(event) => {
              if (event.key === 'Enter') void create();
            }}
          />
        </label>
      </Modal>
    </>
  );
}