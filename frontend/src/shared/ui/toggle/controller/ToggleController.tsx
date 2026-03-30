import { ToggleProps } from '../model/types';
import { ToggleView } from '../view/ToggleView';

export function Toggle({
  value,
  onChange,
  disabled = false,
  className,
}: ToggleProps) {
  return (
    <ToggleView
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={className}
    />
  );
}
