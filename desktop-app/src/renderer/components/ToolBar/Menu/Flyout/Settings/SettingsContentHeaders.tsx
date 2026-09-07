import {FC, useId} from 'react';

interface ISettingsContentHeaders {
  acceptLanguage: string;
  setAcceptLanguage: (arg0: string) => void;
}

export const SettingsContentHeaders: FC<ISettingsContentHeaders> = ({
  acceptLanguage = '',
  setAcceptLanguage,
}) => {
  const id = useId();

  return (
    <>
      <h2>请求头</h2>
      <div className="my-4 flex flex-col space-y-4 text-sm">
        <div className="flex flex-col space-y-2">
          <label htmlFor={id} className="flex flex-col">
            首选语言
            <input
              data-testid="settings-accept_language-input"
              type="text"
              id={id}
              placeholder="例如：zh-CN,zh;q=0.9"
              className="mt-2 rounded-md border border-gray-300 px-4 py-2 text-base focus-visible:outline-gray-400 dark:border-gray-500 dark:bg-slate-900"
              value={acceptLanguage}
              onChange={(e) => setAcceptLanguage(e.target.value)}
            />
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            HTTP 请求的首选语言；留空时使用操作系统的语言设置。
          </p>
        </div>
      </div>
    </>
  );
};
