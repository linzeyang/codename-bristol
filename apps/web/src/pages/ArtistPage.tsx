import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { ArtistDetail } from '../api/types';
import { ArtCard } from '../components/ArtCard';
import { CoverArt } from '../components/CoverArt';
import { TrackList } from '../components/TrackRow';
import { ErrorState, Section, Skeleton } from '../components/ui';
import { CheckIcon, PlayIcon, PlusIcon, ShuffleIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { usePlayCollection } from '../hooks/usePlayCollection';
import { genreLabel } from '../lib/labels';
import { listenersLabel } from '../lib/player';

export function ArtistPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useFetch<ArtistDetail>(`/artists/${id}`, [id]);
  const { user } = useAuth();
  const { show } = useToast();
  const player = usePlayer();
  const { playAlbum, playPlaylist } = usePlayCollection();
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setFollowing(data.artist.following);
      document.title = `${data.artist.name} · 声屿`;
    }
  }, [data]);

  if (loading && !data) {
    return (
      <div className="page">
        <Skeleton className="skeleton-hero" />
        <div className="cards-grid"><Skeleton className="skeleton-card" count={5} /></div>
      </div>
    );
  }
  if (error || !data) return <ErrorState message={error ?? '音乐人不存在'} onRetry={reload} />;

  const { artist, popularTracks, albums, appearsOn, similarArtists } = data;

  const toggleFollow = async () => {
    if (!user) {
      show('登录后即可关注音乐人', 'info');
      return;
    }
    setFollowBusy(true);
    try {
      const response = await api.post<{ following: boolean }>(`/follows/${artist.id}`);
      setFollowing(response.following);
      show(response.following ? `已关注 ${artist.name}` : `已取消关注 ${artist.name}`, 'success');
    } catch {
      show('操作失败，请稍后再试', 'error');
    } finally {
      setFollowBusy(false);
    }
  };

  const shufflePlay = () => {
    if (popularTracks.length === 0) return;
    const shuffled = [...popularTracks];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    player.playTracks(shuffled, 0);
    show(`正在随机播放 ${artist.name}`, 'info');
  };

  return (
    <div className="page artist-page">
      <section
        className="artist-hero"
        style={{
          ['--artist-a' as string]: artist.accent,
          ['--artist-b' as string]: artist.accent2,
        }}
      >
        <div className="artist-hero-pattern" aria-hidden="true">
          <CoverArt seed={artist.artSeed} accent={artist.accent} accent2={artist.accent2} label={artist.name} />
        </div>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">发现</Link>
          <span aria-hidden="true">/</span>
          <span>音乐人</span>
        </nav>
        <div className="artist-hero-inner">
          <div className="artist-portrait">
            <CoverArt
              seed={artist.artSeed}
              accent={artist.accent}
              accent2={artist.accent2}
              label={artist.name}
              monogram
            />
            <span className="artist-rank">#{String((artist.monthlyListeners % 90) + 1).padStart(2, '0')} 本月</span>
          </div>
          <div className="artist-hero-copy">
            <p className="kicker">{genreLabel(artist.genre)} · {artist.origin}</p>
            <h1>{artist.name}</h1>
            <p className="artist-listeners">
              <strong>{listenersLabel(artist.monthlyListeners)}</strong> 月听众 · {artist.trackCount} 首作品
            </p>
            <p className="artist-bio-short">{artist.bio}</p>
            <div className="artist-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={popularTracks.length === 0}
                onClick={() => player.playTracks(popularTracks, 0)}
              >
                <PlayIcon size={18} />
                播放
              </button>
              <button type="button" className="btn btn-ghost" onClick={shufflePlay}>
                <ShuffleIcon size={18} />
                随机
              </button>
              <button
                type="button"
                className={`btn ${following ? 'btn-on-accent' : 'btn-ghost'}`}
                onClick={() => void toggleFollow()}
                disabled={followBusy}
                aria-pressed={following}
              >
                {following ? <CheckIcon size={17} /> : <PlusIcon size={17} />}
                {following ? '已关注' : '关注'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="artist-body">
        <Section kicker="Popular" title="热门曲目">
          <div className="chart-wrap">
            <TrackList tracks={popularTracks} showAlbum />
          </div>
        </Section>

        <div className="artist-columns">
          <div>
            <Section kicker="Discography" title="作品">
              <div className="cards-grid compact-grid">
                {albums.map((album) => (
                  <ArtCard
                    key={album.id}
                    to={`/album/${album.id}`}
                    title={album.title}
                    subtitle={album.year}
                    meta={album.type === 'album' ? '专辑' : album.type === 'ep' ? 'EP' : '单曲'}
                    art={{ seed: album.artSeed, accent: album.accent, accent2: album.accent2 }}
                    onPlay={() => void playAlbum(album.id)}
                  />
                ))}
              </div>
            </Section>
          </div>
          <aside className="artist-about">
            <p className="kicker">About</p>
            <h2>关于 {artist.name}</h2>
            <p>{artist.bio}</p>
            <dl>
              <div><dt>来自</dt><dd>{artist.origin}</dd></div>
              <div><dt>风格</dt><dd>{genreLabel(artist.genre)}</dd></div>
              <div><dt>月听众</dt><dd>{listenersLabel(artist.monthlyListeners)}</dd></div>
              <div><dt>作品</dt><dd>{artist.trackCount} 首</dd></div>
            </dl>
            <Link to={`/guide?q=${encodeURIComponent(`像${artist.name}一样的歌`)}`} className="btn btn-ghost btn-sm">
              听相似的声音
            </Link>
          </aside>
        </div>

        {appearsOn.length > 0 ? (
          <Section kicker="Appears on" title="收录于">
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

        {similarArtists.length > 0 ? (
          <Section kicker="Fans also like" title="相似的听众也在听">
            <div className="cards-grid">
              {similarArtists.map((similar) => (
                <ArtCard
                  key={similar.id}
                  to={`/artist/${similar.id}`}
                  title={similar.name}
                  subtitle={genreLabel(similar.genre)}
                  meta={`${listenersLabel(similar.monthlyListeners)} 月听众`}
                  art={{ seed: similar.artSeed, accent: similar.accent, accent2: similar.accent2 }}
                  shape="squircle"
                  monogram
                  onPlay={() => {
                    api.get<ArtistDetail>(`/artists/${similar.id}`).then((detail) => player.playTracks(detail.popularTracks, 0)).catch(() => show('加载失败', 'error'));
                  }}
                />
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    </div>
  );
}