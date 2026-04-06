import { useSearchPopup } from '../hooks/useSearchPopup';
import { FileSearchResults } from './FileSearchResults';
import { CommandPaletteResults } from './CommandPaletteResults';
import styles from './SearchPopup.module.scss';

interface SearchPopupProps {
  isOpen: boolean;
  initialQuery?: string;
  openToken?: number;
  onClose: () => void;
  voltId: string;
  voltPath: string;
  onToggleSidebar: () => void;
}

export function SearchPopup({
  isOpen,
  initialQuery = '',
  openToken = 0,
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
  } = useSearchPopup(isOpen, initialQuery, openToken, onClose, voltId, voltPath, onToggleSidebar);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} data-testid="workspace-search-popup" onClick={handleOverlayClick}>
      <div className={styles.popup} onKeyDown={handleKeyDown}>
        <div className={styles.inputWrapper}>
          <input
            ref={inputRef}
            data-testid="workspace-search-input"
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
