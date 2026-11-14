import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { AlbumPage } from './pages/AlbumPage';
import { ArtistPage } from './pages/ArtistPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { GuidePage } from './pages/GuidePage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlansPage } from './pages/PlansPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { PodcastShowPage } from './pages/PodcastShowPage';
import { PodcastsPage } from './pages/PodcastsPage';
import { SearchPage } from './pages/SearchPage';
import { StationPage } from './pages/StationPage';
import { TrackPage } from './pages/TrackPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="playlist/:id" element={<PlaylistPage />} />
        <Route path="artist/:id" element={<ArtistPage />} />
        <Route path="album/:id" element={<AlbumPage />} />
        <Route path="track/:id" element={<TrackPage />} />
        <Route path="station/:id" element={<StationPage />} />
        <Route path="podcasts" element={<PodcastsPage />} />
        <Route path="podcast/:id" element={<PodcastShowPage />} />
        <Route path="guide" element={<GuidePage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}