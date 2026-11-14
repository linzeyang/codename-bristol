import { useId } from 'react';

interface CoverArtProps {
  seed: number;
  accent: string;
  accent2: string;
  label: string;
  className?: string;
  monogram?: boolean;
}

function pseudo(seed: number, salt: number): number {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  if (value.length !== 6) return 0.5;
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function CoverArt({ seed, accent, accent2, label, className, monogram = false }: CoverArtProps) {
  const rawId = useId();
  const id = `g${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const variant = Math.abs(seed * 5 + 11) % 7;
  const flip = pseudo(seed, 1) > 0.5;
  const initial = label.trim().slice(0, 1) || '声';
  const lightArt = (luminance(accent) + luminance(accent2)) / 2 > 0.55;
  const patternColor = lightArt ? '#1B1A17' : '#FFFDF8';
  const monogramColor = lightArt ? '#1B1A17' : '#FFFDF8';

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={`${label} 封面`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={id} x1={flip ? '0' : '1'} y1="0" x2={flip ? '1' : '0'} y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor={accent2} />
        </linearGradient>
        <pattern id={`${id}-dots`} width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.4" fill={patternColor} opacity="0.45" />
        </pattern>
      </defs>
      <rect width="200" height="200" fill={`url(#${id})`} />
      {variant === 0 && (
        <g fill="none" stroke={patternColor} strokeWidth="3" opacity="0.65">
          <circle cx="35" cy="170" r="40" />
          <circle cx="35" cy="170" r="70" />
          <circle cx="35" cy="170" r="100" />
          <circle cx="35" cy="170" r="130" />
          <circle cx="150" cy="50" r="18" fill={patternColor} stroke="none" opacity="0.8" />
        </g>
      )}
      {variant === 1 && (
        <g fill="none" stroke={patternColor} strokeWidth="2.6" opacity="0.7">
          {Array.from({ length: 7 }, (_, i) => (
            <path
              key={i}
              d={`M-20 ${60 + i * 18} C 30 ${20 + i * 18}, 70 ${100 + i * 10}, 110 ${60 + i * 15} S 180 ${30 + i * 16}, 225 ${65 + i * 14}`}
            />
          ))}
        </g>
      )}
      {variant === 2 && (
        <g>
          <circle cx="138" cy="66" r="42" fill={patternColor} opacity="0.75" />
          <path d="M0 132h200M0 150h200M0 168h200" stroke="#1B1A17" strokeWidth="2.4" opacity="0.5" />
          <circle cx="52" cy="156" r="22" fill="#1B1A17" opacity="0.28" />
        </g>
      )}
      {variant === 3 && (
        <g>
          <rect width="200" height="200" fill={`url(#${id}-dots)`} />
          <rect x="28" y="28" width="86" height="86" fill={patternColor} opacity="0.8" />
          <circle cx="143" cy="128" r="34" fill="#1B1A17" opacity="0.28" />
          <path d="M28 140h144" stroke={patternColor} strokeWidth="2" opacity="0.5" />
        </g>
      )}
      {variant === 4 && (
        <g stroke={patternColor} strokeWidth="7" opacity="0.55">
          {Array.from({ length: 10 }, (_, i) => (
            <path key={i} d={`M${-40 + i * 28} 210 L${50 + i * 28} 0`} />
          ))}
        </g>
      )}
      {variant === 5 && (
        <g>
          <circle cx="58" cy="66" r="48" fill={patternColor} opacity="0.38" />
          <circle cx="142" cy="132" r="62" fill="#1B1A17" opacity="0.22" />
          <circle cx="158" cy="52" r="20" fill={patternColor} opacity="0.9" />
          <path d="M0 170 C 50 138, 120 196, 200 150 L200 200 L0 200Z" fill="#1B1A17" opacity="0.18" />
        </g>
      )}
      {variant === 6 && (
        <g fill="none" stroke={patternColor} strokeWidth="9" opacity="0.55">
          <path d="M35 200V95a45 45 0 0 1 90 0v30" />
          <path d="M75 200V115a45 45 0 0 1 90 0v85" />
          <path d="M115 200v-40a40 40 0 0 1 80 0v40" />
        </g>
      )}
      {monogram && (
        <text
          x="100"
          y="125"
          textAnchor="middle"
          fontFamily="'Songti SC', 'Noto Serif CJK SC', Georgia, serif"
          fontSize="78"
          fontWeight="600"
          fill={monogramColor}
          opacity="0.82"
        >
          {initial}
        </text>
      )}
      <rect x="0.75" y="0.75" width="198.5" height="198.5" fill="none" stroke="#1B1A17" strokeWidth="1.5" opacity="0.35" />
    </svg>
  );
}