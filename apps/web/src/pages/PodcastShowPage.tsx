import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { PodcastDetail } from '../api/types';
import { CoverArt } from '../components/CoverArt';
import { ErrorState, Skeleton } from '../components/ui';
import { CheckIcon, ClockIcon, MicIcon, PlayIcon, PlusIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { formatTime } from '../lib/player';

export function PodcastShowPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useFetch<PodcastDetail>(`/podcasts/${id}`, [id]);
  const { user } = useAuth();
  const { show } = useToast();
  const player = usePlayer();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setFollowing(data.podcast.following);
      document.title = `${data.podcast.title} · 播客 · 声屿`;
    }
  }, [data]);

  if (loading && !data) {
    return <div className="page"><Skeleton className="skeleton-hero" /><Skeleton className="skeleton-line" count={6} /></div>;
  }
  if (error || !data) return <ErrorState message={error ?? '播客不存在'} onRetry={reload} />;

  const { podcast, episodes } = data;

  const toggleFollow = async () => {
    if (!user) {
      show('登录后即可关注播客', 'info');
      return;
    }
    setBusy(true);
    try {
      const response = await api.post<{ following: boolean }>(`/podcast-follows/${podcast.id}`);
      setFollowing(response.following);
      show(response.following ? '已关注播客' : '已取消关注', 'success');
    } catch {
      show('操作失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page podcast-show-page">
      <section
        className="podcast-hero"
        style={{ ['--pod-a' as string]: podcast.accent, ['--pod-b' as string]: podcast.accent2 }}
      >
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">发现</Link>
          <span aria-hidden="true">/</span>
          <Link to="/podcasts">播客</Link>
          <span aria-hidden="true">/</span>
          <span>{podcast.title}</span>
        </nav>
        <div className="podcast-hero-inner">
          <div className="podcast-cover">
            <CoverArt
              seed={podcast.artSeed}
              accent={podcast.accent}
              accent2={podcast.accent2}
              label={podcast.title}
              monogram
            />
            <span className="podcast-badge"><MicIcon size={13} /> PODCAST</span>
          </div>
          <div className="podcast-copy">
            <p className="kicker">{podcast.category} · {podcast.publisher}</p>
            <h1>{podcast.title}</h1>
            <p className="podcast-desc">{podcast.description}</p>
            <p className="podcast-meta">{episodes.length} 集 · 每集 45 秒原创样带 · 关注后出现在音乐库</p>
            <div className="podcast-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={episodes.length === 0}
                onClick={() => player.playEpisodes(episodes, 0)}
              >
                <PlayIcon size={18} />
                播放最新一集
              </button>
              <button
                type="button"
                className={`btn ${following ? 'btn-on-accent' : 'btn-ghost'}`}
                onClick={() => void toggleFollow()}
                disabled={busy}
                aria-pressed={following}
              >
                {following ? <CheckIcon size={17} /> : <PlusIcon size={17} />}
                {following ? '已关注' : '关注节目'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="podcast-episodes">
        <div className="episodes-head">
          <p className="kicker">All episodes</p>
          <h2>全部单集</h2>
          <span>{episodes.length} 集</span>
        </div>
        <div className="episode-list">
          {episodes.map((episode, index) => (
            <article key={episode.id} className="episode-row">
              <span className="episode-no">EP {String(episode.episodeNo).padStart(2, '0')}</span>
              <div className="episode-main">
                <h3>{episode.title}</h3>
                <p>{episode.description}</p>
                <div className="episode-meta">
                  <span>{new Date(episode.publishedAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
                  <span><ClockIcon size={14} /> {formatTime(episode.durationSec)}</span>
                  <span>原创样带</span>
                </div>
              </div>
              <button
                type="button"
                className="episode-play"
                onClick={() => player.playEpisodes(episodes, index)}
                aria-label={`播放 ${episode.title}`}
              >
                <PlayIcon size={19} />
              </button>
            </article>
          ))}
        </div>
        <p className="episode-note">
          播客单集与音乐共用播放队列。你可以把一集设为下一首，或在「舱内视图」里查看队列。
        </p>
      </div>
    </div>
  );
}