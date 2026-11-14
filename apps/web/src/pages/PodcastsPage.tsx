import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Podcast } from '../api/types';
import { ArtCard } from '../components/ArtCard';
import { CoverArt } from '../components/CoverArt';
import { ErrorState, PageShell, Skeleton } from '../components/ui';
import { MicIcon, PlayIcon } from '../components/Icons';
import { usePlayer } from '../context/PlayerContext';
import { useFetch } from '../hooks/useFetch';
import { usePlayCollection } from '../hooks/usePlayCollection';

export function PodcastsPage() {
  const { data, loading, error, reload } = useFetch<{ podcasts: Podcast[] }>('/podcasts');
  const { playPodcast } = usePlayCollection();
  const player = usePlayer();

  useEffect(() => {
    document.title = '播客 · 声屿';
  }, []);

  if (loading && !data) {
    return <div className="page"><Skeleton className="skeleton-hero" /><div className="cards-grid"><Skeleton className="skeleton-card" count={3} /></div></div>;
  }
  if (error || !data) return <ErrorState message={error ?? '播客加载失败'} onRetry={reload} />;

  return (
    <div className="page podcasts-page">
      <PageShell
        kicker="Stories in sound"
        title="播客"
        description="不赶路的声音散步、音乐人的深夜自白，以及写代码的人如何听歌。"
      >
        <div className="podcast-feature">
          <div className="podcast-feature-art">
            <CoverArt seed={51} accent="#123B52" accent2="#63A8B0" label="深夜声场" monogram />
          </div>
          <div className="podcast-feature-copy">
            <p className="kicker">Featured show</p>
            <h2>深夜声场</h2>
            <p>每期请一位音乐人聊聊深夜写歌、失眠和那些没有发表的 demo。第 1 集从林晚星的《潮汐信箱》开始。</p>
            <div className="podcast-feature-actions">
              <button type="button" className="btn btn-primary" onClick={() => void playPodcast('pod-shenye')}>
                <PlayIcon size={18} /> 从第一集开始
              </button>
              <Link to="/podcast/pod-shenye" className="btn btn-ghost">查看节目</Link>
            </div>
            <p className="podcast-note"><MicIcon size={14} /> 全部单集为原创 45 秒样带</p>
          </div>
        </div>

        <div className="podcast-list-head">
          <p className="kicker">All shows</p>
          <h2>全部节目</h2>
        </div>
        <div className="cards-grid podcast-grid">
          {data.podcasts.map((podcast) => (
            <ArtCard
              key={podcast.id}
              to={`/podcast/${podcast.id}`}
              title={podcast.title}
              subtitle={podcast.publisher}
              meta={`${podcast.episodeCount} 集 · ${podcast.category}${podcast.following ? ' · 已关注' : ''}`}
              art={{ seed: podcast.artSeed, accent: podcast.accent, accent2: podcast.accent2 }}
              badge="PODCAST"
              monogram
              onPlay={() => {
                void playPodcast(podcast.id);
              }}
            />
          ))}
        </div>

        <div className="podcast-list-cta">
          <div>
            <p className="kicker">Follow along</p>
            <h2>关注一档节目，更新会出现在音乐库</h2>
            <p>播客与音乐共用同一个播放器、同一个队列和同一套键盘快捷键。</p>
          </div>
          <Link to="/library?tab=podcasts" className="btn btn-ghost">我的播客</Link>
        </div>
        <span className="sr-only">{player.current ? `正在播放 ${player.current.title}` : ''}</span>
      </PageShell>
    </div>
  );
}