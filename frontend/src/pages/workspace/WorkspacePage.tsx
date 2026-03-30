import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@entities/workspace';
import { loadAllPlugins, unloadAllPlugins } from '@shared/lib/plugin-runtime';
import { WorkspaceShell } from '@widgets/workspace-shell';

export function WorkspacePage() {
  const { voltId } = useParams<{ voltId: string }>();
  const navigate = useNavigate();
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const workspace = workspaces.find((w) => w.voltId === voltId);
  useEffect(() => {
    if (workspace) {
      void loadAllPlugins(workspace.voltPath);
    }

    return () => {
      void unloadAllPlugins();
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
  }, [voltId, workspace, activeWorkspaceId, setActiveWorkspace, navigate]);

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

  if (!workspace || !voltId) {
    return null;
  }

  return <WorkspaceShell voltId={voltId} voltPath={workspace.voltPath} />;
}
