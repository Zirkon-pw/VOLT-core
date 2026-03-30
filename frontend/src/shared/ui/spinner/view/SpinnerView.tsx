import type { SpinnerProps } from '../model/types';
import styles from './SpinnerView.module.scss';

export function SpinnerView({ size = 'md' }: SpinnerProps) {
  return <div className={`${styles.spinner} ${styles[size]}`} />;
}
