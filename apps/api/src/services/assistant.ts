import { z } from 'zod';
import type { Config } from '../config.js';
import type { Db } from '../db/types.js';
import type { TrackDTO } from '../types.js';
import { queryTracks } from './catalog.js';
import { genreLabel } from './recommend.js';

const MOOD_KEYWORDS: Record<string, string[]> = {
  深夜: ['深夜', '失眠', '睡不着', '夜里', '凌晨', '夜'],
  专注: ['专注', '写代码', '工作', '学习', '看书', '编程', '效率'],
  城市: ['通勤', '上班', '地铁', '公交', 'city'],
  雨天: ['雨', '下雨', '潮湿'],
  运动: ['运动', '跑步', '健身', '骑行', '燃'],
  安静: ['放松', 'chill', '休息', '周末', '安静', '不吵', '轻一点'],
  入睡: ['入睡', '睡觉', '助眠', '睡眠'],
  夏日: ['夏天', '夏日', '汽水', '阳光'],
  清晨: ['清晨', '早上', '醒来', '晨跑'],
  伤感: ['难过', '伤感', '失恋', 'emo', '低落'],
  轻快: ['开心', '快乐', '好心情', '轻快'],
  海: ['海', '海边', '浪'],
  公路: ['公路', '自驾', '旅行', '远方', '开车'],
};

const GENRE_KEYWORDS: Record<string, string[]> = {
  electronic: ['电子', '合成器', '电音'],
  folk: ['民谣', '木吉他', '吉他'],
  'post-rock': ['后摇', '器乐'],
  rock: ['摇滚'],
  'hip-hop': ['说唱', 'rap', '嘻哈'],
  ambient: ['氛围', '环境音', '白噪音', '纯音乐'],
  'city-pop': ['城市流行', 'citypop', 'disco'],
  'dream-pop': ['梦幻', 'dream'],
  'indie-pop': ['独立流行', 'indie'],
};

const ENERGY_TARGETS: Record<string, number> = {
  运动: 0.82,
  轻快: 0.75,
  夏日: 0.72,
  专注: 0.42,
  入睡: 0.15,
  安静: 0.28,
  深夜: 0.3,
  雨天: 0.3,
};

export interface AssistantResult {
  reply: string;
  tracks: (TrackDTO & { reason: string })[];
  source: 'local' | 'llm';
  intent: { moods: string[]; genres: string[] };
  suggestions: string[];
}

const SUGGESTIONS = [
  '适合雨夜写代码的歌',
  '想听点像林晚星但更新鲜的',
  '给通勤路上一点节拍',
  '睡前不要太吵的声音',
];

const CN_NUMBERS: Record<string, number> = {
  一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};

function detect(message: string, tracks: TrackDTO[]) {
  const lower = message.toLowerCase();
  const moods = Object.entries(MOOD_KEYWORDS)
    .filter(([, words]) => words.some((word) => lower.includes(word)))
    .map(([mood]) => mood);
  const genres = Object.entries(GENRE_KEYWORDS)
    .filter(([, words]) => words.some((word) => lower.includes(word)))
    .map(([genre]) => genre);
  const artist = tracks.find((track) => message.includes(track.artist.name))?.artist;
  const explicitGenreMatch = tracks.find((track) => lower.includes(track.genre.toLowerCase()));
  if (explicitGenreMatch && !genres.includes(explicitGenreMatch.genre)) {
    genres.push(explicitGenreMatch.genre);
  }
  const countMatch = message.match(/([0-9]+|[一二两三四五六七八九十])\s*(首|分钟)/);
  const raw = countMatch ? Number(countMatch[1]) || CN_NUMBERS[countMatch[1]!] || null : null;
  const limit = raw
    ? countMatch?.[2] === '分钟'
      ? Math.max(3, Math.min(12, Math.ceil((raw * 60) / 45)))
      : Math.max(3, Math.min(12, raw))
    : 8;
  return { moods, genres, artist, limit, lower };
}

function localReason(track: TrackDTO, moods: string[], genres: string[]): string {
  const moodHit = track.moods.find((mood) => moods.includes(mood));
  if (moodHit) return `贴近「${moodHit}」的氛围`;
  if (genres.includes(track.genre)) return `${genreLabel(track.genre)}风格`;
  return '向导的补充选择';
}

