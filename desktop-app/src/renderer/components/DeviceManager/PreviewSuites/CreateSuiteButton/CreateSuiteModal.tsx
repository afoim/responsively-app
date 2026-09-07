import {useState} from 'react';
import {useDispatch} from 'react-redux';
import {v4 as uuidv4} from 'uuid';

import {addSuite} from 'renderer/store/features/device-manager';

import Button from '../../../Button';
import Input from '../../../Input';
import Modal from '../../../Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateSuiteModal = ({isOpen, onClose}: Props) => {
  const [name, setName] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);
  const dispatch = useDispatch();

  const handleAddSuite = async (): Promise<void> => {
    if (name === '') {
      setNameError('套件名称不能为空，请输入名称。');
      return undefined;
    }
    dispatch(addSuite({id: uuidv4(), name, devices: ['10008']}));
    return onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="添加套件">
        <div className="flex flex-col gap-4">
          <div className="flex w-[420px] flex-col gap-2">
            <Input
              label="套件名称"
              type="text"
              placeholder="我的自定义套件"
              value={name}
              error={nameError}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
            />
          </div>
          <div className="flex flex-row justify-between">
            <div className="flex flex-row justify-end gap-2">
              <Button className="px-2" onClick={onClose}>
                取消
              </Button>
              <Button className="px-2" onClick={handleAddSuite} isActive>
                添加
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
