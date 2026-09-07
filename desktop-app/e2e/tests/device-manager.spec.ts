import {test, expect} from '../fixtures/electron-app';

test.describe('Device Manager', () => {
  test('the toolbar button opens the Device Manager sheet', async ({app}) => {
    await app.dismissModals();
    await app.openDeviceManager();

    await expect(app.deviceManagerSheet).toBeVisible();
    await expect(app.deviceManagerSheet.getByText('套件', {exact: true})).toBeVisible();
    await expect(app.page.locator('[data-testid="device-grid-meta"]')).toContainText('设备');

    await app.closeDeviceManager();
  });

  test('the previews stay mounted behind the sheet', async ({app}) => {
    await app.dismissModals();
    const before = await app.webviews.count();

    await app.openDeviceManager();
    // The sheet floats over the stage rather than replacing it.
    expect(await app.webviews.count()).toBe(before);
    await expect(app.addressBar).toBeVisible();

    await app.closeDeviceManager();
  });

  test('search filters the device grid', async ({app}) => {
    await app.dismissModals();
    await app.ensureDeviceManagerOpen();

    const meta = app.page.locator('[data-testid="device-grid-meta"]');
    const searchInput = app.page.locator('input[placeholder="搜索设备…"]');

    await searchInput.fill('iPhone');
    await expect(app.deviceManagerSheet.getByText('iPhone', {exact: false}).first()).toBeVisible();
    await expect(meta).toContainText('设备');

    await searchInput.fill('zzz_nonexistent_device_xyz');
    await expect(app.deviceManagerSheet.getByText(/没有匹配/)).toBeVisible();

    await searchInput.fill('');
    await app.closeDeviceManager();
  });

  test('filter chips narrow the grid by device type', async ({app}) => {
    await app.dismissModals();
    await app.ensureDeviceManagerOpen();

    const phones = app.deviceManagerSheet.getByRole('button', {name: '手机', exact: true});
    await phones.click();
    await expect(phones).toHaveAttribute('aria-pressed', 'true');

    const all = app.deviceManagerSheet.getByRole('button', {name: '全部', exact: true});
    await all.click();
    await expect(all).toHaveAttribute('aria-pressed', 'true');

    await app.closeDeviceManager();
  });

  test('close button dismisses the sheet', async ({app}) => {
    await app.dismissModals();
    await app.ensureDeviceManagerOpen();

    await app.closeDeviceManager();

    await expect(app.deviceManagerSheet).toBeHidden();
    await expect(app.addressBar).toBeVisible();
  });
});
