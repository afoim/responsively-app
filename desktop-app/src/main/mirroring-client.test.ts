import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {installSemanticMirroring} from './mirroring-client';

describe('semantic mirroring target safety', () => {
  let receive: (message: any) => void;
  let addListener: any;
  let socket: {connected: boolean; emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>};
  const identity = (extra = {}) => ({
    tag: 'BUTTON',
    id: 'wanted',
    key: '',
    name: '',
    type: 'button',
    role: '',
    label: '',
    text: 'Action',
    form: '',
    ...extra,
  });
  const send = (extra: any = {}) =>
    receive({page: location.href, kind: 'click', target: identity(), ...extra});
  beforeEach(() => {
    document.body.innerHTML =
      '<button id="other" type="button">Other</button><button id="wanted" type="button">Action</button>';
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      {width: 10, height: 10},
    ] as any);
    socket = {
      connected: true,
      emit: vi.fn(),
      on: vi.fn((_name, fn) => {
        receive = fn;
      }),
    };
    (window as any).___browserSync___ = {socket};
    delete (window as any).__responsivelySemanticMirroring;
    addListener = vi.spyOn(window, 'addEventListener');
    installSemanticMirroring();
  });
  afterEach(() => {
    for (const [type, listener, options] of addListener.mock.calls) {
      window.removeEventListener(type, listener, options);
    }
    delete (window as any).___browserSync___;
    delete (window as any).__responsivelySemanticMirroring;
    vi.restoreAllMocks();
  });
  it('matches the intended element rather than the tag index', () => {
    const right = vi.fn(),
      wrong = vi.fn();
    document.getElementById('wanted')!.onclick = right;
    document.getElementById('other')!.onclick = wrong;
    send();
    expect(right).toHaveBeenCalledOnce();
    expect(wrong).not.toHaveBeenCalled();
  });
  it('does not fall back to the first element when the target is missing', () => {
    document.getElementById('wanted')!.remove();
    const wrong = vi.fn();
    document.getElementById('other')!.onclick = wrong;
    send();
    expect(wrong).not.toHaveBeenCalled();
  });
  it('rejects an ID reused for a different action', () => {
    const el = document.getElementById('wanted')!;
    el.textContent = 'Delete';
    const wrong = vi.fn();
    el.onclick = wrong;
    send();
    expect(wrong).not.toHaveBeenCalled();
  });
  it('skips ambiguous controls instead of picking one', () => {
    document.body.innerHTML =
      '<button type="button">Action</button><button type="button">Action</button>';
    const wrong = vi.fn();
    document.body.onclick = wrong;
    send();
    expect(wrong).not.toHaveBeenCalled();
  });
  it('matches a unique semantic label when generated IDs differ', () => {
    const el = document.getElementById('wanted')!;
    el.id = 'generated-other';
    const right = vi.fn();
    el.onclick = right;
    send();
    expect(right).toHaveBeenCalledOnce();
  });
  it.each(['hidden', 'disabled', 'inert'])('does not activate %s controls', (mode) => {
    const el = document.getElementById('wanted')!;
    if (mode === 'hidden') (el as HTMLElement).style.visibility = 'hidden';
    else el.setAttribute(mode, '');
    const wrong = vi.fn();
    el.onclick = wrong;
    send();
    expect(wrong).not.toHaveBeenCalled();
  });
  it('requires the same page, including the query', () => {
    const fn = vi.fn();
    document.getElementById('wanted')!.onclick = fn;
    send({page: `${location.href}?other=1`});
    expect(fn).not.toHaveBeenCalled();
  });
  it('respects a disconnected mirror socket', () => {
    socket.connected = false;
    const fn = vi.fn();
    document.getElementById('wanted')!.onclick = fn;
    send();
    expect(fn).not.toHaveBeenCalled();
  });
  it('never replays anchors, even if a remote client sends one', () => {
    document.body.innerHTML = '<a id="wanted" href="https://example.com">Action</a>';
    const fn = vi.fn();
    document.getElementById('wanted')!.onclick = fn;
    send({target: identity({tag: 'A', type: ''})});
    expect(fn).not.toHaveBeenCalled();
  });
  it('never duplicates a native form submission', () => {
    document.body.innerHTML = '<form><button id="wanted">Action</button></form>';
    const fn = vi.fn();
    document.getElementById('wanted')!.onclick = fn;
    send({target: identity({type: 'submit', form: `||${location.href}|get`})});
    expect(fn).not.toHaveBeenCalled();
  });
  it.each(['password', 'file', 'hidden'])(
    'does not write mirrored data into a %s input',
    (type) => {
      document.body.innerHTML = `<input id="wanted" type="${type}">`;
      send({kind: 'input', value: 'secret', target: identity({tag: 'INPUT', type, text: ''})});
      expect((document.getElementById('wanted') as HTMLInputElement).value).toBe('');
    }
  );
  it('synthetic page clicks are not echoed back into the socket', () => {
    document.getElementById('wanted')!.click();
    send();
    expect(socket.emit).not.toHaveBeenCalled();
  });
  it('is idempotent when initialized more than once', () => {
    installSemanticMirroring();
    expect(socket.on).toHaveBeenCalledOnce();
  });
  it('rejects malformed messages without evaluating selectors', () => {
    for (const value of [
      null,
      {},
      {page: location.href, kind: 'click', target: null},
      {page: location.href, kind: 'click', target: {tag: 'BUTTON, A'}},
    ]) {
      expect(() => receive(value)).not.toThrow();
    }
  });
});
