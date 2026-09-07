import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {webViewPubSub} from 'renderer/lib/pubsub';
import useKeyboardShortcut, {
  SHORTCUT_CHANNEL,
} from '../KeyboardShortcutsManager/useKeyboardShortcut';
import NavigationControls, {NAVIGATION_EVENTS} from './NavigationControls';

vi.mock('../KeyboardShortcutsManager/useKeyboardShortcut', async () => {
  const {SHORTCUT_CHANNEL} = await import('common/shortcuts');
  return {SHORTCUT_CHANNEL, default: vi.fn()};
});
vi.mock('renderer/lib/pubsub', () => ({webViewPubSub: {publish: vi.fn()}}));

describe('localized navigation identifiers', () => {
  it('keeps stable automation IDs and dispatches the original navigation events', () => {
    render(<NavigationControls />);
    for (const [id, label, event] of [
      ['nav-back', '后退', NAVIGATION_EVENTS.BACK],
      ['nav-forward', '前进', NAVIGATION_EVENTS.FORWARD],
      ['nav-refresh', '刷新', NAVIGATION_EVENTS.RELOAD],
    ]) {
      const button = screen.getByTestId(id);
      expect(button).toHaveAttribute('title', label);
      fireEvent.click(button);
      expect(webViewPubSub.publish).toHaveBeenCalledWith(event);
    }
  });

  it('binds shortcut channels explicitly instead of uppercasing translated labels', () => {
    render(<NavigationControls />);
    for (const channel of [
      SHORTCUT_CHANNEL.BACK,
      SHORTCUT_CHANNEL.FORWARD,
      SHORTCUT_CHANNEL.RELOAD,
    ]) {
      expect(useKeyboardShortcut).toHaveBeenCalledWith(channel, expect.any(Function));
    }
    expect(useKeyboardShortcut).not.toHaveBeenCalledWith(undefined, expect.any(Function));
  });
});
