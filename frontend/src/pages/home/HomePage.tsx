import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoltStore } from '@entities/volt';
import { useWorkspaceStore } from '@entities/workspace';
import { Button } from '@shared/ui/button';
import { TextInput } from '@shared/ui/text-input';
import { Modal } from '@shared/ui/modal';
import { useI18n } from '@app/providers/I18nProvider';
import { VoltCard } from '@shared/ui/volt-card';
import { selectDirectory } from '@shared/api/volt';
import voltLogo from '@shared/assets/volt-logo.svg';
import styles from './HomePage.module.scss';

export function HomePage() {
  const { t } = useI18n();
  const { volts, loading, error, fetchVolts, createVolt, deleteVolt } =
    useVoltStore();
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace);
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [voltName, setVoltName] = useState('');
  const [voltPath, setVoltPath] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchVolts();
  }, [fetchVolts]);

  const handleOpenModal = () => {
    setVoltName('');
    setVoltPath('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleSelectDirectory = async () => {
    try {
      const dir = await selectDirectory();
      if (dir) {
        setVoltPath(dir);
      }
    } catch {
      // User cancelled or error
    }
  };

  const handleCreate = async () => {
    if (!voltName.trim() || !voltPath.trim()) return;
    setCreating(true);
    const result = await createVolt(voltName.trim(), voltPath.trim());
    setCreating(false);
    if (result) {
      setModalOpen(false);
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

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.brand}>
            <img className={styles.logo} src={voltLogo} alt={t('home.logoAlt')} />
            <div className={styles.brandCopy}>
              <span className={styles.kicker}>{t('home.kicker')}</span>
              <h1 className={styles.title}>volt</h1>
              <p className={styles.subtitle}>
                {t('home.subtitle')}
              </p>
            </div>
          </div>
          <Button variant="primary" size="md" onClick={handleOpenModal}>
            {t('home.newVolt')}
          </Button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {!loading && volts.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyText}>{t('home.emptyTitle')}</span>
            <span className={styles.emptyHint}>
              {t('home.emptyHint')}
            </span>
            <Button variant="secondary" size="lg" onClick={handleOpenModal}>
              {t('home.createFirstVolt')}
            </Button>
          </div>
        ) : (
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
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={t('home.modal.title')}>
        <TextInput
          label={t('home.modal.nameLabel')}
          placeholder={t('home.modal.namePlaceholder')}
          value={voltName}
          onChange={(e) => setVoltName(e.target.value)}
          autoFocus
        />

        <div className={styles.modalField}>
          <span className={styles.modalLabel}>{t('home.modal.locationLabel')}</span>
          <div className={styles.directorySelector}>
            <div
              className={`${styles.directoryPath} ${voltPath ? styles.directoryPathSelected : ''}`}
              title={voltPath}
            >
              {voltPath || t('home.modal.noDirectory')}
            </div>
            <Button variant="secondary" size="sm" onClick={handleSelectDirectory}>
              {t('home.modal.browse')}
            </Button>
          </div>
        </div>

        <div className={styles.modalActions}>
          <Button variant="ghost" size="md" onClick={handleCloseModal}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleCreate}
            disabled={!voltName.trim() || !voltPath.trim() || creating}
          >
            {creating ? t('home.modal.creating') : t('home.modal.create')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
