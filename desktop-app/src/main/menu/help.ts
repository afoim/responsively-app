import {BrowserWindow, MenuItemConstructorOptions, ipcMain, shell} from 'electron';

import {EnvironmentInfo, getEnvironmentInfo} from '../util';
import {IPC_MAIN_CHANNELS} from '../../common/constants';
import {AppUpdater, AppUpdaterStatus} from '../app-updater';

export interface AboutDialogArgs {
  environmentInfo: EnvironmentInfo;
  updaterStatus: AppUpdaterStatus;
}

export const subMenuHelp = (
  mainWindow: BrowserWindow,
  appUpdater: AppUpdater
): MenuItemConstructorOptions => {
  const environmentInfo = getEnvironmentInfo();
  // Menus are rebuilt per window; keep the handler registration idempotent.
  ipcMain.removeHandler(IPC_MAIN_CHANNELS.GET_ABOUT_INFO);
  ipcMain.handle(IPC_MAIN_CHANNELS.GET_ABOUT_INFO, async (_): Promise<AboutDialogArgs> => {
    return {
      environmentInfo,
      updaterStatus: appUpdater.getStatus(),
    };
  });

  return {
    label: '帮助',
    submenu: [
      {
        label: '了解更多',
        click() {
          shell.openExternal('https://responsively.app');
        },
      },
      {
        label: '查看源码',
        click() {
          shell.openExternal('https://github.com/responsively-org/responsively-app');
        },
      },
      {
        label: '加入 Discord 社区',
        click() {
          shell.openExternal('https://responsively.app/join-discord/');
        },
      },
      {
        label: '查找问题',
        click() {
          shell.openExternal('https://github.com/responsively-org/responsively-app/issues');
        },
      },
      {
        label: '赞助 Responsively',
        click() {
          shell.openExternal(
            'https://responsively.app/sponsor?utm_source=app&utm_medium=menu&utm_campaign=sponsor'
          );
        },
      },
      {
        type: 'separator',
      },
      {
        label: '关于',
        accelerator: 'F1',
        click: () => {
          mainWindow.webContents.send(IPC_MAIN_CHANNELS.OPEN_ABOUT_DIALOG, {
            environmentInfo,
            updaterStatus: appUpdater.getStatus(),
          });
        },
      },
    ],
  };
};
