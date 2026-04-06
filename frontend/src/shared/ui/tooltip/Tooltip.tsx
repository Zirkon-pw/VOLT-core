import { useId, useState, type ReactNode } from 'react';
import styles from './Tooltip.module.scss';

export type TooltipSide = 'top' | 'bottom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className={[styles.root, className ?? ''].filter(Boolean).join(' ')}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span className={styles.trigger} aria-describedby={open ? tooltipId : undefined}>
        {children}
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className={[
          styles.tooltip,
          styles[side],
          open ? styles.open : '',
        ].filter(Boolean).join(' ')}
      >
        {content}
      </span>
    </span>
  );
}
