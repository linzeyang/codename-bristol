import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PlayIcon } from './Icons';
import { CoverArt } from './CoverArt';

interface ArtCardProps {
  to: string;
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  art: { seed: number; accent: string; accent2: string };
  shape?: 'square' | 'squircle' | 'circle';
  badge?: string;
  reason?: string;
  monogram?: boolean;
  onPlay?: () => void;
  playLabel?: string;
  className?: string;
  showPlay?: boolean;
}

export function ArtCard({
  to,
  title,
  subtitle,
  meta,
  art,
  shape = 'square',
  badge,
  reason,
  monogram = false,
  onPlay,
  playLabel,
  className = '',
  showPlay = true,
}: ArtCardProps) {
  return (
    <article className={`art-card ${className}`}>
      <div className={`art-card-frame shape-${shape}`}>
        <Link to={to} className="art-card-link" aria-label={`打开 ${title}`} tabIndex={-1}>
          <CoverArt seed={art.seed} accent={art.accent} accent2={art.accent2} label={title} monogram={monogram} className="art-card-img" />
        </Link>
        {badge ? <span className="art-badge">{badge}</span> : null}
        {showPlay && onPlay ? (
          <button type="button" className="art-play" onClick={onPlay} aria-label={playLabel ?? `播放 ${title}`}>
            <PlayIcon size={20} />
          </button>
        ) : null}
      </div>
      <div className="art-card-body">
        {reason ? <p className="reason-chip">{reason}</p> : null}
        <Link to={to} className="art-card-title">
          {title}
        </Link>
        {subtitle ? <p className="art-card-sub">{subtitle}</p> : null}
        {meta ? <div className="art-card-meta">{meta}</div> : null}
      </div>
    </article>
  );
}

export function TrackCard({
  track,
  onPlay,
  reason,
}: {
  track: { id: string; title: string; artist: { id: string; name: string }; album: { id: string; title: string; artSeed: number; accent: string; accent2: string } };
  onPlay: () => void;
  reason?: string;
}) {
  return (
    <ArtCard
      to={`/track/${track.id}`}
      title={track.title}
      subtitle={<Link to={`/artist/${track.artist.id}`}>{track.artist.name}</Link>}
      art={{ seed: track.album.artSeed, accent: track.album.accent, accent2: track.album.accent2 }}
      onPlay={onPlay}
      reason={reason}
    />
  );
}