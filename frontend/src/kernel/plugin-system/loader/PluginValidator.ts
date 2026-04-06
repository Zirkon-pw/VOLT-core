import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';

function isObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function validatePluginManifest(manifest: unknown): manifest is PluginManifest {
  return (
    isObject(manifest) &&
    typeof manifest.id === 'string' &&
    typeof manifest.name === 'string' &&
    typeof manifest.version === 'string' &&
    typeof manifest.main === 'string' &&
    Array.isArray(manifest.permissions)
  );
}
