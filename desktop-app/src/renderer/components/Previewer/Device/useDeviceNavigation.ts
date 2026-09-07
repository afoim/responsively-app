import {IPC_MAIN_CHANNELS} from 'common/constants';
import {ReloadArgs} from 'main/menu';
import {LoadURLInWebviewArgs, LoadURLInWebviewResult} from 'main/native-functions';
import {DeleteStorageArgs, DeleteStorageResult} from 'main/webview-storage-manager';
import {RefObject, useCallback, useEffect, useReducer} from 'react';
import {useDispatch} from 'react-redux';
import {ADDRESS_BAR_EVENTS} from 'renderer/components/ToolBar/AddressBar';
import {NAVIGATION_EVENTS} from 'renderer/components/ToolBar/NavigationControls';
import {webViewPubSub, type Handler as PubSubHandler} from 'renderer/lib/pubsub';
import {setAddress, setPageTitle} from 'renderer/store/features/renderer';
import {initialNavigationState, navigationReducer, NavigationState} from './navigationMachine';
import {appendHistory} from './utils';

// One authority per app renderer, selected by genuine input, not DOM order.
// A phone may not even render the desktop link. Mirror the source's committed
// URL, never click an unrelated link in the primary device to get that URL.
let navigationOwner: Electron.WebviewTag | null = null;

interface Params {
  ref: RefObject<Electron.WebviewTag | null>;
  isPrimary: boolean;
  webviewReady: boolean;
  address: string;
}

/**
 * Everything that moves a preview between pages: address-driven loads,
 * webview navigation events (routed through the navigation state machine),
 * history, page title, the menu reload channel and the toolbar pub/sub
 * events. The device receiving genuine input owns shared navigation.
 */
