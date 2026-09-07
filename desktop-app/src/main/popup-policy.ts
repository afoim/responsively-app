export type PopupBehavior = 'browser-window' | 'external' | 'in-preview';

export type PopupAction =
  {kind: 'browser-window'; url: string} | {kind: 'external'; url: string} | {kind: 'deny'};

/** The native WindowProxy must survive: do not replace window.open with loadURL. */
export const decidePopupAction = (
  rawUrl: string,
  behavior: PopupBehavior = 'browser-window',
  openerUrl = ''
): PopupAction => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return {kind: 'deny'};
  }
  if (url.protocol === 'http:' || url.protocol === 'https:') {
    return {kind: behavior === 'external' ? 'external' : 'browser-window', url: rawUrl};
  }
  // OAuth commonly creates a blank window during a gesture and navigates it
  // after awaiting a request. Returning deny breaks that WindowProxy entirely.
  if (url.protocol === 'about:' && url.pathname === 'blank') {
    return {kind: 'browser-window', url: rawUrl};
  }
  if (url.protocol === 'mailto:' || url.protocol === 'tel:') {
    return {kind: 'external', url: rawUrl};
  }
  try {
    const opener = new URL(openerUrl);
    if (
      (url.protocol === 'file:' && opener.protocol === 'file:') ||
      (url.protocol === 'blob:' && url.origin !== 'null' && url.origin === opener.origin)
    ) {
      return {kind: 'browser-window', url: rawUrl};
    }
  } catch {
    // No trusted opener context for a local/blob target.
  }
  return {kind: 'deny'};
};
