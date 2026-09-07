import type {ShortcutChannel} from './shortcuts';

/** Display text only. Never translate wire values, shortcut codes or stored IDs. */
export const shortcutLabels: Record<ShortcutChannel, string> = {
  BACK: '后退',
  BOOKMARK: '添加或移除书签',
  DELETE_ALL: '清除全部站点数据',
  DELETE_CACHE: '清除缓存',
  DELETE_COOKIES: '清除 Cookie',
  DELETE_STORAGE: '清除存储',
  EDIT_URL: '编辑网址',
  FORWARD: '前进',
  INSPECT_ELEMENTS: '检查元素',
  PREVIEW_LAYOUT: '切换预览布局',
  RELOAD: '刷新页面',
  ROTATE_ALL: '旋转全部设备',
  SCREENSHOT_ALL: '截取全部设备',
  THEME: '切换界面主题',
  TOGGLE_RULERS: '切换标尺',
  ZOOM_IN: '放大',
  ZOOM_OUT: '缩小',
};

export const simulationLabels: Record<string, string> = {
  deuteranopia: '绿色盲',
  deuteranomaly: '绿色弱',
  protanopia: '红色盲',
  protanomaly: '红色弱',
  tritanopia: '蓝色盲',
  tritanomaly: '蓝色弱',
  achromatomaly: '全色弱',
  achromatopsia: '全色盲',
  cataract: '白内障',
  farsightedness: '远视',
  glaucoma: '青光眼',
  solarize: '强光环境',
  'color-contrast-loss': '色彩对比度下降',
};

export const permissionLabels: Record<string, string> = {
  camera: '摄像头',
  microphone: '麦克风',
  media: '摄像头与麦克风',
  geolocation: '位置',
  notifications: '通知',
  'clipboard-read': '读取剪贴板',
  'clipboard-sanitized-write': '写入剪贴板',
  fullscreen: '全屏',
  midi: 'MIDI 设备',
  midiSysex: 'MIDI 系统消息',
  pointerLock: '指针锁定',
  'display-capture': '屏幕捕获',
  'idle-detection': '空闲检测',
  'window-management': '窗口管理',
  'speaker-selection': '扬声器选择',
};

export function permissionLabel(permission: string): string {
  return permissionLabels[permission] ?? `其他权限（${permission}）`;
}

export function updateStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    IDLE: '尚未检查',
    CHECKING: '正在检查更新',
    AVAILABLE: '发现新版本',
    UP_TO_DATE: '已是最新版本',
    ERROR: '更新失败',
    'DOWNLOADED (Restart to apply update)': '下载完成，重启后更新',
  };
  const progress = status?.match(/^DOWNLOADING - (\d+(?:\.\d+)?)%$/);
  if (progress) return `正在下载：${progress[1]}%`;
  return labels[status ?? 'IDLE'] ?? '更新状态未知';
}

/** Old built-in suite labels are translated for display; user-authored names are kept. */
export function suiteDisplayName(suite: {id: string; name: string}): string {
  return suite.id === 'default' && suite.name === 'Default' ? '默认' : suite.name;
}
