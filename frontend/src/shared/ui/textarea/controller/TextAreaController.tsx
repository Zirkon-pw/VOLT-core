import { TextAreaProps } from '../model/types';
import { TextAreaView } from '../view/TextAreaView';

export function TextArea({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  className,
  rows = 3,
}: TextAreaProps) {
  return (
    <TextAreaView
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      rows={rows}
    />
  );
}
