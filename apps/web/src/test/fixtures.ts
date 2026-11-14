import type { Track } from '../api/types';

export function makeTrack(id: string, title: string, overrides: Partial<Track> = {}): Track {
  return {
    id,
    title,
    durationSec: 45,
    trackNo: 1,
    audioUrl: '/media/audio/loop-01.mp3',
    plays: 1000,
    genre: 'folk',
    moods: ['深夜'],
    energy: 0.3,
    lyrics: [{ t: 0, text: '一行原创歌词' }],
    isExplicit: false,
    liked: false,
    artist: { id: 'ar-a', name: '林晚星', genre: 'folk', artSeed: 1, accent: '#E84A2A', accent2: '#F2C14E' },
    album: { id: 'al-a', title: '潮汐信箱', year: 2024, type: 'album', artSeed: 2, accent: '#111111', accent2: '#EEEEEE' },
    ...overrides,
  };
}

export const sampleTracks = [
  makeTrack('a', '潮汐信箱'),
  makeTrack('b', '海风未读'),
  makeTrack('c', '凌晨三点的信'),
  makeTrack('d', '盐与月光'),
];