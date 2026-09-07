import {IPC_MAIN_CHANNELS} from 'common/constants';
import {AuthInfo} from 'electron';
import {AuthResponseArgs} from 'main/http-basic-auth';
import {useEffect, useState} from 'react';
import Button from 'renderer/components/Button';
import Input from 'renderer/components/Input';
import Modal from 'renderer/components/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  authInfo: AuthInfo | null;
}

const AuthModal = ({isOpen, onClose, authInfo}: Props) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setPassword('');
    }
  }, [isOpen]);

  const onSubmit = (proceed: boolean) => {
    if (authInfo == null) {
      return;
    }
    window.electron.ipcRenderer.sendMessage<AuthResponseArgs>(IPC_MAIN_CHANNELS.AUTH_RESPONSE, {
      authInfo,
      username: proceed ? username : '',
      password: proceed ? password : '',
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="HTTP 身份验证">
      <div className="flex flex-col gap-4">
        <p>
          身份验证请求：<span className="font-bold">{authInfo?.host}</span>
        </p>
        <div className="flex w-[420px] flex-col gap-2">
          <Input label="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex flex-row justify-end gap-2">
          <Button className="px-2" onClick={() => onSubmit(false)}>
            取消
          </Button>
          <Button className="px-2" onClick={() => onSubmit(true)} isActive>
            继续
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AuthModal;
