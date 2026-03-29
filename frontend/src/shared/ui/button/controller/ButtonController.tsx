import { ButtonProps } from '../model/types';
import { ButtonView } from '../view/ButtonView';

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  onClick,
  children,
  className,
  type = 'button',
}: ButtonProps) {
  return (
    <ButtonView
      variant={variant}
      size={size}
      disabled={disabled}
      fullWidth={fullWidth}
      onClick={onClick}
      className={className}
      type={type}
    >
      {children}
    </ButtonView>
  );
}
