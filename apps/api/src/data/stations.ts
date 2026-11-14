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

export const STATIONS: Station[] = [
  {
    id: 'night',
    title: '深夜靠岸',
    tagline: '给还醒着的你',
    description: '低亮度的人声与合成器，把城市调成静音。',
    genre: 'indie-pop',
    moods: ['深夜', '氛围', '城市'],
    energyMin: 0,
    energyMax: 0.45,
    accent: '#123B52',
    accent2: '#63A8B0',
    artSeed: 41,
  },
  {
    id: 'focus',
    title: '专注防噪',
    tagline: '让世界静音',
    description: '稳定的节奏与无歌词干扰的声音，适合写代码与阅读。',
    genre: 'electronic',
    moods: ['专注', '氛围', '电子'],
    energyMin: 0.2,
    energyMax: 0.6,
    accent: '#0D6E66',
    accent2: '#9BD1C5',
    artSeed: 42,
  },
  {
    id: 'road',
    title: '公路与海',
    tagline: '把窗摇下来',
    description: '后摇吉他与海岸线的风，适合长途与黄昏。',
    genre: 'post-rock',
    moods: ['公路', '海', '黄昏'],
    energyMin: 0.4,
    energyMax: 0.8,
    accent: '#395B64',
    accent2: '#E8A33D',
    artSeed: 43,
  },
  {
    id: 'summer',
    title: '夏日汽水',
    tagline: '冰镇五分钟',
    description: '复古合成器、轻快鼓点与沿海公路的傍晚。',
    genre: 'city-pop',
    moods: ['夏日', '轻快', '城市'],
    energyMin: 0.55,
    energyMax: 1,
    accent: '#D1495B',
    accent2: '#F2CC8F',
    artSeed: 44,
  },
  {
    id: 'rain',
    title: '雨天房间',
    tagline: '听雨落下',
    description: '木吉他、雾气和一扇没有关紧的窗。',
    genre: 'folk',
    moods: ['雨天', '民谣', '安静'],
    energyMin: 0,
    energyMax: 0.4,
    accent: '#6B5B95',
    accent2: '#D9C7A7',
    artSeed: 45,
  },
  {
    id: 'dawn',
    title: '清晨慢速',
    tagline: '在光里醒来',
    description: '慢速氛围与温柔的电子纹理，为一天留出空白。',
    genre: 'ambient',
    moods: ['清晨', '氛围', '安静'],
    energyMin: 0.1,
    energyMax: 0.5,
    accent: '#C96A3D',
    accent2: '#F0D9A8',
    artSeed: 46,
  },
];

export function findStation(id: string): Station | undefined {
  return STATIONS.find((station) => station.id === id);
}