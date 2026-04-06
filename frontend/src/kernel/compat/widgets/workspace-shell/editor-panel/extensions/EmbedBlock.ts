import { Node, mergeAttributes } from '@tiptap/core';
import { type NodeViewRendererProps } from '@tiptap/core';
import { resolveLinkPreview, type LinkPreviewPayload } from '@plugins/link-preview';
import { getRemoteUrlHostname } from '@shared/lib/remoteUrl';
import { translate } from '@shared/i18n';

export const EmbedBlock = Node.create({
  name: 'embedBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      url: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('url') || '',
        renderHTML: (attributes: Record<string, unknown>) => (
          typeof attributes.url === 'string' && attributes.url
            ? { url: attributes.url }
            : {}
        ),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'volt-embed' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['volt-embed', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return (props: NodeViewRendererProps) => {
      const dom = document.createElement('div');
      dom.classList.add('embed-block-node');
      dom.setAttribute('data-testid', 'embed-block');
      dom.contentEditable = 'false';

      const content = document.createElement('div');
      content.className = 'embed-block-content';
      dom.appendChild(content);

      let currentNode = props.node;
      let requestId = 0;

      const render = (element: HTMLElement, kind: string) => {
        content.replaceChildren(element);
        dom.setAttribute('data-embed-kind', kind);
      };

      const renderLoading = (url: string) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'embed-block-state';
        wrapper.setAttribute('data-testid', 'embed-block-loading');

        const title = document.createElement('strong');
        title.className = 'embed-block-state-title';
        title.textContent = translate('editor.embed.loading');

        const description = document.createElement('span');
        description.className = 'embed-block-state-description';
        description.textContent = url;

        wrapper.append(title, description);
        render(wrapper, 'loading');
      };

      const renderFallback = (url: string) => {
        const preview = buildFallbackPreview(url);
        render(renderPreview(preview), preview.kind);
      };

      const loadPreview = async () => {
        const url = String(currentNode.attrs.url || '').trim();
        if (!url) {
          renderFallback('');
          return;
        }

        const nextRequestId = ++requestId;
        renderLoading(url);

        try {
          const preview = await resolveLinkPreview(url);
          if (nextRequestId !== requestId) {
            return;
          }

          render(renderPreview(preview), preview.kind);
        } catch {
          if (nextRequestId !== requestId) {
            return;
          }

          renderFallback(url);
        }
      };

      loadPreview();

      return {
        dom,
        update(node) {
          if (node.type.name !== 'embedBlock') {
            return false;
          }

          const previousUrl = String(currentNode.attrs.url || '');
          currentNode = node;

          if (previousUrl !== String(node.attrs.url || '')) {
            void loadPreview();
          }

          return true;
        },
        selectNode() {
          dom.classList.add('ProseMirror-selectednode');
        },
        deselectNode() {
          dom.classList.remove('ProseMirror-selectednode');
        },
        stopEvent(event) {
          const target = event.target;
          return target instanceof HTMLElement && Boolean(target.closest('a, video, iframe'));
        },
        ignoreMutation() {
          return true;
        },
      };
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`<volt-embed url="${escapeAttribute(node.attrs.url)}"></volt-embed>`);
          state.closeBlock(node);
        },
      },
    };
  },
});

function renderPreview(preview: LinkPreviewPayload): HTMLElement {
  switch (preview.kind) {
    case 'githubRepo':
      return renderGitHubPreview(preview);
    case 'video':
      return renderVideoPreview(preview);
    case 'generic':
      return renderGenericPreview(preview);
  }
}

function renderGenericPreview(preview: Extract<LinkPreviewPayload, { kind: 'generic' }>): HTMLElement {
  const wrapper = createCardWrapper('generic');
  const link = createCardLink(preview.url, 'embed-block-link');
  link.appendChild(createCardBody(preview));

  if (preview.imageUrl) {
    link.appendChild(createThumbnail(preview.imageUrl, preview.title));
  }

  wrapper.appendChild(link);
  return wrapper;
}

