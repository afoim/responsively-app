import {test, expect} from '../fixtures/electron-app';
import type {Page} from '@playwright/test';

const oldLabels =
  /\b(Location|Accept-Language|When a page opens a new window|Rotate|Inspect|Capture|Simulate|Bookmarks|Request Headers|Device Manager|New custom device|General Shortcuts|Previewer Shorcuts)\b/;

async function assertChineseShell(page: Page) {
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(oldLabels);
  // The guest website is intentionally not translated; this inspects only the app shell.
  const attributes = await page
    .locator('[title], [aria-label], [placeholder]')
    .evaluateAll((elements) =>
      elements
        .filter((el) => el.getClientRects().length > 0)
        .flatMap((el) =>
          ['title', 'aria-label', 'placeholder'].map((attr) => el.getAttribute(attr) ?? '')
        )
        .join('\n')
    );
  expect(attributes).not.toMatch(oldLabels);
}

test.describe('Simplified Chinese desktop interface', () => {
  test.beforeAll(async ({app, testServerUrl}) => {
    await app.dismissModals();
    await app.navigateTo(`${testServerUrl}/test-page.html`);
  });

  test.beforeEach(async ({app}) => {
    await app.page.keyboard.press('Escape');
    const closeManager = app.deviceManagerSheet.getByTitle('关闭');
    if (await closeManager.isVisible()) await closeManager.click();
    await app.addressBar.click();
  });

  test('shell, status, old default suite and native menus are Chinese', async ({app}) => {
    await expect(app.page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    for (const name of ['旋转', '检查', '截图', '模拟']) {
      await expect(app.page.getByRole('button', {name, exact: true})).toBeVisible();
    }
    await expect(app.page.getByTestId('status-text')).toContainText('台设备');
    await expect(app.page.getByTestId('suite-chip-default')).toContainText('默认');
    const menus = await app.electronApp.evaluate(({Menu, app}) => {
      const walk = (menu: Electron.Menu): string[] =>
        menu.items.flatMap((item) => [item.label, ...(item.submenu ? walk(item.submenu) : [])]);
      return {locale: app.getLocale(), labels: walk(Menu.getApplicationMenu()!)};
    });
    expect(menus.locale).toMatch(/^zh/);
    expect(menus.labels).toContain('帮助');
    expect(menus.labels).toContain('关于');
    expect(menus.labels.join('\n')).not.toMatch(/\b(Help|File|View|Close|Reload|About)\b/);
    await assertChineseShell(app.page);
  });

  test('settings include screenshot location, preferred language, popups and validation', async ({
    app,
  }, info) => {
    await app.openSettings();
    const dialog = app.page.getByRole('dialog');
    for (const text of ['保存位置', '首选语言', '请求头']) {
      await expect(dialog.getByText(text, {exact: true})).toBeVisible();
    }
    await expect(
      dialog.getByRole('combobox', {name: '当页面打开新窗口时', exact: true})
    ).toBeVisible();
    await expect(dialog.getByTestId('settings-popup_behavior-select')).toContainText(
      '打开独立浏览器窗口（推荐）'
    );
    const location = dialog.getByTestId('settings-screenshot_location-input');
    const original = await location.inputValue();
    await location.fill('');
    await dialog.getByTestId('settings-save-button').click();
    await expect(dialog.getByRole('alert')).toHaveText('请输入有效的保存位置。');
    await assertChineseShell(app.page);
    await app.page.screenshot({path: info.outputPath('settings-zh.png')});
    await location.fill(original);
    await dialog.getByTestId('settings-save-button').click();
  });

  test('bookmark menu, empty state and bookmark editor are Chinese', async ({app}, info) => {
    await app.openMenuFlyout();
    await app.page.getByRole('button', {name: '书签', exact: true}).hover();
    await expect(app.page.getByText('暂无书签', {exact: true})).toBeVisible();
    await assertChineseShell(app.page);
    await app.addressBar.click();
    await app.page.getByTitle('添加书签', {exact: true}).click();
    await expect(app.page.getByLabel('书签名称')).toBeVisible();
    await expect(app.page.getByLabel('网址', {exact: true})).toBeVisible();
    await app.page.getByLabel('书签名称').fill('汉化验收书签');
    await app.page.screenshot({path: info.outputPath('bookmark-zh.png')});
    await app.page.getByRole('button', {name: '保存', exact: true}).click();
    await app.openMenuFlyout();
    await app.page.getByRole('button', {name: '书签', exact: true}).hover();
    await expect(app.page.getByText('汉化验收书签', {exact: true})).toBeVisible();
  });

  test('device manager, form, duplicate error and user device names', async ({app}, info) => {
    await app.openDeviceManager();
    for (const name of ['全部', '手机', '平板', '笔记本', '自定义']) {
      await expect(app.deviceManagerSheet.getByRole('button', {name, exact: true})).toBeVisible();
    }
    await app.page.getByTestId('add-custom-device').click();
    const form = app.page.getByTestId('device-form');
    for (const label of ['设备名称', '设备宽度', '设备高度', '用户代理字符串']) {
      await expect(form.getByLabel(label, {exact: true})).toBeVisible();
    }
    await expect(form.getByText('预览', {exact: true})).toBeVisible();
    const firstName = await app.deviceManagerSheet
      .locator('[data-device-name]')
      .first()
      .getAttribute('data-device-name');
    await form.getByLabel('设备名称').fill(firstName!);
    await form.getByRole('button', {name: '添加', exact: true}).click();
    await expect(form.getByRole('alert')).toContainText('已存在同名设备');
    await form.getByLabel('设备名称').fill('My custom device');
    await assertChineseShell(app.page);
    await app.page.screenshot({path: info.outputPath('device-manager-zh.png')});
    await form.getByRole('button', {name: '添加', exact: true}).click();
    await expect(
      app.deviceManagerSheet.locator('[data-device-name="My custom device"]')
    ).toBeVisible();
    await app.closeDeviceManager();
  });

  test('device suite import, JSON errors and reset confirmation are Chinese', async ({app}) => {
    await app.openDeviceManager();
    await app.page.getByTestId('download-btn').click();
    await expect(app.page.getByRole('dialog')).toContainText('导入设备');
    await app.page
      .getByRole('dialog')
      .getByTestId('fileUploader')
      .setInputFiles({
        name: 'invalid.json',
        mimeType: 'application/json',
        buffer: Buffer.from('not valid JSON'),
      });
    await expect(app.page.getByText('发生错误，请重试。', {exact: true})).toBeVisible();
    await assertChineseShell(app.page);
    await app.page.keyboard.press('Escape');
    await app.ensureDeviceManagerOpen();
    await app.page.getByTestId('reset-btn').click();
    await expect(app.page.getByRole('dialog')).toContainText('确定要重置全部设置吗？');
    await app.page.getByRole('dialog').getByRole('button', {name: '取消', exact: true}).click();
    await app.closeDeviceManager();
  });

  test('all vision simulations have Chinese labels and still use original identifiers', async ({
    app,
  }, info) => {
    const trigger = app.page.getByTestId('color-blindness-controls').getByTitle('模拟视觉');
    await trigger.click();
    await expect(app.page.locator('[data-simulation]')).toHaveCount(14);
    for (const text of [
      '正常视觉',
      '红绿色觉障碍',
      '蓝黄色觉障碍',
      '绿色盲',
      '青光眼',
      '强光环境',
    ]) {
      await expect(app.page.getByText(text, {exact: true})).toBeVisible();
    }
    await assertChineseShell(app.page);
    await app.page.screenshot({path: info.outputPath('simulate-zh.png')});
    await app.page.locator('[data-simulation="deuteranopia"]').click();
    await expect(app.page.getByText('绿色盲', {exact: true}).first()).toBeVisible();
    await trigger.click();
    await expect(app.page.locator('[data-simulation="deuteranopia"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await app.page.locator('[data-simulation="none"]').click();
  });

  test('device tooltips and design overlay controls are Chinese', async ({app}, info) => {
    await app.revealDevicePill();
    await app.page.getByTitle('更多设备工具', {exact: true}).first().click();
    for (const text of ['整页截图', '设计稿叠加', '事件同步']) {
      await expect(app.page.getByTitle(text, {exact: true}).first()).toBeVisible();
    }
    await app.page.getByTitle('设计稿叠加', {exact: true}).first().click();
    await expect(app.page.getByRole('group', {name: '叠加模式'})).toBeVisible();
    await expect(app.page.getByRole('button', {name: '设计图', exact: true})).toBeVisible();
    await assertChineseShell(app.page);
    await app.page.screenshot({path: info.outputPath('device-tools-zh.png')});
    await app.page.getByTitle('设计稿叠加', {exact: true}).first().click();
  });

  test('shortcut names are display translations, not transformed enum codes', async ({
    app,
  }, info) => {
    await app.openMenuFlyout();
    await app.page.getByRole('button', {name: '键盘快捷键', exact: true}).click();
    const dialog = app.page.getByRole('dialog');
    await expect(dialog.getByText('通用快捷键', {exact: true})).toBeVisible();
    await expect(dialog.getByText('预览快捷键', {exact: true})).toBeVisible();
    await dialog.getByText('预览快捷键', {exact: true}).click();
    await expect(dialog.getByText('旋转全部设备', {exact: true})).toBeVisible();
    await assertChineseShell(app.page);
    await app.page.screenshot({path: info.outputPath('shortcuts-zh.png')});
    await dialog.getByRole('button', {name: '关闭', exact: true}).click();
  });

  test('MCP status and buttons are Chinese without touching user tool configs', async ({
    app,
  }, info) => {
    await app.page.getByTitle('MCP 服务：连接 AI 工具', {exact: true}).click();
    const panel = app.page.getByTestId('mcp-panel');
    await expect(panel.getByTestId('mcp-status')).toHaveText('运行中');
    await panel.getByRole('button', {name: 'MCP 服务', exact: true}).click();
    await expect(panel.getByTestId('mcp-status')).toHaveText('已关闭');
    await panel.getByRole('button', {name: 'MCP 服务', exact: true}).click();
    await expect(panel.getByRole('button', {name: 'MCP 服务', exact: true})).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(panel.getByTestId('mcp-status')).toHaveText(/^(运行中|已停止)$/);
    await assertChineseShell(app.page);
    await app.page.screenshot({path: info.outputPath('mcp-zh.png')});
  });

  test('site permission controls and changed-state notice are Chinese', async ({app}, info) => {
    await app.page.getByTitle('站点工具', {exact: true}).click();
    await app.page.getByRole('button', {name: '站点权限', exact: true}).click();
    await expect(app.page.getByText('此站点的权限', {exact: true})).toBeVisible();
    await expect(app.page.getByText('摄像头', {exact: true})).toBeVisible();
    await expect(app.page.getByText('位置', {exact: true})).toBeVisible();
    await app.page.getByRole('button', {name: '询问', exact: true}).first().click();
    await expect(
      app.page.getByText('权限已更新，请刷新页面以应用更改。', {exact: true})
    ).toBeVisible();
    await assertChineseShell(app.page);
    await app.page.screenshot({path: info.outputPath('permissions-zh.png')});
  });

  test('notification release highlights and about dialog are Chinese', async ({app}, info) => {
    await app.page.getByTitle('通知', {exact: true}).click();
    await expect(app.page.getByText('MCP 集成', {exact: true})).toBeVisible();
    await expect(app.page.getByText('画布模式', {exact: true})).toBeVisible();
    await assertChineseShell(app.page);
    await app.page.screenshot({path: info.outputPath('notifications-zh.png')});
    await app.addressBar.click();
    await app.openAboutDialog();
    await expect(app.page.getByRole('dialog')).toContainText('版本信息');
    await expect(app.page.getByText('尚未检查', {exact: true})).toBeVisible();
    await assertChineseShell(app.page);
    await app.page.screenshot({path: info.outputPath('about-zh.png')});
    await app.page.getByRole('dialog').getByRole('button', {name: '关闭', exact: true}).click();
  });

  test('canvas settings and presentation controls are Chinese', async ({app}, info) => {
    await app.page.getByTitle('画布布局', {exact: true}).click();
    await app.page.getByTitle('视图选项', {exact: true}).click();
    for (const text of ['画布显示内容', '设备边框', '设备名称', '分辨率']) {
      await expect(app.page.getByText(text, {exact: true})).toBeVisible();
    }
    await assertChineseShell(app.page);
    await app.page.screenshot({path: info.outputPath('canvas-zh.png')});
    await app.page.keyboard.press('Escape');
    await app.page.getByTestId('present-button').click();
    await app.page.mouse.move(750, 100);
    await expect(app.page.getByText('退出演示', {exact: true})).toBeVisible();
    await app.page.keyboard.press('Escape');
    await app.page.getByTitle('网格布局', {exact: true}).click();
  });
});
