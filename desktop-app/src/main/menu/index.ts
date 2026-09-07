import {app, Menu, BrowserWindow, MenuItemConstructorOptions} from 'electron';
import {subMenuHelp} from './help';
import {getViewMenu} from './view';
import {AppUpdater} from '../app-updater';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export interface ReloadArgs {
  ignoreCache?: boolean;
}

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  appUpdater: AppUpdater;

  constructor(mainWindow: BrowserWindow, appUpdater: AppUpdater) {
    this.mainWindow = mainWindow;
    this.appUpdater = appUpdater;
  }

  buildMenu(): Menu {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
      this.setupDevelopmentEnvironment();
    }

    const template =
      process.platform === 'darwin' ? this.buildDarwinTemplate() : this.buildDefaultTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupDevelopmentEnvironment(): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const {x, y} = props;

      Menu.buildFromTemplate([
        {
          label: '检查元素',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          },
        },
      ]).popup({window: this.mainWindow});
    });
  }

  buildDarwinTemplate(): MenuItemConstructorOptions[] {
    const subMenuAbout: DarwinMenuItemConstructorOptions = {
      label: 'ResponsivelyApp',
      submenu: [
        {
          label: '关于 ResponsivelyApp',
          selector: 'orderFrontStandardAboutPanel:',
        },
        {type: 'separator'},
        {
          label: '隐藏 ResponsivelyApp',
          accelerator: 'Command+H',
          selector: 'hide:',
        },
        {
          label: '隐藏其他窗口',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:',
        },
        {label: '显示全部', selector: 'unhideAllApplications:'},
        {type: 'separator'},
        {
          label: '退出',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };
    const subMenuEdit: DarwinMenuItemConstructorOptions = {
      label: '编辑',
      submenu: [
        {label: '撤销', accelerator: 'Command+Z', selector: 'undo:'},
        {label: '重做', accelerator: 'Shift+Command+Z', selector: 'redo:'},
        {type: 'separator'},
        {label: '剪切', accelerator: 'Command+X', selector: 'cut:'},
        {label: '复制', accelerator: 'Command+C', selector: 'copy:'},
        {label: '粘贴', accelerator: 'Command+V', selector: 'paste:'},
        {
          label: '全选',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    };

    const subMenuWindow: DarwinMenuItemConstructorOptions = {
      label: '窗口',
      submenu: [
        {
          label: '最小化',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        {label: '关闭', accelerator: 'Command+W', selector: 'performClose:'},
        {type: 'separator'},
        {label: '全部置于前台', selector: 'arrangeInFront:'},
      ],
    };

    return [
      subMenuAbout,
      subMenuEdit,
      getViewMenu(this.mainWindow),
      subMenuWindow,
      subMenuHelp(this.mainWindow, this.appUpdater),
    ];
  }

  buildDefaultTemplate(): MenuItemConstructorOptions[] {
    return [
      {
        label: '文件(&F)',
        submenu: [
          {
            label: '打开(&O)',
            accelerator: 'Ctrl+O',
          },
          {
            label: '关闭(&C)',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            },
          },
        ],
      },
      getViewMenu(this.mainWindow),
      subMenuHelp(this.mainWindow, this.appUpdater),
    ];
  }
}
