export interface LyricLine {
  t: number;
  text: string;
}

export interface TrackArtist {
  id: string;
  name: string;
  genre: string;
  artSeed: number;
  accent: string;
  accent2: string;
}

export interface TrackAlbum {
  id: string;
  title: string;
  year: number;
  type: 'album' | 'ep' | 'single';
  artSeed: number;
  accent: string;
  accent2: string;
}

export interface Track {
  id: string;
  title: string;
  durationSec: number;
  trackNo: number;
  audioUrl: string;
  plays: number;
  genre: string;
  moods: string[];
  energy: number;
  lyrics: LyricLine[];
  isExplicit: boolean;
  liked: boolean;
  artist: TrackArtist;
  album: TrackAlbum;
}

export interface Artist {
  id: string;
  name: string;
  genre: string;
  bio: string;
  monthlyListeners: number;
  origin: string;
  accent: string;
  accent2: string;
  artSeed: number;
  following: boolean;
  trackCount: number;
}

export interface Album {
  id: string;
  title: string;
  year: number;
  type: 'album' | 'ep' | 'single';
  description: string;
  accent: string;
  accent2: string;
  artSeed: number;
  artist: { id: string; name: string };
  saved: boolean;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  isEditorial: boolean;
  accent: string;
  accent2: string;
  artSeed: number;
  owner: { id: string; displayName: string } | null;
  trackCount: number;
  durationSec: number;
  updatedAt: string;
}

export interface Podcast {
  id: string;
  title: string;
  publisher: string;
  description: string;
  category: string;
  accent: string;
  accent2: string;
  artSeed: number;
  episodeCount: number;
  following: boolean;
}

export interface Episode {
  id: string;
  podcastId: string;
  title: string;
  description: string;
  durationSec: number;
  episodeNo: number;
  publishedAt: string;
  audioUrl: string;
  podcastTitle: string;
  artSeed: number;
  accent: string;
  accent2: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'listener' | 'admin';
  planId: string;
  avatarHue: number;
  createdAt: string;
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  audioQuality: 'standard' | 'high' | 'lossless';
  normalizeVolume: boolean;
  showNowPlaying: boolean;
  privateSession: boolean;
  autoplaySimilar: boolean;
  reduceMotion: boolean;
  notifyNewRelease: boolean;
  notifyEmail: boolean;
}

export interface Station {
  id: string;
  title: string;
  tagline: string;
  description: string;
  genre: string;
  moods: string[];
  energyMin: number;
  energyMax: number;
  accent: string;
  accent2: string;
  artSeed: number;
}

export interface Plan {
  id: string;
  name: string;
  priceLabel: string;
  period: string;
  tagline: string;
  features: string[];
  accent: string;
  featured: boolean;
  note: string;
}

export interface HomePick {
  track: Track;
  reason: string;
}

export interface HomePayload {
  greeting: string;
  personalized: boolean;
  tuner: { familiarity: number; energy: number; novelty: number };
  picks: HomePick[];
  trending: Track[];
  artists: Artist[];
  releases: Album[];
  playlists: Playlist[];
  podcasts: Podcast[];
  stations: Station[];
  continueListening: Track[];
}

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  podcasts: Podcast[];
}

export interface ArtistDetail {
  artist: Artist;
  popularTracks: Track[];
  albums: Album[];
  appearsOn: Playlist[];
  similarArtists: Artist[];
}

export interface AlbumDetail {
  album: Album;
  tracks: Track[];
  totalDurationSec: number;
  moreByArtist: Album[];
}

export interface TrackDetail {
  track: Track;
  related: Track[];
  appearsOn: Playlist[];
  album: TrackAlbum;
  artist: TrackArtist;
}

export interface PlaylistDetail {
  playlist: Playlist;
  tracks: Track[];
  totalDurationSec: number;
  isOwner: boolean;
}

export interface PodcastDetail {
  podcast: Podcast;
  episodes: Episode[];
}

export interface LibraryPayload {
  likedTracks: Track[];
  playlists: Playlist[];
  followedArtists: Artist[];
  savedAlbums: Album[];
  followedPodcasts: Podcast[];
  recentTracks: Track[];
  counts: {
    likedTracks: number;
    playlists: number;
    followedArtists: number;
    savedAlbums: number;
    followedPodcasts: number;
    recentTracks: number;
  };
}

export interface AssistantResponse {
  reply: string;
  tracks: (Track & { reason: string })[];
  source: 'local' | 'llm';
  intent: { moods: string[]; genres: string[] };
  suggestions: string[];
}

export interface MeResponse {
  user: User;
  settings: Settings;
}

export interface PlansResponse {
  plans: Plan[];
  currentPlanId: string;
  isGuest: boolean;
  demoNotice: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}