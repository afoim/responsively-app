import {Icon} from '@iconify/react';
import {webViewPubSub} from 'renderer/lib/pubsub';
import useKeyboardShortcut, {
  SHORTCUT_CHANNEL,
  ShortcutChannel,
} from '../KeyboardShortcutsManager/useKeyboardShortcut';
import {IconButton} from './primitives';

export const NAVIGATION_EVENTS = {
  BACK: 'back',
  FORWARD: 'forward',
  RELOAD: 'reload',
};

interface NavigationItemProps {
  shortcut: ShortcutChannel;
  testId: string;
  label: string;
  icon: string;
  action: () => void;
}

// Display labels are localized; keyboard channels and automation IDs are stable.
const NavigationButton = ({label, icon, action, shortcut, testId}: NavigationItemProps) => {
  useKeyboardShortcut(shortcut, action);
  return (
    <IconButton onClick={action} title={label} data-testid={testId}>
      <Icon icon={icon} />
    </IconButton>
  );
};

const ITEMS: NavigationItemProps[] = [
  {
    shortcut: SHORTCUT_CHANNEL.BACK,
    testId: 'nav-back',
    label: '后退',
    icon: 'ic:round-arrow-back',
    action: () => {
      webViewPubSub.publish(NAVIGATION_EVENTS.BACK);
    },
  },
  {
    shortcut: SHORTCUT_CHANNEL.FORWARD,
    testId: 'nav-forward',
    label: '前进',
    icon: 'ic:round-arrow-forward',
    action: () => {
      webViewPubSub.publish(NAVIGATION_EVENTS.FORWARD);
    },
  },
  {
    shortcut: SHORTCUT_CHANNEL.RELOAD,
    testId: 'nav-refresh',
    label: '刷新',
    icon: 'ic:round-refresh',
    action: () => {
      webViewPubSub.publish(NAVIGATION_EVENTS.RELOAD);
    },
  },
];

const NavigationControls = () => {
  return (
    <div className="flex flex-shrink-0 gap-[2px]">
      {ITEMS.map((item) => (
        <NavigationButton {...item} key={item.shortcut} />
      ))}
    </div>
  );
};

export default NavigationControls;
