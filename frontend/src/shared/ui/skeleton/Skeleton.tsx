import type { CSSProperties } from 'react';
import styles from './Skeleton.module.scss';

export type SkeletonRadius = 'sm' | 'md' | 'lg' | 'pill';

interface SkeletonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: SkeletonRadius;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  radius = 'md',
  className,
}: SkeletonProps) {
  return (
    <span
      className={[
        styles.skeleton,
        styles[radius],
        className ?? '',
      ].filter(Boolean).join(' ')}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
