import styles from './ToggleView.module.scss';

interface ToggleViewProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
  className?: string;
}

export function ToggleView({ value, onChange, disabled, className }: ToggleViewProps) {
  const classNames = [
    styles.toggle,
    value ? styles.toggleOn : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classNames}
      onClick={() => onChange(!value)}
      disabled={disabled}
    />
  );
}
