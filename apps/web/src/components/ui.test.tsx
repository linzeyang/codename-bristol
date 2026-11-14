import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthRequired } from './AuthRequired';
import { EmptyState } from './ui';

describe('通用界面状态', () => {
  it('空态提供标题、说明与操作', () => {
    render(
      <EmptyState
        title="还没有喜欢的歌"
        description="在任意曲目上点一下心形。"
        action={<button type="button">去发现</button>}
      />,
    );
    expect(screen.getByRole('heading', { name: '还没有喜欢的歌' })).toBeInTheDocument();
    expect(screen.getByText('在任意曲目上点一下心形。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '去发现' })).toBeInTheDocument();
  });

  it('登录门包含登录、注册与演示账号提示', () => {
    render(
      <MemoryRouter>
        <AuthRequired title="音乐库" description="登录后查看你的收藏。" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: '音乐库' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '去登录' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: '注册新账户' })).toHaveAttribute('href', '/register');
    expect(screen.getByText(/demo@shengyu.app/)).toBeInTheDocument();
  });
});