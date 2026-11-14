import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { PlansResponse, User } from '../api/types';
import { ErrorState, Skeleton } from '../components/ui';
import { CheckIcon, LockIcon, ShieldIcon, SparklesIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFetch } from '../hooks/useFetch';
import { PLAN_LABELS } from '../lib/labels';

export function PlansPage() {
  const { data, loading, error, reload } = useFetch<PlansResponse>('/plans');
  const { user, ready, updateUser } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  useEffect(() => {
    document.title = '订阅方案 · 声屿';
  }, []);

  const currentPlanId = user?.planId ?? data?.currentPlanId ?? 'free';

  const choose = async (planId: string) => {
    if (!ready) return;
    if (!user) {
      show('登录后即可切换套餐', 'info');
      navigate('/login', { state: { from: '/plans' } });
      return;
    }
    if (planId === currentPlanId) return;
    setBusyPlan(planId);
    try {
      const response = await api.post<{ user: User; plan: { id: string }; notice: string }>('/subscription', { planId });
      updateUser(response.user);
      show(response.notice, 'success');
      reload();
    } catch {
      show('切换失败，请稍后再试', 'error');
    } finally {
      setBusyPlan(null);
    }
  };

  if (loading && !data) {
    return <div className="page"><Skeleton className="skeleton-hero" /><div className="plan-grid"><Skeleton className="skeleton-card" count={3} /></div></div>;
  }
  if (error || !data) return <ErrorState message={error ?? '套餐加载失败'} onRetry={reload} />;

  return (
    <div className="page plans-page">
      <header className="plans-hero">
        <p className="kicker">Plans without fine print</p>
        <h1>选一个适合当下的方案</h1>
        <p className="plans-lede">
          声屿的订阅是透明的：当前方案一眼可见、切换即时生效、随时可以回到免费。没有倒计时，没有遮挡内容的横幅，
          也没有假装已经扣款的按钮。
        </p>
        <div className="plans-notice">
          <ShieldIcon size={18} />
          <span>{data.demoNotice}</span>
        </div>
        <div className="plans-current">
          当前方案：<strong>{PLAN_LABELS[currentPlanId] ?? currentPlanId}</strong>
          {!user ? <span>（游客默认）</span> : null}
        </div>
      </header>

      <div className="plan-grid">
        {data.plans.map((plan) => {
          const current = plan.id === currentPlanId;
          return (
            <article
              key={plan.id}
              className={`plan-card${plan.featured ? ' featured' : ''}${current ? ' current' : ''}`}
              style={{ ['--plan-accent' as string]: plan.accent }}
            >
              <div className="plan-stamp">{current ? '当前方案' : plan.featured ? '推荐' : plan.period}</div>
              <h2>{plan.name}</h2>
              <p className="plan-tagline">{plan.tagline}</p>
              <p className="plan-price">
                <span>{plan.priceLabel}</span>
                <small> / {plan.period}</small>
              </p>
              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}><CheckIcon size={16} /> {feature}</li>
                ))}
              </ul>
              <button
                type="button"
                className={`btn btn-block ${current ? 'btn-ghost' : plan.featured ? 'btn-primary' : 'btn-ghost'}`}
                disabled={current || busyPlan === plan.id}
                onClick={() => void choose(plan.id)}
              >
                {current ? '正在使用' : busyPlan === plan.id ? '切换中…' : plan.id === 'free' ? '回到免费方案' : `选择 ${plan.name}`}
              </button>
              <p className="plan-note">{plan.note}</p>
            </article>
          );
        })}
      </div>

      <section className="plans-transparency">
        <div>
          <p className="kicker">Our promise</p>
          <h2>订阅应该比听歌更简单</h2>
        </div>
        <div className="transparency-grid">
          <div>
            <SparklesIcon size={20} />
            <h3>没有隐藏权益</h3>
            <p>功能与套餐在同一个页面说清楚；原型中所有方案均可用完整曲库，差异仅作展示。</p>
          </div>
          <div>
            <LockIcon size={20} />
            <h3>没有真实扣款</h3>
            <p>切换套餐只写入演示数据，不接入支付渠道、不保存银行卡，也不会产生账单。</p>
          </div>
          <div>
            <ShieldIcon size={20} />
            <h3>数据随时带走</h3>
            <p>账户页支持导出 JSON 与删除账户；隐私模式下播放不会留下历史。</p>
          </div>
        </div>
      </section>

      <section className="plans-faq">
        <h2>常见问题</h2>
        <details>
          <summary>切换套餐后会发生什么？</summary>
          <p>你的账户方案标记会立即更新，并在账户页与顶栏显示。因为这是原型，不会发生支付或续费。</p>
        </details>
        <details>
          <summary>免费方案会限制音质或广告吗？</summary>
          <p>不会。原型不投放广告，所有音质偏好都可用；但音频本身是 45 秒原创样带，码率固定为 96 kbps。</p>
        </details>
        <details>
          <summary>家庭席位的其他人如何加入？</summary>
          <p>成员邀请属于演示文案，未实现真实的多人席位管理。这里不假装能力存在。</p>
        </details>
      </section>
    </div>
  );
}