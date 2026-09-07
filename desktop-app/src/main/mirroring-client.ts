/**
 * Executed in the page's main world after BrowserSync loads. Keep this function
 * self-contained: the preload serializes it with toString(). BrowserSync still
 * provides the socket, scroll sync and reloads, but never chooses click targets
 * by a global tag index (responsive layouts do not share a DOM).
 */
export function installSemanticMirroring(): void {
  type Identity = {
    tag: string;
    id: string;
    key: string;
    name: string;
    type: string;
    role: string;
    label: string;
    text: string;
    form: string;
  };
  type Message = {
    page: string;
    kind: 'click' | 'input' | 'change';
    target: Identity;
    value?: string;
    checked?: boolean;
    selected?: string[];
  };
  const scope = window as typeof window & {
    ___browserSync___?: {
      socket: {
        connected: boolean;
        emit: (name: string, data: Message) => void;
        on: (name: string, callback: (data: Message) => void) => void;
      };
    };
    __responsivelySemanticMirroring?: boolean;
  };
  const socket = scope.___browserSync___?.socket;
  if (!socket || scope.__responsivelySemanticMirroring) return;
  scope.__responsivelySemanticMirroring = true;
  const channel = 'responsively:interaction';
  let replaying = false;
  const normalize = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();
  const field = (el: Element) =>
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement;
  const usable = (el: HTMLElement) =>
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== 'hidden' &&
    !el.closest('[inert]') &&
    !el.matches(':disabled, [aria-disabled="true"]');
  const describe = (el: HTMLElement): Identity => {
    const form = (el as HTMLInputElement).form;
    return {
      tag: el.tagName,
      id: el.id,
      key: el.getAttribute('data-responsively-mirror-key') || el.getAttribute('data-testid') || '',
      name: el.getAttribute('name') || '',
      type: (el as HTMLInputElement).type || '',
      role: el.getAttribute('role') || '',
      label: normalize(el.getAttribute('aria-label')),
      text: field(el) ? '' : normalize(el.textContent),
      form: form
        ? `${form.id}|${form.getAttribute('name') || ''}|${form.action}|${form.method}`
        : '',
    };
  };
  const resolve = (target: Identity): HTMLElement | undefined => {
    if (!target || typeof target.tag !== 'string' || !/^[A-Z][A-Z0-9-]*$/.test(target.tag)) return;
    const candidates = Array.from(document.getElementsByTagName(target.tag)).filter(
      (el): el is HTMLElement => {
        if (!(el instanceof HTMLElement) || !usable(el)) return false;
        const current = describe(el);
        return ['key', 'name', 'type', 'role', 'label', 'text', 'form'].every(
          (key) => current[key as keyof Identity] === target[key as keyof Identity]
        );
      }
    );
    if (target.id) {
      const identified = candidates.filter((el) => el.id === target.id);
      if (identified.length === 1) return identified[0];
    }
    // No positional fallback. Ambiguous or absent controls are left alone.
    if (candidates.length === 1 && (target.key || target.name || target.label || target.text)) {
      return candidates[0];
    }
  };
  const privateField = (el: HTMLElement) =>
    el instanceof HTMLInputElement && ['password', 'file', 'hidden'].includes(el.type);
  const submitControl = (el: HTMLElement) =>
    (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) &&
    !!el.form &&
    ['submit', 'image', 'reset'].includes(el.type);

  const forward = (event: Event) => {
    if (replaying || !event.isTrusted || !socket.connected) return;
    const origin = event.composedPath().find((item) => item instanceof Element) as
      Element | undefined;
    if (!origin) return;
    // Let the actual browser perform navigation, downloads and popups ONCE.
    // Confirmed source navigation is synchronized separately by the host.
    if (origin.closest('a[href], area[href]')) return;
    const el = origin.closest(
      'button, input, textarea, select, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [data-responsively-mirror-key], [data-testid], [id]'
    );
    if (!(el instanceof HTMLElement) || !usable(el) || privateField(el)) return;
    if (event instanceof MouseEvent) {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)
        return;
      // Checkboxes/selects synchronize their state via input/change, not another
      // click that would toggle them twice. Never duplicate a form submission.
      if (field(el) || submitControl(el)) return;
    } else if (!field(el)) return;
    const target = describe(el);
    if (!target.id && !target.key && !target.name && !target.label && !target.text) return;
    const message: Message = {page: location.href, kind: event.type as Message['kind'], target};
    if (field(el)) {
      message.value = (el as HTMLInputElement).value;
      if (el instanceof HTMLInputElement) message.checked = el.checked;
      if (el instanceof HTMLSelectElement && el.multiple) {
        message.selected = Array.from(el.selectedOptions, (option) => option.value);
      }
    }
    socket.emit(channel, message);
  };
  window.addEventListener('click', forward, true);
  window.addEventListener('input', forward, true);
  window.addEventListener('change', forward, true);

  socket.on(channel, (message) => {
    if (!message || message.page !== location.href || !socket.connected) return;
    if (!['click', 'input', 'change'].includes(message.kind)) return;
    const el = resolve(message.target);
    if (!el || privateField(el) || el.closest('a[href], area[href]') || submitControl(el)) return;
    replaying = true;
    // The isolated preload tells the main process this is a mirrored action.
    // Popups caused by it (including asynchronous ones) must not duplicate the
    // real source's popup. A genuine subsequent gesture clears that state.
    window.dispatchEvent(new Event('responsively:mirrored-interaction'));
    try {
      if (message.kind === 'click') {
        if (!field(el)) el.click();
      } else if (
        field(el) &&
        typeof message.value === 'string' &&
        message.value.length <= 100_000
      ) {
        const proto =
          el instanceof HTMLInputElement
            ? HTMLInputElement.prototype
            : el instanceof HTMLTextAreaElement
              ? HTMLTextAreaElement.prototype
              : HTMLSelectElement.prototype;
        // Use the native setter so controlled React inputs see the change too.
        Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, message.value);
        if (el instanceof HTMLInputElement && typeof message.checked === 'boolean') {
          el.checked = message.checked;
        }
        if (el instanceof HTMLSelectElement && el.multiple && Array.isArray(message.selected)) {
          for (const option of Array.from(el.options))
            option.selected = message.selected.includes(option.value);
        }
        el.dispatchEvent(new Event('input', {bubbles: true}));
        if (message.kind === 'change') el.dispatchEvent(new Event('change', {bubbles: true}));
      }
    } finally {
      replaying = false;
    }
  });
}
