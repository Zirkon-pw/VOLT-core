import { Icon } from '@shared/ui/icon';
import type { CommandPaletteItem } from './useSearchPopup';
import styles from './SearchPopup.module.scss';

interface CommandPaletteResultsProps {
  commands: CommandPaletteItem[];
  activeIndex: number;
  onSelect: (command: CommandPaletteItem) => void;
  onHover: (index: number) => void;
  emptyLabel: string;
}

export function CommandPaletteResults({
  commands,
  activeIndex,
  onSelect,
  onHover,
  emptyLabel,
}: CommandPaletteResultsProps) {
  if (commands.length === 0) {
    return <div className={styles.empty}>{emptyLabel}</div>;
  }

  return (
    <>
      {commands.map((command, i) => (
        <div
          key={command.id}
          className={`${styles.resultItem} ${i === activeIndex ? styles.active : ''}`}
          onClick={() => onSelect(command)}
          onMouseEnter={() => onHover(i)}
        >
          <span className={styles.resultIcon}>
            <Icon name={command.icon} size={14} />
          </span>
          <div className={styles.resultContent}>
            <div className={styles.resultHeader}>
              <span className={styles.resultFileName}>{command.title}</span>
              {command.hotkey && <span className={styles.hotkeyBadge}>{command.hotkey}</span>}
            </div>
            {command.subtitle && (
              <span className={styles.resultPath}>{command.subtitle}</span>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
