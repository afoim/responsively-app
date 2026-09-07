import {suiteDisplayName} from 'common/ui-text';
import {Icon} from '@iconify/react';
import cx from 'classnames';
import {useDispatch, useSelector} from 'react-redux';
import {v4 as uuidv4} from 'uuid';
import {
  addSuite,
  deleteSuite,
  DEFAULT_SUITE,
  selectActiveSuite,
  selectSuites,
  setActiveSuite,
} from 'renderer/store/features/device-manager';

/** Suites list of the Device Manager sheet. */
const SuitesColumn = () => {
  const dispatch = useDispatch();
  const suites = useSelector(selectSuites);
  const activeSuite = useSelector(selectActiveSuite);

  return (
    <div className="box-border flex w-60 flex-shrink-0 flex-col gap-2 overflow-y-auto border-r border-line-soft p-[14px]">
      <div className="text-[11px] font-bold tracking-[0.08em] text-muted">套件</div>

      {suites.map((suite) => {
        const isActive = suite.id === activeSuite.id;
        const isDefault = suite.id === DEFAULT_SUITE.id;
        return (
          <div
            key={suite.id}
            className={cx('cursor-pointer rounded-[10px] border px-3 py-[10px]', {
              'border-accent bg-accent-soft': isActive,
              'border-line bg-card': !isActive,
            })}
          >
            <div className="flex items-center gap-[6px]">
              <button
                type="button"
                aria-pressed={isActive}
                data-testid={`suite-row-${suite.id}`}
                onClick={() => dispatch(setActiveSuite(suite.id))}
                className="min-w-0 flex-1 truncate text-left focus:outline-none"
              >
                <span
                  className={cx('text-[13.5px] font-bold', isActive ? 'text-accent' : 'text-fg')}
                >
                  {suiteDisplayName(suite)}
                </span>
              </button>
              <button
                type="button"
                title="复制套件"
                onClick={() =>
                  dispatch(
                    addSuite({
                      id: uuidv4(),
                      name: `${suiteDisplayName(suite)} 副本`,
                      devices: [...suite.devices],
                    })
                  )
                }
                className="flex h-6 w-6 items-center justify-center rounded-md text-[13px] text-muted transition-colors hover:bg-hover hover:text-fg focus:outline-none"
              >
                <span className="pointer-events-none contents">
                  <Icon icon="lucide:copy" />
                </span>
              </button>
              <button
                type="button"
                title={isDefault ? '默认套件不能删除' : '删除套件'}
                disabled={isDefault}
                onClick={() => dispatch(deleteSuite(suite.id))}
                className={cx(
                  'flex h-6 w-6 items-center justify-center rounded-md text-[13px] text-muted transition-colors focus:outline-none',
                  isDefault ? 'cursor-not-allowed opacity-[0.35]' : 'hover:bg-hover hover:text-fg'
                )}
              >
                <span className="pointer-events-none contents">
                  <Icon icon="carbon:trash-can" />
                </span>
              </button>
            </div>
            <div className="mt-[3px] text-[11.5px] text-muted">{suite.devices.length} 台设备</div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() =>
          dispatch(
            addSuite({
              id: uuidv4(),
              name: `套件 ${suites.length + 1}`,
              devices: [...activeSuite.devices],
            })
          )
        }
        className="flex h-[38px] items-center justify-center gap-[7px] rounded-[10px] border border-dashed border-line text-[12.5px] text-muted transition-colors hover:bg-hover hover:text-fg focus:outline-none"
      >
        <span className="pointer-events-none contents">
          <Icon icon="lucide:plus" fontSize={14} />
          新建套件
        </span>
      </button>

      <div className="flex-1" />
      <div className="text-[11.5px] leading-[1.5] text-muted">
        勾选设备卡片即可将设备加入当前套件。
      </div>
    </div>
  );
};

export default SuitesColumn;
