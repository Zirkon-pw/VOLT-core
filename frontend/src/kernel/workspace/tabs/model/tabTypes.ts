export type TabType = 'file' | 'plugin';

export interface FileTab {
  id: string;
  type: TabType;
  filePath: string;
  fileName: string;
  isDirty: boolean;
  pluginPageId?: string;
}

export interface OpenTabOptions {
  activate?: boolean;
}
