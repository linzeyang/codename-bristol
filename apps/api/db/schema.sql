-- 声屿数据库初始化 schema（PostgreSQL 16+）
-- 幂等：应用每次启动都会执行本文件。

CREATE TABLE IF NOT EXISTS meta (
  key   text PRIMARY KEY,
  value text NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            text PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name  text NOT NULL,
  role          text NOT NULL DEFAULT 'listener' CHECK (role IN ('listener', 'admin')),
  plan_id       text NOT NULL DEFAULT 'free',
  token_version integer NOT NULL DEFAULT 0,
  avatar_hue    integer NOT NULL DEFAULT 18 CHECK (avatar_hue BETWEEN 0 AND 360),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id           text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme             text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  audio_quality     text NOT NULL DEFAULT 'standard' CHECK (audio_quality IN ('standard', 'high', 'lossless')),
  normalize_volume  boolean NOT NULL DEFAULT true,
  show_now_playing  boolean NOT NULL DEFAULT true,
  private_session   boolean NOT NULL DEFAULT false,
  autoplay_similar  boolean NOT NULL DEFAULT true,
  reduce_motion     boolean NOT NULL DEFAULT false,
  notify_new_release boolean NOT NULL DEFAULT true,
  notify_email      boolean NOT NULL DEFAULT false,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artists (
  id                text PRIMARY KEY,
  name              text NOT NULL,
  genre             text NOT NULL,
  bio               text NOT NULL DEFAULT '',
  monthly_listeners integer NOT NULL DEFAULT 0,
  origin            text NOT NULL DEFAULT '',
  accent            text NOT NULL DEFAULT '#E84A2A',
  accent2           text NOT NULL DEFAULT '#F2C14E',
  art_seed          integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS albums (
  id          text PRIMARY KEY,
  artist_id   text NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title       text NOT NULL,
  year        integer NOT NULL,
  type        text NOT NULL DEFAULT 'album' CHECK (type IN ('album', 'ep', 'single')),
  description text NOT NULL DEFAULT '',
  accent      text NOT NULL DEFAULT '#E84A2A',
  accent2     text NOT NULL DEFAULT '#F2C14E',
  art_seed    integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS albums_artist_idx ON albums (artist_id);

CREATE TABLE IF NOT EXISTS tracks (
  id          text PRIMARY KEY,
  album_id    text NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  artist_id   text NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title       text NOT NULL,
  duration_sec integer NOT NULL DEFAULT 45 CHECK (duration_sec > 0),
  track_no    integer NOT NULL DEFAULT 1,
  audio_key   text NOT NULL,
  play_count  bigint NOT NULL DEFAULT 0,
  genre       text NOT NULL DEFAULT '',
  moods       text[] NOT NULL DEFAULT '{}',
  energy      real NOT NULL DEFAULT 0.5 CHECK (energy BETWEEN 0 AND 1),
  lyrics      jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_explicit boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tracks_album_idx ON tracks (album_id);
CREATE INDEX IF NOT EXISTS tracks_artist_idx ON tracks (artist_id);
CREATE INDEX IF NOT EXISTS tracks_play_count_idx ON tracks (play_count DESC);

CREATE TABLE IF NOT EXISTS podcasts (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  publisher   text NOT NULL,
  description text NOT NULL DEFAULT '',
  category    text NOT NULL DEFAULT '',
  accent      text NOT NULL DEFAULT '#0D6E66',
  accent2     text NOT NULL DEFAULT '#9BD1C5',
  art_seed    integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS episodes (
  id          text PRIMARY KEY,
  podcast_id  text NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration_sec integer NOT NULL DEFAULT 45,
  episode_no  integer NOT NULL DEFAULT 1,
  published_at timestamptz NOT NULL DEFAULT now(),
  audio_key   text NOT NULL
);
CREATE INDEX IF NOT EXISTS episodes_podcast_idx ON episodes (podcast_id);

CREATE TABLE IF NOT EXISTS playlists (
  id          text PRIMARY KEY,
  owner_id    text REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_editorial boolean NOT NULL DEFAULT false,
  accent      text NOT NULL DEFAULT '#0D6E66',
  accent2     text NOT NULL DEFAULT '#9BD1C5',
  art_seed    integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (is_editorial OR owner_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS playlists_owner_idx ON playlists (owner_id);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id text NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id    text NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position    integer NOT NULL DEFAULT 0,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, track_id)
);
CREATE INDEX IF NOT EXISTS playlist_tracks_order_idx ON playlist_tracks (playlist_id, position);

CREATE TABLE IF NOT EXISTS likes (
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id   text NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);

CREATE TABLE IF NOT EXISTS follows (
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id  text NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artist_id)
);

CREATE TABLE IF NOT EXISTS saved_albums (
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  album_id   text NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, album_id)
);

CREATE TABLE IF NOT EXISTS podcast_follows (
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  podcast_id text NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, podcast_id)
);

CREATE TABLE IF NOT EXISTS plays (
  id         bigserial PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id   text NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  played_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plays_user_time_idx ON plays (user_id, played_at DESC);

CREATE TABLE IF NOT EXISTS search_history (
  id          bigserial PRIMARY KEY,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query       text NOT NULL,
  searched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS search_history_user_idx ON search_history (user_id, searched_at DESC);

CREATE TABLE IF NOT EXISTS subscription_events (
  id         bigserial PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id    text NOT NULL,
  action     text NOT NULL DEFAULT 'switch',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_events_user_idx ON subscription_events (user_id, created_at DESC);