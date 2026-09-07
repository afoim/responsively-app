import {test, expect} from '../fixtures/electron-app';

test.describe('About Dialog', () => {
  test('about dialog can be opened via native menu', async ({app}) => {
    await app.dismissModals();

    await app.openAboutDialog();

    // Check if the about dialog is visible — it shows "Responsively App" title
    const aboutTitle = app.page.getByText('Responsively App');
    await expect(aboutTitle.first()).toBeVisible({timeout: 5_000});
  });

  test('about dialog displays version info', async ({app}) => {
    await app.dismissModals();

    await app.openAboutDialog();

    const versionsText = app.page.getByText('版本信息');
    await expect(versionsText).toBeVisible({timeout: 5_000});

    await expect(app.page.getByText('应用', {exact: true})).toBeVisible();
    await expect(app.page.getByText('Electron', {exact: true})).toBeVisible();
    await expect(app.page.getByText('Chrome', {exact: true})).toBeVisible();
    await expect(app.page.getByText('Node.js')).toBeVisible();
  });

  test('about dialog displays update status', async ({app}) => {
    await app.dismissModals();

    await app.openAboutDialog();

    await expect(app.page.getByText('更新状态')).toBeVisible({timeout: 5_000});
    await expect(app.page.getByText('状态', {exact: true})).toBeVisible();
  });

  test('about dialog has a close button that works', async ({app}) => {
    await app.dismissModals();

    await app.openAboutDialog();

    // Verify dialog is open
    await expect(app.page.getByText('版本信息')).toBeVisible({timeout: 5_000});

    // Click the Close button
    const closeBtn = app.page.locator('button:has-text("关闭")').last();
    await closeBtn.click();
    await app.page.waitForTimeout(500);

    // The Versions text should no longer be visible
    await expect(app.page.getByText('版本信息')).not.toBeVisible({timeout: 5_000});
  });
});
