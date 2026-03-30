export const SIDEBAR = {
  MIN_WIDTH: 180,
  MAX_WIDTH: 400,
  DEFAULT_WIDTH: 240,
  STORAGE_KEY: 'volt-sidebar-width',
  BUTTON_ORDER_STORAGE_KEY: 'volt-sidebar-button-order',
  COLLAPSED_STORAGE_KEY: 'volt-sidebar-collapsed',
} as const;

export const EDITOR = {
  AUTO_SAVE_DELAY_MS: 500,
  SLASH_MENU_HEIGHT: 320,
} as const;

export const FILE_TREE = {
  HOVER_EXPAND_DELAY_MS: 400,
} as const;

export const SEARCH = {
  MAX_RESULTS: 50,
  MAX_CONTENT_MATCHES: 5,
  SNIPPET_CONTEXT_CHARS: 50,
} as const;

export const WAILS = {
  READY_TIMEOUT_MS: 15000,
  POLL_MS: 25,
} as const;

export const PLUGIN_STATUS = {
  AUTO_CLOSE_SUCCESS_MS: 2200,
  AUTO_CLOSE_ERROR_MS: 4200,
  AUTO_CLOSE_CANCELLED_MS: 2600,
} as const;
