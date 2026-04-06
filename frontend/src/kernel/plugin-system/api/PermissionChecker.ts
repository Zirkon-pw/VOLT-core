export type PluginPermission = 'read' | 'write' | 'editor' | 'process' | 'external';

export function hasPluginPermission(
  permissions: string[],
  permission: PluginPermission,
): boolean {
  return permissions.includes(permission);
}
