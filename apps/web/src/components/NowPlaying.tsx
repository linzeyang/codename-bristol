import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylistPicker } from '../context/PlaylistPickerContext';
import { useSettings } from '../context/SettingsContext';
import { formatTime, playsLabel } from '../lib/player';
import { CoverArt } from './CoverArt';
import { Chip, EmptyState } from './ui';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CloseIcon,
  HeartFilledIcon,
  HeartIcon,
  InfoIcon,
  LyricsIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  PrevIcon,
  QueueIcon,
  TrashIcon,
} from './Icons';

const QUALITY_LABELS = { standard: '标准音质', high: '高品质', lossless: '无损（演示）' } as const;

export function NowPlaying() {
  const player = usePlayer();
  const picker = usePlaylistPicker();
  const { settings, resolvedTheme } = useSettings();
  const closeNowPlaying = player.closeNowPlaying;
  const panelRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const lyricRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = player.current;

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [player.nowPlayingTab, player.nowPlayingOpen]);

  useEffect(() => {
    if (!player.nowPlayingOpen) return;
    previousFocus.current = document.activeElement;
    const panel = panelRef.current;
    window.setTimeout(() => {
      panel?.querySelector<HTMLElement>('.now-close')?.focus();
    }, 20);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeNowPlaying();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => element.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      (previousFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [player.nowPlayingOpen, closeNowPlaying]);

  const lyrics = current?.track?.lyrics ?? [];
  const activeLine = lyrics.reduce((acc, line, index) => (line.t <= player.position + 0.15 ? index : acc), -1);

  useEffect(() => {
    if (!player.nowPlayingOpen || player.nowPlayingTab !== 'lyrics' || activeLine < 0) return;
    const node = lyricRefs.current[activeLine];
    node?.scrollIntoView({
      behavior: settings.reduceMotion ? 'auto' : 'smooth',
      block: 'center',
    });
  }, [activeLine, player.nowPlayingOpen, player.nowPlayingTab, settings.reduceMotion]);

  if (!player.nowPlayingOpen || !current) return null;

  const track = current.track;
  const episode = current.episode;

  return (
    <div className="now-layer">
      <div className="now-backdrop" onClick={player.closeNowPlaying} aria-hidden="true" />
      <aside
        className="now-panel"
        role="dialog"
        aria-modal="true"
        aria-label="舱内播放工作台"
        ref={panelRef}
      >
        <header className="now-head">
          <div>
            <p className="kicker">舱内播放 · NOW ON DECK</p>
            <span className="now-quality">{QUALITY_LABELS[settings.audioQuality]}</span>
          </div>
          <button type="button" className="icon-btn now-close" onClick={player.closeNowPlaying} aria-label="关闭舱内视图">
            <CloseIcon />
          </button>
        </header>

        <div className="now-hero">
          <div className="now-cover">
            <CoverArt
              seed={current.art.seed}
              accent={current.art.accent}
              accent2={current.art.accent2}
              label={current.title}
              monogram={current.kind === 'episode'}
            />
            <span className="now-sticker">{current.kind === 'track' ? '样带' : '播客'}</span>
          </div>
          <div className="now-meta">
            {current.reason ? <Chip tone="accent">{current.reason}</Chip> : null}
            <h2>{current.title}</h2>
            <p className="now-sub">
              {track ? (
                <>
                  <Link to={`/artist/${track.artist.id}`}>{track.artist.name}</Link>
                  <span>·</span>
                  <Link to={`/album/${track.album.id}`}>{track.album.title}</Link>
                  <span>·</span>
                  <span>{track.album.year}</span>
                </>
              ) : (
                <>
                  <Link to={`/podcast/${episode?.podcastId ?? ''}`}>{current.subtitle}</Link>
                  <span>·</span>
                  <span>第 {episode?.episodeNo} 集</span>
                </>
              )}
            </p>
            <div className="now-actions">
              <button type="button" className="btn btn-primary" onClick={player.toggle}>
                {player.isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
                {player.isPlaying ? '暂停' : '继续播放'}
              </button>
              <button type="button" className="icon-btn" onClick={player.previous} aria-label="上一首">
                <PrevIcon size={20} />
              </button>
              <button type="button" className="icon-btn" onClick={player.next} aria-label="下一首">
                <NextIcon size={20} />
              </button>
              {track ? (
                <>
                  <button
                    type="button"
                    className={`icon-btn${player.currentLiked ? ' is-liked' : ''}`}
                    onClick={() => void player.toggleLikeCurrent()}
                    aria-label={player.currentLiked ? '取消喜欢' : '喜欢'}
                    aria-pressed={player.currentLiked}
                  >
                    {player.currentLiked ? <HeartFilledIcon size={20} /> : <HeartIcon size={20} />}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => picker.openFor(track)}
                    aria-label="加入歌单"
                  >
                    <PlusIcon size={20} />
                  </button>
                </>
              ) : null}
            </div>
            <div className="now-progress">
              <span>{formatTime(player.position)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(1, player.duration || current.durationSec)}
                step={0.1}
                value={Math.min(player.position, player.duration || current.durationSec)}
                onChange={(event) => player.seek(Number(event.target.value))}
                aria-label="舱内播放进度"
                style={{
                  ['--progress' as string]: `${(player.position / Math.max(1, player.duration || current.durationSec)) * 100}%`,
                }}
              />
              <span>{formatTime(player.duration || current.durationSec)}</span>
            </div>
          </div>
        </div>

        <div className="now-tabs" role="tablist" aria-label="播放工作台视图">
          <button
            type="button"
            role="tab"
            aria-selected={player.nowPlayingTab === 'lyrics'}
            className={player.nowPlayingTab === 'lyrics' ? 'is-active' : ''}
            onClick={() => player.setNowPlayingTab('lyrics')}
          >
            <LyricsIcon size={17} />
            歌词
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={player.nowPlayingTab === 'queue'}
            className={player.nowPlayingTab === 'queue' ? 'is-active' : ''}
            onClick={() => player.setNowPlayingTab('queue')}
          >
            <QueueIcon size={17} />
            队列 <span>{player.queue.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={player.nowPlayingTab === 'info'}
            className={player.nowPlayingTab === 'info' ? 'is-active' : ''}
            onClick={() => player.setNowPlayingTab('info')}
          >
            <InfoIcon size={17} />
            信息
          </button>
        </div>

        <div className="now-body" ref={bodyRef}>
          {player.nowPlayingTab === 'lyrics' ? (
            lyrics.length > 0 ? (
              <div className="lyrics-view">
                <p className="lyrics-note">原创歌词 · 点击任意一句可跳转</p>
                {lyrics.map((line, index) => (
                  <button
                    type="button"
                    key={`${line.t}-${index}`}
                    ref={(node) => {
                      lyricRefs.current[index] = node;
                    }}
                    className={`lyric-line${index === activeLine ? ' is-active' : ''}`}
                    onClick={() => player.seek(line.t)}
                  >
                    {line.text}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<LyricsIcon size={38} />}
                title="这是一段器乐 / 播客内容"
                description="该内容没有歌词。切到「信息」查看详情，或继续收听。"
              />
            )
          ) : null}

          {player.nowPlayingTab === 'queue' ? (
            <div className="queue-view">
              <div className="queue-head">
                <p>
                  正在播放第 <strong>{player.index + 1}</strong> / {player.queue.length} 首
                </p>
                {player.index < player.queue.length - 1 ? (
                  <button type="button" className="text-link" onClick={player.clearUpcoming}>
                    清空待播
                  </button>
                ) : null}
              </div>
              <div className="queue-list" role="list">
                {player.queue.map((item, queueIndex) => (
                  <div
                    key={`${item.key}-${queueIndex}`}
                    role="listitem"
                    className={`queue-row${queueIndex === player.index ? ' is-current' : ''}`}
                  >
                    <button
                      type="button"
                      className="queue-index"
                      onClick={() => player.jumpTo(queueIndex)}
                      aria-label={`播放 ${item.title}`}
                    >
                      {queueIndex === player.index && player.isPlaying ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                    </button>
                    <button type="button" className="queue-title" onClick={() => player.jumpTo(queueIndex)}>
                      <strong>{item.title}</strong>
                      <span>{item.subtitle}</span>
                    </button>
                    <span className="queue-time">{formatTime(item.durationSec)}</span>
                    <div className="queue-actions">
                      <button
                        type="button"
                        className="icon-btn small"
                        disabled={queueIndex === 0}
                        onClick={() => player.move(queueIndex, queueIndex - 1)}
                        aria-label="在队列中上移"
                      >
                        <ArrowUpIcon size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn small"
                        disabled={queueIndex === player.queue.length - 1}
                        onClick={() => player.move(queueIndex, queueIndex + 1)}
                        aria-label="在队列中下移"
                      >
                        <ArrowDownIcon size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn small"
                        onClick={() => player.removeAt(queueIndex)}
                        aria-label="从队列移除"
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {player.nowPlayingTab === 'info' ? (
            <div className="info-view">
              <div className="info-grid">
                {track ? (
                  <>
                    <div>
                      <span className="info-label">专辑</span>
                      <Link to={`/album/${track.album.id}`}>{track.album.title}</Link>
                    </div>
                    <div>
                      <span className="info-label">发行</span>
                      <span>{track.album.year} · {track.album.type === 'album' ? '专辑' : track.album.type === 'ep' ? 'EP' : '单曲'}</span>
                    </div>
                    <div>
                      <span className="info-label">风格</span>
                      <span>{track.genre} · {track.moods.join(' / ')}</span>
                    </div>
                    <div>
                      <span className="info-label">播放量</span>
                      <span>{playsLabel(track.plays)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="info-label">播客</span>
                      <Link to={`/podcast/${episode?.podcastId ?? ''}`}>{episode?.podcastTitle}</Link>
                    </div>
                    <div>
                      <span className="info-label">集数</span>
                      <span>第 {episode?.episodeNo} 集</span>
                    </div>
                    <div>
                      <span className="info-label">发布</span>
                      <span>{episode ? new Date(episode.publishedAt).toLocaleDateString('zh-CN') : '—'}</span>
                    </div>
                  </>
                )}
                <div>
                  <span className="info-label">主题</span>
                  <span>{resolvedTheme === 'dark' ? '夜航' : '纸张'}</span>
                </div>
              </div>

              {track ? (
                <div className="energy-meter">
                  <div className="energy-head">
                    <span>能量</span>
                    <span>{Math.round(track.energy * 100)}%</span>
                  </div>
                  <div className="energy-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round(track.energy * 100)}%` }} />
                  </div>
                </div>
              ) : null}

              {current.reason ? (
                <div className="info-reason">
                  <span className="kicker">为什么是这首</span>
                  <p>{current.reason}</p>
                  <p className="muted">推荐理由来自你的喜欢、关注与最近播放；可在首页调音台调整口味。</p>
                </div>
              ) : null}

              {episode?.description ? <p className="info-description">{episode.description}</p> : null}

              <p className="info-disclaimer">
                本原型音频为 45 秒原创合成样带（96 kbps MP3），不包含任何第三方录音。音质设置仅作偏好展示。
              </p>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}