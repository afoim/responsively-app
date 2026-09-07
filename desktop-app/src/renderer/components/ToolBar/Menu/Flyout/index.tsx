import {Icon} from '@iconify/react';
import {DOCK_POSITION} from 'common/constants';
import {ReactNode, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import Modal from 'renderer/components/Modal';
import Toggle from 'renderer/components/Toggle';
import {selectDockPosition, setDockPosition} from 'renderer/store/features/devtools';
import {APP_VIEWS, setAppView} from 'renderer/store/features/ui';
import ShortcutsModal from '../../Shortcuts/ShortcutsModal';
import Bookmark from './Bookmark';
import {SettingsContent} from './Settings/SettingsContent';

interface MenuItemProps {
  icon: string;
  iconClassName?: string;
  label: string;
  trailing?: ReactNode;
  onClick: () => void;
}

/** One 232px-panel row (Hybrid Studio kebab menu). */
export const MenuItem = ({icon, iconClassName, label, trailing, onClick}: MenuItemProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-[10px] rounded-[7px] px-[10px] py-2 text-[13.5px] text-fg hover:bg-hover focus:outline-none focus-visible:bg-hover"
  >
    <span className="pointer-events-none contents">
      <Icon icon={icon} fontSize={15} className={iconClassName ?? 'text-muted'} />
      {label}
      {trailing}
    </span>
  </button>
);

interface Props {
  closeFlyout: () => void;
}

const MenuFlyout = ({closeFlyout}: Props) => {
  const dispatch = useDispatch();
  const dockPosition = useSelector(selectDockPosition);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  return (
    <>
      <div className="absolute right-0 top-[30px] z-50 w-[232px] rounded-[10px] border border-line bg-panel p-[6px] text-fg shadow-elevated focus:outline-none">
        <div className="flex items-center justify-between px-[10px] py-2">
          <span className="text-[13.5px]">停靠开发者工具</span>
          <Toggle
            isOn={dockPosition !== DOCK_POSITION.UNDOCKED}
            aria-label="停靠开发者工具"
            onChange={(e) =>
              dispatch(
                setDockPosition(e.target.checked ? DOCK_POSITION.BOTTOM : DOCK_POSITION.UNDOCKED)
              )
            }
          />
        </div>
        <MenuItem
          icon="heroicons:swatch"
          iconClassName="text-accent"
          label="设备与套件"
          onClick={() => {
            closeFlyout();
            dispatch(setAppView(APP_VIEWS.DEVICE_MANAGER));
          }}
        />
        <MenuItem
          icon="carbon:trash-can"
          label="清除浏览历史"
          onClick={() => {
            window.electron.store.set('history', []);
            closeFlyout();
          }}
        />
        <Bookmark />
        <MenuItem
          icon="lucide:settings"
          label="设置"
          onClick={() => {
            closeFlyout();
            setIsSettingsOpen(true);
          }}
        />
        <MenuItem
          icon="iconoir:apple-shortcuts"
          label="键盘快捷键"
          onClick={() => {
            closeFlyout();
            setIsShortcutsOpen(true);
          }}
        />
      </div>
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="设置">
        <SettingsContent onClose={() => setIsSettingsOpen(false)} />
      </Modal>
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
    </>
  );
};

export default MenuFlyout;
