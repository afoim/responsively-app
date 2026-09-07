import {expect, test} from '../fixtures/electron-app';
import type {ResponsivelyApp} from '../models/app';

const setAnnouncements = async (
  app: ResponsivelyApp,
  value: {seenVersion: string | null; supportShownAt: number | null; supportHidden: boolean}
) => {
  await app.page.evaluate((v) => {
    (
      window as unknown as {electron: {store: {set: (k: string, val: unknown) => void}}}
    ).electron.store.set('ui.announcements', v);
  }, value);
};

test.describe('Announcements', () => {
  test.describe.configure({mode: 'serial'});

  test.afterAll(async ({app}) => {
    // Leave the cards suppressed for whatever spec file shares this worker.
    const version = await app.electronApp.evaluate(({app: electronApp}) =>
      electronApp.getVersion()
    );
    await setAnnouncements(app, {
      seenVersion: version,
      supportShownAt: Date.now(),
      supportHidden: false,
    });
  });

  test('bell panel lists release highlights and the sponsor strip', async ({app}) => {
    await app.dismissModals();
    await app.page.locator('button[title="通知"]').click();

    await expect(app.page.getByText('MCP 集成')).toBeVisible();
    await expect(app.page.getByText('画布模式', {exact: true})).toBeVisible();
    await expect(app.page.getByText('自定义设备', {exact: true})).toBeVisible();
    await expect(app.page.getByText('喜欢 Responsively？')).toBeVisible();
    await expect(app.page.getByRole('button', {name: '赞助'})).toBeVisible();

    await app.page.keyboard.press('Escape');
  });

  test('whats-new card shows for an unseen version and dismisses for good', async ({app}) => {
    await app.dismissModals();
    // Pretend the last seen release was older, then boot the renderer again.
    await setAnnouncements(app, {
      seenVersion: '0.0.1',
      supportShownAt: Date.now(),
      supportHidden: false,
    });
    await app.page.reload();

    const card = app.page.locator('[data-testid="announcement-card"]');
    await expect(card).toBeVisible({timeout: 15_000});
    await expect(card).toContainText('版本更新');
    await expect(card).toContainText('MCP 服务');
    // The bell shows unread state alongside the card.
    await expect(app.page.locator('[data-testid="bell-unread-dot"]')).toBeVisible();

    await card.getByRole('button', {name: '稍后'}).click();
    await expect(card).toBeHidden();

    // Dismissal is persisted: the current version is now the seen one.
    const seen = await app.page.evaluate(() =>
      (window as unknown as {electron: {store: {get: (k: string) => unknown}}}).electron.store.get(
        'ui.announcements.seenVersion'
      )
    );
    const version = await app.electronApp.evaluate(({app: electronApp}) =>
      electronApp.getVersion()
    );
    expect(seen).toBe(version);
    await expect(app.page.locator('[data-testid="bell-unread-dot"]')).toBeHidden();
  });

  test('support card shows monthly once the release notes are seen', async ({app}) => {
    await app.dismissModals();
    const version = await app.electronApp.evaluate(({app: electronApp}) =>
      electronApp.getVersion()
    );
    await setAnnouncements(app, {seenVersion: version, supportShownAt: null, supportHidden: false});
    await app.page.reload();

    const card = app.page.locator('[data-testid="announcement-card"]');
    await expect(card).toBeVisible({timeout: 15_000});
    await expect(card).toContainText('支持 Responsively');
    await expect(card).toContainText('每月最多显示一次');

    // Being shown at all records the timestamp for the monthly cadence.
    await expect
      .poll(async () =>
        app.page.evaluate(() =>
          (
            window as unknown as {electron: {store: {get: (k: string) => unknown}}}
          ).electron.store.get('ui.announcements.supportShownAt')
        )
      )
      .toBeGreaterThan(0);

    await card.getByRole('button', {name: '以后再说'}).click();
    await expect(card).toBeHidden();
  });
});