function renderGitHubPreview(preview: Extract<LinkPreviewPayload, { kind: 'githubRepo' }>): HTMLElement {
  const wrapper = createCardWrapper('github');
  const link = createCardLink(preview.url, 'embed-block-link');

  const badge = document.createElement('span');
  badge.className = 'embed-block-badge';
  badge.textContent = 'GitHub';

  const title = document.createElement('h4');
  title.className = 'embed-block-title';
  title.textContent = preview.title;

  const description = document.createElement('p');
  description.className = 'embed-block-description';
  description.textContent = preview.description || `${preview.owner}/${preview.repo}`;

  const meta = document.createElement('div');
  meta.className = 'embed-block-meta';

  const repoName = document.createElement('span');
  repoName.className = 'embed-block-pill';
  repoName.textContent = `${preview.owner}/${preview.repo}`;
  meta.appendChild(repoName);

  if (preview.stars) {
    const stars = document.createElement('span');
    stars.className = 'embed-block-pill';
    stars.textContent = `${new Intl.NumberFormat().format(preview.stars)} stars`;
    meta.appendChild(stars);
  }

  if (preview.language) {
    const language = document.createElement('span');
    language.className = 'embed-block-pill';
    language.textContent = preview.language;
    meta.appendChild(language);
  }

  const body = document.createElement('div');
  body.className = 'embed-block-body';
  body.append(badge, title, description, meta);
  link.appendChild(body);

  if (preview.imageUrl) {
    link.appendChild(createThumbnail(preview.imageUrl, preview.title));
  }

  wrapper.appendChild(link);
  return wrapper;
}

function renderVideoPreview(preview: Extract<LinkPreviewPayload, { kind: 'video' }>): HTMLElement {
  const wrapper = createCardWrapper('video');
  wrapper.setAttribute('data-testid', 'embed-block-video');

  const header = createCardLink(preview.url, 'embed-block-link embed-block-link-compact');
  header.appendChild(createCardBody({
    url: preview.url,
    title: preview.title || translate('editor.embed.videoTitle'),
    description: getRemoteUrlHostname(preview.url),
    siteName: preview.provider === 'youtube' ? 'YouTube' : translate('editor.embed.videoLabel'),
  }));
  wrapper.appendChild(header);

  const media = document.createElement('div');
  media.className = 'embed-block-media';

  if (preview.embedUrl) {
    const frame = document.createElement('iframe');
    frame.className = 'embed-block-frame';
    frame.src = preview.embedUrl;
    frame.title = preview.title || translate('editor.embed.videoTitle');
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    frame.allowFullscreen = true;
    frame.setAttribute('data-testid', 'embed-video-frame');
    media.appendChild(frame);
  } else if (preview.sourceUrl) {
    const video = document.createElement('video');
    video.className = 'embed-block-video';
    video.src = preview.sourceUrl;
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    if (preview.posterUrl) {
      video.poster = preview.posterUrl;
    }
    video.setAttribute('data-testid', 'embed-video-player');
    media.appendChild(video);
  }

  wrapper.appendChild(media);
  return wrapper;
}

function createCardWrapper(kind: string): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'embed-block-card';
  wrapper.setAttribute('data-testid', `embed-block-${kind}`);
  return wrapper;
}

function createCardLink(href: string, className: string, testId?: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = className;
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  if (testId) {
    link.setAttribute('data-testid', testId);
  }
  return link;
}

function createCardBody(preview: {
  title: string;
  description?: string;
  siteName?: string;
  url: string;
}) {
  const body = document.createElement('div');
  body.className = 'embed-block-body';

  const siteName = document.createElement('span');
  siteName.className = 'embed-block-site';
  siteName.textContent = preview.siteName || getRemoteUrlHostname(preview.url);

  const title = document.createElement('h4');
  title.className = 'embed-block-title';
  title.textContent = preview.title;

  body.append(siteName, title);

  if (preview.description) {
    const description = document.createElement('p');
    description.className = 'embed-block-description';
    description.textContent = preview.description;
    body.appendChild(description);
  }

  return body;
}

function createThumbnail(src: string, alt: string): HTMLDivElement {
  const media = document.createElement('div');
  media.className = 'embed-block-thumbnail';

  const image = document.createElement('img');
  image.src = src;
  image.alt = alt;
  image.loading = 'lazy';

  media.appendChild(image);
  return media;
}

function buildFallbackPreview(url: string): Extract<LinkPreviewPayload, { kind: 'generic' }> {
  return {
    kind: 'generic',
    url,
    title: url || translate('editor.embed.unavailable'),
    description: url ? getRemoteUrlHostname(url) : translate('editor.embed.unavailableDescription'),
    siteName: getRemoteUrlHostname(url),
  };
}

function escapeAttribute(raw: string): string {
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
