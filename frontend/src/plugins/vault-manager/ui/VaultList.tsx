import { useEffect } from 'react';
import { useVaultStore } from '../VaultStore';
import { VoltCard } from '@shared/ui/volt-card/VoltCard';

interface VaultListProps {
  onOpenVault?: (vault: { id: string; name: string; path: string }) => void;
}

export function VaultList({ onOpenVault }: VaultListProps) {
  const volts = useVaultStore((state) => state.volts);
  const loading = useVaultStore((state) => state.loading);
  const fetchVolts = useVaultStore((state) => state.fetchVolts);

  useEffect(() => {
    void fetchVolts();
  }, [fetchVolts]);

  if (loading) {
    return null;
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
      {volts.map((volt) => (
        <VoltCard
          key={volt.id}
          volt={volt}
          onOpen={(nextVolt) => {
            onOpenVault?.(nextVolt);
          }}
          onDelete={() => undefined}
        />
      ))}
    </div>
  );
}
