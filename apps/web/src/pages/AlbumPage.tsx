import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { AlbumDetail } from '../api/types';
import { ArtCard } from '../components/ArtCard';
import { CoverArt } from '../components/CoverArt';
import { TrackList } from '../components/TrackRow';
import { ErrorState, Section, Skeleton } from '../components/ui';
import { CheckIcon, HeartIcon, PlayIcon, PlusIcon, QueueIcon, ShuffleIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { usePlayCollection } from '../hooks/usePlayCollection';
import { ALBUM_TYPE_LABELS } from '../lib/labels';
import { formatTime, trackToItem } from '../lib/player';

export function AlbumPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useFetch<AlbumDetail>(`/albums/${id}`, [id]);
  const { user } = useAuth();
  const { show } = useToast();
  const player = usePlayer();
  const { playAlbum } = usePlayCollection();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setSaved(data.album.saved);
      document.title = `${data.album.title} · ${data.album.artist.name} · 声屿`;
    }
  }, [data]);

  if (loading && !data) {
    return <div className="page"><Skeleton className="skeleton-hero" /><Skeleton className="skeleton-line" count={6} /></div>;
  }
  if (error || !data) return <ErrorState message={error ?? '专辑不存在'} onRetry={reload} />;

  const { album, tracks, totalDurationSec, moreByArtist } = data;

  const toggleSave = async () => {
    if (!user) {
      show('登录后即可收藏专辑', 'info');
      return;
    }
    setBusy(true);
    try {
      const response = await api.post<{ saved: boolean }>(`/saved-albums/${album.id}`);
      setSaved(response.saved);
      show(response.saved ? '已收藏专辑' : '已取消收藏', 'success');
    } catch {
      show('操作失败，请稍后再试', 'error');
    } finally {
      setBusy(false);
    }
  };

  const shuffle = () => {
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    player.playTracks(shuffled, 0);
    show('正在随机播放这张专辑', 'info');
  };

  const addAll = () => {
    player.addToQueue(tracks.map((track) => trackToItem(track)));
  };

  return (
    <div className="page album-page">
      <section
        className="album-hero"
        style={{ ['--album-a' as string]: album.accent, ['--album-b' as string]: album.accent2 }}
      >
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">发现</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/artist/${album.artist.id}`}>{album.artist.name}</Link>
          <span aria-hidden="true">/</span>
          <span>{album.title}</span>
        </nav>
        <div className="album-hero-inner">
          <div className="album-cover">
            <CoverArt seed={album.artSeed} accent={album.accent} accent2={album.accent2} label={album.title} />
            <span className="album-tape">ORIGINAL TAPE</span>
          </div>
          <div className="album-copy">
            <p className="kicker">{ALBUM_TYPE_LABELS[album.type]} · {album.year}</p>
            <h1>{album.title}</h1>
            <p className="album-byline">
              <Link to={`/artist/${album.artist.id}`}>{album.artist.name}</Link>
              <span>·</span>
              <span>{tracks.length} 首</span>
              <span>·</span>
              <span>约 {Math.max(1, Math.round(totalDurationSec / 60))} 分钟</span>
            </p>
            <p className="album-desc">{album.description}</p>
            <div className="album-actions">
              <button type="button" className="btn btn-primary" disabled={tracks.length === 0} onClick={() => void playAlbum(album.id)}>
                <PlayIcon size={18} />
                播放全部
              </button>
              <button type="button" className="btn btn-ghost" onClick={shuffle}>
                <ShuffleIcon size={18} />
                随机
              </button>
              <button
                type="button"
                className={`icon-btn on-hero${saved ? ' is-liked' : ''}`}
                onClick={() => void toggleSave()}
                disabled={busy}
                aria-label={saved ? '取消收藏专辑' : '收藏专辑'}
                aria-pressed={saved}
              >
                {saved ? <CheckIcon size={20} /> : <HeartIcon size={20} />}
              </button>
              <button type="button" className="icon-btn on-hero" onClick={addAll} aria-label="将整张专辑加入队列">
                <QueueIcon size={20} />
              </button>
              <span className="album-duration-total">总时长 {formatTime(totalDurationSec)}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="album-body">
        <div className="album-track-head">
          <span>#</span>
          <span>曲目</span>
          <span>时长</span>
        </div>
        <TrackList tracks={tracks} />
        <div className="release-note">
          <span>{album.year} 年发行</span>
          <span>声屿原创样带 · 45 秒 / 首</span>
          <span>所有内容为虚构演示素材</span>
        </div>

        {moreByArtist.length > 0 ? (
          <Section kicker="More by" title={`更多 ${album.artist.name}`}>
            <div className="cards-grid compact-grid">
              {moreByArtist.map((release) => (
                <ArtCard
                  key={release.id}
                  to={`/album/${release.id}`}
                  title={release.title}
                  subtitle={release.artist.name}
                  meta={`${release.year} · ${ALBUM_TYPE_LABELS[release.type]}`}
                  art={{ seed: release.artSeed, accent: release.accent, accent2: release.accent2 }}
                  onPlay={() => void playAlbum(release.id)}
                />
              ))}
            </div>
          </Section>
        ) : null}

        <div className="album-cta">
          <div>
            <p className="kicker">Keep the ritual</p>
            <h2>把这张唱片留在音乐库</h2>
            <p>收藏后可在音乐库随时回来；登录后还会同步到你的账户。</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => void toggleSave()}>
            <PlusIcon size={18} />
            {saved ? '已收藏' : '收藏专辑'}
          </button>
        </div>
      </div>
    </div>
  );
}