export interface Plan {
  id: string;
  name: string;
  priceLabel: string;
  period: string;
  tagline: string;
  features: string[];
  accent: string;
  featured: boolean;
  note: string;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: '漫步',
    priceLabel: '¥0',
    period: '永久免费',
    tagline: '把耳朵交给声屿',
    features: ['完整曲库与播客', '自建歌单与收藏', '个性化推荐与向导', '原创样带试听'],
    accent: '#6B655C',
    featured: false,
    note: '原型不投放广告，所有功能在免费方案下均可用。',
  },
  {
    id: 'plus',
    name: '靠岸 Plus',
    priceLabel: '¥15',
    period: '每月',
    tagline: '为认真听歌的人',
    features: ['支持独立创作者', '优先体验新功能', '高音质偏好（演示）', '无广告体验'],
    accent: '#E84A2A',
    featured: true,
    note: '演示环境，切换套餐不会产生任何扣款。',
  },
  {
    id: 'studio',
    name: '共听 Studio',
    priceLabel: '¥25',
    period: '每月',
    tagline: '把声音带回家',
    features: ['包含 Plus 全部权益', '共听功能优先体验', '年度听歌报告（规划中）', '演示共享席位'],
    accent: '#0D6E66',
    featured: false,
    note: '成员邀请为演示文案，原型不产生真实订阅与扣款。',
  },
];

export function findPlan(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}