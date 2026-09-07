import {BrowserWindow, MenuItemConstructorOptions} from 'electron';

const isMac = process.platform === 'darwin';
const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

const getToggleFullScreen = (mainWindow: BrowserWindow): MenuItemConstructorOptions => ({
  label: '切换全屏(&F)',
  accelerator: isMac ? 'Ctrl+CommandOrControl+F' : 'F11',
  click: () => {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  },
});

const getToggleDevTools = (mainWindow: BrowserWindow): MenuItemConstructorOptions => ({
  label: '切换开发者工具(&D)',
  accelerator: isMac ? 'Alt+CommandOrControl+I' : 'Alt+Ctrl+I',
  click: () => {
    mainWindow.webContents.toggleDevTools();
  },
});

const getReloadMenu = (mainWindow: BrowserWindow): MenuItemConstructorOptions => ({
  label: '重新加载(&R)',
  accelerator: 'CommandOrControl+R',
  click: () => {
    if (isDev) {
      mainWindow.webContents.reload();
      return;
    }
    mainWindow.webContents.send('reload', {});
  },
});

const getReloadIgnoringCacheMenu = (mainWindow: BrowserWindow): MenuItemConstructorOptions => ({
  label: '忽略缓存并重新加载',
  accelerator: 'CommandOrControl+Shift+R',
  click: () => {
    mainWindow.webContents.send('reload', {ignoreCache: true});
  },
});

const getViewMenuProd = (mainWindow: BrowserWindow): MenuItemConstructorOptions => ({
  label: '视图(&V)',
  submenu: [
    getReloadMenu(mainWindow),
    getReloadIgnoringCacheMenu(mainWindow),
    getToggleFullScreen(mainWindow),
  ],
});

const getViewMenuDev = (mainWindow: BrowserWindow): MenuItemConstructorOptions => ({
  label: '视图(&V)',
  submenu: [
    getReloadMenu(mainWindow),
    getToggleDevTools(mainWindow),
    getToggleFullScreen(mainWindow),
  ],
});

export const getViewMenu = isDev ? getViewMenuDev : getViewMenuProd;
