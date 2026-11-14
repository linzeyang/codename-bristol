import { Link } from 'react-router-dom';
import { Logo } from '../components/Icons';

export function NotFoundPage() {
  return (
    <div className="page not-found-page">
      <div className="not-found-art" aria-hidden="true">
        <Logo size={76} />
        <span>404</span>
      </div>
      <p className="kicker">Lost at sea</p>
      <h1>这片海域没有声音</h1>
      <p>你访问的页面不存在，或者已经被移走。回首页继续靠岸吧。</p>
      <div className="not-found-actions">
        <Link to="/" className="btn btn-primary">回到发现</Link>
        <Link to="/search" className="btn btn-ghost">去搜索</Link>
      </div>
    </div>
  );
}