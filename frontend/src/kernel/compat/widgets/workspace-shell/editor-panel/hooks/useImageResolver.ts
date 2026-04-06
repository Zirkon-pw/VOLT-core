import { useRef, useCallback, useEffect } from 'react';
import { readImageBase64, dataUrlToBlobUrl } from '@plugins/image-service';

interface ImageMaps {
  relToBlob: Map<string, string>;
  blobToRel: Map<string, string>;
}

export function useImageResolver(voltPath: string) {
  const maps = useRef<ImageMaps>({
    relToBlob: new Map(),
    blobToRel: new Map(),
  });

  const resolve = useCallback(async (relPath: string): Promise<string> => {
    const cached = maps.current.relToBlob.get(relPath);
    if (cached) return cached;

    const dataUrl = await readImageBase64(voltPath, relPath);
    const blobUrl = dataUrlToBlobUrl(dataUrl);
    maps.current.relToBlob.set(relPath, blobUrl);
    maps.current.blobToRel.set(blobUrl, relPath);
    return blobUrl;
  }, [voltPath]);

  const register = useCallback((relPath: string, blobUrl: string) => {
    maps.current.relToBlob.set(relPath, blobUrl);
    maps.current.blobToRel.set(blobUrl, relPath);
  }, []);

  const unresolveAll = useCallback((markdown: string): string => {
    return markdown.replace(/!\[([^\]]*)\]\((blob:[^)]+)\)/g, (_match, alt, src) => {
      const rel = maps.current.blobToRel.get(src);
      if (rel) return `![${alt}](${rel})`;
      return `![${alt}](${src})`;
    });
  }, []);

  const resolveAll = useCallback(async (markdown: string): Promise<string> => {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const entries: Array<{ full: string; alt: string; relPath: string }> = [];

    let match: RegExpExecArray | null;
    while ((match = imageRegex.exec(markdown)) !== null) {
      const [full, alt, src] = match;
      if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) {
        continue;
      }
      // Handle legacy vault-asset URLs
      let relPath = src;
      if (src.includes('/vault-asset')) {
        try {
          const parsed = new URL(src, 'http://localhost');
          relPath = parsed.searchParams.get('file') || src;
        } catch {
          continue;
        }
      }
      entries.push({ full, alt, relPath });
    }

    const resolved = await Promise.all(
      entries.map(async (e) => {
        try {
          const blobUrl = await resolve(e.relPath);
          return { ...e, blobUrl };
        } catch (err) {
          console.warn('Failed to resolve image:', e.relPath, err);
          return { ...e, blobUrl: null as string | null };
        }
      })
    );

    let result = markdown;
    for (const r of resolved) {
      if (r.blobUrl) {
        result = result.replace(r.full, `![${r.alt}](${r.blobUrl})`);
      }
    }
    return result;
  }, [resolve]);

  const clear = useCallback(() => {
    for (const blobUrl of maps.current.blobToRel.keys()) {
      URL.revokeObjectURL(blobUrl);
    }
    maps.current.relToBlob.clear();
    maps.current.blobToRel.clear();
  }, []);

  useEffect(() => {
    return () => {
      for (const blobUrl of maps.current.blobToRel.keys()) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [voltPath]);

  return { resolve, register, unresolveAll, resolveAll, clear };
}
