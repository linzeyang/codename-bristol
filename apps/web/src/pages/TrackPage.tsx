import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { TrackDetail } from '../api/types';
import { ArtCard } from '../components/ArtCard';
import { CoverArt } from '../components/CoverArt';
import { TrackList } from '../components/TrackRow';
import { ErrorState, Section, Skeleton } from '../components/ui';
import {
  HeartFilledIcon,
  HeartIcon,
  LyricsIcon,
  PlayIcon,
  PlusIcon,
  QueueIcon,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylistPicker } from '../context/PlaylistPickerContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { usePlayCollection } from '../hooks/usePlayCollection';
import { ALBUM_TYPE_LABELS, genreLabel } from '../lib/labels';
import { formatTime, playsLabel, trackToItem } from '../lib/player';

export function TrackPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useFetch<TrackDetail>(`/tracks/${id}`, [id]);
  const { user } = useAuth();
  const { show } = useToast();
  const player = usePlayer();
  const picker = usePlaylistPicker();
  const { playAlbum, playPlaylist } = usePlayCollection();
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (data) {
      setLiked(data.track.liked);
      document.title = `${data.track.title} · ${data.track.artist.name} · 声屿`;
    }
  }, [data]);

  if (loading && !data) {
    return <div className="page"><Skeleton className="skeleton-hero" /><Skeleton className="skeleton-line" count={6} /></div>;
  }
  if (error || !data) return <ErrorState message={error ?? '曲目不存在'} onRetry={reload} />;

  const { track, related, appearsOn } = data;

  const toggleLike = async () => {
    if (!user) {
      show('登录后即可收藏喜欢的歌', 'info');
      return;
    }
    try {
      const response = await api.post<{ liked: boolean }>(`/likes/${track.id}`);
      setLiked(response.liked);
      show(response.liked ? '已加入「喜欢」' : '已取消喜欢', 'success');
    } catch {
      show('操作失败，请稍后再试', 'error');
    }
  };

  const playTrack = () => {
    const queue = [track, ...related];
    player.playItems(queue.map((entry) => trackToItem(entry)), 0);
  };

  const openLyrics = () => {
    if (player.current?.key !== `track:${track.id}`) {
      const queue = [track, ...related];
      player.playItems(queue.map((entry) => trackToItem(entry)), 0, { autoOpen: false });
    }
    window.setTimeout(() => player.openNowPlaying('lyrics'), 60);
  };

  return (
    <div className="page track-page">
      <section
        className="track-hero"
        style={{ ['--tr-a' as string]: track.album.accent, ['--tr-b' as string]: track.album.accent2 }}
      >
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">发现</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/artist/${track.artist.id}`}>{track.artist.name}</Link>
          <span aria-hidden="true">/</span>
          <span>{track.title}</span>
        </nav>
        <div className="track-hero-inner">
          <div className="track-cover">
            <CoverArt
              seed={track.album.artSeed}
              accent={track.album.accent}
              accent2={track.album.accent2}
              label={track.title}
            />
          </div>
          <div className="track-copy">
            <p className="kicker">Song · {genreLabel(track.genre)}</p>
            <h1>{track.title}</h1>
            <p className="track-byline">
              <Link to={`/artist/${track.artist.id}`}>{track.artist.name}</Link>
              <span>·</span>
              <Link to={`/album/${track.album.id}`}>{track.album.title}</Link>
              <span>·</span>
              <span>{track.album.year}</span>
              <span>·</span>
              <span>{formatTime(track.durationSec)}</span>
              <span>·</span>
              <span>{playsLabel(track.plays)} 次播放</span>
            </p>
            <div className="track-moods">
              {track.moods.map((mood) => <span key={mood} className="chip">{mood}</span>)}
              <span className="chip">能量 {Math.round(track.energy * 100)}</span>
            </div>
            <div className="track-actions">
              <button type="button" className="btn btn-primary" onClick={playTrack}>
                <PlayIcon size={18} />
                播放
              </button>
              <button
                type="button"
                className={`icon-btn on-hero${liked ? ' is-liked' : ''}`}
                onClick={() => void toggleLike()}
                aria-label={liked ? '取消喜欢' : '喜欢'}
                aria-pressed={liked}
              >
                {liked ? <HeartFilledIcon size={20} /> : <HeartIcon size={20} />}
              </button>
              <button type="button" className="icon-btn on-hero" onClick={() => picker.openFor(track)} aria-label="加入歌单">
                <PlusIcon size={20} />
              </button>
              <button
                type="button"
                className="icon-btn on-hero"
                onClick={() => player.addToQueue([trackToItem(track)])}
                aria-label="加入队列"
              >
                <QueueIcon size={20} />
              </button>
              <button type="button" className="btn btn-ghost on-hero-btn" onClick={openLyrics}>
                <LyricsIcon size={18} />
                舱内跟唱
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="track-body">
        <div className="track-main-col">
          <Section kicker="Lyrics" title="歌词" action={
            <button type="button" className="text-link" onClick={openLyrics}>
              <LyricsIcon size={15} /> 同步歌词
            </button>
          }>
            {track.lyrics.length > 0 ? (
              <div className="lyrics-page">
                {track.lyrics.map((line) => (
                  <p key={`${line.t}-${line.text}`}>{line.text}</p>
                ))}
                <span className="lyrics-credit">原创歌词 · 由声屿为演示生成</span>
              </div>
            ) : (
              <p className="muted">这是一段器乐，没有歌词。</p>
            )}
          </Section>

          {related.length > 0 ? (
            <Section kicker="Next up" title="听完这首，也许会喜欢">
              <div className="chart-wrap">
                <TrackList tracks={related} showAlbum />
              </div>
            </Section>
          ) : null}
        </div>

        <aside className="track-side">
          <div className="side-card album-mini">
            <Link to={`/album/${track.album.id}`} className="side-card-art">
              <CoverArt
                seed={track.album.artSeed}
                accent={track.album.accent}
                accent2={track.album.accent2}
                label={track.album.title}
              />
            </Link>
            <p className="kicker">{ALBUM_TYPE_LABELS[track.album.type]}</p>
            <h3><Link to={`/album/${track.album.id}`}>{track.album.title}</Link></h3>
            <p>{track.artist.name} · {track.album.year}</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void playAlbum(track.album.id)}>
              <PlayIcon size={16} /> 播放整张
            </button>
          </div>

          <div className="side-card artist-mini">
            <div className="artist-mini-avatar">
              <CoverArt
                seed={track.artist.artSeed}
                accent={track.artist.accent}
                accent2={track.artist.accent2}
                label={track.artist.name}
                monogram
              />
            </div>
            <p className="kicker">Artist</p>
            <h3><Link to={`/artist/${track.artist.id}`}>{track.artist.name}</Link></h3>
            <p>{genreLabel(track.artist.genre)}</p>
            <Link to={`/artist/${track.artist.id}`} className="btn btn-ghost btn-sm">查看音乐人</Link>
          </div>

          {appearsOn.length > 0 ? (
            <div className="side-card">
              <p className="kicker">Appears on</p>
              <h3>收录歌单</h3>
              <div className="mini-list">
                {appearsOn.map((playlist) => (
                  <div key={playlist.id} className="mini-row">
                    <button
                      type="button"
                      className="mini-art"
                      onClick={() => void playPlaylist(playlist.id)}
                      aria-label={`播放歌单 ${playlist.title}`}
                    >
                      <CoverArt
                        seed={playlist.artSeed}
                        accent={playlist.accent}
                        accent2={playlist.accent2}
                        label={playlist.title}
                      />
                    </button>
                    <span>
                      <Link to={`/playlist/${playlist.id}`}>{playlist.title}</Link>
                      <small>{playlist.trackCount} 首</small>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {appearsOn.length > 0 ? (
        <Section kicker="Collected in" title="这首歌也出现在">
          <div className="cards-grid compact-grid">
            {appearsOn.map((playlist) => (
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
          </div>
        </Section>
      ) : null}
    </div>
  );
}