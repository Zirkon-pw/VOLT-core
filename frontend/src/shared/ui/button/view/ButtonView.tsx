import { MouseEventHandler, ReactNode } from 'react';
import { ButtonVariant, ButtonSize } from '../model/types';
import styles from './ButtonView.module.scss';

interface ButtonViewProps {
  variant: ButtonVariant;
  size: ButtonSize;
  disabled: boolean;
  fullWidth: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
  className?: string;
  type: 'button' | 'submit' | 'reset';
}

export function ButtonView({
  variant,
  size,
  disabled,
  fullWidth,
  onClick,
  children,
  className,
  type,
}: ButtonViewProps) {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
