import { SelectProps } from '../model/types';
import { SelectView } from '../view/SelectView';

export function Select({
  value,
  onChange,
  options,
  disabled = false,
  className,
}: SelectProps) {
  return (
    <SelectView
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      className={className}
    />
  );
}
