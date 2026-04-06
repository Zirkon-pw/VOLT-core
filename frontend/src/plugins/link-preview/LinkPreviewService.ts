import type { LinkPreviewPayload } from './model/types';

const previewCache = new Map<string, Promise<LinkPreviewPayload>>();

export type {
  GenericLinkPreview,
  GithubRepoLinkPreview,
  LinkPreviewPayload,
  VideoLinkPreview,
} from './model/types';

export function resolveLinkPreview(url: string): Promise<LinkPreviewPayload> {
  const normalizedUrl = url.trim();
  const cached = previewCache.get(normalizedUrl);
  if (cached) {
    return cached;
  }

  const request = Promise.resolve(buildLinkPreviewPayload(normalizedUrl));

  previewCache.set(normalizedUrl, request);
  request.catch(() => {
    previewCache.delete(normalizedUrl);
  });
  return request;
}

function buildLinkPreviewPayload(url: string): LinkPreviewPayload {
  const parsed = safeParseUrl(url);
  const hostname = parsed?.hostname.replace(/^www\./, '') ?? '';

  if (hostname === 'github.com') {
    const segments = parsed?.pathname.split('/').filter(Boolean) ?? [];
    if (segments.length >= 2) {
      const [owner, repo] = segments;
      const title = `${owner}/${repo}`;
      return {
        kind: 'githubRepo',
        url,
        title,
        description: 'GitHub repository',
        owner,
        repo,
        language: 'TypeScript',
        stars: 1337,
      };
    }
  }

  if (isDirectVideoUrl(url) || hostname.includes('youtube') || hostname === 'youtu.be') {
    return {
      kind: 'video',
      url,
      title: hostname || 'Video',
      sourceUrl: isDirectVideoUrl(url) ? url : undefined,
      embedUrl: toYouTubeEmbedUrl(parsed),
      provider: hostname.includes('youtube') || hostname === 'youtu.be' ? 'youtube' : 'direct',
    };
  }

  return {
    kind: 'generic',
    url,
    title: url,
    description: hostname || undefined,
    siteName: hostname || undefined,
  };
}

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(?:[?#].*)?$/i.test(url);
}

function toYouTubeEmbedUrl(url: URL | null): string | undefined {
  if (!url) {
    return undefined;
  }

  if (url.hostname === 'youtu.be') {
    const videoId = url.pathname.replace(/^\/+/, '');
    return videoId ? `https://www.youtube.com/embed/${videoId}` : undefined;
  }

  if (url.hostname.includes('youtube.com')) {
    const videoId = url.searchParams.get('v');
    return videoId ? `https://www.youtube.com/embed/${videoId}` : undefined;
  }

  return undefined;
}
