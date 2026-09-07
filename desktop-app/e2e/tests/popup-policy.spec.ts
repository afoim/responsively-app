import {test, expect} from '../fixtures/electron-app';
import type {ResponsivelyApp} from '../models/app';

// Clicks an element inside a preview webview's guest page. Any guest works:
// window.open routing is wired per-guest in the main process.
const clickInWebview = async (app: ResponsivelyApp, selector: string) => {
  await app.electronApp.evaluate(async ({webContents}, sel) => {
    const webviews = webContents
      .getAllWebContents()
      .filter((wc: Electron.WebContents) => (wc as any).getType() === 'webview');
    if (webviews.length === 0) {
      throw new Error('No webview guests found');
    }
    await webviews[0].executeJavaScript(`document.querySelector(${JSON.stringify(sel)}).click()`);
  }, selector);
};

test.describe('Popup Policy', () => {
  test.beforeAll(async ({app, testServerUrl}) => {
    await app.dismissModals();
    await app.navigateTo(`${testServerUrl}/popup-test.html`);
    await expect(app.addressBar).toHaveValue(/popup-test\.html/, {timeout: 15_000});
  });

  test.afterAll(async ({app}) => {
    // Worker-scoped app persists across spec files — leave the default
    // behavior and the real shell.openExternal behind.
    await app.page.evaluate(() => {
      (window as any).electron.store.set('userPreferences.popupBehavior', 'browser-window');
    });
    await app.electronApp.evaluate(({shell}) => {
      const g = global as any;
      if (g.__origOpenExternal) {
        shell.openExternal = g.__origOpenExternal;
        delete g.__origOpenExternal;
        delete g.__openExternalCalls;
      }
    });
  });

  for (const [name, selector] of [
    ['target=_blank', '#blank-link'],
    ['window.open', '#js-popup'],
  ]) {
    test(`${name} opens a separate native window by default`, async ({app}) => {
      const originalIds = await app.electronApp.evaluate(({BrowserWindow}) =>
        BrowserWindow.getAllWindows().map((w) => w.id)
      );
      await clickInWebview(app, selector);
      await expect
        .poll(() =>
          app.electronApp.evaluate(
            ({BrowserWindow}, ids) =>
              BrowserWindow.getAllWindows()
                .filter((w) => !ids.includes(w.id))
                .map((w) => w.webContents.getURL()),
            originalIds
          )
        )
        .toEqual([expect.stringContaining('test-page-2.html')]);
      await expect(app.addressBar).toHaveValue(/popup-test\.html/);
      await app.electronApp.evaluate(({BrowserWindow}, ids) => {
        for (const w of BrowserWindow.getAllWindows()) if (!ids.includes(w.id)) w.destroy();
      }, originalIds);
    });
  }

  test('external setting sends popups to the OS browser instead', async ({app}) => {
    // Stub shell.openExternal in the main process so the test asserts the
    // call without opening a real browser.
    await app.electronApp.evaluate(({shell}) => {
      const g = global as any;
      g.__origOpenExternal = shell.openExternal;
      g.__openExternalCalls = [];
      shell.openExternal = async (url: string) => {
        g.__openExternalCalls.push(url);
      };
    });
    await app.page.evaluate(() => {
      (window as any).electron.store.set('userPreferences.popupBehavior', 'external');
    });

    await clickInWebview(app, '#blank-link');

    // Navigation links are not synthetically clicked on other previews.
    // One source action must produce exactly one external open.
    await expect
      .poll(() => app.electronApp.evaluate(() => (global as any).__openExternalCalls as string[]), {
        timeout: 10_000,
      })
      .toEqual([expect.stringContaining('test-page-2.html')]);
    // The previews stay where they were.
    await expect(app.addressBar).toHaveValue(/popup-test\.html/);
  });
});
