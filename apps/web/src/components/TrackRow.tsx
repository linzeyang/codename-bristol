import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import type { Track } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylistPicker } from '../context/PlaylistPickerContext';
import { useToast } from '../context/ToastContext';
import { formatTime, trackToItem } from '../lib/player';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DiscIcon,
  HeartFilledIcon,
  HeartIcon,
  MoreIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  QueueIcon,
  TrashIcon,
  UserIcon,
} from './Icons';

interface TrackRowProps {
  track: Track;
  index?: number;
  showAlbum?: boolean;
  contextTracks?: Track[];
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  reason?: string;
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="menu-item" role="menuitem" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function TrackRow({
  track,
  index,
  showAlbum = false,
  contextTracks,
  onRemove,
  onMoveUp,
  onMoveDown,
  reason,
}: TrackRowProps) {
  const { user } = useAuth();
  const { show } = useToast();
  const player = usePlayer();
  const picker = usePlaylistPicker();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(track.liked);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isCurrent = player.current?.key === `track:${track.id}`;
  const item = trackToItem(track, reason);

  useEffect(() => {
    setLiked(track.liked);
  }, [track.id, track.liked]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event instanceof MouseEvent) {
        const target = event.target as Node;
        if (menuButtonRef.current?.contains(target)) return;
        const menu = document.getElementById(`track-menu-${track.id}`);
        if (menu?.contains(target)) return;
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen, track.id]);

  const handlePlay = () => {
    if (isCurrent) {
      player.toggle();
      return;
    }
    const source = contextTracks && contextTracks.length > 0 ? contextTracks : [track];
    const start = source.findIndex((entry) => entry.id === track.id);
    player.playItems(source.map((entry) => trackToItem(entry)), start < 0 ? 0 : start);
  };

  const handleLike = async () => {
    if (!user) {
      show('登录后即可收藏喜欢的歌', 'info');
      return;
    }
    try {
      const response = await api.post<{ liked: boolean }>(`/likes/${track.id}`);
      setLiked(response.liked);
      show(response.liked ? '已加入「喜欢」' : '已取消喜欢', 'success');
    } catch {
      show('操作失败，请稍后再试', 'error');
    }
  };

  const openMenu = () => {
    const rect = menuButtonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 232;
      const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
      const top = rect.bottom + 6 + 340 > window.innerHeight ? Math.max(12, rect.top - 346) : rect.bottom + 6;
      setMenuPos({ top, left });
    }
    setMenuOpen((previous) => !previous);
  };

  const run = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  const menu =
    menuOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="popover-menu"
            id={`track-menu-${track.id}`}
            role="menu"
            aria-label={`${track.title} 的操作`}
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <MenuItem
              icon={<PlayIcon size={17} />}
              label="立即播放"
              onClick={() => run(() => player.playItems([item], 0))}
            />
            <MenuItem
              icon={<NextIcon size={17} />}
              label="下一首播放"
              onClick={() => run(() => player.playNext([item]))}
            />
            <MenuItem
              icon={<QueueIcon size={17} />}
              label="加入播放队列"
              onClick={() => run(() => player.addToQueue([item]))}
            />
            <hr />
            <MenuItem icon={<PlusIcon size={17} />} label="添加到歌单" onClick={() => run(() => picker.openFor(track))} />
            <MenuItem
              icon={liked ? <HeartFilledIcon size={17} /> : <HeartIcon size={17} />}
              label={liked ? '取消喜欢' : '喜欢这首'}
              onClick={() => run(() => void handleLike())}
            />
            <hr />
            <MenuItem
              icon={<UserIcon size={17} />}
              label={`去 ${track.artist.name}`}
              onClick={() => run(() => navigate(`/artist/${track.artist.id}`))}
            />
            <MenuItem
              icon={<DiscIcon size={17} />}
              label={`去 ${track.album.title}`}
              onClick={() => run(() => navigate(`/album/${track.album.id}`))}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`track-row${isCurrent ? ' is-current' : ''}`} data-track-id={track.id}>
      <div className="track-lead">
        {typeof index === 'number' ? <span className="track-index">{String(index + 1).padStart(2, '0')}</span> : null}
        <button type="button" className="track-play" onClick={handlePlay} aria-label={`${isCurrent && player.isPlaying ? '暂停' : '播放'} ${track.title}`}>
          {isCurrent && player.isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
        </button>
      </div>
      <div className="track-main">
        <div className="track-title-line">
          <button type="button" className="track-title" onClick={handlePlay}>
            {track.title}
          </button>
          {track.isExplicit ? <span className="explicit" title="包含露骨内容">E</span> : null}
          {reason ? <span className="reason-chip inline">{reason}</span> : null}
        </div>
        <div className="track-sub">
          <Link to={`/artist/${track.artist.id}`}>{track.artist.name}</Link>
          {showAlbum ? (
            <>
              <span aria-hidden="true">·</span>
              <Link to={`/album/${track.album.id}`}>{track.album.title}</Link>
            </>
          ) : null}
          <span className="track-mood">{track.moods.slice(0, 2).join(' / ')}</span>
        </div>
      </div>
      <div className="track-actions">
        {onMoveUp ? (
          <button type="button" className="icon-btn small" onClick={onMoveUp} aria-label="上移">
            <ArrowUpIcon size={16} />
          </button>
        ) : null}
        {onMoveDown ? (
          <button type="button" className="icon-btn small" onClick={onMoveDown} aria-label="下移">
            <ArrowDownIcon size={16} />
          </button>
        ) : null}
        <button
          type="button"
          className={`icon-btn small like-btn${liked ? ' is-liked' : ''}`}
          onClick={() => void handleLike()}
          aria-label={liked ? `取消喜欢 ${track.title}` : `喜欢 ${track.title}`}
          aria-pressed={liked}
        >
          {liked ? <HeartFilledIcon size={17} /> : <HeartIcon size={17} />}
        </button>
        {onRemove ? (
          <button type="button" className="icon-btn small" onClick={onRemove} aria-label={`从歌单移除 ${track.title}`}>
            <TrashIcon size={16} />
          </button>
        ) : null}
        <button
          type="button"
          ref={menuButtonRef}
          className="icon-btn small"
          onClick={openMenu}
          aria-label={`更多 ${track.title} 的操作`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <MoreIcon size={18} />
        </button>
      </div>
      <span className="track-duration">{formatTime(track.durationSec)}</span>
      {menu}
    </div>
  );
}

export function TrackList({
  tracks,
  showAlbum = false,
  onRemove,
  onReorder,
}: {
  tracks: Track[];
  showAlbum?: boolean;
  onRemove?: (track: Track) => void;
  onReorder?: (from: number, to: number) => void;
}) {
  return (
    <div className="track-list" role="list">
      {tracks.map((track, index) => (
        <div role="listitem" key={track.id}>
          <TrackRow
            track={track}
            index={index}
            showAlbum={showAlbum}
            contextTracks={tracks}
            onRemove={onRemove ? () => onRemove(track) : undefined}
            onMoveUp={onReorder && index > 0 ? () => onReorder(index, index - 1) : undefined}
            onMoveDown={onReorder && index < tracks.length - 1 ? () => onReorder(index, index + 1) : undefined}
          />
        </div>
      ))}
    </div>
  );
}