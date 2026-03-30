import { TextInputProps } from '../model/types';
import { TextInputView } from '../view/TextInputView';

export function TextInput({
  value,
  onChange,
  placeholder = '',
  label,
  error,
  autoFocus = false,
  disabled = false,
  className,
}: TextInputProps) {
  return (
    <TextInputView
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      label={label}
      error={error}
      autoFocus={autoFocus}
      disabled={disabled}
      className={className}
    />
  );
}
