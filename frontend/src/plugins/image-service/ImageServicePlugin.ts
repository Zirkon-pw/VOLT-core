import type { PluginManifest } from '@kernel/plugin-system/api/pluginTypes';
import type { BuiltinPluginModule } from '@kernel/plugin-system/builtin/types';
import { useImageService } from '@kernel/services/imageService';
import { copyImage, pickImage, readImageBase64, saveImageBase64, dataUrlToBlobUrl, base64ToBlobUrl } from './ImageService';

export const imageServiceManifest: PluginManifest = {
  apiVersion: 5,
  id: 'builtin-image-service',
  name: 'Image Service',
  version: '1.0.0',
  description: 'Built-in image selection and asset handling service.',
  main: 'builtin',
  permissions: ['read', 'write'],
};

useImageService.getState().register({
  copyImage,
  pickImage,
  readImageBase64,
  saveImageBase64,
  dataUrlToBlobUrl,
  base64ToBlobUrl,
});

export const imageServicePlugin: BuiltinPluginModule = {
  manifest: imageServiceManifest,
};
