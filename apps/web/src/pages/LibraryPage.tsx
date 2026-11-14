import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { LibraryPayload, Playlist } from '../api/types';
import { ArtCard } from '../components/ArtCard';
import { AuthRequired } from '../components/AuthRequired';
import { Modal } from '../components/Modal';
import { TrackList } from '../components/TrackRow';
import { Chip, EmptyState, ErrorState, Section, Skeleton } from '../components/ui';
import { HeartIcon, LibraryIcon, PlayIcon, PlusIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { usePlayCollection } from '../hooks/usePlayCollection';

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'liked', label: '喜欢的歌' },
  { key: 'playlists', label: '歌单' },
  { key: 'artists', label: '音乐人' },
  { key: 'albums', label: '专辑' },
  { key: 'podcasts', label: '播客' },
  { key: 'recent', label: '最近播放' },
] as const;

type LibraryTab = (typeof TABS)[number]['key'];

export function LibraryPage() {
  const { user, ready } = useAuth();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') ?? 'all';
  const tab: LibraryTab = TABS.some((entry) => entry.key === tabParam) ? (tabParam as LibraryTab) : 'all';
  const { data, loading, error, reload } = useFetch<LibraryPayload>(user ? '/library' : null, [user?.id]);
  const player = usePlayer();
  const { show } = useToast();
  const { playArtist, playAlbum, playPodcast, playPlaylist } = usePlayCollection();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    document.title = '音乐库 · 声屿';
  }, []);

  if (ready && !user) {
    return (
      <AuthRequired
        title="你的音乐库"
        description="喜欢的歌、自建歌单、关注的音乐人与收藏的专辑都会出现在这里。"
      />
    );
  }

  const createPlaylist = async () => {
    const title = newTitle.trim();
    if (!title) {
      show('请填写歌单名称', 'info');
      return;
    }
    setCreating(true);
    try {
      await api.post<{ playlist: Playlist }>('/playlists', { title, description: '' });
      show('歌单已创建', 'success');
      setNewTitle('');
      setCreateOpen(false);
      reload();
      window.dispatchEvent(new Event('sy:playlists-changed'));
    } catch {
      show('创建失败', 'error');
    } finally {
      setCreating(false);
    }
  };

  const clearHistory = async () => {
    setClearing(true);
    try {
      await api.delete('/history');
      show('最近播放已清空', 'success');
      setConfirmClear(false);
      reload();
    } catch {
      show('清空失败', 'error');
    } finally {
      setClearing(false);
    }
  };

  if (!user && !ready) {
    return <div className="cards-grid"><Skeleton className="skeleton-card" count={5} /></div>;
  }

  return (
    <div className="page library-page">
      <header className="page-head library-head">
        <div>
          <p className="kicker">Your sound shelf</p>
          <h1>音乐库</h1>
          <p className="page-desc">收藏、整理与回到你听过的地方。所有内容只属于你。</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <PlusIcon size={18} />
            新建歌单
          </button>
        </div>
      </header>

      {data ? (
        <div className="library-stats">
          <Link to="/library?tab=liked" className="stat-card">
            <span>{data.counts.likedTracks}</span>
            <strong>喜欢的歌</strong>
          </Link>
          <Link to="/library?tab=playlists" className="stat-card">
            <span>{data.counts.playlists}</span>
            <strong>自建歌单</strong>
          </Link>
          <Link to="/library?tab=artists" className="stat-card">
            <span>{data.counts.followedArtists}</span>
            <strong>关注音乐人</strong>
          </Link>
          <Link to="/library?tab=albums" className="stat-card">
            <span>{data.counts.savedAlbums}</span>
            <strong>收藏专辑</strong>
          </Link>
          <Link to="/library?tab=podcasts" className="stat-card">
            <span>{data.counts.followedPodcasts}</span>
            <strong>关注播客</strong>
          </Link>
        </div>
      ) : null}

      <div className="library-tabs" role="tablist" aria-label="音乐库分类">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={tab === entry.key}
            className={`chip${tab === entry.key ? ' is-active' : ''}`}
            onClick={() => setParams(entry.key === 'all' ? {} : { tab: entry.key })}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {loading && !data ? <div className="cards-grid"><Skeleton className="skeleton-card" count={6} /></div> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <>
          {(tab === 'all' || tab === 'liked') && (
            <Section
              kicker="Liked songs"
              title="喜欢的歌"
              action={
                data.likedTracks.length > 0 ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => player.playTracks(data.likedTracks, 0)}
                  >
                    <PlayIcon size={16} /> 播放全部
                  </button>
                ) : undefined
              }
            >
              {data.likedTracks.length ? (
                <div className="chart-wrap">
                  <TrackList tracks={tab === 'all' ? data.likedTracks.slice(0, 6) : data.likedTracks} showAlbum />
                </div>
              ) : (
                <EmptyState
                  icon={<HeartIcon size={38} />}
                  title="还没有喜欢的歌"
                  description="在任意曲目上点一下心形，它就会出现在这里。"
                  action={<Link to="/" className="btn btn-primary btn-sm">去发现音乐</Link>}
                />
              )}
            </Section>
          )}

          {(tab === 'all' || tab === 'playlists') && (
            <Section kicker="Made by you" title="我的歌单" action={tab === 'all' ? { label: '查看全部', to: '/library?tab=playlists' } : undefined}>
              {data.playlists.length ? (
                <div className="cards-grid">
                  {data.playlists.map((playlist) => (
                    <ArtCard
                      key={playlist.id}
                      to={`/playlist/${playlist.id}`}
                      title={playlist.title}
                      subtitle={playlist.description || '还没有简介'}
                      meta={`${playlist.trackCount} 首 · 你创建`}
                      art={{ seed: playlist.artSeed, accent: playlist.accent, accent2: playlist.accent2 }}
                      shape="squircle"
                      monogram
                      onPlay={() => void playPlaylist(playlist.id)}
                      playLabel="打开歌单"
                    />
                  ))}
                  <button type="button" className="create-card" onClick={() => setCreateOpen(true)}>
                    <span className="create-card-plus"><PlusIcon size={26} /></span>
                    <strong>新建歌单</strong>
                    <span>把此刻的声音收在一起</span>
                  </button>
                </div>
              ) : (
                <EmptyState
                  icon={<LibraryIcon size={38} />}
                  title="你的第一张歌单"
                  description="给一种情绪、一个场景或一条路命名。"
                  action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>创建歌单</button>}
                />
              )}
            </Section>
          )}

          {(tab === 'all' || tab === 'artists') && data.followedArtists.length > 0 && (
            <Section kicker="Following" title="关注的音乐人">
              <div className="cards-grid">
                {data.followedArtists.map((artist) => (
                  <ArtCard
                    key={artist.id}
                    to={`/artist/${artist.id}`}
                    title={artist.name}
                    subtitle={artist.genre}
                    art={{ seed: artist.artSeed, accent: artist.accent, accent2: artist.accent2 }}
                    shape="squircle"
                    monogram
                    onPlay={() => void playArtist(artist.id)}
                  />
                ))}
              </div>
            </Section>
          )}

          {(tab === 'all' || tab === 'albums') && data.savedAlbums.length > 0 && (
            <Section kicker="Saved" title="收藏专辑">
              <div className="cards-grid">
                {data.savedAlbums.map((album) => (
                  <ArtCard
                    key={album.id}
                    to={`/album/${album.id}`}
                    title={album.title}
                    subtitle={album.artist.name}
                    meta={`${album.year} · ${album.type}`}
                    art={{ seed: album.artSeed, accent: album.accent, accent2: album.accent2 }}
                    onPlay={() => void playAlbum(album.id)}
                  />
                ))}
              </div>
            </Section>
          )}

          {(tab === 'all' || tab === 'podcasts') && data.followedPodcasts.length > 0 && (
            <Section kicker="Podcasts" title="关注的播客">
              <div className="cards-grid">
                {data.followedPodcasts.map((podcast) => (
                  <ArtCard
                    key={podcast.id}
                    to={`/podcast/${podcast.id}`}
                    title={podcast.title}
                    subtitle={podcast.publisher}
                    meta={`${podcast.episodeCount} 集`}
                    art={{ seed: podcast.artSeed, accent: podcast.accent, accent2: podcast.accent2 }}
                    badge="PODCAST"
                    monogram
                    onPlay={() => void playPodcast(podcast.id)}
                  />
                ))}
              </div>
            </Section>
          )}

          {(tab === 'all' || tab === 'recent') && (
            <Section
              kicker="Played lately"
              title="最近播放"
              action={
                data.recentTracks.length > 0 ? (
                  <button type="button" className="text-link" onClick={() => setConfirmClear(true)}>
                    <TrashIcon size={15} /> 清空历史
                  </button>
                ) : undefined
              }
            >
              {data.recentTracks.length ? (
                <div className="chart-wrap">
                  <TrackList tracks={tab === 'all' ? data.recentTracks.slice(0, 5) : data.recentTracks} showAlbum />
                </div>
              ) : (
                <EmptyState
                  title="还没有播放记录"
                  description="播放一首歌后，这里会留下你的足迹。开启隐私模式后则不会记录。"
                  action={<Link to="/" className="btn btn-primary btn-sm">去找点声音</Link>}
                />
              )}
            </Section>
          )}

          {tab === 'artists' && data.followedArtists.length === 0 ? (
            <EmptyState title="还没有关注音乐人" description="在音乐人页点击「关注」，他们的新作品会更靠近你。" action={<Link to="/" className="btn btn-primary btn-sm">去发现</Link>} />
          ) : null}
          {tab === 'albums' && data.savedAlbums.length === 0 ? (
            <EmptyState title="还没有收藏专辑" description="在专辑页点击收藏，把整张唱片留在这里。" action={<Link to="/" className="btn btn-primary btn-sm">去发现</Link>} />
          ) : null}
          {tab === 'podcasts' && data.followedPodcasts.length === 0 ? (
            <EmptyState title="还没有关注播客" description="去播客页找一档适合通勤或睡前的节目。" action={<Link to="/podcasts" className="btn btn-primary btn-sm">浏览播客</Link>} />
          ) : null}
        </>
      ) : null}

      <Modal
        open={createOpen}
        title="新建歌单"
        kicker="把声音收好"
        size="small"
        onClose={() => setCreateOpen(false)}
        initialFocusSelector="#library-playlist-title"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>取消</button>
            <button type="button" className="btn btn-primary" disabled={creating} onClick={() => void createPlaylist()}>
              {creating ? '创建中…' : '创建歌单'}
            </button>
          </>
        }
      >
        <label className="field">
          <span>歌单名称</span>
          <input
            id="library-playlist-title"
            value={newTitle}
            maxLength={60}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="例如：雨天写代码"
            onKeyDown={(event) => {
              if (event.key === 'Enter') void createPlaylist();
            }}
          />
        </label>
      </Modal>

      <Modal
        open={confirmClear}
        title="清空最近播放？"
        size="small"
        onClose={() => setConfirmClear(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmClear(false)}>取消</button>
            <button type="button" className="btn btn-danger" disabled={clearing} onClick={() => void clearHistory()}>
              {clearing ? '清空中…' : '确认清空'}
            </button>
          </>
        }
      >
        <p>这会删除你的播放历史，但不会影响喜欢、歌单或关注。此操作不可撤销。</p>
      </Modal>
    </div>
  );
}