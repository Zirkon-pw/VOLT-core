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
