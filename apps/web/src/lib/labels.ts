export const GENRE_LABELS: Record<string, string> = {
  'indie-pop': '独立流行',
  'post-rock': '后摇',
  folk: '民谣',
  electronic: '电子',
  'dream-pop': '梦幻流行',
  'singer-songwriter': '唱作',
  'hip-hop': '说唱',
  rock: '摇滚',
  ambient: '氛围',
  'city-pop': '城市流行',
};

export function genreLabel(genre: string): string {
  return GENRE_LABELS[genre] ?? genre;
}

export const ALBUM_TYPE_LABELS: Record<string, string> = {
  album: '专辑',
  ep: 'EP',
  single: '单曲',
};

export const PLAN_LABELS: Record<string, string> = {
  free: '漫步',
  plus: '靠岸 Plus',
  studio: '共听 Studio',
};

export const QUALITY_LABELS: Record<string, string> = {
  standard: '标准音质',
  high: '高品质',
  lossless: '无损（演示）',
};