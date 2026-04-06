import { useEffect, useState } from 'react';
import type { LinkPreviewPayload } from '../LinkPreviewService';
import { resolveLinkPreview } from '../LinkPreviewService';

interface LinkPreviewCardProps {
  url: string;
}

export function LinkPreviewCard({ url }: LinkPreviewCardProps) {
  const [preview, setPreview] = useState<LinkPreviewPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    void resolveLinkPreview(url).then((value) => {
      if (!cancelled) {
        setPreview(value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!preview) {
    return null;
  }

  const description = preview.kind === 'githubRepo'
    ? preview.description ?? `${preview.owner}/${preview.repo}`
    : preview.kind === 'video'
      ? preview.provider
      : preview.description ?? preview.siteName ?? preview.url;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-2xs)',
        padding: 'var(--spacing-sm)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-surface-elevated)',
        color: 'inherit',
        textDecoration: 'none',
      }}
    >
      <strong>{preview.title || preview.url}</strong>
      <span>{description}</span>
    </a>
  );
}
