import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Logo, EyeIcon, EyeOffIcon, LockIcon, MailIcon, SparklesIcon, UserIcon } from '../components/Icons';

function AuthArt() {
  return (
    <div className="auth-art" aria-hidden="true">
      <svg viewBox="0 0 560 560" className="auth-art-svg">
        <defs>
          <linearGradient id="authGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E84A2A" />
            <stop offset="100%" stopColor="#0D6E66" />
          </linearGradient>
        </defs>
        <circle cx="280" cy="280" r="230" fill="url(#authGrad)" />
        <circle cx="280" cy="280" r="184" fill="none" stroke="#F6F1E7" strokeWidth="2" opacity="0.55" />
        <circle cx="280" cy="280" r="136" fill="none" stroke="#F6F1E7" strokeWidth="2" opacity="0.7" />
        <circle cx="280" cy="280" r="88" fill="#F6F1E7" opacity="0.92" />
        <path d="M70 356c58 0 58-140 116-140s58 140 116 140 58-98 116-98 58 38 84 38" fill="none" stroke="#1B1A17" strokeWidth="7" strokeLinecap="round" />
        <path d="M70 396c58 0 58-70 116-70s58 70 116 70 58-44 116-44 58 20 84 20" fill="none" stroke="#1B1A17" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
        <circle cx="445" cy="125" r="22" fill="#F2C14E" />
        <circle cx="90" cy="120" r="9" fill="#1B1A17" />
      </svg>
      <div className="auth-sticker">在声音里靠岸</div>
    </div>
  );
}

function AuthLayout({ mode }: { mode: 'login' | 'register' }) {
  const { user, ready, login, register } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const next = (location.state as { from?: string } | null)?.from ?? '/';

  useEffect(() => {
    document.title = mode === 'login' ? '登录 · 声屿' : '注册 · 声屿';
  }, [mode]);

  useEffect(() => {
    if (ready && user) navigate(next, { replace: true });
  }, [ready, user, navigate, next]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('请输入有效的邮箱地址');
      return;
    }
    if (password.length < 8) {
      setError('密码至少 8 位');
      return;
    }
    if (mode === 'register' && displayName.trim().length === 0) {
      setError('给自己取一个昵称吧');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const logged = await login(email.trim(), password);
        show(`欢迎回来，${logged.displayName}`, 'success');
      } else {
        const created = await register(email.trim(), password, displayName.trim());
        show(`欢迎来到声屿，${created.displayName}`, 'success');
      }
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@shengyu.app');
    setPassword('demo1234');
    setError('');
  };

  return (
    <div className={`auth-page mode-${mode}`}>
      <section className="auth-poster">
        <Link to="/" className="auth-brand">
          <Logo size={38} />
          <span>
            <strong>声屿</strong>
            <small>SONORA ISLE</small>
          </span>
        </Link>
        <AuthArt />
        <div className="auth-claim">
          <p className="kicker">原创音乐流媒体原型</p>
          <h1>{mode === 'login' ? '欢迎回来，\n继续靠岸。' : '注册即可，\n开始收听。'}</h1>
          <p>
            发现、收藏、歌词、队列与播客，都在一个安静的工作台里。推荐会告诉你为什么，向导能听懂你的一句话。
          </p>
          <ul className="auth-points">
            <li><SparklesIcon size={17} /> 可解释推荐与口味调音台</li>
            <li><LockIcon size={17} /> 隐私模式与一键数据导出</li>
            <li><MailIcon size={17} /> 仅邮箱登录，完全离线可用</li>
          </ul>
        </div>
        <p className="auth-foot">声屿 1.0 · 全部内容与音频均为原创演示素材</p>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <Link to="/" className="auth-brand">
              <Logo size={30} />
              <span><strong>声屿</strong><small>SONORA ISLE</small></span>
            </Link>
          </div>
          <p className="kicker">{mode === 'login' ? 'WELCOME BACK' : 'JOIN THE ISLE'}</p>
          <h2>{mode === 'login' ? '登录声屿' : '创建你的账户'}</h2>
          <p className="auth-sub">
            {mode === 'login' ? '用邮箱继续。没有账户？' : '只需邮箱、昵称与密码。已有账户？'}
            <Link to={mode === 'login' ? '/register' : '/login'}>
              {mode === 'login' ? '现在注册' : '去登录'}
            </Link>
          </p>

          <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
            {mode === 'register' ? (
              <label className="field">
                <span>昵称</span>
                <div className="input-with-icon">
                  <UserIcon size={18} />
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    maxLength={24}
                    placeholder="例如：海边的人"
                    autoComplete="nickname"
                  />
                </div>
              </label>
            ) : null}
            <label className="field">
              <span>电子邮件地址</span>
              <div className="input-with-icon">
                <MailIcon size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@domain.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>
            <label className="field">
              <span>密码</span>
              <div className="input-with-icon">
                <LockIcon size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 8 位"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  className="input-eye"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </label>

            {error ? <p className="form-error" role="alert">{error}</p> : null}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? '正在靠岸…' : mode === 'login' ? '登录' : '创建账户'}
            </button>
          </form>

          <div className="demo-card">
            <div>
              <strong>演示账号</strong>
              <p>听众 demo@shengyu.app / demo1234</p>
              <p>管理员 admin@shengyu.app / admin1234</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={fillDemo}>
              填入听众账号
            </button>
          </div>

          <p className="auth-note">
            原型不接入第三方 OAuth，也不发送邮件。登录状态保存在 HttpOnly Cookie 中。
          </p>
        </div>
      </section>
    </div>
  );
}

export function LoginPage() {
  return <AuthLayout mode="login" />;
}

export function RegisterPage() {
  return <AuthLayout mode="register" />;
}