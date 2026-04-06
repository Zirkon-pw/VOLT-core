export type PluginPermission = 'read' | 'write' | 'editor' | 'process' | 'external' | 'inter-plugin';

export function hasPluginPermission(
  permissions: string[],
  permission: PluginPermission,
): boolean {
  return permissions.includes(permission);
}
