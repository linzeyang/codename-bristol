import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { AssistantResponse } from '../api/types';
import { CoverArt } from '../components/CoverArt';
import { EmptyState } from '../components/ui';
import {
  ArrowRightIcon,
  PlayIcon,
  PlusIcon,
  QueueIcon,
  SparklesIcon,
  WaveIcon,
} from '../components/Icons';
import { usePlayer } from '../context/PlayerContext';
import { formatTime, trackToItem } from '../lib/player';

interface GuideMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  response?: AssistantResponse;
  error?: boolean;
}

const EXAMPLES = [
  '适合雨夜写代码的歌',
  '想听点像林晚星但更新鲜的',
  '给通勤路上一点节拍',
  '睡前不要太吵的声音',
  '来五首像公路电影一样的歌',
];

let messageId = 0;

export function GuidePage() {
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get('q')?.trim() ?? '';
  const player = usePlayer();
  const [messages, setMessages] = useState<GuideMessage[]>([
    {
      id: 'hello',
      role: 'assistant',
      text: '我是声屿向导。你可以不记得歌名，只要告诉我场景、情绪或一个「像谁」的线索。我会从 58 首原创样带里挑选，并给每一首一个理由。',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAutoQuery = useRef('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.title = '声屿向导 · 用一句话找歌';
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  const ask = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || loading) return;
      const userMessage: GuideMessage = { id: `u-${++messageId}`, role: 'user', text: message };
      setMessages((previous) => [...previous, userMessage]);
      setInput('');
      setLoading(true);
      try {
        const response = await api.post<AssistantResponse>('/assistant', { message });
        setMessages((previous) => [
          ...previous,
          { id: `a-${++messageId}`, role: 'assistant', text: response.reply, response },
        ]);
      } catch {
        setMessages((previous) => [
          ...previous,
          {
            id: `e-${++messageId}`,
            role: 'assistant',
            text: '向导暂时没有回应。请确认 API 服务已启动，或稍后再试。',
            error: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  useEffect(() => {
    if (initialQuery && initialQuery !== lastAutoQuery.current) {
      lastAutoQuery.current = initialQuery;
      void ask(initialQuery);
      const next = new URLSearchParams(params);
      next.delete('q');
      setParams(next, { replace: true });
    }
  }, [initialQuery, ask, params, setParams]);

  const playResponse = (response: AssistantResponse, startIndex = 0) => {
    player.playItems(
      response.tracks.map((track) => trackToItem(track, track.reason)),
      startIndex,
    );
  };

  const addResponse = (response: AssistantResponse) => {
    player.addToQueue(response.tracks.map((track) => trackToItem(track, track.reason)));
  };

  const submit = () => {
    void ask(input);
  };

  return (
    <div className="page guide-page">
      <div className="guide-layout">
        <section className="guide-main">
          <header className="guide-head">
            <p className="kicker">Say it, don't spell it</p>
            <h1>声屿向导</h1>
            <p className="page-desc">
              用一句话描述你想听的场景。默认使用离线意图引擎，不联网也能工作；配置 LLM 后会增强表达，失败自动回退。
            </p>
          </header>

          <div className="guide-thread" aria-live="polite">
            {messages.map((message) => (
              <article key={message.id} className={`guide-message role-${message.role}${message.error ? ' is-error' : ''}`}>
                <header>
                  <span className="guide-avatar" aria-hidden="true">
                    {message.role === 'user' ? '你' : <SparklesIcon size={18} />}
                  </span>
                  <strong>{message.role === 'user' ? '你' : '声屿向导'}</strong>
                  {message.response ? (
                    <span className="guide-source">
                      {message.response.source === 'llm' ? 'LLM 增强' : '离线意图引擎'}
                    </span>
                  ) : null}
                </header>
                <p className="guide-text">{message.text}</p>

                {message.response ? (
                  <div className="guide-results">
                    <div className="guide-result-actions">
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => playResponse(message.response!, 0)}>
                        <PlayIcon size={16} />
                        播放全部 {message.response.tracks.length} 首
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => addResponse(message.response!)}>
                        <QueueIcon size={16} />
                        加入队列
                      </button>
                      {message.response.intent.moods.length + message.response.intent.genres.length > 0 ? (
                        <span className="guide-intent">
                          识别到：{[...message.response.intent.moods, ...message.response.intent.genres].join(' / ')}
                        </span>
                      ) : null}
                    </div>

                    <div className="guide-tracks">
                      {message.response.tracks.map((track, index) => (
                        <div key={track.id} className="guide-track">
                          <button
                            type="button"
                            className="guide-track-art"
                            onClick={() => playResponse(message.response!, index)}
                            aria-label={`播放 ${track.title}`}
                          >
                            <CoverArt
                              seed={track.album.artSeed}
                              accent={track.album.accent}
                              accent2={track.album.accent2}
                              label={track.title}
                            />
                            <span><PlayIcon size={16} /></span>
                          </button>
                          <div className="guide-track-text">
                            <Link to={`/track/${track.id}`}>{track.title}</Link>
                            <span>{track.artist.name} · {formatTime(track.durationSec)}</span>
                            <em>{track.reason}</em>
                          </div>
                          <button
                            type="button"
                            className="icon-btn small"
                            onClick={() => player.playNext([trackToItem(track, track.reason)])}
                            aria-label="下一首播放"
                          >
                            <PlusIcon size={17} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {message.response.suggestions.length > 0 ? (
                      <div className="guide-suggestions">
                        <span>继续问：</span>
                        {message.response.suggestions.slice(0, 3).map((suggestion) => (
                          <button key={suggestion} type="button" className="chip" onClick={() => void ask(suggestion)}>
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}

            {loading ? (
              <div className="guide-message role-assistant">
                <header>
                  <span className="guide-avatar"><SparklesIcon size={18} /></span>
                  <strong>声屿向导</strong>
                </header>
                <p className="guide-thinking"><WaveIcon size={20} /> 正在听你的描述…</p>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <div className="guide-composer">
            <textarea
              ref={inputRef}
              value={input}
              rows={2}
              maxLength={200}
              placeholder="例如：适合雨夜写代码的歌，不要太吵"
              aria-label="向向导描述你想听的音乐"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <div className="guide-composer-foot">
              <span>Enter 发送 · Shift+Enter 换行 · {200 - input.length} 字</span>
              <button type="button" className="btn btn-primary" onClick={submit} disabled={loading || !input.trim()}>
                发送
                <ArrowRightIcon size={17} />
              </button>
            </div>
          </div>
        </section>

        <aside className="guide-side">
          <div className="guide-side-card">
            <SparklesIcon size={22} />
            <h2>可以这样说</h2>
            <div className="guide-examples">
              {EXAMPLES.map((example) => (
                <button key={example} type="button" className="guide-example" onClick={() => void ask(example)}>
                  {example}
                  <ArrowRightIcon size={15} />
                </button>
              ))}
            </div>
          </div>

          <div className="guide-side-card muted-card">
            <h2>它是怎么工作的</h2>
            <ol>
              <li>解析情绪、风格、场景与艺人线索。</li>
              <li>按能量、热度与你的收藏做加权排序。</li>
              <li>把匹配理由写出来，并允许一键播放。</li>
            </ol>
            <p>
              未配置 <code>LLM_*</code> 时完全离线；配置后只把问题与曲库元数据发送到你指定的 OpenAI 兼容端点。
            </p>
          </div>

          <div className="guide-side-card">
            <h2>不适合什么</h2>
            <p>向导只推荐曲库中的原创样带，不做事实问答，也不会把问题用于训练。找不到时，它会给你一组兜底推荐。</p>
            {messages.length === 1 ? (
              <EmptyState title="还没有开始" description="点一个示例，或直接输入你的场景。" />
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}