import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Station, Track } from '../api/types';
import { CoverArt } from '../components/CoverArt';
import { TrackList } from '../components/TrackRow';
import { ErrorState, Skeleton } from '../components/ui';
import { PlayIcon, RadioIcon, ShuffleIcon } from '../components/Icons';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';

export function StationPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useFetch<{ station: Station; tracks: Track[] }>(`/stations/${id}`, [id]);
  const player = usePlayer();
  const { show } = useToast();

  useEffect(() => {
    if (data) document.title = `${data.station.title} · 电台 · 声屿`;
  }, [data]);

  if (loading && !data) return <div className="page"><Skeleton className="skeleton-hero" /></div>;
  if (error || !data) return <ErrorState message={error ?? '电台不存在'} onRetry={reload} />;

  const { station, tracks } = data;

  const shuffle = () => {
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    player.playTracks(shuffled, 0);
    show('电台已开启随机', 'info');
  };

  return (
    <div className="page station-page">
      <section
        className="station-hero"
        style={{ ['--st-a' as string]: station.accent, ['--st-b' as string]: station.accent2 }}
      >
        <div className="station-hero-pattern" aria-hidden="true">
          <CoverArt seed={station.artSeed} accent={station.accent} accent2={station.accent2} label={station.title} />
        </div>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">发现</Link>
          <span aria-hidden="true">/</span>
          <span>电台</span>
        </nav>
        <div className="station-hero-copy">
          <span className="station-badge"><RadioIcon size={13} /> RADIO · ALWAYS ON</span>
          <h1>{station.title}</h1>
          <p className="station-tagline">{station.tagline}</p>
          <p className="station-desc">{station.description}</p>
          <p className="station-moods">
            {station.moods.map((mood) => <span key={mood} className="chip">{mood}</span>)}
            <span className="chip">能量 {Math.round(station.energyMin * 100)}–{Math.round(station.energyMax * 100)}</span>
          </p>
          <div className="station-actions">
            <button type="button" className="btn btn-primary" disabled={tracks.length === 0} onClick={() => player.playTracks(tracks, 0)}>
              <PlayIcon size={18} /> 开始收听
            </button>
            <button type="button" className="btn btn-ghost" onClick={shuffle}>
              <ShuffleIcon size={18} /> 随机
            </button>
          </div>
        </div>
      </section>

      <div className="station-body">
        <div className="station-list-head">
          <p className="kicker">On rotation</p>
          <h2>正在轮播</h2>
          <span>{tracks.length} 首 · 原创样带</span>
        </div>
        <TrackList tracks={tracks} showAlbum />
        <p className="station-note">
          电台由情绪标签与能量区间生成，不是一个固定歌单。每次进入都可能听到不同的组合；开启「自动续播相似曲目」后，
          播放到队尾会继续延伸。
        </p>
      </div>
    </div>
  );
}