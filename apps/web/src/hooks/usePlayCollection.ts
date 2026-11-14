import { useCallback } from 'react';
import { api } from '../api/client';
import type { AlbumDetail, ArtistDetail, PlaylistDetail, PodcastDetail } from '../api/types';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../context/ToastContext';

export function usePlayCollection() {
  const player = usePlayer();
  const { show } = useToast();

  const playAlbum = useCallback(
    async (albumId: string) => {
      try {
        const detail = await api.get<AlbumDetail>(`/albums/${albumId}`);
        player.playTracks(detail.tracks, 0);
      } catch {
        show('专辑加载失败，请稍后再试', 'error');
      }
    },
    [player, show],
  );

  const playArtist = useCallback(
    async (artistId: string) => {
      try {
        const detail = await api.get<ArtistDetail>(`/artists/${artistId}`);
        player.playTracks(detail.popularTracks, 0);
      } catch {
        show('音乐人作品加载失败', 'error');
      }
    },
    [player, show],
  );

  const playPlaylist = useCallback(
    async (playlistId: string) => {
      try {
        const detail = await api.get<PlaylistDetail>(`/playlists/${playlistId}`);
        player.playTracks(detail.tracks, 0);
      } catch {
        show('歌单加载失败', 'error');
      }
    },
    [player, show],
  );

  const playPodcast = useCallback(
    async (podcastId: string) => {
      try {
        const detail = await api.get<PodcastDetail>(`/podcasts/${podcastId}`);
        player.playEpisodes(detail.episodes, 0);
      } catch {
        show('播客加载失败', 'error');
      }
    },
    [player, show],
  );

  return { playAlbum, playArtist, playPlaylist, playPodcast };
}