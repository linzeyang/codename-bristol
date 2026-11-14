import type { ReactNode, SVGProps } from 'react';

export interface IconProps {
  size?: number;
  className?: string;
  title?: string;
}

function Svg({
  size = 24,
  className,
  title,
  children,
  fill = 'none',
  ...rest
}: IconProps & { children: ReactNode; fill?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={fill === 'none' ? 'currentColor' : 'none'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function Logo({ size = 32, className, title }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      fill="none"
    >
      {title ? <title>{title}</title> : null}
      <path d="M6 28.5c5.2 0 5.2-16 10.4-16s5.2 16 10.4 16S32 18 37 18" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M9.5 34c3.4 0 3.4-7.5 6.8-7.5s3.4 7.5 6.8 7.5 3.4-4.2 6.8-4.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
      <circle cx="32" cy="10" r="3" fill="currentColor" />
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.8Z" /></Svg>
);
export const CompassIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="m15.4 8.6-2.1 4.7-4.7 2.1 2.1-4.7 4.7-2.1Z" /></Svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></Svg>
);
export const MenuIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 6.5h16M4 12h16M4 17.5h10" /></Svg>
);
export const LibraryIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 5.5h4v14H4zM10 5.5h3v14h-3z" /><path d="m15.5 7 4 12" /></Svg>
);
export const PlusIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);
export const PlayIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor"><path d="M8.5 5.7c0-.9 1-1.4 1.7-.9l9 6.3c.7.5.7 1.4 0 1.9l-9 6.3c-.7.5-1.7 0-1.7-.9V5.7Z" /></Svg>
);
export const PauseIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor"><path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z" /></Svg>
);
export const PrevIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor"><path d="M6 5h2.2v14H6zM19 6.4v11.2c0 .9-1 1.4-1.7.9l-8-5.6a1.1 1.1 0 0 1 0-1.8l8-5.6c.7-.5 1.7 0 1.7.9Z" /></Svg>
);
export const NextIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor"><path d="M15.8 5H18v14h-2.2zM5 6.4v11.2c0 .9 1 1.4 1.7.9l8-5.6a1.1 1.1 0 0 0 0-1.8l-8-5.6C6 5 5 5.5 5 6.4Z" /></Svg>
);
export const ShuffleIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 6h3.2c1.4 0 2.7.7 3.5 1.8l4.6 6.4a4.3 4.3 0 0 0 3.5 1.8H20" /><path d="m17 3 3 3-3 3M4 18h3.2c1.4 0 2.7-.7 3.5-1.8l.8-1.1M14.2 9.2l.9-1.4A4.3 4.3 0 0 1 18.6 6H20M17 15l3 3-3 3" /></Svg>
);
export const RepeatIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 9.5A4.5 4.5 0 0 1 9.5 5H19l-2.5-2.5M19 14.5a4.5 4.5 0 0 1-4.5 4.5H5l2.5 2.5" /></Svg>
);
export const RepeatOneIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 9.5A4.5 4.5 0 0 1 9.5 5H19l-2.5-2.5M19 14.5a4.5 4.5 0 0 1-4.5 4.5H5l2.5 2.5" /><path d="M12 9.5v5M10.8 10.4l1.2-.9" /></Svg>
);
export const HeartIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 20s-7.5-4.4-7.5-9.4A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 3c0 5-7.5 9.4-7.5 9.4Z" /></Svg>
);
export const HeartFilledIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor"><path d="M12 20s-7.5-4.4-7.5-9.4A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 3c0 5-7.5 9.4-7.5 9.4Z" /></Svg>
);
export const MoreIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></Svg>
);
export const CloseIcon = (p: IconProps) => (
  <Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <Svg {...p}><path d="m15 5-7 7 7 7" /></Svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}><path d="m9 5 7 7-7 7" /></Svg>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}><path d="m5 9 7 7 7-7" /></Svg>
);
export const ChevronUpIcon = (p: IconProps) => (
  <Svg {...p}><path d="m5 15 7-7 7 7" /></Svg>
);
export const SunIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></Svg>
);
export const MoonIcon = (p: IconProps) => (
  <Svg {...p}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></Svg>
);
export const MonitorIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="4.5" width="18" height="12.5" rx="1.5" /><path d="M9 21h6M12 17v4" /></Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.5 3.5-5.5 7-5.5s6.2 2 7 5.5" /></Svg>
);
export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.8 7.8 0 0 0-2.6-1.5L13.8 2h-3.6l-.3 2.5A7.8 7.8 0 0 0 7.3 6L5 5.1 3 8.5 5 10a7.8 7.8 0 0 0 0 3l-2 1.5L5 18l2.3-.9a7.8 7.8 0 0 0 2.6 1.5l.3 2.4h3.6l.3-2.4a7.8 7.8 0 0 0 2.6-1.5l2.3.9 2-3.5-2-1.5Z" /></Svg>
);
export const SparklesIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3.5 13.8 9l5.5 1.8-5.5 1.9L12 18l-1.8-5.3-5.5-1.9L10.2 9 12 3.5Z" /><path d="M19 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" /></Svg>
);
export const CommandIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9 6a2.5 2.5 0 1 0-2.5 2.5H9V6Zm0 0h6m-6 0v6m0 0v6a2.5 2.5 0 1 1-2.5-2.5H9v-3.5Zm6-6v6m0 0v6a2.5 2.5 0 1 0 2.5-2.5H15v-3.5Zm0-6a2.5 2.5 0 1 1 2.5 2.5H15V6Z" /></Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7" /></Svg>
);
export const TrashIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" /></Svg>
);
export const EditIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m13.5 5.5 3 3" /></Svg>
);
export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>
);
export const ArrowDownIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>
);
export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
);
export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Svg>
);
export const LockIcon = (p: IconProps) => (
  <Svg {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="1.8" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2" /></Svg>
);
export const LogoutIcon = (p: IconProps) => (
  <Svg {...p}><path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8M10 12h11M17 8l4 4-4 4" /></Svg>
);
export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3 5 6v5.5c0 4.4 2.9 7.6 7 9.5 4.1-1.9 7-5.1 7-9.5V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></Svg>
);
export const CardIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></Svg>
);
export const RadioIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="2.2" /><path d="M7.5 16.5a6.4 6.4 0 0 1 0-9M16.5 7.5a6.4 6.4 0 0 1 0 9M5 19a9.5 9.5 0 0 1 0-14M19 5a9.5 9.5 0 0 1 0 14" /></Svg>
);
export const MicIcon = (p: IconProps) => (
  <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" /></Svg>
);
export const ClockIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
);
export const ListIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></Svg>
);
export const QueueIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 6h12M4 12h12M4 18h8M19 14v6M16 17h6" /></Svg>
);
export const LyricsIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 5h16v11H9l-5 4V5Z" /><path d="M8 9h8M8 12h5" /></Svg>
);
export const ExpandIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9 4H4v5M15 20h5v-5M20 9V4h-5M4 15v5h5" /></Svg>
);
export const VolumeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4v-5Z" /><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></Svg>
);
export const VolumeLowIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4v-5Z" /><path d="M15.5 9a4.2 4.2 0 0 1 0 6" /></Svg>
);
export const MuteIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4v-5Z" /><path d="m16 10 4 4M20 10l-4 4" /></Svg>
);
export const MailIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 6.5 8 6 8-6" /></Svg>
);
export const EyeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const EyeOffIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 4l16 16M10.5 6c.5-.1 1-.1 1.5-.1 6 0 9.5 6.1 9.5 6.1a16 16 0 0 1-2.4 3.2M6.2 7.8A16.4 16.4 0 0 0 2.5 12S6 18.1 12 18.1c1.4 0 2.7-.3 3.9-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Svg>
);
export const HeadphonesIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13.5" width="4.5" height="7" rx="2" /><rect x="16.5" y="13.5" width="4.5" height="7" rx="2" /></Svg>
);
export const MusicIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></Svg>
);
export const PodcastIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="10" r="3.2" /><path d="M6.5 17.5a7 7 0 0 1 11 0M8.5 21a5.3 5.3 0 0 1 7 0M4.5 14a9 9 0 0 1 15 0" /></Svg>
);
export const DiscIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2" /></Svg>
);
export const ExternalIcon = (p: IconProps) => (
  <Svg {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></Svg>
);
export const InfoIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></Svg>
);
export const GripIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor"><circle cx="9" cy="7" r="1.3" /><circle cx="15" cy="7" r="1.3" /><circle cx="9" cy="12" r="1.3" /><circle cx="15" cy="12" r="1.3" /><circle cx="9" cy="17" r="1.3" /><circle cx="15" cy="17" r="1.3" /></Svg>
);
export const MinusIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14" /></Svg>
);
export const RefreshIcon = (p: IconProps) => (
  <Svg {...p}><path d="M20 11a8 8 0 1 0-2.3 6.2M20 4v7h-7" /></Svg>
);
export const WaveIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 12c2 0 2-5 4-5s2 10 4 10 2-12 4-12 2 9 4 9 2-3 2-3" /></Svg>
);
export const BellIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5S6.5 14 6.5 10ZM10 19a2.2 2.2 0 0 0 4 0" /></Svg>
);
export const KeyboardIcon = (p: IconProps) => (
  <Svg {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" /></Svg>
);
export const GlobeIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.2 2.3 3.3 5.2 3.3 8.5S14.2 18.2 12 20.5C9.8 18.2 8.7 15.3 8.7 12S9.8 5.8 12 3.5Z" /></Svg>
);