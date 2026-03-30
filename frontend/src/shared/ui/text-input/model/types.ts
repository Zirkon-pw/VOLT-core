import { ChangeEventHandler } from 'react';

export interface TextInputProps {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  label?: string;
  error?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}
