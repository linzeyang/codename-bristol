import { Link } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylistPicker } from '../context/PlaylistPickerContext';
import { formatTime } from '../lib/player';
import { CoverArt } from './CoverArt';
import {
  ExpandIcon,
  HeartFilledIcon,
  HeartIcon,
  LyricsIcon,
  MuteIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  VolumeIcon,
  VolumeLowIcon,
} from './Icons';

export function PlayerBar() {
  const player = usePlayer();
  const picker = usePlaylistPicker();
  const current = player.current;
  if (!current) return null;

  const total = player.duration || current.durationSec || 1;
  const percent = Math.max(0, Math.min(100, (player.position / total) * 100));
  const link = current.kind === 'track' ? `/track/${current.id}` : `/podcast/${current.podcastId ?? ''}`;
  const VolumeGlyph = player.muted ? MuteIcon : player.volume < 0.45 ? VolumeLowIcon : VolumeIcon;
  const RepeatGlyph = player.repeat === 'one' ? RepeatOneIcon : RepeatIcon;

  return (
    <div className="player-bar" role="region" aria-label="播放器">
      <div className="player-now">
        <button
          type="button"
          className="player-cover"
          onClick={() => player.openNowPlaying('info')}
          aria-label="展开舱内播放工作台"
        >
          <CoverArt
            seed={current.art.seed}
            accent={current.art.accent}
            accent2={current.art.accent2}
            label={current.title}
          />
          <span className="player-cover-icon">
            <ExpandIcon size={18} />
          </span>
        </button>
        <div className="player-meta">
          <Link to={link} className="player-title" title={current.title}>
            {current.title}
          </Link>
          <span className="player-subtitle">
            {current.subtitle}
            {current.reason ? <span className="player-reason"> · {current.reason}</span> : null}
          </span>
        </div>
        {current.track ? (
          <>
            <button
              type="button"
              className={`icon-btn small player-like${player.currentLiked ? ' is-liked' : ''}`}
              onClick={() => void player.toggleLikeCurrent()}
              aria-label={player.currentLiked ? '取消喜欢当前曲目' : '喜欢当前曲目'}
              aria-pressed={player.currentLiked}
            >
              {player.currentLiked ? <HeartFilledIcon size={18} /> : <HeartIcon size={18} />}
            </button>
            <button
              type="button"
              className="icon-btn small player-add"
              onClick={() => picker.openFor(current.track!)}
              aria-label="将当前曲目加入歌单"
            >
              <PlusIcon size={18} />
            </button>
          </>
        ) : null}
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button
            type="button"
            className={`icon-btn small${player.shuffle ? ' is-active' : ''}`}
            onClick={player.toggleShuffle}
            aria-label={player.shuffle ? '关闭随机播放' : '开启随机播放'}
            aria-pressed={player.shuffle}
          >
            <ShuffleIcon size={18} />
          </button>
          <button type="button" className="icon-btn small" onClick={player.previous} aria-label="上一首">
            <PrevIcon size={19} />
          </button>
          <button
            type="button"
            className="play-toggle"
            onClick={player.toggle}
            aria-label={player.isPlaying ? '暂停' : '播放'}
          >
            {player.isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
          </button>
          <button type="button" className="icon-btn small" onClick={player.next} aria-label="下一首">
            <NextIcon size={19} />
          </button>
          <button
            type="button"
            className={`icon-btn small${player.repeat !== 'off' ? ' is-active' : ''}`}
            onClick={player.cycleRepeatMode}
            aria-label={player.repeat === 'off' ? '开启循环' : player.repeat === 'all' ? '切换为单曲循环' : '关闭循环'}
            title={player.repeat === 'one' ? '单曲循环' : player.repeat === 'all' ? '列表循环' : '循环关闭'}
          >
            <RepeatGlyph size={18} />
          </button>
        </div>
        <div className="player-progress">
          <span className="time">{formatTime(player.position)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(1, total)}
            step={0.1}
            value={Math.min(player.position, total)}
            onChange={(event) => player.seek(Number(event.target.value))}
            aria-label="播放进度"
            style={{ ['--progress' as string]: `${percent}%` }}
          />
          <span className="time">{formatTime(total)}</span>
        </div>
      </div>

      <div className="player-tools">
        <span className="sample-tag" title="原型使用原创合成样带">样带 45s</span>
        <button
          type="button"
          className={`icon-btn small${player.nowPlayingOpen && player.nowPlayingTab === 'queue' ? ' is-active' : ''}`}
          onClick={() => player.openNowPlaying('queue')}
          aria-label="打开播放队列"
        >
          <QueueIcon size={19} />
        </button>
        <button
          type="button"
          className={`icon-btn small${player.nowPlayingOpen && player.nowPlayingTab === 'lyrics' ? ' is-active' : ''}`}
          onClick={() => player.openNowPlaying('lyrics')}
          aria-label="查看歌词"
        >
          <LyricsIcon size={19} />
        </button>
        <div className="volume-control">
          <button
            type="button"
            className="icon-btn small"
            onClick={player.toggleMute}
            aria-label={player.muted ? '取消静音' : '静音'}
          >
            <VolumeGlyph size={19} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={player.muted ? 0 : player.volume}
            onChange={(event) => player.setVolume(Number(event.target.value))}
            aria-label="音量"
            style={{ ['--progress' as string]: `${(player.muted ? 0 : player.volume) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}