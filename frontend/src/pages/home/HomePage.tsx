import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@kernel/workspace/core/WorkspaceStore';
import { selectDirectory, useVaultStore } from '@plugins/vault-manager';
import { Button } from '@shared/ui/button';
import { TextInput } from '@shared/ui/text-input';
import { Modal } from '@shared/ui/modal';
import { Icon } from '@shared/ui/icon';
import { VoltLogo } from '@shared/ui/volt-logo';
import { useI18n } from '@app/providers/I18nProvider';
import { VoltCard } from '@shared/ui/volt-card';
import styles from './HomePage.module.scss';

type HomeModalMode = 'create' | 'attach' | null;

function sanitizeDirectoryName(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPathBasename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

function joinPath(parentPath: string, childName: string): string {
  if (!parentPath) return childName;
  const separator = parentPath.includes('\\') && !parentPath.includes('/') ? '\\' : '/';
  return `${parentPath.replace(/[\\/]+$/, '')}${separator}${childName}`;
}

export function HomePage() {
  const { t } = useI18n();
  const {
    volts,
    loading,
    error,
    fetchVolts,
    createVolt,
    createVoltInParent,
    deleteVolt,
    clearError,
  } = useVaultStore();
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const navigate = useNavigate();

  const [modalMode, setModalMode] = useState<HomeModalMode>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [directoryName, setDirectoryName] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [directoryNameEdited, setDirectoryNameEdited] = useState(false);
  const [workspaceNameEdited, setWorkspaceNameEdited] = useState(false);

  useEffect(() => {
    fetchVolts();
  }, [fetchVolts]);

  const previewPath = useMemo(() => {
    if (modalMode !== 'create' || !selectedPath || !directoryName.trim()) {
      return '';
    }
    return joinPath(selectedPath, sanitizeDirectoryName(directoryName));
  }, [directoryName, modalMode, selectedPath]);

  const resetModalState = () => {
    clearError();
    setWorkspaceName('');
    setDirectoryName('');
    setSelectedPath('');
    setSubmitting(false);
    setFormError(null);
    setDirectoryNameEdited(false);
    setWorkspaceNameEdited(false);
  };

  const openModal = (mode: Exclude<HomeModalMode, null>) => {
    resetModalState();
    setModalMode(mode);
  };

  const closeModal = () => {
    resetModalState();
    setModalMode(null);
  };

  const handleWorkspaceNameChange = (value: string) => {
    setWorkspaceName(value);
    setWorkspaceNameEdited(true);

    if (modalMode === 'create' && !directoryNameEdited) {
      setDirectoryName(sanitizeDirectoryName(value));
    }
  };

  const handleDirectorySelect = async () => {
    try {
      const dir = await selectDirectory();
      if (!dir) return;

      setSelectedPath(dir);
      setFormError(null);
      clearError();

      if (modalMode === 'attach' && !workspaceNameEdited) {
        setWorkspaceName(getPathBasename(dir));
      }
    } catch {
      // User cancelled or dialog failed.
    }
  };

  const validateForm = (): string | null => {
    if (!workspaceName.trim()) {
      return t('home.validation.nameRequired');
    }

    if (!selectedPath.trim()) {
      return modalMode === 'create' ? t('home.validation.parentRequired') : t('home.validation.locationRequired');
    }

    if (modalMode === 'create') {
      const nextDirectoryName = sanitizeDirectoryName(directoryName);
      if (!nextDirectoryName) {
        return t('home.validation.folderNameRequired');
      }
      if (/[\\/]/.test(directoryName)) {
        return t('home.validation.folderNameInvalid');
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    clearError();

    try {
      if (modalMode === 'create') {
        await createVoltInParent(
          workspaceName.trim(),
          selectedPath.trim(),
          sanitizeDirectoryName(directoryName),
        );
      } else if (modalMode === 'attach') {
        await createVolt(workspaceName.trim(), selectedPath.trim());
      }

      closeModal();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteVolt(id);
  };

  const handleOpenVolt = (volt: { id: string; name: string; path: string }) => {
    openWorkspace({
      voltId: volt.id,
      voltName: volt.name,
      voltPath: volt.path,
    });
    navigate(`/workspace/${volt.id}`);
  };

  const modalTitle = modalMode === 'create' ? t('home.modal.createTitle') : t('home.modal.attachTitle');
  const submitLabel = modalMode === 'create'
    ? (submitting ? t('home.modal.creating') : t('home.modal.create'))
    : (submitting ? t('home.modal.adding') : t('home.modal.add'));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.logoWrap}>
              <VoltLogo className={styles.logo} title={t('home.logoAlt')} />
            </div>
            <div className={styles.brandTitle}>Volt</div>
            <div className={styles.brandSubtitle}>{t('home.subtitle')}</div>
            <div className={styles.actionCluster}>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.actionCreate}`}
                data-testid="home-create-workspace"
                aria-label={t('home.actions.create.aria')}
                onClick={() => openModal('create')}
              >
                <Icon name="plus" size={16} />
                {t('home.actions.create.title')}
              </button>
              <button
                type="button"
                className={`${styles.actionButton} ${styles.actionAttach}`}
                data-testid="home-attach-workspace"
                aria-label={t('home.actions.attach.aria')}
                onClick={() => openModal('attach')}
              >
                <Icon name="folderOpen" size={16} />
                {t('home.actions.attach.title')}
              </button>
            </div>
          </div>
        </header>

        {error && modalMode == null && <div className={styles.error}>{error}</div>}

        {!loading && volts.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <Icon name="folderOpen" size={28} />
            </div>
            <span className={styles.emptyText}>{t('home.emptyTitle')}</span>
            <span className={styles.emptyHint}>{t('home.emptyHint')}</span>
          </div>
        ) : (
          <>
            {volts.length > 0 && (
              <div className={styles.sectionTitle}>{t('home.section.workspaces')}</div>
            )}
            <div className={styles.grid}>
              {volts.map((volt) => (
                <VoltCard
                  key={volt.id}
                  volt={volt}
                  onDelete={handleDelete}
                  onOpen={handleOpenVolt}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Modal isOpen={modalMode != null} onClose={closeModal} title={modalTitle}>
        <TextInput
          label={t('home.modal.nameLabel')}
          placeholder={t('home.modal.namePlaceholder')}
          value={workspaceName}
          onChange={(e) => handleWorkspaceNameChange(e.target.value)}
          autoFocus
        />

        {modalMode === 'create' ? (
          <>
            <div className={styles.modalField}>
              <span className={styles.modalLabel}>{t('home.modal.parentLabel')}</span>
              <div className={styles.directorySelector}>
                <div
                  className={`${styles.directoryPath} ${selectedPath ? styles.directoryPathSelected : ''}`}
                  title={selectedPath}
                >
                  {selectedPath || t('home.modal.noDirectory')}
                </div>
                <Button variant="secondary" size="sm" onClick={handleDirectorySelect}>
                  {t('home.modal.browse')}
                </Button>
              </div>
            </div>

            <TextInput
              label={t('home.modal.directoryNameLabel')}
              placeholder={t('home.modal.directoryNamePlaceholder')}
              value={directoryName}
              onChange={(e) => {
                setDirectoryNameEdited(true);
                setDirectoryName(e.target.value);
              }}
            />

            <div className={styles.modalField}>
              <span className={styles.modalLabel}>{t('home.modal.previewLabel')}</span>
              <div
                className={`${styles.directoryPath} ${previewPath ? styles.directoryPathSelected : ''}`}
                data-testid="home-modal-path-preview"
                title={previewPath}
              >
                {previewPath || t('home.modal.noDirectory')}
              </div>
            </div>
          </>
        ) : (
          <div className={styles.modalField}>
            <span className={styles.modalLabel}>{t('home.modal.locationLabel')}</span>
            <div className={styles.directorySelector}>
              <div
                className={`${styles.directoryPath} ${selectedPath ? styles.directoryPathSelected : ''}`}
                title={selectedPath}
              >
                {selectedPath || t('home.modal.noDirectory')}
              </div>
              <Button variant="secondary" size="sm" onClick={handleDirectorySelect}>
                {t('home.modal.browse')}
              </Button>
            </div>
          </div>
        )}

        {(formError ?? error) && <div className={styles.inlineError}>{formError ?? error}</div>}

        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={closeModal}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitLabel}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
