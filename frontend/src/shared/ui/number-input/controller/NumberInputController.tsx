import { NumberInputProps } from '../model/types';
import { NumberInputView } from '../view/NumberInputView';

function formatValue(value: number | ''): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  placeholder = '',
  disabled = false,
  className,
}: NumberInputProps) {
  const handleChange = (raw: string) => {
    onChange(raw === '' ? '' : Number(raw));
  };

  return (
    <NumberInputView
      value={formatValue(value)}
      onChange={handleChange}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