export async function answerLocally(db: Db, userId: string | null, message: string): Promise<AssistantResult> {
  const tracks = await queryTracks(db, userId, { limit: 200 });
  const { moods, genres, artist, limit, lower } = detect(message, tracks);

  const candidates = tracks.map((track) => {
    let score = 0;
    const moodHits = track.moods.filter((mood) => moods.includes(mood)).length;
    score += moodHits * 2.4;
    if (genres.includes(track.genre)) score += 2.8;
    if (artist && track.artist.id === artist.id) score += 6;
    if (artist && track.artist.genre === artist.genre && track.artist.id !== artist.id) score += 0.8;
    for (const mood of moods) {
      const target = ENERGY_TARGETS[mood];
      if (target !== undefined) score += (1 - Math.abs(track.energy - target)) * 1.1;
    }
    if (lower.includes('随机') || lower.includes('随便')) score += (track.plays % 97) / 97;
    score += Math.log10(track.plays + 1) * 0.06;
    return { track, score };
  });

  candidates.sort((a, b) => b.score - a.score || a.track.title.localeCompare(b.track.title, 'zh'));
  const filtered = candidates.filter((entry) => entry.score > 0.6).slice(0, limit);
  const fallback = candidates.slice(0, limit);
  const picked = filtered.length >= 3 ? filtered : fallback;

  const reasons = new Map<string, string>();
  for (const { track } of picked) reasons.set(track.id, localReason(track, moods, genres));

  let reply: string;
  if (artist) {
    reply = `从 ${artist.name} 开始，再补几首同风格的声音。挑出 ${picked.length} 首，都是 45 秒原创样带，可以直接播放。`;
  } else if (moods.length > 0 || genres.length > 0) {
    const bits = [
      moods.length ? `「${moods.slice(0, 3).join(' / ')}」的情绪` : '',
      genres.length ? `「${genres.map(genreLabel).join(' / ')}」的风格` : '',
    ].filter(Boolean);
    reply = `我听到你想要${bits.join('，以及')}。从曲库中挑了 ${picked.length} 首，每首都有匹配理由；调整口味可以回到首页的调音台。`;
  } else {
    reply = `我还没完全听懂你的方向，先给你 ${picked.length} 首最近被反复播放的歌。可以试试「适合雨夜写代码」「想听像林晚星但更新鲜的」这样更具体的说法。`;
  }

  return {
    reply,
    tracks: picked.map(({ track }) => ({ ...track, reason: reasons.get(track.id) ?? '向导选择' })),
    source: 'local',
    intent: { moods, genres },
    suggestions: SUGGESTIONS,
  };
}

const LlmAnswer = z.object({
  reply: z.string().min(1).max(800),
  trackIds: z.array(z.string().min(1)).max(12),
});

async function answerWithLlm(
  db: Db,
  userId: string | null,
  message: string,
  config: Config,
  local: AssistantResult,
): Promise<AssistantResult | null> {
  if (!config.llm) return null;
  try {
    const catalog = await queryTracks(db, userId, { limit: 200 });
    const compact = catalog
      .map((t) => `${t.id}|${t.title}|${t.artist.name}|${t.genre}|${t.moods.join('/')}|energy=${t.energy.toFixed(2)}`)
      .join('\n');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.llm.timeoutMs);
    const response = await fetch(`${config.llm.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.llm.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.llm.model,
        temperature: 0.6,
        messages: [
          {
            role: 'system',
            content:
              '你是「声屿」音乐向导。只能从给定曲库中选择曲目，用简体中文回答。' +
              '输出严格 JSON：{"reply":"不超过120字的中文回答","trackIds":["曲目ID"]}。' +
              'trackIds 最多 8 个，必须来自曲库。不要输出 Markdown。',
          },
          { role: 'user', content: `用户需求：${message}\n\n曲库（ID|标题|艺人|风格|情绪|能量）：\n${compact}` },
        ],
      }),
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content ?? '';
    const jsonText = content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const parsed = LlmAnswer.safeParse(JSON.parse(jsonText));
    if (!parsed.success) return null;
    const byId = new Map(catalog.map((track) => [track.id, track]));
    const picked = parsed.data.trackIds
      .map((id) => byId.get(id))
      .filter((track): track is TrackDTO => Boolean(track));
    if (picked.length < 2) return null;
    return {
      reply: parsed.data.reply,
      tracks: picked.map((track) => ({ ...track, reason: '向导为你挑选' })),
      source: 'llm',
      intent: local.intent,
      suggestions: local.suggestions,
    };
  } catch {
    return null;
  }
}

export async function answer(
  db: Db,
  userId: string | null,
  message: string,
  config: Config,
): Promise<AssistantResult> {
  const local = await answerLocally(db, userId, message);
  const enhanced = await answerWithLlm(db, userId, message, config, local);
  return enhanced ?? local;
}