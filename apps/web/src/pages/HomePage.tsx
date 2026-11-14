import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { HomePayload, Station } from '../api/types';
import { ArtCard, TrackCard } from '../components/ArtCard';
import { CoverArt } from '../components/CoverArt';
import { ErrorState, Section, Shelf, Skeleton } from '../components/ui';
import { TrackList } from '../components/TrackRow';
import {
  ArrowRightIcon,
  PlayIcon,
  RadioIcon,
  SparklesIcon,
  WaveIcon,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../context/ToastContext';
import { useDebouncedValue, useFetch } from '../hooks/useFetch';
import { usePlayCollection } from '../hooks/usePlayCollection';
import { listenersLabel, trackToItem } from '../lib/player';

const TUNER_KEY = 'sy:tuner';
const DEFAULT_TUNER = { familiarity: 0.55, energy: 0.5, novelty: 0.45 };

function readTuner() {
  try {
    const raw = localStorage.getItem(TUNER_KEY);
    if (!raw) return DEFAULT_TUNER;
    const parsed = JSON.parse(raw) as Partial<typeof DEFAULT_TUNER>;
    return {
      familiarity: Number(parsed.familiarity ?? DEFAULT_TUNER.familiarity),
      energy: Number(parsed.energy ?? DEFAULT_TUNER.energy),
      novelty: Number(parsed.novelty ?? DEFAULT_TUNER.novelty),
    };
  } catch {
    return DEFAULT_TUNER;
  }
}

function Tuner({
  value,
  onChange,
  personalized,
}: {
  value: typeof DEFAULT_TUNER;
  onChange: (next: typeof DEFAULT_TUNER) => void;
  personalized: boolean;
}) {
  const controls: { key: keyof typeof DEFAULT_TUNER; label: string; low: string; high: string }[] = [
    { key: 'familiarity', label: '熟悉度', low: '新朋友', high: '老朋友' },
    { key: 'energy', label: '能量', low: '安静', high: '有劲' },
    { key: 'novelty', label: '新鲜度', low: '热门', high: '冷门' },
  ];
  return (
    <div className="tuner">
      <div className="tuner-head">
        <div>
          <p className="kicker">Taste tuner</p>
          <h3>调音台</h3>
        </div>
        <SparklesIcon size={22} />
      </div>
      <p className="tuner-copy">
        {personalized
          ? '拖动滑杆，推荐会立刻重新排序。每一个理由都来自你的喜欢、关注与最近播放。'
          : '游客也能调节电台的松紧。登录后，调音台会结合你的收藏生成个人化理由。'}
      </p>
      <div className="tuner-controls">
        {controls.map((control) => (
          <label key={control.key} className="tuner-control">
            <span className="tuner-label">
              <span>{control.label}</span>
              <span>{Math.round(value[control.key] * 100)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={value[control.key]}
              onChange={(event) => onChange({ ...value, [control.key]: Number(event.target.value) })}
              aria-label={`${control.label}，${control.low}到${control.high}`}
              style={{ ['--progress' as string]: `${value[control.key] * 100}%` }}
            />
            <span className="tuner-ends">
              <span>{control.low}</span>
              <span>{control.high}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="tuner-foot">
        <span>参数会保存在本机</span>
        <button type="button" className="text-link" onClick={() => onChange(DEFAULT_TUNER)}>
          恢复默认
        </button>
      </div>
    </div>
  );
}

function StationTile({ station, onPlay }: { station: Station; onPlay: () => void }) {
  return (
    <article className="station-tile" style={{ ['--station-a' as string]: station.accent, ['--station-b' as string]: station.accent2 }}>
      <div className="station-pattern" aria-hidden="true">
        <WaveIcon size={150} />
      </div>
      <div className="station-top">
        <span className="station-badge"><RadioIcon size={13} /> RADIO</span>
        <span className="station-energy">能量 {Math.round(station.energyMin * 100)}–{Math.round(station.energyMax * 100)}</span>
      </div>
      <div className="station-copy">
        <Link to={`/station/${station.id}`}>
          <h3>{station.title}</h3>
        </Link>
        <p>{station.tagline}</p>
      </div>
      <button type="button" className="station-play" onClick={onPlay} aria-label={`播放电台 ${station.title}`}>
        <PlayIcon size={20} />
      </button>
    </article>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const player = usePlayer();
  const { show } = useToast();
  const { playAlbum, playArtist, playPlaylist, playPodcast } = usePlayCollection();
  const [tuner, setTuner] = useState(readTuner);
  const debouncedTuner = useDebouncedValue(tuner, 320);
  const path = `/home?familiarity=${debouncedTuner.familiarity.toFixed(2)}&energy=${debouncedTuner.energy.toFixed(2)}&novelty=${debouncedTuner.novelty.toFixed(2)}`;
  const { data, loading, error, reload } = useFetch<HomePayload>(path, [user?.id]);

  useEffect(() => {
    document.title = '声屿 · 在声音里靠岸';
  }, []);

  useEffect(() => {
    localStorage.setItem(TUNER_KEY, JSON.stringify(tuner));
  }, [tuner]);

  const playPicks = (startIndex = 0) => {
    if (!data) return;
    player.playItems(
      data.picks.map((pick) => trackToItem(pick.track, pick.reason)),
      startIndex,
    );
  };

  const playStation = async (stationId: string) => {
    try {
      const response = await api.get<{ station: Station; tracks: HomePayload['trending'] }>(`/stations/${stationId}`);
      if (response.tracks.length === 0) {
        show('这个电台暂时没有曲目', 'info');
        return;
      }
      player.playTracks(response.tracks, 0);
    } catch {
      show('电台加载失败', 'error');
    }
  };

  const heroCovers = useMemo(() => data?.picks.filter((_, index) => index % 2 === 0).slice(0, 3) ?? [], [data]);

  if (loading && !data) {
    return (
      <div className="page home-page">
        <div className="home-hero-skeleton">
          <Skeleton className="skeleton-title" />
          <Skeleton className="skeleton-line" count={3} />
          <Skeleton className="skeleton-block" />
        </div>
        <div className="cards-grid">
          <Skeleton className="skeleton-card" count={5} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error ?? '首页加载失败'} onRetry={reload} />;
  }

  return (
    <div className="page home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="kicker">{data.personalized ? '为你而排 · TODAY ON THE ISLE' : '声屿 · 今日发现'}</p>
          <h1>{data.greeting}</h1>
          <p className="hero-lede">
            {data.personalized
              ? '每一条推荐都有理由。把喜欢、关注与最近播放交给声屿，再把口味交给调音台。'
              : '58 首原创样带、10 位虚构音乐人、3 档播客。无需登录即可收听，登录后开始留下自己的声音地图。'}
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => playPicks(0)}>
              <PlayIcon size={19} />
              播放今日推荐
            </button>
            <Link to="/guide" className="btn btn-ghost">
              <SparklesIcon size={18} />
              问向导找歌
            </Link>
          </div>
          <div className="hero-meta">
            <span>{data.picks.length} 首为你挑选</span>
            <span aria-hidden="true">·</span>
            <span>实时随调音台更新</span>
            <span aria-hidden="true">·</span>
            <Link to="/plans" className="text-link">
              查看订阅 <ArrowRightIcon size={15} />
            </Link>
          </div>
        </div>

        <div className="hero-collage" aria-hidden="true">
          {heroCovers.map((pick, index) => (
            <div key={pick.track.id} className={`collage-card collage-${index + 1}`}>
              <CoverArt
                seed={pick.track.album.artSeed}
                accent={pick.track.album.accent}
                accent2={pick.track.album.accent2}
                label={pick.track.title}
              />
              <span>{pick.track.title}</span>
            </div>
          ))}
          <div className="hero-sticker">
            <span>FOR</span>
            <strong>YOU</strong>
            <small>有理由的推荐</small>
          </div>
          <div className="hero-rule" />
        </div>
      </section>

      {!user ? (
        <div className="login-banner">
          <div>
            <strong>这是游客视角</strong>
            <p>登录后，喜欢一首歌或关注一位音乐人，首页推荐与理由会马上改变。</p>
          </div>
          <div className="login-banner-actions">
            <Link to="/login" className="btn btn-primary btn-sm">登录</Link>
            <Link to="/register" className="btn btn-ghost btn-sm">注册</Link>
          </div>
        </div>
      ) : null}

      <div className="home-grid">
        <Tuner value={tuner} onChange={setTuner} personalized={data.personalized} />
        <div className="home-note">
          <p className="kicker">本周编者的话</p>
          <p>
            好的推荐不是猜中你，而是让你知道为什么。声屿把推荐因子摊开：你喜欢的风格、关注的人、最近循环的歌，
            再加上你可以亲手拧动的三个旋钮。
          </p>
          <span>— 声屿编辑部</span>
        </div>
      </div>

      {data.continueListening.length > 0 ? (
        <Section kicker="Pick up where you left" title="继续收听">
          <Shelf label="继续收听">
            {data.continueListening.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                onPlay={() => {
                  const index = data.continueListening.findIndex((entry) => entry.id === track.id);
                  player.playTracks(data.continueListening, index);
                }}
              />
            ))}
          </Shelf>
        </Section>
      ) : null}

      <Section kicker="Explained picks" title="为你挑选" action={{ label: '问向导更多', to: '/guide' }}>
        <Shelf label="为你挑选">
          {data.picks.map((pick, index) => (
            <TrackCard
              key={pick.track.id}
              track={pick.track}
              reason={pick.reason}
              onPlay={() => playPicks(index)}
            />
          ))}
        </Shelf>
      </Section>

      <Section kicker="Right now" title="此刻流行" action={{ label: '去搜索', to: '/search' }}>
        <div className="chart-wrap">
          <TrackList tracks={data.trending} showAlbum />
        </div>
      </Section>

      <Section kicker="Fresh ink" title="新发行" action={{ label: '搜索全部专辑', to: '/search?type=albums' }}>
        <Shelf label="新发行">
          {data.releases.map((album) => (
            <ArtCard
              key={album.id}
              to={`/album/${album.id}`}
              title={album.title}
              subtitle={album.artist.name}
              meta={`${album.year} · ${album.type === 'album' ? '专辑' : album.type === 'ep' ? 'EP' : '单曲'}`}
              art={{ seed: album.artSeed, accent: album.accent, accent2: album.accent2 }}
              onPlay={() => void playAlbum(album.id)}
            />
          ))}
        </Shelf>
      </Section>

      <Section kicker="Voices" title="值得关注的音乐人">
        <Shelf label="值得关注的音乐人">
          {data.artists.map((artist) => (
            <ArtCard
              key={artist.id}
              to={`/artist/${artist.id}`}
              title={artist.name}
              subtitle={`${artist.genre} · ${artist.origin}`}
              meta={`${listenersLabel(artist.monthlyListeners)} 月听众`}
              art={{ seed: artist.artSeed, accent: artist.accent, accent2: artist.accent2 }}
              shape="squircle"
              monogram
              onPlay={() => void playArtist(artist.id)}
            />
          ))}
        </Shelf>
      </Section>

      <Section kicker="Always on" title="氛围电台">
        <div className="station-grid">
          {data.stations.map((station) => (
            <StationTile key={station.id} station={station} onPlay={() => void playStation(station.id)} />
          ))}
        </div>
      </Section>

      <Section kicker="Listen slow" title="播客精选" action={{ label: '全部播客', to: '/podcasts' }}>
        <Shelf label="播客精选">
          {data.podcasts.map((podcast) => (
            <ArtCard
              key={podcast.id}
              to={`/podcast/${podcast.id}`}
              title={podcast.title}
              subtitle={podcast.publisher}
              meta={`${podcast.episodeCount} 集 · ${podcast.category}`}
              art={{ seed: podcast.artSeed, accent: podcast.accent, accent2: podcast.accent2 }}
              badge="PODCAST"
              monogram
              onPlay={() => void playPodcast(podcast.id)}
            />
          ))}
        </Shelf>
      </Section>

      <Section kicker="Editorial" title="编辑歌单" action={{ label: '音乐库', to: '/library' }}>
        <Shelf label="编辑歌单">
          {data.playlists.map((playlist) => (
            <ArtCard
              key={playlist.id}
              to={`/playlist/${playlist.id}`}
              title={playlist.title}
              subtitle={playlist.description}
              meta={`${playlist.trackCount} 首`}
              art={{ seed: playlist.artSeed, accent: playlist.accent, accent2: playlist.accent2 }}
              shape="squircle"
              monogram
              onPlay={() => void playPlaylist(playlist.id)}
            />
          ))}
        </Shelf>
      </Section>

      <footer className="home-footer">
        <span>声屿 · 原创音乐流媒体原型</span>
        <span>所有音频为原创合成样带 · 无第三方录音</span>
        <Link to="/plans" className="text-link">订阅说明</Link>
      </footer>
    </div>
  );
}