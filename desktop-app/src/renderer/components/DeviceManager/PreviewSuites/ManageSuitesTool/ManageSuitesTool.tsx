import {Icon} from '@iconify/react';
import type {Device} from 'common/deviceList';
import {invalidateDevicesMap} from 'common/deviceList';
import Button from 'renderer/components/Button';
import {useState} from 'react';
import {FileUploader} from 'renderer/components/FileUploader';
import Modal from 'renderer/components/Modal';
import {addSuites, deleteAllSuites} from 'renderer/store/features/device-manager';
import {useDispatch} from 'react-redux';
import {ConfirmDialog} from 'renderer/components/ConfirmDialog';
import {transformFile} from './utils';
import {onFileDownload, setCustomDevices} from './helpers';
import {ManageSuitesToolError} from './ManageSuitesToolError';

interface ManageSuitesToolProps {
  setCustomDevicesState: (devices: Device[]) => void;
}

export const ManageSuitesTool = ({setCustomDevicesState}: ManageSuitesToolProps) => {
  const [open, setOpen] = useState<boolean>(false);
  const [resetConfirmation, setResetConfirmation] = useState<boolean>(false);

  const [error, setError] = useState<boolean>(false);
  const dispatch = useDispatch();

  const onFileUpload = (fileUploaded: File) =>
    transformFile(fileUploaded)
      .then((fileTransformed) => {
        const {customDevices, suites} = fileTransformed;

        if (customDevices) {
          const newCustomDevices = setCustomDevices(customDevices);
          setCustomDevicesState(newCustomDevices);
        }

        if (suites) {
          dispatch(addSuites(suites));
        }

        setOpen(false);

        return null;
      })
      .catch(() => setError(true));

  const onErrorClose = () => {
    setError(false);
    setOpen(false);
  };

  const clearCustomDevices = () => {
    window.electron.store.set('deviceManager.customDevices', []);
    invalidateDevicesMap();
    setCustomDevicesState([]);
  };

  const onReset = () => {
    dispatch(deleteAllSuites());
    clearCustomDevices();
    setResetConfirmation(false);
  };

  return (
    <>
      <div className="flex flex-row content-end justify-end">
        <Button
          data-testid="download-btn"
          title="导入设备与套件"
          aria-label="导入设备与套件"
          className="aspect-square w-12 rounded-full hover:!bg-slate-500"
          onClick={() => setOpen(true)}
        >
          <Icon icon="uil:export" fontSize={18} />
        </Button>
        <Button
          data-testid="upload-btn"
          title="导出设备与套件"
          aria-label="导出设备与套件"
          className="aspect-square w-12 rounded-full hover:!bg-slate-500"
          onClick={onFileDownload}
        >
          <Icon icon="uil:import" fontSize={18} />
        </Button>
        <Button
          data-testid="reset-btn"
          title="重置设备与套件"
          aria-label="重置设备与套件"
          className="aspect-square w-12 rounded-full hover:!bg-slate-500"
          onClick={() => setResetConfirmation(true)}
        >
          <Icon icon="uil:redo" fontSize={18} />
        </Button>
      </div>
      <ConfirmDialog
        onConfirm={onReset}
        onClose={() => setResetConfirmation(false)}
        open={resetConfirmation}
        confirmText="确定要重置全部设置吗？"
      />
      <Modal isOpen={open} onClose={() => setOpen(false)} title="导入设备">
        <>
          <FileUploader
            acceptedFileTypes="application/json"
            multiple={false}
            handleFileUpload={onFileUpload}
          />
          <div className="text-align align-items-center flex flex-row flex-nowrap text-orange-500">
            <Icon icon="mdi:alert" />
            <p className="pl-2">重复的导入项将替换已有套件或自定义设备。</p>
          </div>
          {error && <ManageSuitesToolError onClose={onErrorClose} />}
        </>
      </Modal>
    </>
  );
};
