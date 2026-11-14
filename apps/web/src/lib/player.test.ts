import { describe, expect, it } from 'vitest';
import type { Episode, Track } from '../api/types';
import {
  clampIndex,
  cycleRepeat,
  episodeToItem,
  formatTime,
  listenersLabel,
  nextRepeatLabel,
  playsLabel,
  restoredOrder,
  shuffledWithCurrent,
  trackToItem,
} from './player';

function makeTrack(id: string, title: string): Track {
  return {
    id,
    title,
    durationSec: 45,
    trackNo: 1,
    audioUrl: `/media/audio/loop-01.mp3`,
    plays: 1200,
    genre: 'folk',
    moods: ['深夜'],
    energy: 0.3,
    lyrics: [{ t: 0, text: '一行歌词' }],
    isExplicit: false,
    liked: false,
    artist: { id: 'ar-a', name: '林晚星', genre: 'folk', artSeed: 1, accent: '#000', accent2: '#fff' },
    album: { id: 'al-a', title: '潮汐信箱', year: 2024, type: 'album', artSeed: 2, accent: '#111', accent2: '#eee' },
  };
}

describe('播放队列纯逻辑', () => {
  it('把曲目转换为可播放队列项并生成唯一 key', () => {
    const item = trackToItem(makeTrack('t1', '潮汐信箱'));
    expect(item).toMatchObject({ key: 'track:t1', kind: 'track', title: '潮汐信箱', subtitle: '林晚星' });
    expect(item.art).toEqual({ seed: 2, accent: '#111', accent2: '#eee' });
  });

  it('把播客单集转换为队列项', () => {
    const episode: Episode = {
      id: 'e1',
      podcastId: 'p1',
      title: '第 1 集',
      description: '',
      durationSec: 45,
      episodeNo: 1,
      publishedAt: new Date('2026-01-01').toISOString(),
      audioUrl: '/media/audio/loop-02.mp3',
      podcastTitle: '深夜声场',
      artSeed: 9,
      accent: '#123',
      accent2: '#456',
    };
    const item = episodeToItem(episode);
    expect(item.key).toBe('episode:e1');
    expect(item.albumId).toBeUndefined();
    expect(item.podcastId).toBe('p1');
    expect(item.subtitle).toBe('深夜声场');
  });

  it('随机播放保留当前曲目在首位并覆盖其余曲目', () => {
    const items = ['a', 'b', 'c', 'd'].map((id) => trackToItem(makeTrack(id, id)));
    const result = shuffledWithCurrent(items, 2, () => 0.5);
    expect(result.index).toBe(0);
    expect(result.queue[0]?.id).toBe('c');
    expect(result.queue).toHaveLength(4);
    expect(new Set(result.queue.map((item) => item.id))).toEqual(new Set(['a', 'b', 'c', 'd']));
  });

  it('关闭随机后恢复原顺序并定位当前曲目', () => {
    const original = ['a', 'b', 'c', 'd'].map((id) => trackToItem(makeTrack(id, id)));
    const result = restoredOrder(original, 'track:c');
    expect(result.queue.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.index).toBe(2);
  });

  it('原顺序找不到当前曲目时回到第一首', () => {
    const original = ['a', 'b'].map((id) => trackToItem(makeTrack(id, id)));
    expect(restoredOrder(original, 'track:zzz').index).toBe(0);
    expect(restoredOrder([], 'x')).toEqual({ queue: [], index: 0 });
  });

  it('循环模式按关→全部→单曲循环', () => {
    expect(cycleRepeat('off')).toBe('all');
    expect(cycleRepeat('all')).toBe('one');
    expect(cycleRepeat('one')).toBe('off');
    expect(nextRepeatLabel('one')).toContain('单曲');
  });

  it('索引被限制在合法范围', () => {
    expect(clampIndex(-2, 5)).toBe(0);
    expect(clampIndex(9, 5)).toBe(4);
    expect(clampIndex(3, 0)).toBe(0);
  });

  it('时间与播放量格式化符合界面文案', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(Number.NaN)).toBe('0:00');
    expect(playsLabel(123_456_789)).toContain('亿');
    expect(playsLabel(23_456)).toContain('万');
    expect(listenersLabel(3_280_000)).toBe('328.0 万');
  });
});