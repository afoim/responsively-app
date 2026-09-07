import {test, expect} from '../fixtures/electron-app';

test.describe('Custom Device Creation', () => {
  // Serial on purpose: these tests all mutate the same persisted
  // `deviceManager.customDevices` list. Run in parallel they interleave —
  // one test's stale snapshot writes back a device another just deleted.

  test('empty state shows "No custom devices" message and add button', async ({app}) => {
    await app.dismissModals();
    await app.openDeviceManager();

    const customSection = app.deviceManagerSheet;
    // The empty state belongs to the Custom filter in the new grid.
    await customSection.getByRole('button', {name: '自定义', exact: true}).click();
    await expect(customSection.getByText('还没有添加自定义设备！')).toBeVisible();
    await expect(app.page.locator('[data-testid="add-custom-device"]')).toBeVisible();

    await app.closeDeviceManager();
  });

  test('add custom device form opens with correct defaults', async ({app}) => {
    await app.dismissModals();
    await app.openDeviceManager();

    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);

    // Modal title
    await expect(app.page.getByTestId('device-form')).toBeVisible();
    await expect(app.page.getByText('新建自定义设备')).toBeVisible();

    // Default values
    const nameInput = app.page.getByLabel('设备名称');
    await expect(nameInput).toHaveValue('');

    const widthInput = app.page.getByLabel('设备宽度');
    await expect(widthInput).toHaveValue('400');

    const heightInput = app.page.getByLabel('设备高度');
    await expect(heightInput).toHaveValue('600');

    await expect(app.page.getByLabel('设备像素比 1 倍')).toHaveAttribute('aria-pressed', 'true');

    // Default type is phone
    await expect(app.page.getByLabel('设备类型：手机')).toHaveAttribute('aria-pressed', 'true');

    // Touch and mobile default checked for phone
    await expect(app.page.getByLabel('支持触摸')).toHaveAttribute('aria-pressed', 'true');
    await expect(app.page.getByLabel('移动设备（可旋转）')).toHaveAttribute('aria-pressed', 'true');

    // Buttons: Cancel and Add
    await expect(app.page.getByRole('button', {name: '取消'})).toBeVisible();
    await expect(app.page.getByRole('button', {name: '添加', exact: true})).toBeVisible();

    // No Delete button for new device
    await expect(app.page.getByRole('button', {name: '删除', exact: true})).not.toBeVisible();

    await app.page.getByRole('button', {name: '取消'}).click();
    await app.page.waitForTimeout(300);
    await app.closeDeviceManager();
  });

  test('add a custom device and verify it appears in the list', async ({app}) => {
    await app.dismissModals();
    await app.openDeviceManager();

    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);

    // Fill in the form
    await app.page.getByLabel('设备名称').fill('My Test Device');
    await app.page.getByLabel('设备宽度').fill('1024');
    await app.page.getByLabel('设备高度').fill('768');
    await app.page.getByLabel('设备像素比 2 倍').click();

    // Click Add
    await app.page.getByRole('button', {name: '添加', exact: true}).click();
    await app.page.waitForTimeout(500);

    // The custom device should now appear in the CUSTOM DEVICES section
    const customSection = app.deviceManagerSheet;
    await expect(customSection.getByText('My Test Device')).toBeVisible();
    await expect(customSection.getByText('1024 × 768')).toBeVisible();

    // Empty state message should be gone
    await expect(customSection.getByText('还没有添加自定义设备！')).not.toBeVisible();

    await app.closeDeviceManager();
  });

  test('custom device renders as webview with correct dimensions after closing device manager', async ({
    app,
  }) => {
    await app.dismissModals();
    await app.openDeviceManager();

    // Add a custom device with known dimensions
    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);
    await app.page.getByLabel('设备名称').fill('Dimension Test Device');
    await app.page.getByLabel('设备宽度').fill('500');
    await app.page.getByLabel('设备高度').fill('700');
    await app.page.getByRole('button', {name: '添加', exact: true}).click();
    await app.page.waitForTimeout(500);

    // Close device manager to return to browser view
    await app.closeDeviceManager();

    // The new device should appear as a webview — find it by checking all webviews
    // The webview width attribute should match the device width
    const webviews = app.page.locator('webview');
    const count = await webviews.count();
    expect(count).toBeGreaterThan(0);

    // Look for the webview with our custom dimensions
    let found = false;
    for (let i = 0; i < count; i++) {
      const wv = webviews.nth(i);
      const style = await wv.getAttribute('style');
      if (style?.includes('width: 500px') && style?.includes('height: 700px')) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test('edit custom device changes its dimensions', async ({app}) => {
    await app.dismissModals();
    await app.openDeviceManager();

    // First add a device
    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);
    await app.page.getByLabel('设备名称').fill('Edit Me Device');
    await app.page.getByLabel('设备宽度').fill('800');
    await app.page.getByLabel('设备高度').fill('600');
    await app.page.getByRole('button', {name: '添加', exact: true}).click();
    await app.page.waitForTimeout(500);

    // Verify it exists
    const customSection = app.deviceManagerSheet;
    await expect(customSection.getByText('Edit Me Device')).toBeVisible();
    await expect(customSection.getByText('800 × 600')).toBeVisible();

    // Click the edit button (pencil icon) on the custom device label
    // DeviceLabel uses w-fit class, distinguishing it from parent containers
    const deviceCard = customSection.locator(
      '[data-device-name="Edit Me Device"] button[title="编辑设备"]'
    );
    await deviceCard.click();
    await app.page.waitForTimeout(500);

    // Modal title should say "Device Details" for editing
    await expect(app.page.getByText('编辑自定义设备')).toBeVisible();

    // Buttons should show "Save" instead of "Add", and "Delete" should be visible
    await expect(app.page.getByRole('button', {name: '保存'})).toBeVisible();
    await expect(app.page.getByRole('button', {name: '删除', exact: true})).toBeVisible();

    // Change dimensions
    await app.page.getByLabel('设备宽度').fill('1200');
    await app.page.getByLabel('设备高度').fill('900');

    // Save
    await app.page.getByRole('button', {name: '保存'}).click();
    await app.page.waitForTimeout(500);

    // Verify the updated dimensions
    await expect(customSection.getByText('1200 × 900')).toBeVisible();
    await expect(customSection.getByText('800 × 600')).not.toBeVisible();

    await app.closeDeviceManager();
  });

  test('delete custom device removes it from the list', async ({app}) => {
    await app.dismissModals();
    await app.openDeviceManager();

    // Add a device
    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);
    await app.page.getByLabel('设备名称').fill('Delete Me Device');
    await app.page.getByLabel('设备宽度').fill('640');
    await app.page.getByLabel('设备高度').fill('480');
    await app.page.getByRole('button', {name: '添加', exact: true}).click();
    await app.page.waitForTimeout(500);

    const customSection = app.deviceManagerSheet;
    await expect(customSection.getByText('Delete Me Device')).toBeVisible();

    // Open edit modal for the device
    const deviceCard = customSection.locator(
      '[data-device-name="Delete Me Device"] button[title="编辑设备"]'
    );
    await deviceCard.click();
    await app.page.waitForTimeout(500);

    // Click Delete
    await app.page.getByRole('button', {name: '删除', exact: true}).click();
    await app.page.waitForTimeout(500);

    // Device should be removed. Only assert on the device this test created —
    // sibling tests run in parallel and may share this app instance, so the
    // list is not necessarily empty afterwards.
    await expect(customSection.getByText('Delete Me Device')).not.toBeVisible();

    await app.closeDeviceManager();
  });

  test('duplicate name validation shows inline error', async ({app}) => {
    await app.dismissModals();
    await app.openDeviceManager();

    // Add a device
    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);
    await app.page.getByLabel('设备名称').fill('Unique Device');
    await app.page.getByRole('button', {name: '添加', exact: true}).click();
    await app.page.waitForTimeout(500);

    // Try to add another device with the same name
    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);
    await app.page.getByLabel('设备名称').fill('Unique Device');

    await app.page.getByRole('button', {name: '添加', exact: true}).click();

    // Validation renders inline next to the field instead of a blocking alert
    await expect(app.page.getByRole('alert')).toContainText('已存在同名设备');

    // Typing again clears the error
    await app.page.getByLabel('设备名称').fill('Unique Device 2');
    await expect(app.page.getByRole('alert')).toHaveCount(0);

    // Cancel out of the modal
    await app.page.getByRole('button', {name: '取消'}).click();
    await app.page.waitForTimeout(300);
    await app.closeDeviceManager();
  });

  test('changing device type to Desktop auto-populates desktop user agent and unchecks touch/mobile', async ({
    app,
  }) => {
    await app.dismissModals();
    await app.openDeviceManager();

    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);

    // Default type is phone — touch and mobile should be checked
    await expect(app.page.getByLabel('支持触摸')).toHaveAttribute('aria-pressed', 'true');
    await expect(app.page.getByLabel('移动设备（可旋转）')).toHaveAttribute('aria-pressed', 'true');

    // The phone UA should be set
    const uaInput = app.page.getByLabel('用户代理字符串');
    const initialUA = await uaInput.inputValue();
    expect(initialUA).toContain('iPhone');

    // Change to Desktop (notebook)
    await app.page.getByLabel('设备类型：笔记本').click();
    await app.page.waitForTimeout(300);

    // UA should switch to desktop
    const newUA = await uaInput.inputValue();
    expect(newUA).toContain('Macintosh');
    expect(newUA).not.toContain('iPhone');

    // Touch and mobile should be unchecked
    await expect(app.page.getByLabel('支持触摸')).toHaveAttribute('aria-pressed', 'false');
    await expect(app.page.getByLabel('移动设备（可旋转）')).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    await app.page.getByRole('button', {name: '取消'}).click();
    await app.page.waitForTimeout(300);
    await app.closeDeviceManager();
  });

  test('changing device type from Desktop to Phone re-enables touch/mobile and sets phone UA', async ({
    app,
  }) => {
    await app.dismissModals();
    await app.openDeviceManager();

    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);

    // Switch to Desktop first
    await app.page.getByLabel('设备类型：笔记本').click();
    await app.page.waitForTimeout(300);
    await expect(app.page.getByLabel('支持触摸')).toHaveAttribute('aria-pressed', 'false');

    // Switch back to Phone
    await app.page.getByLabel('设备类型：手机').click();
    await app.page.waitForTimeout(300);

    const uaInput = app.page.getByLabel('用户代理字符串');
    const ua = await uaInput.inputValue();
    expect(ua).toContain('iPhone');

    await expect(app.page.getByLabel('支持触摸')).toHaveAttribute('aria-pressed', 'true');
    await expect(app.page.getByLabel('移动设备（可旋转）')).toHaveAttribute('aria-pressed', 'true');

    await app.page.getByRole('button', {name: '取消'}).click();
    await app.page.waitForTimeout(300);
    await app.closeDeviceManager();
  });

  test('custom device is added to the active suite and renders webview', async ({app}) => {
    await app.dismissModals();
    await app.openDeviceManager();

    // Count current webviews before adding
    const initialWebviewCount = await app.page.locator('webview').count();

    // Add a custom device
    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);
    await app.page.getByLabel('设备名称').fill('Suite Test Device');
    await app.page.getByLabel('设备宽度').fill('375');
    await app.page.getByLabel('设备高度').fill('812');
    await app.page.getByRole('button', {name: '添加', exact: true}).click();
    await app.page.waitForTimeout(500);

    // The checkbox should be checked (auto-added to active suite)
    const customSection = app.deviceManagerSheet;
    const card = customSection.locator(
      '[data-device-name="Suite Test Device"] [data-testid^="device-card-"]'
    );
    await expect(card).toHaveAttribute('aria-pressed', 'true');

    // Close device manager and verify the webview count increased
    await app.closeDeviceManager();
    // Wait for webviews to render after view transition
    await app.page.waitForTimeout(1000);

    const newWebviewCount = await app.page.locator('webview').count();
    expect(newWebviewCount).toBeGreaterThan(initialWebviewCount);
  });

  test('unchecking custom device removes it from active suite webviews', async ({app}) => {
    await app.dismissModals();

    // Capture initial webview count before any changes
    const initialCount = await app.page.locator('webview').count();

    await app.openDeviceManager();

    // Add a custom device (auto-checked into suite)
    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);
    await app.page.getByLabel('设备名称').fill('Uncheck Device');
    await app.page.getByLabel('设备宽度').fill('320');
    await app.page.getByLabel('设备高度').fill('568');
    await app.page.getByRole('button', {name: '添加', exact: true}).click();
    await app.page.waitForTimeout(500);

    // Immediately uncheck it while still in device manager
    const customSection = app.deviceManagerSheet;
    const card = customSection.locator(
      '[data-device-name="Uncheck Device"] [data-testid^="device-card-"]'
    );
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await card.click();
    await app.page.waitForTimeout(300);

    // Close device manager — webview count should match original (device was unchecked)
    await app.closeDeviceManager();
    await app.page.waitForTimeout(1000);
    const finalCount = await app.page.locator('webview').count();
    expect(finalCount).toBe(initialCount);
  });

  test('search filters custom devices', async ({app}) => {
    await app.dismissModals();
    await app.openDeviceManager();

    // Add two custom devices
    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);
    await app.page.getByLabel('设备名称').fill('Alpha Phone');
    await app.page.getByRole('button', {name: '添加', exact: true}).click();
    await app.page.waitForTimeout(500);

    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);
    await app.page.getByLabel('设备名称').fill('Beta Tablet');
    await app.page.getByRole('button', {name: '添加', exact: true}).click();
    await app.page.waitForTimeout(500);

    const customSection = app.deviceManagerSheet;
    await expect(customSection.getByText('Alpha Phone')).toBeVisible();
    await expect(customSection.getByText('Beta Tablet')).toBeVisible();

    // Search for "Alpha"
    const searchInput = app.page.locator('input[placeholder="搜索设备…"]');
    await searchInput.fill('Alpha');
    await app.page.waitForTimeout(300);

    await expect(customSection.getByText('Alpha Phone')).toBeVisible();
    await expect(customSection.getByText('Beta Tablet')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');
    await app.page.waitForTimeout(300);

    await expect(customSection.getByText('Alpha Phone')).toBeVisible();
    await expect(customSection.getByText('Beta Tablet')).toBeVisible();

    await app.closeDeviceManager();
  });

  test('cancel button closes modal without saving', async ({app}) => {
    await app.dismissModals();
    await app.openDeviceManager();

    await app.page.locator('[data-testid="add-custom-device"]').click();
    await app.page.waitForTimeout(500);

    await app.page.getByLabel('设备名称').fill('Should Not Save');
    await app.page.getByRole('button', {name: '取消'}).click();
    // Wait for modal close animation (200ms leave transition)
    await expect(app.page.getByLabel('设备名称')).not.toBeVisible();

    const customSection = app.deviceManagerSheet;
    await expect(customSection.getByText('Should Not Save')).not.toBeVisible();

    await app.closeDeviceManager();
  });
});
