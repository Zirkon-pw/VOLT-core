import { usePluginRegistryStore } from '@entities/plugin';
import { Icon } from '@shared/ui/icon';
import styles from './WorkspaceToolbar.module.scss';

export function WorkspaceToolbar() {
  const toolbarButtons = usePluginRegistryStore((state) => state.toolbarButtons);

  if (toolbarButtons.length === 0) {
    return null;
  }

  return (
    <div className={styles.toolbar}>
      {toolbarButtons.map((button) => (
        <button
          key={button.id}
          type="button"
          className={styles.button}
          onClick={button.callback}
          title={button.label}
          aria-label={button.label}
        >
          <Icon name={button.icon} size={16} />
        </button>
      ))}
    </div>
  );
}
