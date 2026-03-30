import type { EditorKindCapabilities, EditorKindInfo, EditorMountConfig } from './pluginApi';

const HOST_EDITOR_EVENT_NAMES: EditorKindCapabilities['eventNames'] = [
  'ready',
  'focus',
  'blur',
  'change',
  'save',
  'selection-change',
  'dirty-change',
  'dispose',
];

const HOST_EDITOR_CAPABILITIES: Record<string, EditorKindCapabilities> = {
  markdown: {
    kind: 'markdown',
    supportsFileTabs: true,
    supportsEmbeddedMount: true,
    supportsReadOnly: true,
    supportsToolbarActions: true,
    supportsPanels: true,
    supportsOverlays: false,
    supportedOverlayAnchors: [],
    commandIds: ['focus', 'save'],
    eventNames: HOST_EDITOR_EVENT_NAMES,
  },
  'raw-text': {
    kind: 'raw-text',
    supportsFileTabs: true,
    supportsEmbeddedMount: true,
    supportsReadOnly: true,
    supportsToolbarActions: true,
    supportsPanels: true,
    supportsOverlays: false,
    supportedOverlayAnchors: [],
    commandIds: ['focus', 'save'],
    eventNames: HOST_EDITOR_EVENT_NAMES,
  },
  image: {
    kind: 'image',
    supportsFileTabs: true,
    supportsEmbeddedMount: true,
    supportsReadOnly: true,
    supportsToolbarActions: true,
    supportsPanels: true,
    supportsOverlays: false,
    supportedOverlayAnchors: [],
    commandIds: ['focus'],
    eventNames: HOST_EDITOR_EVENT_NAMES,
  },
};

const HOST_EDITOR_TITLES: Record<string, string> = {
  markdown: 'Markdown',
  'raw-text': 'Raw Text',
  image: 'Image',
};

export function listHostEditorKinds(): EditorKindInfo[] {
  return Object.keys(HOST_EDITOR_CAPABILITIES)
    .sort((left, right) => left.localeCompare(right))
    .map((kind) => ({ kind, title: HOST_EDITOR_TITLES[kind] ?? kind }));
}

export function getHostEditorCapabilities(kind: string): EditorKindCapabilities | null {
  return HOST_EDITOR_CAPABILITIES[kind] ?? null;
}

export function hasHostEditorKind(kind: string): boolean {
  return kind in HOST_EDITOR_CAPABILITIES;
}

export function validateHostEditorConfig(config: Omit<EditorMountConfig, 'filePath'>): string | null {
  const capabilities = getHostEditorCapabilities(config.kind);
  if (!capabilities) {
    return `Host editor kind "${config.kind}" is not available`;
  }

  if (config.toolbarActions?.length && !capabilities.supportsToolbarActions) {
    return `Host editor kind "${config.kind}" does not support toolbar actions`;
  }

  if (config.panels?.length && !capabilities.supportsPanels) {
    return `Host editor kind "${config.kind}" does not support panels`;
  }

  if (config.overlays?.length && !capabilities.supportsOverlays) {
    return `Host editor kind "${config.kind}" does not support overlays`;
  }

  const unsupportedOverlay = config.overlays?.find(
    (overlay) => !capabilities.supportedOverlayAnchors.includes(overlay.anchor.type),
  );
  if (unsupportedOverlay) {
    return `Host editor kind "${config.kind}" does not support overlay anchor "${unsupportedOverlay.anchor.type}"`;
  }

  const seenCommands = new Set<string>();
  for (const command of config.commands ?? []) {
    if (seenCommands.has(command.id)) {
      return `Duplicate editor command "${command.id}"`;
    }
    seenCommands.add(command.id);
  }

  const invalidToolbarAction = config.toolbarActions?.find((action) => !action.commandId && !action.callback);
  if (invalidToolbarAction) {
    return `Toolbar action "${invalidToolbarAction.id}" must define callback or commandId`;
  }

  return null;
}
