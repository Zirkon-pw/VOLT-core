import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageDir = dirname(currentDir);
const distDir = join(packageDir, 'dist');

await mkdir(distDir, { recursive: true });
await copyFile(join(packageDir, 'manifest.json'), join(distDir, 'manifest.json'));
