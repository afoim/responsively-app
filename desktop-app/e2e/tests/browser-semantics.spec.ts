import {readFileSync} from 'fs';
import http from 'http';
import path from 'path';
import {test as base, expect} from '../fixtures/electron-app';
import type {ResponsivelyApp} from '../models/app';

let posts: string[] = [];
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
const test = base.extend<{}, {browserUrl: string}>({
  browserUrl: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const page = readFileSync(path.join(__dirname, '../fixtures/pages/browser-semantics.html'));
      const server = http.createServer((req, res) => {
        const url = new URL(req.url!, 'http://localhost');
        if (url.pathname === '/redirect') {
          res.writeHead(302, {Location: '/destination'});
          res.end();
          return;
        }
        if (url.pathname === '/post') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            posts.push(`${req.method}:${body}`);
            res.end(`<pre>${req.method}:${body}</pre>`);
          });
          return;
        }
        if (url.pathname === '/download') {
          res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Content-Disposition': 'attachment; filename=fixture.txt',
          });
          res.end('download fixture');
          return;
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        if (url.pathname === '/frame-a' || url.pathname === '/frame-b') {
          res.end(
            '<a id="frame-next" href="/frame-b">Frame next</a><a id="frame-top" href="/destination" target="_top">Top</a>'
          );
          return;
        }
        if (url.pathname === '/destination') {
          res.end(
            '<h1>Destination</h1><a id="child-popup" href="/destination?child=1" target="_blank">Child popup</a><script>window.opener?.postMessage("popup-ready",location.origin)</script>'
          );
          return;
        }
        res.end(page);
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      try {
        await use(`http://127.0.0.1:${(server.address() as any).port}`);
      } finally {
        server.close();
      }
    },
    {scope: 'worker'},
  ],
});

const exec = (app: ResponsivelyApp, id: number, code: string) =>
  app.electronApp.evaluate(
    async ({webContents}, data) => {
      const wc = webContents.fromId(data.id);
      if (!wc) throw new Error('Guest missing');
      return wc.executeJavaScript(data.code);
    },
    {id, code}
  );

async function click(
  app: ResponsivelyApp,
  id: number,
  selector: string,
  button = 'left',
  modifiers: string[] = []
) {
  await expect
    .poll(() =>
      exec(
        app,
        id,
        `!!document.querySelector(${JSON.stringify(selector)})?.getClientRects().length`
      )
    )
    .toBe(true);
  const point = await exec(
    app,
    id,
    `(() => {
    const el=document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error('Missing click target');
    el.scrollIntoView({behavior:'instant',block:'center'});
    const r=el.getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};
  })()`
  );
  await app.electronApp.evaluate(
    ({webContents}, data) => {
      const wc = webContents.fromId(data.id)!;
      wc.focus();
      wc.sendInputEvent({type: 'mouseMove', ...data.point});
      wc.sendInputEvent({
        type: 'mouseDown',
        button: data.button,
        clickCount: 1,
        modifiers: data.modifiers,
        ...data.point,
      } as any);
      wc.sendInputEvent({
        type: 'mouseUp',
        button: data.button,
        clickCount: 1,
        modifiers: data.modifiers,
        ...data.point,
      } as any);
    },
    {id, point, button, modifiers}
  );
}

let rootId: number;
let ids: number[] = [];
let desktop: number;
let mobile: number;
const popupIds = (app: ResponsivelyApp) =>
  app.electronApp.evaluate(
    ({BrowserWindow}, root) =>
      BrowserWindow.getAllWindows()
        .filter((w) => w.id !== root)
        .map((w) => w.webContents.id),
    rootId
  );
const urls = (app: ResponsivelyApp) =>
  app.electronApp.evaluate(
    ({webContents}, list) => list.map((id) => webContents.fromId(id)?.getURL()),
    ids
  );

async function expectPreviews(app: ResponsivelyApp, url: string) {
  await expect(app.addressBar).toHaveValue(url);
  await expect.poll(() => urls(app)).toEqual(ids.map(() => url));
}

