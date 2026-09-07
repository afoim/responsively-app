import {WebContents} from 'electron';
import {IPC_MAIN_CHANNELS} from '../common/constants';
import {matchShortcut, ShortcutChannel} from '../common/shortcuts';
import store from '../store';
import log from './logging';
import {decidePopupAction, PopupBehavior} from './popup-policy';

// Guest webContents ids tracked straight from did-attach-webview, so the set
// cannot be spoofed through IPC. IPC handlers that take a webContentsId must
// validate against it — otherwise a caller could aim executeJavaScript /
// loadURL / clearStorageData at any webContents, including the app shell.
const registeredWebviewIds = new Set<number>();

export const isRegisteredWebview = (webContentsId: number): boolean =>
  registeredWebviewIds.has(webContentsId);

export interface WebviewSecurityDeps {
  openExternal: (url: string) => void;
  /** Routes an app shortcut typed inside a preview back to the renderer. */
  onShortcut: (channel: ShortcutChannel) => void;
}

/** Native child windows preserve opener, POST data, cookies and named targets. */
const wirePopupWindows = (
  contents: WebContents,
  deps: WebviewSecurityDeps,
  mirrored: () => boolean = () => false
) => {
  contents.setWindowOpenHandler((details) => {
    // Suppress replicas, not distinct deliberate opens of the same URL. The old
    // time/URL dedup also swallowed legitimate rapid clicks and named windows.
    if (mirrored()) return {action: 'deny'};
    const behavior = (store.get('userPreferences.popupBehavior') ??
      'browser-window') as PopupBehavior;
    const action = decidePopupAction(details.url, behavior, contents.getURL());
    if (action.kind === 'external') {
      deps.openExternal(action.url);
      return {action: 'deny'};
    }
    if (action.kind === 'deny') return {action: 'deny'};
    return {
      action: 'allow',
      outlivesOpener: true,
      overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        show: process.env.E2E_HEADLESS !== 'true',
        // Never give untrusted popups the app-shell bridge or Node privileges.
        webPreferences: {
          preload: '',
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webviewTag: false,
        },
      },
    };
  });
  contents.on('did-create-window', (child) => {
    child.removeMenu();
    wirePopupWindows(child.webContents, deps);
    child.webContents.on('will-navigate', (event, url) => {
      const action = decidePopupAction(url, 'browser-window', child.webContents.getURL());
      if (action.kind !== 'browser-window') {
        event.preventDefault();
        if (action.kind === 'external') deps.openExternal(action.url);
      }
    });
  });
};

/**
 * Per-window guest wiring: registers every attached <webview>, enforces safe
 * webPreferences before attach, and routes window.open / target=_blank out of
 * guests into separate, sandboxed browser windows (or the user's OS browser).
 */
export const wireWebviewSecurity = (hostContents: WebContents, deps: WebviewSecurityDeps) => {
  hostContents.on('will-attach-webview', (_event, webPreferences) => {
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.webviewTag = false;
    webPreferences.nodeIntegrationInSubFrames = false;
    webPreferences.nodeIntegrationInWorker = false;
    const preload = webPreferences.preload ?? '';
    if (preload !== '' && !preload.includes('preload-webview')) {
      log.warn('[webview] blocked unexpected preload script', preload);
      delete webPreferences.preload;
    }
  });

  hostContents.on('did-attach-webview', (_event, guestContents) => {
    const {id} = guestContents;
    registeredWebviewIds.add(id);
    guestContents.once('destroyed', () => {
      registeredWebviewIds.delete(id);
    });

    let mirroredInteraction = false;
    const claimNavigation = () => {
      mirroredInteraction = false;
      hostContents.send(IPC_MAIN_CHANNELS.PREVIEW_USER_INTERACTION, {webContentsId: id});
    };
    // Native input also covers iframe content, whose DOM events do not bubble
    // into the parent document. Synthetic mirrored clicks never reach this hook.
    guestContents.on('before-mouse-event', (_event, input) => {
      if (input.type === 'mouseDown') claimNavigation();
    });

    // Keystrokes that land inside a guest never reach the renderer's own
    // handlers, which is why app shortcuts died whenever a preview had focus
    // (#1175). The main process sees them first, so match and forward here.
    guestContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') {
        return;
      }
      claimNavigation();
      const channel = matchShortcut(input, process.platform);
      if (channel === null) {
        return;
      }
      event.preventDefault();
      deps.onShortcut(channel);
    });

    guestContents.ipc.on('preview-user-interaction', (event) => {
      if (event.senderFrame === guestContents.mainFrame) mirroredInteraction = false;
      event.returnValue = true;
    });
    guestContents.ipc.on('preview-mirrored-interaction', (event) => {
      if (event.senderFrame === guestContents.mainFrame) mirroredInteraction = true;
      event.returnValue = true;
    });
    wirePopupWindows(guestContents, deps, () => mirroredInteraction);
  });
};
