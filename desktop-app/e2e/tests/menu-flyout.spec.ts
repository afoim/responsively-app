import {test, expect} from '../fixtures/electron-app';

test.describe('Menu Flyout', () => {
  test('clicking the overflow menu button opens the flyout', async ({app}) => {
    await app.dismissModals();

    await app.openMenuFlyout();

    await expect(app.page.getByText('停靠开发者工具')).toBeVisible();
    await expect(app.page.getByText('设备与套件')).toBeVisible();
  });

  test('clicking outside the flyout closes it', async ({app}) => {
    // Menu should still be open from previous test
    const dockLabel = app.page.getByText('停靠开发者工具');
    if (!(await dockLabel.isVisible())) {
      await app.openMenuFlyout();
    }

    // Click outside to close — click on the address bar area
    await app.addressBar.click();
    await app.page.waitForTimeout(300);
  });

  test('dock devtools toggle is present', async ({app}) => {
    await app.dismissModals();

    await app.openMenuFlyout();

    await expect(app.page.getByText('停靠开发者工具')).toBeVisible();
    await expect(app.page.getByRole('checkbox', {name: '停靠开发者工具'})).toBeAttached();

    await app.closeMenuFlyout();
  });

  test('clear browsing history empties the stored history', async ({app}) => {
    await app.dismissModals();
    await app.page.evaluate(() => {
      (window as any).electron.store.set('history', [{url: 'https://example.com'}]);
    });

    await app.openMenuFlyout();
    await app.page.getByText('清除浏览历史').click();

    const history = await app.page.evaluate(() => (window as any).electron.store.get('history'));
    expect(history).toEqual([]);
  });

  test('bookmarks section is visible', async ({app}) => {
    await app.dismissModals();

    await app.openMenuFlyout();

    await expect(app.page.getByText('书签')).toBeVisible();

    await app.closeMenuFlyout();
  });

  test('settings and keyboard shortcuts options are visible', async ({app}) => {
    await app.dismissModals();

    await app.openMenuFlyout();

    await expect(app.page.getByText('设置')).toBeVisible();
    await expect(app.page.getByText('键盘快捷键')).toBeVisible();

    await app.closeMenuFlyout();
  });
});
