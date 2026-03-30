import { ChangeEventHandler } from 'react';

export interface TextAreaProps {
  value: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
}
