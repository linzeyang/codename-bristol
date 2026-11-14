import { Link } from 'react-router-dom';
import { LockIcon } from './Icons';

export function AuthRequired({ title, description }: { title: string; description: string }) {
  return (
    <div className="page auth-required">
      <p className="kicker">Members only</p>
      <h1>{title}</h1>
      <div className="gate-card">
        <span className="gate-icon"><LockIcon size={30} /></span>
        <h2>登录后继续</h2>
        <p>{description}</p>
        <div className="gate-actions">
          <Link to="/login" className="btn btn-primary">去登录</Link>
          <Link to="/register" className="btn btn-ghost">注册新账户</Link>
        </div>
        <p className="gate-hint">演示账号：demo@shengyu.app / demo1234</p>
      </div>
    </div>
  );
}