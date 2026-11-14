import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { PlaylistDetail, Track } from '../api/types';
import { CoverArt } from '../components/CoverArt';
import { Modal } from '../components/Modal';
import { TrackList } from '../components/TrackRow';
import { EmptyState, ErrorState, Section, Skeleton } from '../components/ui';
import { EditIcon, PlayIcon, PlusIcon, QueueIcon, ShuffleIcon, TrashIcon } from '../components/Icons';
import { usePlayer } from '../context/PlayerContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { usePlayCollection } from '../hooks/usePlayCollection';
import { formatTime, trackToItem } from '../lib/player';

export function PlaylistPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useFetch<PlaylistDetail>(`/playlists/${id}`, [id]);
  const player = usePlayer();
  const { show } = useToast();
  const navigate = useNavigate();
  const { playPlaylist } = usePlayCollection();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (data) {
      document.title = `${data.playlist.title} · 声屿`;
      setTitle(data.playlist.title);
      setDescription(data.playlist.description);
    }
  }, [data]);

  if (loading && !data) {
    return <div className="page"><Skeleton className="skeleton-hero" /><Skeleton className="skeleton-line" count={6} /></div>;
  }
  if (error || !data) return <ErrorState message={error ?? '歌单不存在'} onRetry={reload} />;

  const { playlist, tracks, totalDurationSec, isOwner } = data;

  const saveEdits = async () => {
    if (!title.trim()) {
      show('歌单名称不能为空', 'info');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/playlists/${playlist.id}`, { title: title.trim(), description: description.trim() });
      show('歌单已更新', 'success');
      setEditing(false);
      reload();
      window.dispatchEvent(new Event('sy:playlists-changed'));
    } catch {
      show('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeTrack = async (track: Track) => {
    try {
      await api.delete(`/playlists/${playlist.id}/tracks/${track.id}`);
      show(`已移除《${track.title}》`, 'success');
      reload();
    } catch {
      show('移除失败', 'error');
    }
  };

  const reorder = async (from: number, to: number) => {
    const ids = tracks.map((track) => track.id);
    const [moved] = ids.splice(from, 1);
    if (!moved) return;
    ids.splice(to, 0, moved);
    try {
      await api.put(`/playlists/${playlist.id}/order`, { trackIds: ids });
      reload();
    } catch {
      show('排序保存失败', 'error');
    }
  };

  const removePlaylist = async () => {
    setDeleting(true);
    try {
      await api.delete(`/playlists/${playlist.id}`);
      show('歌单已删除', 'success');
      window.dispatchEvent(new Event('sy:playlists-changed'));
      navigate('/library?tab=playlists');
    } catch {
      show('删除失败', 'error');
      setDeleting(false);
    }
  };

  const shuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    player.playTracks(shuffled, 0);
  };

  return (
    <div className="page playlist-page">
      <section
        className="playlist-hero"
        style={{ ['--pl-a' as string]: playlist.accent, ['--pl-b' as string]: playlist.accent2 }}
      >
        <div className="playlist-cover">
          <CoverArt
            seed={playlist.artSeed}
            accent={playlist.accent}
            accent2={playlist.accent2}
            label={playlist.title}
            monogram
          />
          <span className="playlist-stamp">{playlist.isEditorial ? '声屿编辑' : '私人歌单'}</span>
        </div>
        <div className="playlist-copy">
          <p className="kicker">{playlist.isEditorial ? 'Editorial playlist' : 'Your playlist'}</p>
          {editing ? (
            <div className="playlist-edit">
              <label className="field">
                <span>名称</span>
                <input value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="field">
                <span>简介</span>
                <textarea value={description} maxLength={300} rows={3} onChange={(event) => setDescription(event.target.value)} />
              </label>
              <div className="playlist-edit-actions">
                <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => void saveEdits()}>
                  {saving ? '保存中…' : '保存'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>取消</button>
              </div>
            </div>
          ) : (
            <>
              <h1>{playlist.title}</h1>
              <p className="playlist-description">{playlist.description || '还没有简介。'}</p>
            </>
          )}
          <p className="playlist-meta">
            {playlist.owner ? <span>{playlist.owner.displayName}</span> : <span>声屿编辑部</span>}
            <span>·</span>
            <span>{tracks.length} 首</span>
            <span>·</span>
            <span>{formatTime(totalDurationSec)}</span>
            {playlist.isEditorial ? <span className="editorial-tag">官方精选</span> : null}
          </p>
          <div className="playlist-actions">
            <button type="button" className="btn btn-primary" disabled={tracks.length === 0} onClick={() => void playPlaylist(playlist.id)}>
              <PlayIcon size={18} />
              播放
            </button>
            <button type="button" className="btn btn-ghost" onClick={shuffle}>
              <ShuffleIcon size={18} />
              随机
            </button>
            <button
              type="button"
              className="icon-btn on-hero"
              onClick={() => player.addToQueue(tracks.map((track) => trackToItem(track)))}
              aria-label="将歌单加入队列"
            >
              <QueueIcon size={20} />
            </button>
            {isOwner && !editing ? (
              <button type="button" className="icon-btn on-hero" onClick={() => setEditing(true)} aria-label="编辑歌单">
                <EditIcon size={19} />
              </button>
            ) : null}
            {isOwner ? (
              <button type="button" className="icon-btn on-hero danger" onClick={() => setDeleteOpen(true)} aria-label="删除歌单">
                <TrashIcon size={19} />
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="playlist-body">
        {tracks.length === 0 ? (
          <EmptyState
            title="这张歌单还是空的"
            description={isOwner ? '去发现音乐，用曲目菜单把喜欢的歌加进来。' : '编辑正在挑选声音，过一会儿再来。'}
            action={<Link to="/" className="btn btn-primary btn-sm"><PlusIcon size={16} />去发现音乐</Link>}
          />
        ) : (
          <>
            <div className="playlist-track-head"># 曲目</div>
            <TrackList tracks={tracks} showAlbum onRemove={isOwner ? removeTrack : undefined} onReorder={isOwner ? reorder : undefined} />
            {isOwner ? <p className="reorder-hint">使用每行右侧的上下箭头调整顺序，改动会立即保存。</p> : null}
          </>
        )}

        {playlist.isEditorial ? (
          <Section kicker="Curated by" title="为什么是这些歌">
            <div className="editorial-note">
              <p>
                这张歌单由声屿编辑部挑选，依据曲目的情绪、能量与场景标签组合而成。你可以把它加入队列，
                或用向导找到更符合当下的版本。
              </p>
              <Link to="/guide" className="btn btn-ghost btn-sm">让向导再挑一次</Link>
            </div>
          </Section>
        ) : null}
      </div>

      <Modal
        open={deleteOpen}
        title="删除这张歌单？"
        size="small"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteOpen(false)}>保留</button>
            <button type="button" className="btn btn-danger" disabled={deleting} onClick={() => void removePlaylist()}>
              {deleting ? '删除中…' : '确认删除'}
            </button>
          </>
        }
      >
        <p>「{playlist.title}」将被永久删除，其中的曲目不会从曲库消失。此操作不可撤销。</p>
      </Modal>
    </div>
  );
}