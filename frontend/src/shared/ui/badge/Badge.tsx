import type { ReactNode } from 'react';
import styles from './Badge.module.scss';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  className?: string;
}

export function Badge({
  children,
  tone = 'neutral',
  size = 'sm',
  className,
}: BadgeProps) {
  return (
    <span
      className={[
        styles.badge,
        styles[tone],
        styles[size],
        className ?? '',
      ].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  );
}
