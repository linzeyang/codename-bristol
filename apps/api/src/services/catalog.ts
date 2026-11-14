import type { Db } from '../db/types.js';
import type {
  AlbumDTO,
  ArtistDTO,
  EpisodeDTO,
  LyricLine,
  PlaylistDTO,
  PodcastDTO,
  TrackDTO,
} from '../types.js';

interface TrackRow {
  id: string;
  title: string;
  duration_sec: number;
  track_no: number;
  audio_key: string;
  play_count: string | number;
  genre: string;
  moods: string[] | null;
  energy: number;
  lyrics: LyricLine[] | string;
  is_explicit: boolean;
  artist_id: string;
  artist_name: string;
  artist_genre: string;
  artist_art_seed: number;
  artist_accent: string;
  artist_accent2: string;
  album_id: string;
  album_title: string;
  album_year: number;
  album_type: 'album' | 'ep' | 'single';
  album_art_seed: number;
  album_accent: string;
  album_accent2: string;
  liked: boolean;
}

const TRACK_COLUMNS = `
  t.id, t.title, t.duration_sec, t.track_no, t.audio_key, t.play_count, t.genre,
  t.moods, t.energy, t.lyrics, t.is_explicit,
  ar.id AS artist_id, ar.name AS artist_name, ar.genre AS artist_genre, ar.art_seed AS artist_art_seed,
  ar.accent AS artist_accent, ar.accent2 AS artist_accent2,
  al.id AS album_id, al.title AS album_title, al.year AS album_year, al.type AS album_type,
  al.art_seed AS album_art_seed, al.accent AS album_accent, al.accent2 AS album_accent2,
  EXISTS (SELECT 1 FROM likes li WHERE li.user_id = $1 AND li.track_id = t.id) AS liked
`;

const TRACK_FROM = `
  FROM tracks t
  JOIN artists ar ON ar.id = t.artist_id
  JOIN albums al ON al.id = t.album_id
`;

function parseLyrics(value: LyricLine[] | string): LyricLine[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as LyricLine[]) : [];
  } catch {
    return [];
  }
}

export function mapTrack(row: TrackRow): TrackDTO {
  return {
    id: row.id,
    title: row.title,
    durationSec: row.duration_sec,
    trackNo: row.track_no,
    audioUrl: `/media/audio/${row.audio_key}.mp3`,
    plays: Number(row.play_count),
    genre: row.genre,
    moods: row.moods ?? [],
    energy: Number(row.energy),
    lyrics: parseLyrics(row.lyrics),
    isExplicit: row.is_explicit,
    liked: Boolean(row.liked),
    artist: {
      id: row.artist_id,
      name: row.artist_name,
      genre: row.artist_genre,
      artSeed: row.artist_art_seed,
      accent: row.artist_accent,
      accent2: row.artist_accent2,
    },
    album: {
      id: row.album_id,
      title: row.album_title,
      year: row.album_year,
      type: row.album_type,
      artSeed: row.album_art_seed,
      accent: row.album_accent,
      accent2: row.album_accent2,
    },
  };
}

export interface TrackQuery {
  albumId?: string;
  artistId?: string;
  playlistId?: string;
  ids?: string[];
  search?: string;
  genre?: string;
  moods?: string[];
  limit?: number;
  order?: 'album' | 'popular' | 'playlist';
}

