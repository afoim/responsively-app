import {simulationLabels} from 'common/ui-text';
import {Icon} from '@iconify/react';
import cx from 'classnames';
import Popover from '../Popover';

export const SIMULATIONS = {
  DEUTERANOPIA: 'deuteranopia',
  DEUTERANOMALY: 'deuteranomaly',
  PROTANOPIA: 'protanopia',
  PROTANOMALY: 'protanomaly',
  TRITANOPIA: 'tritanopia',
  TRITANOMALY: 'tritanomaly',
  ACHROMATOMALY: 'achromatomaly',
  ACHROMATOPSIA: 'achromatopsia',
  CATARACT: 'cataract',
  FAR: 'farsightedness',
  GLAUCOME: 'glaucoma',
  SOLARIZE: 'solarize',
  COLOR_CONTRAST_LOSS: 'color-contrast-loss',
};

export const RED_GREEN = [
  SIMULATIONS.DEUTERANOPIA,
  SIMULATIONS.DEUTERANOMALY,
  SIMULATIONS.PROTANOPIA,
  SIMULATIONS.PROTANOMALY,
];
export const BLUE_YELLOW = [SIMULATIONS.TRITANOPIA, SIMULATIONS.TRITANOMALY];
export const FULL = [SIMULATIONS.ACHROMATOMALY, SIMULATIONS.ACHROMATOPSIA];
export const VISUAL_IMPAIRMENTS = [
  SIMULATIONS.CATARACT,
  SIMULATIONS.FAR,
  SIMULATIONS.GLAUCOME,
  SIMULATIONS.COLOR_CONTRAST_LOSS,
];
export const SUNLIGHT = [SIMULATIONS.SOLARIZE];

const DISABLE_LABEL = '关闭模拟';

const GROUPS: Array<{header: string; items: string[]}> = [
  {header: '正常视觉', items: [DISABLE_LABEL]},
  {header: '红绿色觉障碍', items: RED_GREEN},
  {header: '蓝黄色觉障碍', items: BLUE_YELLOW},
  {header: '全色觉障碍', items: FULL},
  {header: '视力障碍', items: VISUAL_IMPAIRMENTS},
  {header: '临时视觉影响', items: SUNLIGHT},
];

interface Props {
  simulationName: string | undefined;
  onChange: (name: string | undefined) => void;
  /** `toolbar` shows the labelled action; `compact` is icon-only (per device). */
  variant?: 'toolbar' | 'compact';
}

export const VisionSimulationDropDown = ({
  simulationName,
  onChange,
  variant = 'compact',
}: Props) => {
  const isSimulating = simulationName != null;
  const isToolbar = variant === 'toolbar';

  return (
    <Popover
      triggerTitle="模拟视觉"
      anchor={isToolbar ? 'bottom end' : 'bottom start'}
      className="max-h-[470px] w-[238px] overflow-y-auto p-[6px]"
      triggerClassName={cx(
        'flex items-center transition-colors',
        isToolbar
          ? 'h-[30px] gap-[7px] rounded-[7px] px-[11px] text-[12.5px]'
          : 'h-7 w-7 justify-center rounded-md text-[18px]',
        isSimulating ? 'bg-accent-soft text-accent' : 'text-fg hover:bg-hover'
      )}
      trigger={
        <span className="pointer-events-none contents">
          <Icon icon="bx:low-vision" fontSize={isToolbar ? 16 : 18} />
          {isToolbar ? '模拟' : null}
          {isToolbar ? <Icon icon="mdi:chevron-down" fontSize={13} className="text-muted" /> : null}
        </span>
      }
    >
      {({close}) => (
        <>
          {GROUPS.map((group) => (
            <div key={group.header}>
              <div className="px-[10px] pb-[3px] pt-[10px] text-[10.5px] font-bold uppercase tracking-[0.07em] text-muted">
                {group.header}
              </div>
              {group.items.map((item) => {
                const isDisableEntry = item === DISABLE_LABEL;
                const isActive = isDisableEntry
                  ? simulationName === undefined
                  : simulationName === item.toLowerCase();
                return (
                  <button
                    key={item}
                    data-simulation={isDisableEntry ? 'none' : item}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      onChange(isDisableEntry ? undefined : item.toLowerCase());
                      close();
                    }}
                    className={cx(
                      'flex w-full items-center gap-2 rounded-[7px] px-[10px] py-[6px] text-left text-[13px] capitalize text-fg hover:bg-hover focus:outline-none focus-visible:bg-hover',
                      {'font-semibold': isActive}
                    )}
                  >
                    <span className="pointer-events-none contents">
                      <Icon
                        icon="ic:round-check"
                        fontSize={14}
                        className={cx('text-accent', {'opacity-0': !isActive})}
                      />
                      {isDisableEntry ? DISABLE_LABEL : simulationLabels[item]}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </>
      )}
    </Popover>
  );
};
