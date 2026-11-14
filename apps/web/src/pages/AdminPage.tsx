import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Track } from '../api/types';
import { AuthRequired } from '../components/AuthRequired';
import { CoverArt } from '../components/CoverArt';
import { Modal } from '../components/Modal';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';
import { EditIcon, PlusIcon, SearchIcon, ShieldIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { formatTime } from '../lib/player';

interface AlbumOption {
  id: string;
  title: string;
  artist_name: string;
}

type AdminTrack = Track;

interface TrackForm {
  title: string;
  albumId: string;
  trackNo: string;
  audioKey: string;
  genre: string;
  moods: string;
  energy: string;
  isExplicit: boolean;
}

const EMPTY_FORM: TrackForm = {
  title: '',
  albumId: '',
  trackNo: '',
  audioKey: 'loop-01',
  genre: '',
  moods: '深夜',
  energy: '0.5',
  isExplicit: false,
};

const AUDIO_KEYS = Array.from({ length: 8 }, (_, index) => `loop-0${index + 1}`);

export function AdminPage() {
  const { user, ready } = useAuth();
  const { show } = useToast();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const tracksFetch = useFetch<{ tracks: AdminTrack[] }>(
    user?.role === 'admin' ? `/admin/tracks${submittedQuery ? `?q=${encodeURIComponent(submittedQuery)}` : ''}` : null,
    [user?.id, submittedQuery],
  );
  const albumsFetch = useFetch<{ albums: AlbumOption[] }>(user?.role === 'admin' ? '/admin/albums' : null, [user?.id]);
  const overviewFetch = useFetch<{ counts: Record<string, number> }>(user?.role === 'admin' ? '/admin/overview' : null, [user?.id]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTrack | null>(null);
  const [form, setForm] = useState<TrackForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminTrack | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.title = '内容管理 · 声屿';
  }, []);

  const albums = albumsFetch.data?.albums ?? [];
  const tracks = tracksFetch.data?.tracks ?? [];

  useEffect(() => {
    if (!formOpen) return;
    if (editing) {
      setForm({
        title: editing.title,
        albumId: editing.album.id,
        trackNo: String(editing.trackNo),
        audioKey: editing.audioUrl.split('/').pop()?.replace('.mp3', '') ?? 'loop-01',
        genre: editing.genre,
        moods: editing.moods.join(', '),
        energy: String(editing.energy),
        isExplicit: editing.isExplicit,
      });
    } else {
      setForm({ ...EMPTY_FORM, albumId: albums[0]?.id ?? '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOpen, editing]);

  const stats = useMemo(
    () => [
      { label: '曲目', value: overviewFetch.data?.counts.tracks ?? '—' },
      { label: '音乐人', value: overviewFetch.data?.counts.artists ?? '—' },
      { label: '专辑', value: overviewFetch.data?.counts.albums ?? '—' },
      { label: '用户', value: overviewFetch.data?.counts.users ?? '—' },
      { label: '歌单', value: overviewFetch.data?.counts.playlists ?? '—' },
    ],
    [overviewFetch.data],
  );

  if (ready && !user) {
    return <AuthRequired title="内容管理" description="使用管理员账号登录后可新增、编辑与下架曲目。" />;
  }
  if (ready && user && user.role !== 'admin') {
    return (
      <div className="page auth-required">
        <p className="kicker">403 · Admins only</p>
        <h1>需要管理员权限</h1>
        <div className="gate-card">
          <span className="gate-icon"><ShieldIcon size={30} /></span>
          <h2>这里是内容管理工作台</h2>
          <p>你的账号是听众角色。服务端会拒绝管理接口请求；请使用演示管理员账号登录。</p>
          <div className="gate-actions">
            <Link to="/" className="btn btn-primary">回到发现</Link>
            <Link to="/account" className="btn btn-ghost">查看我的账户</Link>
          </div>
          <p className="gate-hint">管理员：admin@shengyu.app / admin1234</p>
        </div>
      </div>
    );
  }

  const submit = async () => {
    if (!form.title.trim()) {
      show('请填写曲目名称', 'info');
      return;
    }
    if (!form.albumId) {
      show('请选择专辑', 'info');
      return;
    }
    const payload = {
      title: form.title.trim(),
      albumId: form.albumId,
      trackNo: form.trackNo ? Number(form.trackNo) : undefined,
      audioKey: form.audioKey,
      genre: form.genre.trim() || undefined,
      moods: form.moods.split(/[,，\s]+/).map((mood) => mood.trim()).filter(Boolean).slice(0, 6),
      energy: Number(form.energy),
      isExplicit: form.isExplicit,
    };
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/admin/tracks/${editing.id}`, payload);
        show('曲目已更新', 'success');
      } else {
        await api.post('/admin/tracks', payload);
        show('曲目已创建', 'success');
      }
      setFormOpen(false);
      setEditing(null);
      tracksFetch.reload();
      overviewFetch.reload();
    } catch (error) {
      show(error instanceof Error ? error.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/tracks/${deleteTarget.id}`);
      show(`已下架《${deleteTarget.title}》`, 'success');
      setDeleteTarget(null);
      tracksFetch.reload();
      overviewFetch.reload();
    } catch {
      show('删除失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page admin-page">
      <header className="admin-hero">
        <div>
          <p className="kicker">Curator console</p>
          <h1>内容管理</h1>
          <p className="page-desc">以管理员身份维护曲目目录。所有写操作都在服务端校验角色与参数。</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          disabled={albums.length === 0}
        >
          <PlusIcon size={18} />
          新增曲目
        </button>
      </header>

      <div className="admin-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-stat">
            <span>{stat.value}</span>
            <strong>{stat.label}</strong>
          </div>
        ))}
      </div>

      <div className="admin-toolbar">
        <form
          className="admin-search"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedQuery(query.trim());
          }}
        >
          <SearchIcon size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索曲目、艺人或专辑"
            aria-label="搜索曲目"
          />
          <button type="submit" className="btn btn-ghost btn-sm">搜索</button>
        </form>
        <span className="muted">共 {tracks.length} 首</span>
      </div>

      {tracksFetch.loading && !tracksFetch.data ? <Skeleton className="skeleton-line" count={6} /> : null}
      {tracksFetch.error ? <ErrorState message={tracksFetch.error} onRetry={tracksFetch.reload} /> : null}

      {tracksFetch.data && tracks.length === 0 ? (
        <EmptyState
          icon={<SearchIcon size={38} />}
          title="没有匹配的曲目"
          description="清除搜索条件或新建一首曲目。"
          action={submittedQuery ? <button type="button" className="btn btn-primary btn-sm" onClick={() => { setQuery(''); setSubmittedQuery(''); }}>清除搜索</button> : undefined}
        />
      ) : null}

      {tracks.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">曲目</th>
                <th scope="col">专辑</th>
                <th scope="col">风格 / 情绪</th>
                <th scope="col">能量</th>
                <th scope="col">时长</th>
                <th scope="col"><span className="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => (
                <tr key={track.id}>
                  <td>
                    <div className="admin-track-cell">
                      <span className="admin-cover">
                        <CoverArt
                          seed={track.album.artSeed}
                          accent={track.album.accent}
                          accent2={track.album.accent2}
                          label={track.title}
                        />
                      </span>
                      <div>
                        <strong>{track.title}</strong>
                        <span>{track.artist.name} · #{track.trackNo}</span>
                      </div>
                    </div>
                  </td>
                  <td>{track.album.title}</td>
                  <td>
                    <span className="table-tag">{track.genre}</span>
                    <span className="muted">{track.moods.join(' / ')}</span>
                  </td>
                  <td>{Math.round(track.energy * 100)}%</td>
                  <td>{formatTime(track.durationSec)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn small"
                        onClick={() => {
                          setEditing(track);
                          setFormOpen(true);
                        }}
                        aria-label={`编辑 ${track.title}`}
                      >
                        <EditIcon size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn small danger"
                        onClick={() => setDeleteTarget(track)}
                        aria-label={`删除 ${track.title}`}
                      >
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="admin-note">
        注意：管理员只能管理曲目元数据；删除会级联移除相关歌单引用与喜欢记录。角色校验在服务端完成。
      </p>

      <Modal
        open={formOpen}
        title={editing ? '编辑曲目' : '新增曲目'}
        kicker={editing ? editing.id : 'New track'}
        size="medium"
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        initialFocusSelector="#admin-track-title"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => { setFormOpen(false); setEditing(null); }}>取消</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void submit()}>
              {saving ? '保存中…' : editing ? '保存修改' : '创建曲目'}
            </button>
          </>
        }
      >
        <div className="admin-form">
          <label className="field">
            <span>曲目名称</span>
            <input id="admin-track-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>所属专辑</span>
              <select value={form.albumId} onChange={(event) => setForm({ ...form, albumId: event.target.value })}>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>{album.artist_name} · {album.title}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>曲目序号</span>
              <input type="number" min={1} max={99} value={form.trackNo} onChange={(event) => setForm({ ...form, trackNo: event.target.value })} placeholder="自动" />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>音频样带</span>
              <select value={form.audioKey} onChange={(event) => setForm({ ...form, audioKey: event.target.value })}>
                {AUDIO_KEYS.map((key) => <option key={key} value={key}>{key}</option>)}
              </select>
            </label>
            <label className="field">
              <span>风格</span>
              <input value={form.genre} onChange={(event) => setForm({ ...form, genre: event.target.value })} placeholder="如 indie-pop" />
            </label>
          </div>
          <label className="field">
            <span>情绪标签（逗号分隔，最多 6 个）</span>
            <input value={form.moods} onChange={(event) => setForm({ ...form, moods: event.target.value })} placeholder="深夜, 氛围, 城市" />
          </label>
          <label className="field">
            <span>能量 <em>{Math.round(Number(form.energy) * 100)}%</em></span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={form.energy}
              onChange={(event) => setForm({ ...form, energy: event.target.value })}
              style={{ ['--progress' as string]: `${Number(form.energy) * 100}%` }}
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.isExplicit}
              onChange={(event) => setForm({ ...form, isExplicit: event.target.checked })}
            />
            <span>标记为露骨内容（E）</span>
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="下架这首曲目？"
        size="small"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>保留</button>
            <button type="button" className="btn btn-danger" disabled={deleting} onClick={() => void remove()}>
              {deleting ? '删除中…' : '确认删除'}
            </button>
          </>
        }
      >
        <p>《{deleteTarget?.title}》将从曲库、歌单与喜欢记录中移除，无法撤销。</p>
      </Modal>
    </div>
  );
}