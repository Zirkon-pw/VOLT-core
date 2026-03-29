import type { SelectOption } from '../model/types';
import styles from './SelectView.module.scss';

interface SelectViewProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled: boolean;
  className?: string;
}

export function SelectView({ value, onChange, options, disabled, className }: SelectViewProps) {
  const classNames = [styles.select, className ?? ''].filter(Boolean).join(' ');

  return (
    <select
      className={classNames}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
