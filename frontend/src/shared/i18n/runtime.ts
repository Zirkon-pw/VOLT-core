import type { LocalizationPayload } from '@shared/api/settings/types';

export type TranslationParams = Record<string, string | number>;

const fallbackMessages: Record<string, string> = {
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.reload': 'Reload',
  'home.logoAlt': 'Volt logo',
  'home.actions.create.title': 'Create workspace',
  'home.actions.create.aria': 'Create a new workspace',
  'home.actions.attach.title': 'Add existing workspace',
  'home.actions.attach.aria': 'Add an existing workspace',
  'home.emptyTitle': 'No volts yet',
  'home.emptyHint': 'Create a new workspace or add an existing folder to get started.',
  'home.modal.createTitle': 'Create workspace',
  'home.modal.attachTitle': 'Add existing workspace',
  'home.modal.nameLabel': 'Workspace name',
  'home.modal.namePlaceholder': 'My Notes',
  'home.modal.parentLabel': 'Parent folder',
  'home.modal.locationLabel': 'Existing folder',
  'home.modal.directoryNameLabel': 'Folder name',
  'home.modal.directoryNamePlaceholder': 'my-notes',
  'home.modal.previewLabel': 'Path preview',
  'home.modal.noDirectory': 'No directory selected',
  'home.modal.browse': 'Browse',
  'home.modal.create': 'Create',
  'home.modal.add': 'Add',
  'home.modal.creating': 'Creating...',
  'home.modal.adding': 'Adding...',
  'home.validation.nameRequired': 'Enter a workspace name',
  'home.validation.parentRequired': 'Choose a parent folder',
  'home.validation.folderNameRequired': 'Enter a folder name',
  'home.validation.folderNameInvalid': 'Folder name contains invalid characters',
  'home.validation.locationRequired': 'Choose an existing folder',
  'volt.delete': 'Delete volt',
  'settings.tab.shortcuts': 'Shortcuts',
  'settings.shortcuts.title': 'Keyboard shortcuts',
  'settings.shortcuts.description': 'Customize app, editor, file tree, and plugin shortcuts.',
  'settings.shortcuts.searchPlaceholder': 'Search actions',
  'settings.shortcuts.captureHint': 'Press keys',
  'settings.shortcuts.unbound': 'Unbound',
  'settings.shortcuts.reset': 'Reset',
  'settings.shortcuts.empty': 'No shortcuts match your search.',
  'settings.shortcuts.groups.app': 'App',
  'settings.shortcuts.groups.editor': 'Editor',
  'settings.shortcuts.groups.fileTree': 'File Tree',
  'settings.shortcuts.groups.plugins': 'Plugins',
  'settings.shortcuts.source.builtin': 'Built-in',
  'settings.shortcuts.source.plugin': 'Plugin default',
  'settings.shortcuts.source.override': 'Override',
  'settings.shortcuts.conflict': 'This shortcut is already used by {name}.',
  'settings.shortcuts.conflictedDefault': 'Default shortcut conflicts with {name}.',
  'settings.shortcuts.doubleShiftNote': 'Special gesture',
  'settings.shortcuts.actions.workspaceSearchToggle': 'Invoke Command',
  'settings.shortcuts.actions.workspaceSearchDoubleShift': 'Open Search',
  'settings.shortcuts.actions.workspaceSidebarToggle': 'Toggle Sidebar',
  'settings.shortcuts.actions.tabsCloseActive': 'Close Active Tab',
  'settings.shortcuts.actions.modalClose': 'Close Dialog',
  'settings.shortcuts.actions.editorSave': 'Save Active File',
  'settings.shortcuts.actions.fileFind': 'Find in Current File',
  'settings.shortcuts.actions.fileCreate': 'Create File',
  'settings.shortcuts.actions.fileRename': 'Rename Selected File',
  'settings.plugins.importButton': 'Import plugin',
  'settings.plugins.openFolderButton': 'Open plugin folder',
  'settings.plugins.importing': 'Importing...',
  'settings.plugins.importSuccess': 'Plugin "{name}" imported. Review permissions to enable it.',
  'settings.plugins.importEnabledSuccess': 'Plugin "{name}" imported and enabled.',
  'settings.plugins.deleting': 'Deleting...',
  'settings.plugins.delete.title': 'Delete plugin',
  'settings.plugins.delete.description': 'Delete "{name}" and remove its files, saved data, logs, and shortcut overrides?',
  'settings.plugins.deleteSuccess': 'Plugin "{name}" deleted.',
  'editor.codeBlock.language.plainText': 'Plain text',
  'editor.codeBlock.language.searchPlaceholder': 'Search language...',
  'editor.codeBlock.language.empty': 'No languages found',
  'editor.findInFile.placeholder': 'Find in current file...',
  'editor.findInFile.noMatches': 'No matches',
  'editor.findInFile.count': '{current} of {total}',
  'editor.findInFile.previous': 'Previous match',
  'editor.findInFile.next': 'Next match',
  'errorBoundary.title': 'Something went wrong',
  'errorBoundary.description': 'An unexpected error occurred.',
};

let currentLocalization: LocalizationPayload = {
  selectedLocale: 'auto',
  effectiveLocale: 'en',
  availableLocales: [],
  messages: { ...fallbackMessages },
};

export function setLocalizationRuntime(localization: LocalizationPayload) {
  currentLocalization = {
    ...localization,
    availableLocales: [...localization.availableLocales],
    messages: { ...localization.messages },
  };

  if (typeof document !== 'undefined') {
    document.documentElement.lang = localization.effectiveLocale;
  }
}

export function translate(key: string, params?: TranslationParams): string {
  const template = currentLocalization.messages[key] ?? fallbackMessages[key] ?? key;
  if (params == null) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, paramName: string) => {
    const value = params[paramName];
    return value == null ? `{${paramName}}` : String(value);
  });
}

export function getEffectiveLocale(): string {
  return currentLocalization.effectiveLocale;
}
