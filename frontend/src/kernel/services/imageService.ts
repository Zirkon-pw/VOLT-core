import { create } from 'zustand';

/**
 * Service interface for image operations from kernel code.
 * The image-service plugin registers its implementation at startup.
 */

export interface ImageServiceMethods {
  copyImage: (voltPath: string, sourcePath: string, imageDir: string) => Promise<string>;
  saveImageBase64: (voltPath: string, fileName: string, imageDir: string, base64Data: string) => Promise<string>;
  pickImage: () => Promise<string>;
  readImageBase64: (voltPath: string, relPath: string) => Promise<string>;
  dataUrlToBlobUrl: (dataUrl: string) => string;
  base64ToBlobUrl: (b64: string, mimeType: string) => string;
}

interface ImageServiceState {
  methods: ImageServiceMethods | null;
  register: (methods: ImageServiceMethods) => void;
}

export const useImageService = create<ImageServiceState>((set) => ({
  methods: null,
  register: (methods) => set({ methods }),
}));

export function copyImage(voltPath: string, sourcePath: string, imageDir: string): Promise<string> {
  const m = useImageService.getState().methods;
  if (!m) throw new Error('ImageService not registered');
  return m.copyImage(voltPath, sourcePath, imageDir);
}

export function saveImageBase64(voltPath: string, fileName: string, imageDir: string, base64Data: string): Promise<string> {
  const m = useImageService.getState().methods;
  if (!m) throw new Error('ImageService not registered');
  return m.saveImageBase64(voltPath, fileName, imageDir, base64Data);
}

export function pickImage(): Promise<string> {
  const m = useImageService.getState().methods;
  if (!m) throw new Error('ImageService not registered');
  return m.pickImage();
}

export function readImageBase64(voltPath: string, relPath: string): Promise<string> {
  const m = useImageService.getState().methods;
  if (!m) throw new Error('ImageService not registered');
  return m.readImageBase64(voltPath, relPath);
}

export function dataUrlToBlobUrl(dataUrl: string): string {
  const m = useImageService.getState().methods;
  if (!m) throw new Error('ImageService not registered');
  return m.dataUrlToBlobUrl(dataUrl);
}

export function base64ToBlobUrl(b64: string, mimeType: string): string {
  const m = useImageService.getState().methods;
  if (!m) throw new Error('ImageService not registered');
  return m.base64ToBlobUrl(b64, mimeType);
}
