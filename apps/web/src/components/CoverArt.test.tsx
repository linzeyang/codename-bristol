import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CoverArt } from './CoverArt';

describe('原创封面生成', () => {
  it('渲染可访问名称与渐变封面', () => {
    const { container } = render(
      <CoverArt seed={11} accent="#E84A2A" accent2="#F2C14E" label="潮汐信箱" />,
    );
    expect(screen.getByRole('img', { name: '潮汐信箱 封面' })).toBeInTheDocument();
    expect(container.querySelector('linearGradient')).toBeTruthy();
    expect(container.querySelectorAll('stop')).toHaveLength(2);
  });

  it('不同种子产生不同图案，并可为艺人生成字标', () => {
    const first = render(<CoverArt seed={1} accent="#111" accent2="#222" label="林晚星" monogram />);
    const firstMarkup = first.container.innerHTML;
    expect(first.container.querySelector('text')?.textContent).toBe('林');
    first.unmount();

    const second = render(<CoverArt seed={2} accent="#111" accent2="#222" label="北纬三十" monogram />);
    expect(second.container.innerHTML).not.toBe(firstMarkup);
    expect(second.container.querySelector('text')?.textContent).toBe('北');
  });
});