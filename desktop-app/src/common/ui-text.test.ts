import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import {describe, expect, it} from 'vitest';
import {SHORTCUT_CHANNEL} from './shortcuts';
import {SIMULATIONS} from '../renderer/components/VisionSimulationDropDown';
import {
  permissionLabel,
  shortcutLabels,
  simulationLabels,
  suiteDisplayName,
  updateStatusLabel,
} from './ui-text';

const chinese = /[\u3400-\u9fff]/;
const brandOrUnit = /^(Responsively\s?App|Electron|Chrome|Node\.js|V8|MCP|v|x)$/;
const visibleKeys = new Set([
  'title',
  'label',
  'aria-label',
  'ariaLabel',
  'placeholder',
  'alt',
  'description',
  'displayName',
  'header',
  'body',
  'text',
  'triggerTitle',
  'confirmText',
]);

function filesUnder(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const name = path.join(dir, entry.name);
    return entry.isDirectory()
      ? filesUnder(name)
      : /\.tsx?$/.test(name) && !/\.test\.|\.d\.ts$/.test(name)
        ? [name]
        : [];
  });
}

/** AST, not line-based regex: JSX text may span arbitrary lines. */
function untranslatedUiText(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    let text: string | undefined;
    if (ts.isJsxText(node)) text = node.text;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      if (ts.isJsxAttribute(parent) && visibleKeys.has(parent.name.getText(source)))
        text = node.text;
      if (
        ts.isPropertyAssignment(parent) &&
        parent.initializer === node &&
        visibleKeys.has(parent.name.getText(source))
      )
        text = node.text;
    }
    const normalized = text?.replace(/\s+/g, ' ').trim();
    if (
      normalized &&
      /[A-Za-z]/.test(normalized) &&
      !chinese.test(normalized) &&
      !brandOrUnit.test(normalized)
    ) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      found.push(`${path.relative(process.cwd(), file)}:${line}: ${normalized}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('Simplified Chinese interface coverage', () => {
  it('has no untranslated JSX text or UI attributes, including multiline nodes', () => {
    const roots = ['src/renderer', 'src/main/menu', 'src/main/webview-context-menu'];
    expect(
      roots.flatMap((dir) => filesUnder(path.resolve(dir))).flatMap(untranslatedUiText)
    ).toEqual([]);
  });

  it('translates every shortcut without changing keyboard channel IDs', () => {
    for (const key of Object.values(SHORTCUT_CHANNEL)) expect(shortcutLabels[key]).toMatch(chinese);
    expect(SHORTCUT_CHANNEL.ROTATE_ALL).toBe('ROTATE_ALL');
  });

  it('translates every simulation while preserving its CSS/filter identifier', () => {
    for (const key of Object.values(SIMULATIONS)) expect(simulationLabels[key]).toMatch(chinese);
    expect(SIMULATIONS.DEUTERANOPIA).toBe('deuteranopia');
  });

  it('formats all updater states without leaking internal English state codes', () => {
    for (const status of [
      'IDLE',
      'CHECKING',
      'AVAILABLE',
      'UP_TO_DATE',
      'ERROR',
      'DOWNLOADED (Restart to apply update)',
      'DOWNLOADING - 42.5%',
    ]) {
      expect(updateStatusLabel(status)).toMatch(chinese);
    }
    expect(updateStatusLabel('DOWNLOADING - 42.5%')).toBe('正在下载：42.5%');
    expect(updateStatusLabel()).toBe('尚未检查');
  });

  it('translates permission prompts independently of the wire protocol', () => {
    expect(permissionLabel('geolocation')).toBe('位置');
    expect(permissionLabel('media')).toBe('摄像头与麦克风');
    expect(permissionLabel('unknown')).toBe('其他权限（unknown）');
  });

  it('translates the old built-in suite without renaming user content', () => {
    expect(suiteDisplayName({id: 'default', name: 'Default'})).toBe('默认');
    expect(suiteDisplayName({id: 'custom', name: 'Default'})).toBe('Default');
    expect(suiteDisplayName({id: 'default', name: 'My devices'})).toBe('My devices');
  });

  it('keeps HTTP header identifiers and locales separate from labels', () => {
    const network = fs.readFileSync(path.resolve('src/main/web-permissions/index.ts'), 'utf8');
    expect(network).toContain("['Accept-Language']");
    const settings = fs.readFileSync(
      path.resolve(
        'src/renderer/components/ToolBar/Menu/Flyout/Settings/SettingsContentHeaders.tsx'
      ),
      'utf8'
    );
    expect(settings).toContain('首选语言');
    expect(fs.readFileSync(path.resolve('src/renderer/index.ejs'), 'utf8')).toContain(
      'lang="zh-CN"'
    );
    const config = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
    expect(config.build.nsis.installerLanguages).toEqual(['zh_CN']);
    expect(config.build.nsis.language).toBe('2052');
  });
});