test.describe('Browser navigation semantics', () => {
  test.beforeAll(async ({app}) => {
    rootId = await app.electronApp.evaluate(
      ({BrowserWindow}) => BrowserWindow.getAllWindows()[0].id
    );
    await app.dismissModals();
  });
  test.beforeEach(async ({app, browserUrl}) => {
    await app.electronApp.evaluate(({BrowserWindow}, root) => {
      for (const w of BrowserWindow.getAllWindows()) if (w.id !== root) w.destroy();
    }, rootId);
    posts = [];
    await app.navigateTo(`${browserUrl}/browser-semantics.html`, {timeout: 300});
    ids = await app.webviews.evaluateAll((elements) =>
      elements.map((el) => (el as any).getWebContentsId())
    );
    expect(ids.length).toBeGreaterThanOrEqual(2);
    // Entering the same URL in the address bar intentionally does not reload.
    // Reset each real document so counters/DOM mutations cannot leak between tests.
    await app.electronApp.evaluate(
      async ({webContents}, data) => {
        await Promise.all(data.ids.map((id) => webContents.fromId(id)!.loadURL(data.url)));
      },
      {ids, url: `${browserUrl}/browser-semantics.html`}
    );
    await expect
      .poll(
        async () => {
          try {
            return await Promise.all(
              ids.map((id) =>
                exec(
                  app,
                  id,
                  'document.readyState === "complete" && !!window.__responsivelySemanticMirroring && !!window.___browserSync___?.socket.connected'
                )
              )
            );
          } catch {
            return [];
          }
        },
        {timeout: 25_000}
      )
      .toEqual(ids.map(() => true));
    const widths = await Promise.all(
      ids.map(async (id) => ({id, width: await exec(app, id, 'innerWidth')}))
    );
    widths.sort((a, b) => a.width - b.width);
    mobile = widths[0].id;
    desktop = widths[widths.length - 1].id;
  });

  test('desktop link does not click the mobile link at the same DOM index', async ({
    app,
    browserUrl,
  }) => {
    expect(await exec(app, mobile, '!!document.querySelector("#create")')).toBe(false);
    await click(app, desktop, '#create span');
    await expectPreviews(app, `${browserUrl}/destination`);
    expect(await popupIds(app)).toEqual([]);
  });

  test('mobile menu navigation does not misclick desktop feedback links', async ({
    app,
    browserUrl,
  }) => {
    await click(app, mobile, '#menu');
    await expect.poll(() => exec(app, mobile, '!!document.querySelector("#create")')).toBe(true);
    await click(app, mobile, '#create');
    await expectPreviews(app, `${browserUrl}/destination`);
    expect(await popupIds(app)).toEqual([]);
  });

  test('native target=_blank preserves the original page and noopener', async ({
    app,
    browserUrl,
  }) => {
    await click(app, desktop, '#blank');
    await expect.poll(async () => (await popupIds(app)).length).toBe(1);
    const [popup] = await popupIds(app);
    await expect.poll(() => exec(app, popup, 'location.href')).toBe(`${browserUrl}/destination`);
    expect(await exec(app, popup, 'window.opener === null')).toBe(true);
    expect(
      await exec(
        app,
        popup,
        '!!window.electron || !!window.___browserSync___ || typeof require !== "undefined"'
      )
    ).toBe(false);
    await expectPreviews(app, `${browserUrl}/browser-semantics.html`);
  });

  test('two deliberate opens of the same URL are not dropped by a dedup timer', async ({app}) => {
    await click(app, desktop, '#blank');
    await click(app, desktop, '#blank');
    await expect.poll(async () => (await popupIds(app)).length).toBe(2);
  });

  for (const [name, button, modifiers] of [
    ['Ctrl-click', 'left', ['control']],
    ['middle-click', 'middle', []],
  ] as const) {
    test(`${name} opens a separate context without navigating previews`, async ({
      app,
      browserUrl,
    }) => {
      await click(app, desktop, '#normal', button, [...modifiers]);
      await expect.poll(async () => (await popupIds(app)).length).toBe(1);
      await expectPreviews(app, `${browserUrl}/browser-semantics.html`);
    });
  }

  test('about:blank async OAuth window preserves handle, opener, cookies, postMessage and close', async ({
    app,
    browserUrl,
  }) => {
    await exec(app, desktop, 'document.cookie="popup_session=shared; path=/"; true');
    await click(app, desktop, '#js-popup');
    await expect
      .poll(() => exec(app, desktop, 'window.popupMessages.includes("popup-ready")'))
      .toBe(true);
    await expect.poll(async () => (await popupIds(app)).length).toBe(1);
    const [popup] = await popupIds(app);
    expect(await exec(app, popup, '!!window.opener')).toBe(true);
    expect(await exec(app, popup, 'document.cookie')).toContain('popup_session=shared');
    expect(await exec(app, popup, '!!window.___browserSync___ || !!window.electron')).toBe(false);
    await exec(app, desktop, 'window.popup.close(); true');
    await expect.poll(() => exec(app, desktop, 'window.popup.closed')).toBe(true);
    await expectPreviews(app, `${browserUrl}/browser-semantics.html`);
  });

  test('named popup targets reuse their WindowProxy', async ({app}) => {
    await click(app, desktop, '#named-popup');
    await expect.poll(async () => (await popupIds(app)).length).toBe(1);
    const before = await popupIds(app);
    await exec(app, desktop, 'window.firstPopup = window.namedPopup; true');
    await click(app, desktop, '#named-popup');
    expect(await popupIds(app)).toEqual(before);
    expect(await exec(app, desktop, 'window.firstPopup === window.namedPopup')).toBe(true);
  });

  test('target=_blank POST is submitted once with its body, not converted to GET', async ({
    app,
    browserUrl,
  }) => {
    await click(app, desktop, '#post-submit');
    await expect.poll(() => posts).toEqual(['POST:payload=native-post']);
    await expect.poll(async () => (await popupIds(app)).length).toBe(1);
    const [popup] = await popupIds(app);
    await expect
      .poll(() => exec(app, popup, 'document.body.textContent'))
      .toContain('POST:payload=native-post');
    await expectPreviews(app, `${browserUrl}/browser-semantics.html`);
  });

  test('popups opened by a popup remain independent and sandboxed', async ({app, browserUrl}) => {
    await click(app, desktop, '#blank');
    await expect.poll(async () => (await popupIds(app)).length).toBe(1);
    const [popup] = await popupIds(app);
    await expect
      .poll(() => exec(app, popup, '!!document.querySelector("#child-popup")'))
      .toBe(true);
    await click(app, popup, '#child-popup');
    await expect.poll(async () => (await popupIds(app)).length).toBe(2);
    await expectPreviews(app, `${browserUrl}/browser-semantics.html`);
  });

  test('iframe cross-document and hash navigation never update the shared address', async ({
    app,
    browserUrl,
  }) => {
    await exec(
      app,
      desktop,
      'document.querySelector("#frame").contentWindow.location.href="/frame-b"; true'
    );
    await expect
      .poll(() =>
        exec(app, desktop, 'document.querySelector("#frame").contentWindow.location.pathname')
      )
      .toBe('/frame-b');
    await exec(
      app,
      desktop,
      'document.querySelector("#frame").contentWindow.location.hash="nested"; true'
    );
    await app.page.waitForTimeout(300);
    await expectPreviews(app, `${browserUrl}/browser-semantics.html`);
  });

  test('preventDefault keeps navigation cancelled on every preview', async ({app, browserUrl}) => {
    await click(app, desktop, '#cancelled');
    expect(await exec(app, desktop, 'window.cancelled')).toBe(true);
    await expectPreviews(app, `${browserUrl}/browser-semantics.html`);
    expect(await popupIds(app)).toEqual([]);
  });

  test('source hash and SPA history work with back and forward', async ({app, browserUrl}) => {
    await click(app, desktop, '#spa');
    await expectPreviews(app, `${browserUrl}/browser-semantics.html?spa=1`);
    await app.backButton.click();
    await expectPreviews(app, `${browserUrl}/browser-semantics.html`);
    await app.forwardButton.click();
    await expectPreviews(app, `${browserUrl}/browser-semantics.html?spa=1`);
    await click(app, desktop, '#hash');
    await expectPreviews(app, `${browserUrl}/browser-semantics.html?spa=1#bottom`);
  });

  test('address-bar HTTP redirect reflects its final main-frame URL', async ({app, browserUrl}) => {
    await app.navigateTo(`${browserUrl}/redirect`, {timeout: 300});
    await expectPreviews(app, `${browserUrl}/destination`);
  });

  test('safe button mirroring finds the same control despite different DOMs', async ({app}) => {
    await click(app, desktop, '#counter span');
    await expect
      .poll(() => Promise.all(ids.map((id) => exec(app, id, 'window.count'))))
      .toEqual(ids.map(() => 1));
  });

  test('ambiguous receiver controls are skipped, never selected by index', async ({app}) => {
    for (const id of ids.filter((id) => id !== desktop)) {
      await exec(
        app,
        id,
        'const b=document.querySelector("#counter"); b.removeAttribute("id"); const c=b.cloneNode(true); c.onclick=b.onclick; b.after(c); true'
      );
    }
    await click(app, desktop, '#counter');
    await app.page.waitForTimeout(350);
    expect(await exec(app, desktop, 'window.count')).toBe(1);
    for (const id of ids.filter((id) => id !== desktop))
      expect(await exec(app, id, 'window.count')).toBe(0);
  });

  test('native text input and checkbox state synchronize without repeat toggles', async ({app}) => {
    await click(app, desktop, '#text');
    await app.electronApp.evaluate(async ({webContents}, id) => {
      await webContents.fromId(id)!.insertText('native input');
    }, desktop);
    await expect
      .poll(() =>
        Promise.all(ids.map((id) => exec(app, id, 'document.querySelector("#text").value')))
      )
      .toEqual(ids.map(() => 'native input'));
    await click(app, desktop, '#checkbox');
    await expect
      .poll(() =>
        Promise.all(ids.map((id) => exec(app, id, 'document.querySelector("#checkbox").checked')))
      )
      .toEqual(ids.map(() => true));
  });

  test('disabling BrowserSync also disables semantic interaction mirroring', async ({app}) => {
    await exec(app, mobile, 'window.___browserSync___.socket.close(); true');
    await click(app, desktop, '#counter');
    await app.page.waitForTimeout(350);
    expect(await exec(app, mobile, 'window.count')).toBe(0);
    expect(await exec(app, desktop, 'window.count')).toBe(1);
  });

  test('a real click inside an iframe may legitimately navigate target=_top', async ({
    app,
    browserUrl,
  }) => {
    const point = await exec(
      app,
      desktop,
      `(() => {
      const frame=document.querySelector('#frame');
      frame.scrollIntoView({behavior:'instant',block:'center'});
      const outer=frame.getBoundingClientRect();
      const inner=frame.contentDocument.querySelector('#frame-top').getBoundingClientRect();
      return {x:Math.round(outer.x+frame.clientLeft+inner.x+inner.width/2),y:Math.round(outer.y+frame.clientTop+inner.y+inner.height/2)};
    })()`
    );
    await app.electronApp.evaluate(
      ({webContents}, data) => {
        const wc = webContents.fromId(data.id)!;
        wc.focus();
        wc.sendInputEvent({type: 'mouseDown', button: 'left', clickCount: 1, ...data.point});
        wc.sendInputEvent({type: 'mouseUp', button: 'left', clickCount: 1, ...data.point});
      },
      {id: desktop, point}
    );
    await expectPreviews(app, `${browserUrl}/destination`);
  });

  test('keyboard Enter on a link preserves native new-window behavior', async ({
    app,
    browserUrl,
  }) => {
    await exec(app, desktop, 'document.querySelector("#blank").focus(); true');
    await app.electronApp.evaluate(({webContents}, id) => {
      const wc = webContents.fromId(id)!;
      wc.focus();
      wc.sendInputEvent({type: 'keyDown', keyCode: 'Return'});
      wc.sendInputEvent({type: 'char', keyCode: 'Return'});
      wc.sendInputEvent({type: 'keyUp', keyCode: 'Return'});
    }, desktop);
    await expect.poll(async () => (await popupIds(app)).length).toBe(1);
    await expectPreviews(app, `${browserUrl}/browser-semantics.html`);
  });

  test('download anchors trigger one download without changing previews', async ({
    app,
    browserUrl,
  }) => {
    await app.electronApp.evaluate(({session}) => {
      (global as any).__downloadEvents = [];
      session.defaultSession.once('will-download', (event, item) => {
        (global as any).__downloadEvents.push({filename: item.getFilename(), url: item.getURL()});
        // Observe Chromium's real DownloadItem without displaying a save dialog.
        event.preventDefault();
      });
    });
    await click(app, desktop, '#download');
    await expect
      .poll(() => app.electronApp.evaluate(() => (global as any).__downloadEvents))
      .toEqual([{filename: 'fixture.txt', url: `${browserUrl}/download`}]);
    await expectPreviews(app, `${browserUrl}/browser-semantics.html`);
    expect(await popupIds(app)).toEqual([]);
  });
});
