import { ChangeEventHandler } from 'react';
import styles from './TextAreaView.module.scss';

interface TextAreaViewProps {
  value: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  placeholder: string;
  disabled: boolean;
  className?: string;
  rows: number;
}

export function TextAreaView({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  rows,
}: TextAreaViewProps) {
  const classNames = [styles.textarea, className ?? ''].filter(Boolean).join(' ');

  return (
    <textarea
      className={classNames}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
    />
  );
}
