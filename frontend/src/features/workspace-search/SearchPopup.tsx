import { useSearchPopup } from './useSearchPopup';
import { FileSearchResults } from './FileSearchResults';
import { CommandPaletteResults } from './CommandPaletteResults';
import styles from './SearchPopup.module.scss';

interface SearchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  voltId: string;
  voltPath: string;
  onToggleSidebar: () => void;
}

export function SearchPopup({
  isOpen,
  onClose,
  voltId,
  voltPath,
  onToggleSidebar,
}: SearchPopupProps) {
  const {
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    inputRef,
    resultsRef,
    isCommandMode,
    commandResults,
    highlightedResults,
    handleKeyDown,
    handleOverlayClick,
    handleSelect,
    handleCommandSelect,
    t,
  } = useSearchPopup(isOpen, onClose, voltId, voltPath, onToggleSidebar);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.popup} onKeyDown={handleKeyDown}>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder={t(isCommandMode ? 'search.commandPlaceholder' : 'search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={styles.results} ref={resultsRef}>
          {isCommandMode ? (
            <CommandPaletteResults
              commands={commandResults}
              activeIndex={activeIndex}
              onSelect={handleCommandSelect}
              onHover={setActiveIndex}
              emptyLabel={t('search.commandEmpty')}
            />
          ) : (
            <FileSearchResults
              results={highlightedResults}
              query={query}
              activeIndex={activeIndex}
              onSelect={handleSelect}
              onHover={setActiveIndex}
              emptyLabel={t('search.empty')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
