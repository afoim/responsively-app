import {describe, expect, it} from 'vitest';
import {decidePopupAction} from './popup-policy';

describe('browser popup policy', () => {
  it.each(['https://example.com/page', 'http://localhost:4321/create/'])(
    'opens %s in a native child window, never in the previews',
    (url) => {
      expect(decidePopupAction(url)).toEqual({kind: 'browser-window', url});
    }
  );
  it('treats the retired in-preview preference as native window behavior', () => {
    expect(decidePopupAction('https://example.com', 'in-preview').kind).toBe('browser-window');
  });
  it('keeps explicitly selected OS-browser behavior', () => {
    expect(decidePopupAction('https://example.com', 'external')).toEqual({
      kind: 'external',
      url: 'https://example.com',
    });
  });
  it.each(['about:blank', 'about:blank#auth'])(
    'preserves the WindowProxy for %s, including in external mode',
    (url) => {
      expect(decidePopupAction(url, 'external')).toEqual({kind: 'browser-window', url});
    }
  );
  it.each(['mailto:hi@example.com', 'tel:+1234567890'])('delegates %s to the OS', (url) => {
    expect(decidePopupAction(url)).toEqual({kind: 'external', url});
  });
  it.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'smb://server/share',
    'data:text/html,bad',
    'about:config',
    '',
  ])('denies unsafe target %s from a remote page', (url) => {
    expect(decidePopupAction(url, 'browser-window', 'https://example.com')).toEqual({kind: 'deny'});
  });
  it('allows local developer pages to open other local pages', () => {
    expect(
      decidePopupAction('file:///tmp/child.html', 'browser-window', 'file:///tmp/index.html').kind
    ).toBe('browser-window');
  });
  it('allows same-origin blobs, not blobs from another origin', () => {
    expect(
      decidePopupAction('blob:https://example.com/123', 'browser-window', 'https://example.com/app')
        .kind
    ).toBe('browser-window');
    expect(
      decidePopupAction('blob:https://evil.test/123', 'browser-window', 'https://example.com/app')
        .kind
    ).toBe('deny');
  });
});