const useDeviceNavigation = ({ref, isPrimary, webviewReady, address}: Params): NavigationState => {
  const dispatch = useDispatch();
  const [navigation, dispatchNavigationEvent] = useReducer(
    navigationReducer,
    initialNavigationState
  );

  // Navigation is driven from the main process (instead of the <webview> src
  // attribute or webview.loadURL) so that superseded loads don't surface as
  // unhandled ERR_ABORTED errors from Electron's guest-view manager.
  useEffect(() => {
    const webview = ref.current;
    if (webview == null || !webviewReady) {
      return;
    }
    try {
      if (webview.getURL() === address) {
        return;
      }
      window.electron.ipcRenderer.invoke<LoadURLInWebviewArgs, LoadURLInWebviewResult>(
        IPC_MAIN_CHANNELS.LOAD_URL_IN_WEBVIEW,
        {webContentsId: webview.getWebContentsId(), url: address}
      );
    } catch (err) {
      console.error('Error loading URL', err);
    }
  }, [ref, address, isPrimary, webviewReady]);

  // Webview navigation + load events → state machine (and, for the primary
  // device, the shared address/history state).
  useEffect(() => {
    const webview = ref.current;
    if (!webview) {
      return undefined;
    }
    const handlerRemovers: (() => void)[] = [];

    const ownsNavigation = () =>
      navigationOwner?.isConnected ? navigationOwner === webview : isPrimary;
    const claimNavigation = (e: Electron.IpcMessageEvent) => {
      if (e.channel === 'preview-user-interaction') navigationOwner = webview;
    };
    const removeNativeInputListener = window.electron.ipcRenderer.on<{webContentsId: number}>(
      IPC_MAIN_CHANNELS.PREVIEW_USER_INTERACTION,
      ({webContentsId}) => {
        if (webview.getWebContentsId() === webContentsId) navigationOwner = webview;
      }
    );
    webview.addEventListener('ipc-message', claimNavigation);
    handlerRemovers.push(() => {
      removeNativeInputListener?.();
      webview.removeEventListener('ipc-message', claimNavigation);
      if (navigationOwner === webview) navigationOwner = null;
    });

    const commitMainFrameNavigation = (url: string) => {
      if (!ownsNavigation()) return;
      // Include final HTTP redirects even after an address-bar load. Dropping
      // the first commit used to leave the address bar at the pre-redirect URL.
      dispatch(setAddress(url));
      appendHistory(url, webview.getTitle());
    };

    // Both events explicitly identify the frame; iframe navigation stays local.
    const didFrameNavigateHandler = (e: Electron.DidFrameNavigateEvent) => {
      if (!e.isMainFrame) return;
      commitMainFrameNavigation(e.url);
    };
    const didNavigateInPageHandler = (e: Electron.DidNavigateInPageEvent) => {
      if (!e.isMainFrame) return;
      commitMainFrameNavigation(e.url);
    };
    webview.addEventListener('did-frame-navigate', didFrameNavigateHandler);
    webview.addEventListener('did-navigate-in-page', didNavigateInPageHandler);
    handlerRemovers.push(() => {
      webview.removeEventListener('did-frame-navigate', didFrameNavigateHandler);
      webview.removeEventListener('did-navigate-in-page', didNavigateInPageHandler);
    });

    const didStartLoadingHandler = () => {
      dispatchNavigationEvent({type: 'load-started'});
    };
    webview.addEventListener('did-start-loading', didStartLoadingHandler);
    handlerRemovers.push(() => {
      webview.removeEventListener('did-start-loading', didStartLoadingHandler);
    });

    const didStopLoadingHandler = () => {
      dispatchNavigationEvent({type: 'load-finished'});
    };
    webview.addEventListener('did-stop-loading', didStopLoadingHandler);
    handlerRemovers.push(() => {
      webview.removeEventListener('did-stop-loading', didStopLoadingHandler);
    });

    const didFailLoadHandler = ({
      errorCode,
      errorDescription,
      isMainFrame,
    }: Electron.DidFailLoadEvent) => {
      dispatchNavigationEvent({type: 'load-failed', errorCode, errorDescription, isMainFrame});
    };
    webview.addEventListener('did-fail-load', didFailLoadHandler);
    handlerRemovers.push(() => {
      webview.removeEventListener('did-fail-load', didFailLoadHandler);
    });

    return () => {
      handlerRemovers.forEach((remove) => {
        remove();
      });
    };
  }, [ref, dispatch, isPrimary]);

  // Menu-driven reloads arrive over IPC.
  useEffect(() => {
    if (!ref.current) {
      return undefined;
    }
    const webview = ref.current as Electron.WebviewTag;

    const reloadHandler = (args: ReloadArgs) => {
      const {ignoreCache} = args;
      if (ignoreCache === true) {
        webview.reloadIgnoringCache();
      } else {
        webview.reload();
      }
    };

    window.electron.ipcRenderer.on<ReloadArgs>('reload', reloadHandler);

    return () => {
      window.electron.ipcRenderer.removeListener('reload', reloadHandler);
    };
  }, [ref]);

  // Toolbar pub/sub: reload for everyone; back/forward/storage only on the
  // primary device.
  const registerNavigationHandlers = useCallback(() => {
    const subscriptions: Array<[string, PubSubHandler]> = [];
    const subscribe = (topic: string, handler: PubSubHandler) => {
      webViewPubSub.subscribe(topic, handler);
      subscriptions.push([topic, handler]);
    };

    subscribe(NAVIGATION_EVENTS.RELOAD, () => {
      if (ref.current) {
        ref.current.reload();
      }
    });
    if (isPrimary) {
      subscribe(NAVIGATION_EVENTS.BACK, () => {
        if (ref.current) {
          const source = navigationOwner?.isConnected ? navigationOwner : ref.current;
          navigationOwner = source;
          source.goBack();
        }
      });

      subscribe(NAVIGATION_EVENTS.FORWARD, () => {
        if (ref.current) {
          const source = navigationOwner?.isConnected ? navigationOwner : ref.current;
          navigationOwner = source;
          source.goForward();
        }
      });

      subscribe(ADDRESS_BAR_EVENTS.DELETE_STORAGE, async () => {
        if (!ref.current) {
          return;
        }
        const webview = ref.current as Electron.WebviewTag;
        await window.electron.ipcRenderer.invoke<DeleteStorageArgs, DeleteStorageResult>(
          IPC_MAIN_CHANNELS.DELETE_STORAGE,
          {webContentsId: webview.getWebContentsId()}
        );
      });

      subscribe(ADDRESS_BAR_EVENTS.DELETE_COOKIES, async () => {
        if (!ref.current) {
          return;
        }
        const webview = ref.current as Electron.WebviewTag;
        await window.electron.ipcRenderer.invoke<DeleteStorageArgs, DeleteStorageResult>(
          IPC_MAIN_CHANNELS.DELETE_STORAGE,
          {
            webContentsId: webview.getWebContentsId(),
            storages: ['cookies'],
          }
        );
      });

      subscribe(ADDRESS_BAR_EVENTS.DELETE_CACHE, async () => {
        if (!ref.current) {
          return;
        }
        const webview = ref.current as Electron.WebviewTag;
        await window.electron.ipcRenderer.invoke<DeleteStorageArgs, DeleteStorageResult>(
          IPC_MAIN_CHANNELS.DELETE_STORAGE,
          {
            webContentsId: webview.getWebContentsId(),
            storages: ['network-cache'],
          }
        );
      });
    }

    return () => {
      subscriptions.forEach(([topic, handler]) => webViewPubSub.unsubscribe(topic, handler));
    };
  }, [ref, isPrimary]);

  useEffect(() => {
    const unregister = registerNavigationHandlers();
    return () => {
      unregister();
    };
  }, [registerNavigationHandlers]);

  // The window title mirrors the primary page.
  useEffect(() => {
    const webview = ref.current;
    if (!isPrimary || !webview) {
      return undefined;
    }
    const updatePageTitle = () => {
      dispatch(setPageTitle(webview.getTitle()));
    };
    webview.addEventListener('dom-ready', updatePageTitle);

    return () => {
      webview.removeEventListener('dom-ready', updatePageTitle);
    };
  }, [ref, dispatch, isPrimary]);

  return navigation;
};

export default useDeviceNavigation;
