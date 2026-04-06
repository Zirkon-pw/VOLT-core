import styles from './Divider.module.scss';

export type DividerOrientation = 'horizontal' | 'vertical';

interface DividerProps {
  orientation?: DividerOrientation;
  inset?: boolean;
  className?: string;
}

export function Divider({
  orientation = 'horizontal',
  inset = false,
  className,
}: DividerProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        styles.divider,
        styles[orientation],
        inset ? styles.inset : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
    />
  );
}
