interface ContextMenuMetadata {
  id: string;
  label: string;
}

export const CONTEXT_MENUS: {[key: string]: ContextMenuMetadata} = {
  INSPECT_ELEMENT: {id: 'INSPECT_ELEMENT', label: '检查元素'},
  OPEN_CONSOLE: {id: 'OPEN_CONSOLE', label: 'Open Console'},
};
