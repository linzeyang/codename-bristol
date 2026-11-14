import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { SearchResults } from '../api/types';
import { ArtCard } from '../components/ArtCard';
import { CoverArt } from '../components/CoverArt';
import { Chip, EmptyState, ErrorState, Section, Shelf, Skeleton, Spinner } from '../components/ui';
import { TrackList } from '../components/TrackRow';
import { PlayIcon, SearchIcon, SparklesIcon } from '../components/Icons';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { usePlayCollection } from '../hooks/usePlayCollection';
import { trackToItem } from '../lib/player';

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'tracks', label: '歌曲' },
  { key: 'artists', label: '音乐人' },
  { key: 'albums', label: '专辑' },
  { key: 'playlists', label: '歌单' },
  { key: 'podcasts', label: '播客' },
] as const;

type SearchTab = (typeof TABS)[number]['key'];

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q')?.trim() ?? '';
  const tabParam = params.get('type') ?? 'all';
  const tab: SearchTab = TABS.some((entry) => entry.key === tabParam) ? (tabParam as SearchTab) : 'all';
  const [input, setInput] = useState(query);
  const player = usePlayer();
  const { show } = useToast();
  const { playAlbum, playArtist, playPlaylist, playPodcast } = usePlayCollection();

  useEffect(() => {
    setInput(query);
    document.title = query ? `${query} · 搜索 · 声屿` : '搜索 · 声屿';
  }, [query]);

  const { data, loading, error, reload } = useFetch<{ query: string; results: SearchResults }>(
    query ? `/search?q=${encodeURIComponent(query)}&type=${tab}` : null,
    [query, tab],
  );
  const suggestions = useFetch<{ recent: string[]; hot: string[] }>(query ? null : '/search/suggestions', []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      api.get(`/search?q=${encodeURIComponent(trimmed)}&record=1`).catch(() => {});
      setParams({ q: trimmed, type: tab });
    } else {
      setParams({});
    }
  };

  const runQuery = (next: string) => {
    setInput(next);
    setParams({ q: next, type: 'all' });
    api.get(`/search?q=${encodeURIComponent(next)}&record=1`).catch(() => {});
  };

  const results = data?.results;
  const total = results
    ? results.tracks.length + results.artists.length + results.albums.length + results.playlists.length + results.podcasts.length
    : 0;

  const playAllTracks = () => {
    if (!results || results.tracks.length === 0) return;
    player.playItems(results.tracks.map((track) => trackToItem(track)), 0);
    show('正在播放搜索结果', 'info');
  };

  return (
    <div className="page search-page">
      <header className="search-hero">
        <p className="kicker">Search the isle</p>
        <h1>搜索声屿</h1>
        <form className="search-form" onSubmit={submit} role="search">
          <SearchIcon size={22} />
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="歌曲、音乐人、专辑、歌单、播客…"
            aria-label="搜索"
            autoComplete="off"
          />
          {input ? (
            <button type="button" className="search-clear" onClick={() => { setInput(''); setParams({}); }} aria-label="清空搜索">
              ×
            </button>
          ) : null}
          <button type="submit" className="btn btn-primary">搜索</button>
        </form>
        <p className="search-hint">
          也可以直接问 <Link to="/guide" className="text-link"><SparklesIcon size={14} /> 声屿向导</Link>：「适合雨夜写代码的歌」
        </p>
      </header>

      {!query ? (
        <div className="search-idle">
          {suggestions.data?.recent.length ? (
            <section className="search-block">
              <p className="kicker">Recent</p>
              <h2>最近搜索</h2>
              <div className="chip-row">
                {suggestions.data.recent.map((term) => (
                  <Chip key={term} as="button" onClick={() => runQuery(term)}>{term}</Chip>
                ))}
              </div>
            </section>
          ) : null}
          <section className="search-block">
            <p className="kicker">Trending searches</p>
            <h2>大家在找</h2>
            <div className="chip-row">
              {(suggestions.data?.hot ?? ['林晚星', '深夜', '雨天']).map((term) => (
                <Chip key={term} as="button" onClick={() => runQuery(term)}>{term}</Chip>
              ))}
            </div>
          </section>
          <div className="search-promo">
            <div className="search-promo-art">
              <CoverArt seed={31} accent="#E84A2A" accent2="#0D6E66" label="声屿向导" monogram />
            </div>
            <div>
              <p className="kicker">Say it, don't spell it</p>
              <h2>说不清歌名？描述你的场景。</h2>
              <p>「适合雨夜写代码」「想听像林晚星但更新鲜的」「给通勤一点节拍」——向导会从曲库挑选并给出理由。</p>
              <Link to="/guide" className="btn btn-primary btn-sm">
                <SparklesIcon size={17} />
                打开向导
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="search-results">
          <div className="search-tabs" role="tablist" aria-label="搜索结果类型">
            {TABS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={tab === entry.key}
                className={`chip${tab === entry.key ? ' is-active' : ''}`}
                onClick={() => setParams({ q: query, type: entry.key })}
              >
                {entry.label}
              </button>
            ))}
            {results ? <span className="search-count">{total} 个结果</span> : null}
          </div>

          {loading && !results ? (
            <div className="cards-grid"><Skeleton className="skeleton-card" count={6} /></div>
          ) : null}
          {error ? <ErrorState message={error} onRetry={reload} /> : null}

          {results ? (
            <>
              {results.tracks.length > 0 && (tab === 'all' || tab === 'tracks') ? (
                <Section kicker="Tracks" title="歌曲" action={tab === 'all' ? undefined : (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={playAllTracks}>
                    <PlayIcon size={16} /> 播放全部
                  </button>
                )}>
                  <div className="chart-wrap">
                    <TrackList tracks={results.tracks} showAlbum />
                  </div>
                </Section>
              ) : null}

              {results.artists.length > 0 && (tab === 'all' || tab === 'artists') ? (
                <Section kicker="Artists" title="音乐人">
                  <Shelf label="搜索音乐人">
                    {results.artists.map((artist) => (
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
                  </Shelf>
                </Section>
              ) : null}

              {results.albums.length > 0 && (tab === 'all' || tab === 'albums') ? (
                <Section kicker="Albums" title="专辑">
                  <div className="cards-grid">
                    {results.albums.map((album) => (
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
              ) : null}

              {results.playlists.length > 0 && (tab === 'all' || tab === 'playlists') ? (
                <Section kicker="Playlists" title="歌单">
                  <div className="cards-grid">
                    {results.playlists.map((playlist) => (
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

              {results.podcasts.length > 0 && (tab === 'all' || tab === 'podcasts') ? (
                <Section kicker="Podcasts" title="播客">
                  <div className="cards-grid">
                    {results.podcasts.map((podcast) => (
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
                  </div>
                </Section>
              ) : null}

              {total === 0 && !loading ? (
                <EmptyState
                  icon={<SearchIcon size={38} />}
                  title={`没有找到「${query}」`}
                  description="换个关键词，或者把需求直接交给向导：它不要求你知道歌名。"
                  action={<Link to={`/guide?q=${encodeURIComponent(query)}`} className="btn btn-primary btn-sm">问声屿向导</Link>}
                />
              ) : null}
            </>
          ) : loading ? (
            <Spinner label={`正在搜索「${query}」`} />
          ) : null}
        </div>
      )}
    </div>
  );
}