import { create } from 'zustand';

/**
 * Service interface for link preview resolution from kernel code.
 * The link-preview plugin registers its implementation at startup.
 */

export interface GenericLinkPreview {
  kind: 'generic';
  url: string;
  title: string;
  description?: string;
  siteName?: string;
  imageUrl?: string;
}

export interface GithubRepoLinkPreview {
  kind: 'githubRepo';
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  owner: string;
  repo: string;
  stars?: number;
  language?: string;
}

export interface VideoLinkPreview {
  kind: 'video';
  url: string;
  title?: string;
  sourceUrl?: string;
  embedUrl?: string;
  mimeType?: string;
  posterUrl?: string;
  provider: string;
}

export type LinkPreviewPayload =
  | GenericLinkPreview
  | GithubRepoLinkPreview
  | VideoLinkPreview;

export interface LinkPreviewServiceMethods {
  resolveLinkPreview: (url: string) => Promise<LinkPreviewPayload>;
}

interface LinkPreviewServiceState {
  methods: LinkPreviewServiceMethods | null;
  register: (methods: LinkPreviewServiceMethods) => void;
}

export const useLinkPreviewService = create<LinkPreviewServiceState>((set) => ({
  methods: null,
  register: (methods) => set({ methods }),
}));

export function resolveLinkPreview(url: string): Promise<LinkPreviewPayload> {
  const m = useLinkPreviewService.getState().methods;
  if (!m) throw new Error('LinkPreviewService not registered');
  return m.resolveLinkPreview(url);
}
