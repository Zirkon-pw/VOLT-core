import { icons, isCustomSvgIcon, type IconSource } from './icons';
import styles from './Icon.module.scss';

interface IconProps {
  name: IconSource;
  size?: number;
  className?: string;
}

function normalizeCustomSvg(svg: string): string | null {
  const trimmed = svg.trim();
  if (!/^<svg\b/i.test(trimmed)) {
    return null;
  }

  const withoutScripts = trimmed
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z-]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '');

  return withoutScripts.replace(/<svg\b([^>]*)>/i, '<svg$1 width="100%" height="100%" aria-hidden="true" focusable="false">');
}

export function Icon({ name, size = 16, className }: IconProps) {
  if (isCustomSvgIcon(name)) {
    const markup = normalizeCustomSvg(name.svg);
    if (markup) {
      return (
        <span
          className={`${styles.icon} ${styles.customSvg} ${className ?? ''}`}
          style={{ width: size, height: size }}
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      );
    }
  }

  const builtInName = typeof name === 'string' ? name : 'file';
  const pathData = icons[builtInName];
  const paths = pathData.split('|');

  return (
    <svg
      className={`${styles.icon} ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export type { IconSource };
