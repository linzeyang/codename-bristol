import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { PlayerProvider, usePlayer } from '../context/PlayerContext';
import { SettingsProvider } from '../context/SettingsContext';
import { ToastProvider } from '../context/ToastContext';
import { trackToItem } from '../lib/player';
import { sampleTracks } from '../test/fixtures';

function Harness() {
  const player = usePlayer();
  return (
    <div>
      <span data-testid="current">{player.current?.id ?? 'none'}</span>
      <span data-testid="order">{player.queue.map((item) => item.id).join(',')}</span>
      <span data-testid="repeat">{player.repeat}</span>
      <span data-testid="playing">{String(player.isPlaying)}</span>
      <button type="button" onClick={() => player.playTracks(sampleTracks, 0)}>play</button>
      <button type="button" onClick={() => player.addToQueue([trackToItem(sampleTracks[3]!)])}>add</button>
      <button type="button" onClick={() => player.move(1, 2)}>move</button>
      <button type="button" onClick={() => player.next()}>next</button>
      <button type="button" onClick={() => player.removeAt(2)}>remove</button>
      <button type="button" onClick={() => player.cycleRepeatMode()}>repeat</button>
      <button type="button" onClick={() => player.toggle()}>toggle</button>
    </div>
  );
}

function renderPlayer() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <PlayerProvider>
            <Harness />
          </PlayerProvider>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>,
  );
}

describe('播放器状态机', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('播放列表后设置当前曲目与队列', async () => {
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: 'play' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('a'));
    expect(screen.getByTestId('order')).toHaveTextContent('a,b,c,d');
    expect(screen.getByTestId('playing')).toHaveTextContent('true');
  });

  it('加入队列会去重', async () => {
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: 'play' }));
    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('a,b,c,d'));
  });

  it('移动、下一首与暂停可用', async () => {
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: 'play' }));
    fireEvent.click(screen.getByRole('button', { name: 'move' }));
    await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('a,c,b,d'));

    fireEvent.click(screen.getByRole('button', { name: 'next' }));
    await waitFor(() => expect(screen.getByTestId('current')).toHaveTextContent('c'));

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    await waitFor(() => expect(screen.getByTestId('playing')).toHaveTextContent('false'));
  });

  it('移除队列项不会破坏当前曲目', async () => {
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: 'play' }));
    fireEvent.click(screen.getByRole('button', { name: 'remove' }));
    await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('a,b,d'));
    expect(screen.getByTestId('current')).toHaveTextContent('a');
  });

  it('循环模式在三种状态间切换', async () => {
    renderPlayer();
    fireEvent.click(screen.getByRole('button', { name: 'repeat' }));
    await waitFor(() => expect(screen.getByTestId('repeat')).toHaveTextContent('all'));
    fireEvent.click(screen.getByRole('button', { name: 'repeat' }));
    await waitFor(() => expect(screen.getByTestId('repeat')).toHaveTextContent('one'));
    fireEvent.click(screen.getByRole('button', { name: 'repeat' }));
    await waitFor(() => expect(screen.getByTestId('repeat')).toHaveTextContent('off'));
  });
});