export async function queryTracks(db: Db, userId: string | null, opts: TrackQuery = {}): Promise<TrackDTO[]> {
  const params: unknown[] = [userId];
  const conditions: string[] = [];
  const joins: string[] = [];
  const add = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };

  if (opts.ids) {
    if (opts.ids.length === 0) return [];
    const placeholder = add(opts.ids);
    conditions.push(`t.id = ANY(${placeholder}::text[])`);
  }
  if (opts.albumId) conditions.push(`t.album_id = ${add(opts.albumId)}`);
  if (opts.artistId) conditions.push(`t.artist_id = ${add(opts.artistId)}`);
  if (opts.genre) {
    const placeholder = add(opts.genre);
    conditions.push(`(t.genre = ${placeholder} OR ar.genre = ${placeholder})`);
  }
  if (opts.moods && opts.moods.length > 0) {
    conditions.push(`t.moods && ${add(opts.moods)}::text[]`);
  }
  if (opts.playlistId) {
    const placeholder = add(opts.playlistId);
    joins.push(`JOIN playlist_tracks pt ON pt.track_id = t.id AND pt.playlist_id = ${placeholder}`);
  }
  if (opts.search) {
    const pattern = `%${opts.search}%`;
    const placeholder = add(pattern);
    conditions.push(`(t.title ILIKE ${placeholder} OR ar.name ILIKE ${placeholder} OR al.title ILIKE ${placeholder} OR t.genre ILIKE ${placeholder})`);
  }

  const order = opts.order === 'album'
    ? 'al.year DESC, t.track_no ASC, t.title ASC'
    : opts.order === 'playlist'
      ? 'pt.position ASC, t.track_no ASC'
      : 't.play_count DESC, t.title ASC';
  const limit = Math.max(1, Math.min(200, opts.limit ?? 80));
  const sql = `
    SELECT ${TRACK_COLUMNS} ${TRACK_FROM} ${joins.join(' ')}
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY ${order}
    LIMIT ${limit}
  `;
  const { rows } = await db.query<TrackRow>(sql, params);
  return rows.map(mapTrack);
}

export async function tracksByIds(db: Db, userId: string | null, ids: string[]): Promise<TrackDTO[]> {
  if (ids.length === 0) return [];
  const { rows } = await db.query<TrackRow>(
    `SELECT ${TRACK_COLUMNS} ${TRACK_FROM}
     WHERE t.id = ANY($2::text[])
     ORDER BY array_position($2::text[], t.id)`,
    [userId, ids],
  );
  return rows.map(mapTrack);
}

export async function trackById(db: Db, userId: string | null, id: string): Promise<TrackDTO | null> {
  const { rows } = await db.query<TrackRow>(
    `SELECT ${TRACK_COLUMNS} ${TRACK_FROM} WHERE t.id = $2 LIMIT 1`,
    [userId, id],
  );
  return rows[0] ? mapTrack(rows[0]) : null;
}

interface ArtistRow {
  id: string;
  name: string;
  genre: string;
  bio: string;
  monthly_listeners: number;
  origin: string;
  accent: string;
  accent2: string;
  art_seed: number;
  following?: boolean;
  track_count?: string | number;
}

function mapArtist(row: ArtistRow): ArtistDTO & { following: boolean; trackCount: number } {
  return {
    id: row.id,
    name: row.name,
    genre: row.genre,
    bio: row.bio,
    monthlyListeners: Number(row.monthly_listeners),
    origin: row.origin,
    accent: row.accent,
    accent2: row.accent2,
    artSeed: row.art_seed,
    following: Boolean(row.following),
    trackCount: Number(row.track_count ?? 0),
  };
}

export async function listArtists(db: Db, userId: string | null, limit = 20): Promise<(ArtistDTO & { following: boolean; trackCount: number })[]> {
  const { rows } = await db.query<ArtistRow>(
    `SELECT ar.*,
       EXISTS (SELECT 1 FROM follows f WHERE f.user_id = $1 AND f.artist_id = ar.id) AS following,
       (SELECT count(*) FROM tracks t WHERE t.artist_id = ar.id) AS track_count
     FROM artists ar ORDER BY ar.monthly_listeners DESC, ar.name ASC LIMIT $2`,
    [userId, Math.max(1, Math.min(100, limit))],
  );
  return rows.map(mapArtist);
}

