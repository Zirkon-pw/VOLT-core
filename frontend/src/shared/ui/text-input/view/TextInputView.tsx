import { ChangeEventHandler } from 'react';
import styles from './TextInputView.module.scss';

interface TextInputViewProps {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  label?: string;
  error?: string;
  autoFocus: boolean;
  disabled: boolean;
  className?: string;
}

export function TextInputView({
  value,
  onChange,
  placeholder,
  label,
  error,
  autoFocus,
  disabled,
  className,
}: TextInputViewProps) {
  const inputClasses = [
    styles.input,
    error ? styles.inputError : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {label && <label className={styles.label}>{label}</label>}
      <input
        type="text"
        className={inputClasses}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
