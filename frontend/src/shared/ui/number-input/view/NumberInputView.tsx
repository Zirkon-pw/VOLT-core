import styles from './NumberInputView.module.scss';

interface NumberInputViewProps {
  value: string;
  onChange: (raw: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder: string;
  disabled: boolean;
  className?: string;
}

export function NumberInputView({
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  disabled,
  className,
}: NumberInputViewProps) {
  const classNames = [styles.input, className ?? ''].filter(Boolean).join(' ');

  return (
    <input
      type="number"
      className={classNames}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