export async function artistDetail(db: Db, userId: string | null, id: string) {
  const { rows } = await db.query<ArtistRow>(
    `SELECT ar.*,
       EXISTS (SELECT 1 FROM follows f WHERE f.user_id = $1 AND f.artist_id = ar.id) AS following,
       (SELECT count(*) FROM tracks t WHERE t.artist_id = ar.id) AS track_count
     FROM artists ar WHERE ar.id = $2 LIMIT 1`,
    [userId, id],
  );
  const row = rows[0];
  if (!row) return null;

  const [popularTracks, albums, appearsOn, similarArtists] = await Promise.all([
    queryTracks(db, userId, { artistId: id, limit: 10, order: 'popular' }),
    db.query<AlbumRow>(
      `SELECT al.*, ar.name AS artist_name
       FROM albums al JOIN artists ar ON ar.id = al.artist_id
       WHERE al.artist_id = $1 ORDER BY al.year DESC, al.title ASC`,
      [id],
    ),
    db.query<PlaylistRow>(
      `SELECT DISTINCT p.*, u.display_name AS owner_display_name,
         (SELECT count(*) FROM playlist_tracks x WHERE x.playlist_id = p.id) AS track_count,
         (SELECT COALESCE(sum(tr.duration_sec), 0) FROM playlist_tracks x JOIN tracks tr ON tr.id = x.track_id WHERE x.playlist_id = p.id) AS duration_sec
       FROM playlists p
       LEFT JOIN users u ON u.id = p.owner_id
       JOIN playlist_tracks pt ON pt.playlist_id = p.id
       JOIN tracks t ON t.id = pt.track_id
       WHERE t.artist_id = $1 AND p.is_editorial = true
       ORDER BY p.updated_at DESC LIMIT 6`,
      [id],
    ),
    db.query<ArtistRow>(
      `SELECT ar.*,
         EXISTS (SELECT 1 FROM follows f WHERE f.user_id = $1 AND f.artist_id = ar.id) AS following,
         (SELECT count(*) FROM tracks t WHERE t.artist_id = ar.id) AS track_count
       FROM artists ar WHERE ar.id <> $3
       ORDER BY (ar.genre = $2) DESC, ar.monthly_listeners DESC LIMIT 6`,
      [userId, row.genre, id],
    ),
  ]);

  return {
    artist: mapArtist(row),
    popularTracks,
    albums: albums.rows.map(mapAlbum),
    appearsOn: appearsOn.rows.map(mapPlaylist),
    similarArtists: similarArtists.rows.map(mapArtist),
  };
}

interface AlbumRow {
  id: string;
  artist_id: string;
  title: string;
  year: number;
  type: 'album' | 'ep' | 'single';
  description: string;
  accent: string;
  accent2: string;
  art_seed: number;
  artist_name: string;
  saved?: boolean;
}

function mapAlbum(row: AlbumRow): AlbumDTO & { saved: boolean } {
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    type: row.type,
    description: row.description,
    accent: row.accent,
    accent2: row.accent2,
    artSeed: row.art_seed,
    artist: { id: row.artist_id, name: row.artist_name },
    saved: Boolean(row.saved),
  };
}

export async function listAlbums(db: Db, userId: string | null, limit = 20) {
  const { rows } = await db.query<AlbumRow>(
    `SELECT al.*, ar.name AS artist_name,
       EXISTS (SELECT 1 FROM saved_albums sa WHERE sa.user_id = $1 AND sa.album_id = al.id) AS saved
     FROM albums al JOIN artists ar ON ar.id = al.artist_id
     ORDER BY al.year DESC, al.title ASC LIMIT $2`,
    [userId, Math.max(1, Math.min(100, limit))],
  );
  return rows.map(mapAlbum);
}

export async function albumDetail(db: Db, userId: string | null, id: string) {
  const { rows } = await db.query<AlbumRow>(
    `SELECT al.*, ar.name AS artist_name,
       EXISTS (SELECT 1 FROM saved_albums sa WHERE sa.user_id = $1 AND sa.album_id = al.id) AS saved
     FROM albums al JOIN artists ar ON ar.id = al.artist_id WHERE al.id = $2 LIMIT 1`,
    [userId, id],
  );
  const row = rows[0];
  if (!row) return null;
  const [tracks, moreByArtist] = await Promise.all([
    queryTracks(db, userId, { albumId: id, order: 'album' }),
    db.query<AlbumRow>(
      `SELECT al.*, ar.name AS artist_name,
         EXISTS (SELECT 1 FROM saved_albums sa WHERE sa.user_id = $1 AND sa.album_id = al.id) AS saved
       FROM albums al JOIN artists ar ON ar.id = al.artist_id
       WHERE al.artist_id = $2 AND al.id <> $3 ORDER BY al.year DESC LIMIT 8`,
      [userId, row.artist_id, id],
    ),
  ]);
  return {
    album: mapAlbum(row),
    tracks,
    totalDurationSec: tracks.reduce((sum, track) => sum + track.durationSec, 0),
    moreByArtist: moreByArtist.rows.map(mapAlbum),
  };
}

