import { useEffect, useRef } from 'react';
import { useI18n } from '@app/providers/I18nProvider';
import {
  markPluginPageRendered,
  runPluginPageCleanup,
  usePluginRegistryStore,
} from '@kernel/plugin-system/model';
import { safeExecute } from '@kernel/plugin-system/runtime';

interface PluginPageHostProps {
  pageId: string;
  className?: string;
}

export function PluginPageHost({ pageId, className }: PluginPageHostProps) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const page = usePluginRegistryStore((state) =>
    state.pluginPages.find((entry) => entry.id === pageId) ?? null,
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !page) {
      return;
    }

    container.innerHTML = '';
    markPluginPageRendered(page.id);
    safeExecute(page.pluginId, `page:${page.id}:render`, () => {
      page.render(container);
    });

    return () => {
      runPluginPageCleanup(page);
      container.innerHTML = '';
    };
  }, [page]);

  if (!page) {
    return (
      <div className={className} style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
        {t('plugins.pageUnavailable')}
      </div>
    );
  }

  return <div ref={containerRef} className={className} style={{ flex: 1, minWidth: 0, minHeight: 0 }} />;
}
