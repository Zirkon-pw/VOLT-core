import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspaceStore } from '@entities/workspace';
import { loadAllPlugins, unloadAllPlugins } from '@shared/lib/plugin-runtime';
import { PluginPageHost } from '@widgets/plugin-page';

export function PluginRoutePage() {
  const { voltId, pageId: rawPageId } = useParams<{ voltId: string; pageId: string }>();
  const navigate = useNavigate();
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const workspace = workspaces.find((entry) => entry.voltId === voltId);
  const pageId = rawPageId ? decodeURIComponent(rawPageId) : '';

  useEffect(() => {
    if (workspace) {
      void loadAllPlugins(workspace.voltPath);
    }

    return () => {
      unloadAllPlugins();
    };
  }, [workspace]);

  useEffect(() => {
    if (voltId && workspace) {
      if (activeWorkspaceId !== voltId) {
        setActiveWorkspace(voltId);
      }
    } else if (!workspace && voltId) {
      navigate('/');
    }
  }, [activeWorkspaceId, navigate, setActiveWorkspace, voltId, workspace]);

  useEffect(() => {
    const handlePluginNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ voltId: string; pageId: string }>).detail;
      if (!detail || detail.voltId !== voltId) {
        return;
      }

      navigate(`/workspace/${detail.voltId}/plugin/${encodeURIComponent(detail.pageId)}`);
    };

    window.addEventListener('volt:navigate-plugin-page', handlePluginNavigation);
    return () => {
      window.removeEventListener('volt:navigate-plugin-page', handlePluginNavigation);
    };
  }, [navigate, voltId]);

  useEffect(() => {
    const handlePluginUnload = (event: Event) => {
      const detail = (event as CustomEvent<{ pluginId: string }>).detail;
      if (!detail?.pluginId || !pageId.startsWith(`${detail.pluginId}:`) || !voltId) {
        return;
      }

      navigate(`/workspace/${voltId}`);
    };

    window.addEventListener('volt:plugin-unloaded', handlePluginUnload);
    return () => {
      window.removeEventListener('volt:plugin-unloaded', handlePluginUnload);
    };
  }, [navigate, pageId, voltId]);

  if (!workspace || !voltId || !pageId) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <PluginPageHost
        pageId={pageId}
        className=""
      />
    </div>
  );
}