interface PlaylistRow {
  id: string;
  owner_id: string | null;
  title: string;
  description: string;
  is_editorial: boolean;
  accent: string;
  accent2: string;
  art_seed: number;
  created_at: string | Date;
  updated_at: string | Date;
  owner_display_name: string | null;
  track_count: string | number;
  duration_sec: string | number;
}

function mapPlaylist(row: PlaylistRow): PlaylistDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    isEditorial: row.is_editorial,
    accent: row.accent,
    accent2: row.accent2,
    artSeed: row.art_seed,
    owner: row.owner_id ? { id: row.owner_id, displayName: row.owner_display_name ?? '声屿用户' } : null,
    trackCount: Number(row.track_count),
    durationSec: Number(row.duration_sec),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

const PLAYLIST_SELECT = `
  SELECT p.*, u.display_name AS owner_display_name,
    (SELECT count(*) FROM playlist_tracks x WHERE x.playlist_id = p.id) AS track_count,
    (SELECT COALESCE(sum(tr.duration_sec), 0) FROM playlist_tracks x JOIN tracks tr ON tr.id = x.track_id WHERE x.playlist_id = p.id) AS duration_sec
  FROM playlists p LEFT JOIN users u ON u.id = p.owner_id
`;

export async function listPlaylists(db: Db, userId: string | null, kind: 'editorial' | 'mine') {
  if (kind === 'mine') {
    if (!userId) return [];
    const { rows } = await db.query<PlaylistRow>(
      `${PLAYLIST_SELECT} WHERE p.owner_id = $1 ORDER BY p.updated_at DESC`,
      [userId],
    );
    return rows.map(mapPlaylist);
  }
  const { rows } = await db.query<PlaylistRow>(
    `${PLAYLIST_SELECT} WHERE p.is_editorial = true ORDER BY p.updated_at DESC`,
  );
  return rows.map(mapPlaylist);
}

export async function playlistDetail(db: Db, userId: string | null, id: string) {
  const { rows } = await db.query<PlaylistRow>(`${PLAYLIST_SELECT} WHERE p.id = $1 LIMIT 1`, [id]);
  const row = rows[0];
  if (!row) return null;
  const isOwner = Boolean(userId && row.owner_id === userId);
  if (!row.is_editorial && !isOwner) return 'forbidden' as const;
  const tracks = await queryTracks(db, userId, { playlistId: id, order: 'playlist', limit: 200 });
  return {
    playlist: mapPlaylist(row),
    tracks,
    totalDurationSec: tracks.reduce((sum, track) => sum + track.durationSec, 0),
    isOwner,
  };
}

interface PodcastRow {
  id: string;
  title: string;
  publisher: string;
  description: string;
  category: string;
  accent: string;
  accent2: string;
  art_seed: number;
  episode_count: string | number;
  following: boolean;
}

function mapPodcast(row: PodcastRow): PodcastDTO {
  return {
    id: row.id,
    title: row.title,
    publisher: row.publisher,
    description: row.description,
    category: row.category,
    accent: row.accent,
    accent2: row.accent2,
    artSeed: row.art_seed,
    episodeCount: Number(row.episode_count),
    following: Boolean(row.following),
  };
}

const PODCAST_SELECT = `
  SELECT p.*,
    (SELECT count(*) FROM episodes e WHERE e.podcast_id = p.id) AS episode_count,
    EXISTS (SELECT 1 FROM podcast_follows pf WHERE pf.user_id = $1 AND pf.podcast_id = p.id) AS following
  FROM podcasts p
`;

export async function listPodcasts(db: Db, userId: string | null) {
  const { rows } = await db.query<PodcastRow>(`${PODCAST_SELECT} ORDER BY p.title ASC`, [userId]);
  return rows.map(mapPodcast);
}

interface EpisodeRow {
  id: string;
  podcast_id: string;
  title: string;
  description: string;
  duration_sec: number;
  episode_no: number;
  published_at: string | Date;
  audio_key: string;
  podcast_title: string;
  art_seed: number;
  accent: string;
  accent2: string;
}

