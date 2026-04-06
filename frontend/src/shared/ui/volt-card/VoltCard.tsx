import type { Volt } from '@plugins/vault-manager/model/types';
import { useI18n } from '@app/providers/I18nProvider';
import { Icon } from '@shared/ui/icon';
import styles from './VoltCard.module.scss';

interface VoltCardProps {
  volt: Volt;
  onDelete: (id: string) => void;
  onOpen: (volt: Volt) => void;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function VoltCard({ volt, onDelete, onOpen }: VoltCardProps) {
  const { effectiveLocale, t } = useI18n();

  const handleClick = () => {
    onOpen(volt);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(volt.id);
  };

  return (
    <div className={styles.card} onClick={handleClick}>
      <button
        className={styles.deleteButton}
        onClick={handleDelete}
        aria-label={t('volt.delete')}
      >
        <Icon name="close" size={14} />
      </button>
      <span className={styles.name}>{volt.name}</span>
      <span className={styles.path} title={volt.path}>
        {volt.path}
      </span>
      <span className={styles.date}>{formatDate(volt.createdAt, effectiveLocale)}</span>
    </div>
  );
}
