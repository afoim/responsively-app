# 简体中文界面维护

本分支将应用界面设为简体中文。网页内容、用户创建的书签/设备/套件名称、产品型号、协议名称和开发者诊断代码不做字符串替换。

## 漏译入口

上一版按引号或单行 JSX 替换，遗漏了多行 JSX 文本和运行时生成的文案。此次使用 TypeScript AST 检查文本节点、属性及菜单配置，并补齐动态展示层。

| 原文                           | 实际来源                                        | 中文界面           |
| ------------------------------ | ----------------------------------------------- | ------------------ |
| Location                       | `SettingsContent.tsx` 多行 JSX                  | 保存位置           |
| Accept-Language                | `SettingsContentHeaders.tsx`                    | 首选语言           |
| When a page opens a new window | `SettingsContent.tsx`                           | 当页面打开新窗口时 |
| Device / devices               | `StatusBar`、`SuitesColumn`、设备表单与工具提示 | 设备、台设备       |
| Rotate / Inspect / Capture     | `ToolBar/index.tsx` 多行 JSX                    | 旋转 / 检查 / 截图 |
| Simulate                       | `VisionSimulationDropDown` 条件表达式           | 模拟               |
| Bookmarks                      | `Menu/Flyout/Bookmark` 多行 JSX                 | 书签               |

`src/common/ui-text.ts` 提供快捷键、视觉模拟、权限、更新状态与旧默认套件的展示映射。禁止翻译 `SHORTCUT_CHANNEL`、模拟滤镜 ID、拖放类型、存储键或 HTTP 请求头键。旧的内置 Default 套件仅翻译显示名称，不改写用户数据。

界面 HTML 的 `lang` 为 `zh-CN`，Chromium 使用简体中文 locale，Windows NSIS 安装器使用 `zh_CN` / LCID `2052`。关于页的相对时间采用中文。英文错误代码可用于排查第三方或系统故障，不应被当成 UI 文案批量替换。

## 验证

- `src/common/ui-text.test.ts`：AST 漏译守卫及动态映射/协议分离测试。
- `src/renderer/components/Input/Input.test.tsx`：中文标签与指定输入框 ID 的关联。
- `e2e/tests/zh-cn-interface.spec.ts`：实际 Electron 界面，覆盖工具栏、设置/校验、书签、设备/导入、视觉模拟、快捷键、MCP、权限、通知、关于和画布。截图输出到测试报告目录。
- 既有 browser-semantics、cross-device-mirroring、popup-policy 用例保护导航与点击修复。

```powershell
yarn typecheck
yarn lint
yarn test --run
$env:E2E_HEADLESS='true'
yarn playwright test --config=e2e/playwright.config.ts zh-cn-interface.spec.ts browser-semantics.spec.ts cross-device-mirroring.spec.ts popup-policy.spec.ts --workers=1 --reporter=line
```

验收安装包内程序时先设置 `E2E_EXECUTABLE` 指向 `release/build/win-unpacked/ResponsivelyApp.exe`，测试会使用独立的临时用户配置，不能覆盖正在使用的个人配置。

导航按钮的快捷键通道和测试 ID 必须显式指定，不能再通过英文标签大小写转换或查表生成。`NavigationControls.test.tsx` 覆盖中文标签下的后退、前进、刷新绑定及稳定 ID。