function mapEpisode(row: EpisodeRow): EpisodeDTO {
  return {
    id: row.id,
    podcastId: row.podcast_id,
    title: row.title,
    description: row.description,
    durationSec: row.duration_sec,
    episodeNo: row.episode_no,
    publishedAt: new Date(row.published_at).toISOString(),
    audioUrl: `/media/audio/${row.audio_key}.mp3`,
    podcastTitle: row.podcast_title,
    artSeed: row.art_seed,
    accent: row.accent,
    accent2: row.accent2,
  };
}

export async function podcastDetail(db: Db, userId: string | null, id: string) {
  const { rows } = await db.query<PodcastRow>(`${PODCAST_SELECT} WHERE p.id = $2 LIMIT 1`, [userId, id]);
  const row = rows[0];
  if (!row) return null;
  const { rows: episodes } = await db.query<EpisodeRow>(
    `SELECT e.*, p.title AS podcast_title, p.art_seed, p.accent, p.accent2
     FROM episodes e JOIN podcasts p ON p.id = e.podcast_id
     WHERE e.podcast_id = $1 ORDER BY e.published_at DESC, e.episode_no DESC`,
    [id],
  );
  return { podcast: mapPodcast(row), episodes: episodes.map(mapEpisode) };
}

export interface SearchResults {
  tracks: TrackDTO[];
  artists: (ArtistDTO & { following: boolean; trackCount: number })[];
  albums: (AlbumDTO & { saved: boolean })[];
  playlists: PlaylistDTO[];
  podcasts: PodcastDTO[];
}

export async function searchAll(db: Db, userId: string | null, query: string, type = 'all'): Promise<SearchResults> {
  const pattern = `%${query}%`;
  const want = (kind: string) => type === 'all' || type === kind;
  const empty: SearchResults = { tracks: [], artists: [], albums: [], playlists: [], podcasts: [] };

  const [tracks, artists, albums, playlists, podcasts] = await Promise.all([
    want('tracks') ? queryTracks(db, userId, { search: query, limit: 12 }) : Promise.resolve([]),
    want('artists')
      ? db.query<ArtistRow>(
          `SELECT ar.*,
             EXISTS (SELECT 1 FROM follows f WHERE f.user_id = $1 AND f.artist_id = ar.id) AS following,
             (SELECT count(*) FROM tracks t WHERE t.artist_id = ar.id) AS track_count
           FROM artists ar WHERE ar.name ILIKE $2 OR ar.genre ILIKE $2
           ORDER BY ar.monthly_listeners DESC LIMIT 8`,
          [userId, pattern],
        ).then((r) => r.rows.map(mapArtist))
      : Promise.resolve([]),
    want('albums')
      ? db.query<AlbumRow>(
          `SELECT al.*, ar.name AS artist_name,
             EXISTS (SELECT 1 FROM saved_albums sa WHERE sa.user_id = $1 AND sa.album_id = al.id) AS saved
           FROM albums al JOIN artists ar ON ar.id = al.artist_id
           WHERE al.title ILIKE $2 OR ar.name ILIKE $2 OR al.description ILIKE $2
           ORDER BY al.year DESC LIMIT 8`,
          [userId, pattern],
        ).then((r) => r.rows.map(mapAlbum))
      : Promise.resolve([]),
    want('playlists')
      ? db.query<PlaylistRow>(
          `${PLAYLIST_SELECT} WHERE (p.title ILIKE $2 OR p.description ILIKE $2)
             AND (p.is_editorial = true OR p.owner_id = $1)
           ORDER BY p.updated_at DESC LIMIT 8`,
          [userId, pattern],
        ).then((r) => r.rows.map(mapPlaylist))
      : Promise.resolve([]),
    want('podcasts')
      ? db.query<PodcastRow>(
          `${PODCAST_SELECT} WHERE p.title ILIKE $2 OR p.publisher ILIKE $2 OR p.category ILIKE $2
           ORDER BY p.title ASC LIMIT 8`,
          [userId, pattern],
        ).then((r) => r.rows.map(mapPodcast))
      : Promise.resolve([]),
  ]);

  return { ...empty, tracks, artists, albums, playlists, podcasts };
}