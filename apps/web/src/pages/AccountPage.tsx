import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Settings } from '../api/types';
import { AuthRequired } from '../components/AuthRequired';
import { CoverArt } from '../components/CoverArt';
import { Modal } from '../components/Modal';
import { ErrorState, Skeleton } from '../components/ui';
import {
  DownloadIcon,
  EyeIcon,
  LockIcon,
  LogoutIcon,
  MailIcon,
  MonitorIcon,
  MoonIcon,
  ShieldIcon,
  SunIcon,
  TrashIcon,
  UserIcon,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { PLAN_LABELS, QUALITY_LABELS } from '../lib/labels';

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch${checked ? ' is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

export function AccountPage() {
  const { user, ready, updateUser, logout } = useAuth();
  const { settings, update, syncing } = useSettings();
  const { show } = useToast();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [avatarHue, setAvatarHue] = useState(18);
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [logoutAllBusy, setLogoutAllBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const subscription = useFetch<{ currentPlanId: string; events: { planId: string; action: string; createdAt: string }[] }>(
    user ? '/subscription' : null,
    [user?.id],
  );

  useEffect(() => {
    document.title = '账户与设置 · 声屿';
  }, []);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setAvatarHue(user.avatarHue);
    }
  }, [user]);

  if (ready && !user) {
    return <AuthRequired title="账户与设置" description="登录后管理资料、订阅、播放偏好、安全与数据。" />;
  }
  if (!user) return <div className="page"><Skeleton className="skeleton-hero" /></div>;

  const saveProfile = async () => {
    if (!displayName.trim()) {
      show('昵称不能为空', 'info');
      return;
    }
    setSavingProfile(true);
    try {
      const response = await api.patch<{ user: typeof user }>('/me', {
        displayName: displayName.trim(),
        avatarHue,
      });
      updateUser(response.user);
      show('资料已更新', 'success');
    } catch {
      show('保存失败，请稍后再试', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      show('新密码至少 8 位', 'info');
      return;
    }
    if (newPassword !== confirmPassword) {
      show('两次输入的新密码不一致', 'info');
      return;
    }
    setPasswordBusy(true);
    try {
      await api.post('/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      show('密码已更新，其他设备会话已失效', 'success');
    } catch (error) {
      show(error instanceof Error ? error.message : '修改失败', 'error');
    } finally {
      setPasswordBusy(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/me/export', { credentials: 'include' });
      if (!response.ok) throw new Error('export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'shengyu-export.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      show('数据已导出为 JSON', 'success');
    } catch {
      show('导出失败，请稍后再试', 'error');
    } finally {
      setExporting(false);
    }
  };

  const logoutAll = async () => {
    setLogoutAllBusy(true);
    try {
      await api.post('/me/logout-all');
      await logout();
      show('已退出所有设备', 'success');
      navigate('/login');
    } catch {
      show('操作失败', 'error');
      setLogoutAllBusy(false);
    }
  };

  const deleteAccount = async () => {
    setDeleteBusy(true);
    try {
      await api.delete('/me', { password: deletePassword, confirmEmail: deleteEmail });
      await logout();
      show('账户已删除，所有个人数据已清除', 'success');
      navigate('/');
    } catch (error) {
      show(error instanceof Error ? error.message : '删除失败', 'error');
      setDeleteBusy(false);
    }
  };

  const setPref = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    void update({ [key]: value } as Pick<Settings, K>);
  };

  return (
    <div className="page account-page">
      <header className="account-hero">
        <div className="account-avatar" style={{ ['--avatar-hue' as string]: user.avatarHue }}>
          <span>{user.displayName.slice(0, 1)}</span>
          <div className="account-avatar-art" aria-hidden="true">
            <CoverArt seed={user.avatarHue} accent="#E84A2A" accent2="#0D6E66" label={user.displayName} monogram />
          </div>
        </div>
        <div className="account-hero-copy">
          <p className="kicker">Your account</p>
          <h1>{user.displayName}</h1>
          <p>{user.email} · {user.role === 'admin' ? '管理员' : '听众'} · {PLAN_LABELS[user.planId] ?? user.planId}</p>
          <p className="account-since">加入于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}</p>
        </div>
        <div className="account-hero-actions">
          <button type="button" className="btn btn-ghost" onClick={() => void exportData()} disabled={exporting}>
            <DownloadIcon size={17} />
            {exporting ? '导出中…' : '导出我的数据'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/plans')}>
            <ShieldIcon size={17} />
            订阅方案
          </button>
        </div>
      </header>

      <div className="account-layout">
        <nav className="account-nav" aria-label="账户分区">
          <a href="#profile">个人资料</a>
          <a href="#subscription">订阅</a>
          <a href="#preferences">外观与播放</a>
          <a href="#privacy">隐私与通知</a>
          <a href="#security">安全</a>
          <a href="#danger">危险区</a>
        </nav>

        <div className="account-sections">
          <section id="profile" className="settings-card">
            <header>
              <span className="settings-icon"><UserIcon size={20} /></span>
              <div>
                <h2>个人资料</h2>
                <p>昵称与头像色调会显示在侧栏和评论之外的所有地方。</p>
              </div>
            </header>
            <div className="avatar-preview-row">
              <span className="avatar large" style={{ ['--avatar-hue' as string]: avatarHue }}>
                {displayName.slice(0, 1) || '声'}
              </span>
              <label className="field grow">
                <span>昵称</span>
                <input value={displayName} maxLength={24} onChange={(event) => setDisplayName(event.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>头像色调 <em>{avatarHue}°</em></span>
              <input
                type="range"
                min={0}
                max={360}
                value={avatarHue}
                onChange={(event) => setAvatarHue(Number(event.target.value))}
                style={{ ['--progress' as string]: `${(avatarHue / 360) * 100}%` }}
              />
            </label>
            <div className="settings-actions">
              <button type="button" className="btn btn-primary btn-sm" disabled={savingProfile} onClick={() => void saveProfile()}>
                {savingProfile ? '保存中…' : '保存资料'}
              </button>
              <span className="muted">邮箱不可在此修改，避免误操作。</span>
            </div>
          </section>

          <section id="subscription" className="settings-card">
            <header>
              <span className="settings-icon"><ShieldIcon size={20} /></span>
              <div>
                <h2>订阅</h2>
                <p>演示环境不扣款。切换套餐会立即更新当前方案并记录一条事件。</p>
              </div>
            </header>
            <div className="subscription-line">
              <div>
                <strong>{PLAN_LABELS[user.planId] ?? user.planId}</strong>
                <span>当前方案</span>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/plans')}>
                查看全部方案
              </button>
            </div>
            {subscription.data?.events.length ? (
              <ul className="event-list">
                {subscription.data.events.slice(0, 4).map((event, index) => (
                  <li key={`${event.createdAt}-${index}`}>
                    <span>{new Date(event.createdAt).toLocaleString('zh-CN')}</span>
                    <span>{PLAN_LABELS[event.planId] ?? event.planId} · {event.action === 'switch' ? '切换' : event.action === 'confirm' ? '确认' : '种子'}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section id="preferences" className="settings-card">
            <header>
              <span className="settings-icon"><SunIcon size={20} /></span>
              <div>
                <h2>外观与播放</h2>
                <p>主题、音质偏好、自动续播与动效。偏好会保存到账户。</p>
              </div>
            </header>
            <div className="setting-row">
              <div>
                <strong>主题</strong>
                <p>默认是纸张亮色；夜航暗色使用深海军蓝。</p>
              </div>
              <div className="segmented" role="group" aria-label="主题">
                {([
                  { key: 'light', label: '亮色', icon: <SunIcon size={15} /> },
                  { key: 'dark', label: '暗色', icon: <MoonIcon size={15} /> },
                  { key: 'system', label: '跟随系统', icon: <MonitorIcon size={15} /> },
                ] as const).map((theme) => (
                  <button
                    key={theme.key}
                    type="button"
                    className={settings.theme === theme.key ? 'is-active' : ''}
                    aria-pressed={settings.theme === theme.key}
                    onClick={() => setPref('theme', theme.key)}
                  >
                    {theme.icon}
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-row">
              <div>
                <strong>音频质量</strong>
                <p>原型音频固定为 96 kbps 原创样带；此项仅保存偏好并显示在播放器。</p>
              </div>
              <select
                className="select"
                value={settings.audioQuality}
                onChange={(event) => setPref('audioQuality', event.target.value as Settings['audioQuality'])}
                aria-label="音频质量"
              >
                {Object.entries(QUALITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <Toggle
              checked={settings.normalizeVolume}
              onChange={(value) => setPref('normalizeVolume', value)}
              label="音量均衡"
              description="在切换曲目时轻微压低整体增益，避免忽大忽小。"
            />
            <Toggle
              checked={settings.showNowPlaying}
              onChange={(value) => setPref('showNowPlaying', value)}
              label="播放时展开舱内视图"
              description="点击播放时自动滑出歌词/队列工作台（宽屏有效）。"
            />
            <Toggle
              checked={settings.autoplaySimilar}
              onChange={(value) => setPref('autoplaySimilar', value)}
              label="自动续播相似曲目"
              description="队列结束时，自动追加并播放相似曲目。"
            />
            <Toggle
              checked={settings.reduceMotion}
              onChange={(value) => setPref('reduceMotion', value)}
              label="减少动效"
              description="关闭大部分过渡与滚动动画，尊重系统偏好之外的额外选择。"
            />
            {syncing ? <p className="settings-syncing">正在保存…</p> : null}
          </section>

          <section id="privacy" className="settings-card">
            <header>
              <span className="settings-icon"><EyeIcon size={20} /></span>
              <div>
                <h2>隐私与通知</h2>
                <p>隐私模式不会写入播放历史；通知开关仅保存偏好，原型不发送邮件或推送。</p>
              </div>
            </header>
            <Toggle
              checked={settings.privateSession}
              onChange={(value) => setPref('privateSession', value)}
              label="隐私模式"
              description="播放与收听不会出现在「最近播放」中。服务端同样执行该规则。"
            />
            <Toggle
              checked={settings.notifyNewRelease}
              onChange={(value) => setPref('notifyNewRelease', value)}
              label="新作品提醒"
              description="站内偏好。原型暂不实现推送通道。"
            />
            <Toggle
              checked={settings.notifyEmail}
              onChange={(value) => setPref('notifyEmail', value)}
              label="邮件通知"
              description="仅记录偏好；原型不接邮件服务，不会真的发送。"
            />
            <div className="settings-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void exportData()}>
                <DownloadIcon size={16} />
                导出数据
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  try {
                    await api.delete('/history');
                    show('最近播放已清空', 'success');
                  } catch {
                    show('清空失败', 'error');
                  }
                }}
              >
                <TrashIcon size={16} />
                清空播放历史
              </button>
            </div>
          </section>

          <section id="security" className="settings-card">
            <header>
              <span className="settings-icon"><LockIcon size={20} /></span>
              <div>
                <h2>安全</h2>
                <p>修改密码会使所有其他设备的会话失效；也可以主动退出全部设备。</p>
              </div>
            </header>
            <div className="password-grid">
              <label className="field">
                <span>当前密码</span>
                <input type="password" value={currentPassword} autoComplete="current-password" onChange={(event) => setCurrentPassword(event.target.value)} />
              </label>
              <label className="field">
                <span>新密码</span>
                <input type="password" value={newPassword} autoComplete="new-password" onChange={(event) => setNewPassword(event.target.value)} />
              </label>
              <label className="field">
                <span>再次输入新密码</span>
                <input type="password" value={confirmPassword} autoComplete="new-password" onChange={(event) => setConfirmPassword(event.target.value)} />
              </label>
            </div>
            <div className="settings-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={passwordBusy || !currentPassword || !newPassword}
                onClick={() => void changePassword()}
              >
                {passwordBusy ? '更新中…' : '更新密码'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLogoutAllOpen(true)}>
                <LogoutIcon size={16} />
                所有设备退出
              </button>
            </div>
            <div className="security-note">
              <MailIcon size={16} />
              <span>邮箱登录，无第三方 OAuth；会话保存在 HttpOnly Cookie 中，页面脚本无法读取。</span>
            </div>
          </section>

          <section id="danger" className="settings-card danger-zone">
            <header>
              <span className="settings-icon"><TrashIcon size={20} /></span>
              <div>
                <h2>危险区</h2>
                <p>删除账户会级联删除歌单、喜欢、关注、播放历史与设置，且无法撤销。</p>
              </div>
            </header>
            <button type="button" className="btn btn-danger" onClick={() => setDeleteOpen(true)}>
              <TrashIcon size={17} />
              删除我的账户
            </button>
          </section>
        </div>
      </div>

      <Modal
        open={logoutAllOpen}
        title="退出所有设备？"
        size="small"
        onClose={() => setLogoutAllOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setLogoutAllOpen(false)}>取消</button>
            <button type="button" className="btn btn-danger" disabled={logoutAllBusy} onClick={() => void logoutAll()}>
              {logoutAllBusy ? '正在退出…' : '全部退出'}
            </button>
          </>
        }
      >
        <p>这会立即让所有已签发的会话失效，包括当前浏览器。你需要重新登录。</p>
      </Modal>

      <Modal
        open={deleteOpen}
        title="删除账户"
        kicker="不可撤销"
        size="small"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteOpen(false)}>保留账户</button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={deleteBusy || !deletePassword || deleteEmail !== user.email}
              onClick={() => void deleteAccount()}
            >
              {deleteBusy ? '删除中…' : '永久删除'}
            </button>
          </>
        }
      >
        <p>输入登录密码，并完整输入你的邮箱 <strong>{user.email}</strong> 以确认。</p>
        <label className="field">
          <span>登录密码</span>
          <input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
        </label>
        <label className="field">
          <span>确认邮箱</span>
          <input type="email" value={deleteEmail} onChange={(event) => setDeleteEmail(event.target.value)} placeholder={user.email} />
        </label>
      </Modal>
    </div>
  );
}