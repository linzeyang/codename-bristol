export interface LyricLine {
  t: number;
  text: string;
}

export interface TrackArtistDTO {
  id: string;
  name: string;
  genre: string;
  artSeed: number;
  accent: string;
  accent2: string;
}

export interface TrackAlbumDTO {
  id: string;
  title: string;
  year: number;
  type: 'album' | 'ep' | 'single';
  artSeed: number;
  accent: string;
  accent2: string;
}

export interface TrackDTO {
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
  artist: TrackArtistDTO;
  album: TrackAlbumDTO;
}

export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  role: 'listener' | 'admin';
  planId: string;
  avatarHue: number;
  createdAt: string;
}

export interface SettingsDTO {
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

export interface ArtistDTO {
  id: string;
  name: string;
  genre: string;
  bio: string;
  monthlyListeners: number;
  origin: string;
  accent: string;
  accent2: string;
  artSeed: number;
}

export interface AlbumDTO {
  id: string;
  title: string;
  year: number;
  type: 'album' | 'ep' | 'single';
  description: string;
  accent: string;
  accent2: string;
  artSeed: number;
  artist: { id: string; name: string };
}

export interface PlaylistDTO {
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

export interface PodcastDTO {
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

export interface EpisodeDTO {
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

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'listener' | 'admin';
  planId: string;
  avatarHue: number;
  tokenVersion: number;
}