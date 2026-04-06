import { pickImage as pickImageDialog } from '@shared/api/dialog';

function buildVaultAssetUrl(voltPath: string, relPath: string): string {
  const params = new URLSearchParams({
    vault: voltPath,
    file: relPath,
  });
  return `/vault-asset?${params.toString()}`;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });
}

export async function copyImage(_voltPath: string, _sourcePath: string, _imageDir: string): Promise<string> {
  throw new Error('Image copy from host paths is not available in the new backend bridge yet.');
}

export async function saveImageBase64(
  _voltPath: string,
  _fileName: string,
  _imageDir: string,
  _base64Data: string,
): Promise<string> {
  throw new Error('Image persistence is not available in the new backend bridge yet.');
}

export async function pickImage(): Promise<string> {
  return pickImageDialog();
}

export async function readImageBase64(voltPath: string, relPath: string): Promise<string> {
  const response = await fetch(buildVaultAssetUrl(voltPath, relPath));
  if (!response.ok) {
    throw new Error(`Failed to read image "${relPath}"`);
  }

  const blob = await response.blob();
  return blobToDataUrl(blob);
}

export function dataUrlToBlobUrl(dataUrl: string): string {
  const [header, b64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

export function base64ToBlobUrl(b64: string, mimeType: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}
