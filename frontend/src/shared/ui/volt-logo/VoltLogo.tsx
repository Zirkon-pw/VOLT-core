import styles from './VoltLogo.module.scss';

interface VoltLogoProps {
  className?: string;
  title?: string;
}

export function VoltLogo({ className, title }: VoltLogoProps) {
  return (
    <svg
      className={`${styles.logo} ${className ?? ''}`}
      viewBox="0 0 129 149"
      role="img"
      aria-label={title}
    >
      <path
        className={styles.primary}
        d="M124.293 44.0427L58.0931 140.31L45.6315 77.6557L70.3281 9.85664L82.7897 72.5111L124.293 44.0427Z"
      />
      <path
        className={styles.secondary}
        d="M4.34512 104.957L70.5449 8.68982L83.0064 71.3443L58.3098 139.143L58.3098 76.4889L45.8482 76.4889L4.34512 104.957Z"
      />
    </svg>
  );
}
