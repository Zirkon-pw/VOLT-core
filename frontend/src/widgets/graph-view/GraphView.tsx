import { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape, { type Core, type NodeSingular } from 'cytoscape';
import { useI18n } from '@app/providers/I18nProvider';
import { useTheme } from '@app/providers/ThemeProvider';
import { getGraph } from '@api/graph/graphApi';
import { Icon } from '@uikit/icon';
import styles from './GraphView.module.scss';

interface GraphViewProps {
  voltPath: string;
  onNodeOpen?: (filePath: string) => void;
}

function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function nodeSize(linkCount: number): number {
  // min 14, max 48, scaled by link count
  return Math.min(48, 14 + linkCount * 5);
}

function buildStylesheet(): cytoscape.StylesheetStyle[] {
  const accent = getCssVar('--color-accent') || '#2eaadc';
  const accentHover = getCssVar('--color-accent-hover') || '#2496c4';
  const textPrimary = getCssVar('--color-text-primary') || '#37352f';
  const textSecondary = getCssVar('--color-text-secondary') || '#787774';
  const bgPrimary = getCssVar('--color-bg-primary') || '#ffffff';

  return [
    {
      selector: 'node',
      style: {
        'background-color': accent,
        'background-opacity': 0.85,
        'label': 'data(label)',
        'font-size': '10px',
        'font-family': '-apple-system, BlinkMacSystemFont, sans-serif',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 5,
        'text-max-width': '80px',
        'text-wrap': 'ellipsis',
        'width': 'data(size)',
        'height': 'data(size)',
        'color': textPrimary,
        'border-width': 2,
        'border-color': bgPrimary,
        'border-opacity': 0.6,
        'overlay-opacity': 0,
        'transition-property': 'width, height, background-color, opacity, border-width',
        'transition-duration': 150,
      } as any,
    },
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': textSecondary,
        'line-opacity': 0.5,
        'curve-style': 'straight',
        'target-arrow-shape': 'none',
        'overlay-opacity': 0,
        'transition-property': 'line-opacity, line-color, width',
        'transition-duration': 150,
      } as any,
    },
    // Highlighted (hovered) node
    {
      selector: 'node.highlight',
      style: {
        'background-color': accentHover,
        'background-opacity': 1,
        'border-width': 3,
        'border-color': accent,
        'border-opacity': 1,
        'z-index': 10,
      } as any,
    },
    // Neighbor of highlighted node
    {
      selector: 'node.neighbor',
      style: {
        'background-opacity': 1,
        'border-width': 2,
        'border-color': accent,
        'border-opacity': 0.5,
      } as any,
    },
    // Edges connected to highlighted node
    {
      selector: 'edge.highlight',
      style: {
        'line-color': accent,
        'line-opacity': 0.9,
        'width': 2.5,
        'z-index': 10,
      } as any,
    },
    // Dimmed elements (not connected to highlighted)
    {
      selector: 'node.dimmed',
      style: {
        'opacity': 0.12,
      },
    },
    {
      selector: 'edge.dimmed',
      style: {
        'line-opacity': 0.06,
      } as any,
    },
    // Search match
    {
      selector: 'node.searchMatch',
      style: {
        'background-color': accentHover,
        'background-opacity': 1,
        'border-width': 3,
        'border-color': accent,
        'border-opacity': 1,
      } as any,
    },
    {
      selector: 'node.searchDimmed',
      style: {
        'opacity': 0.15,
      },
    },
    {
      selector: 'edge.searchDimmed',
      style: {
        'line-opacity': 0.05,
      } as any,
    },
  ];
}

const LAYOUT_OPTIONS: cytoscape.LayoutOptions = {
  name: 'cose',
  animate: false,
  nodeRepulsion: () => 12000,
  idealEdgeLength: () => 120,
  gravity: 0.15,
  numIter: 500,
  nodeDimensionsIncludeLabels: true,
} as any;

export function GraphView({ voltPath, onNodeOpen }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const { theme } = useTheme();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);
  const [hoverInfo, setHoverInfo] = useState<{
    name: string;
    path: string;
    links: number;
    words: number;
    x: number;
    y: number;
  } | null>(null);

  const initCytoscape = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      const data = await getGraph(voltPath);

      const nodes = (data.nodes || []).map((node) => ({
        group: 'nodes' as const,
        data: {
          id: node.id,
          label: node.name,
          path: node.path,
          linkCount: node.linkCount,
          wordCount: node.wordCount,
          size: nodeSize(node.linkCount),
        },
      }));

      const edges = (data.edges || []).map((edge, i) => ({
        group: 'edges' as const,
        data: { id: `e${i}`, source: edge.source, target: edge.target },
      }));

      setNodeCount(nodes.length);
      setEdgeCount(edges.length);

      if (cyRef.current) {
        cyRef.current.destroy();
      }

      const cy = cytoscape({
        container: containerRef.current,
        elements: [...nodes, ...edges],
        style: buildStylesheet(),
        layout: LAYOUT_OPTIONS,
        minZoom: 0.1,
        maxZoom: 4,
        wheelSensitivity: 0.3,
        pixelRatio: 'auto',
      });

      // --- Hover: highlight neighbors ---
      cy.on('mouseover', 'node', (evt) => {
        const node = evt.target as NodeSingular;
        const neighborhood = node.closedNeighborhood();

        cy.elements().addClass('dimmed');
        neighborhood.removeClass('dimmed');

        node.addClass('highlight');
        neighborhood.nodes().not(node).addClass('neighbor');
        neighborhood.edges().addClass('highlight');

        // Info panel
        const pos = node.renderedPosition();
        setHoverInfo({
          name: node.data('label'),
          path: node.data('path'),
          links: node.data('linkCount'),
          words: node.data('wordCount'),
          x: pos.x,
          y: pos.y,
        });

        containerRef.current!.style.cursor = 'pointer';
      });

      cy.on('mouseout', 'node', () => {
        cy.elements().removeClass('dimmed highlight neighbor');
        setHoverInfo(null);
        containerRef.current!.style.cursor = 'default';
      });

      // --- Click: open file ---
      cy.on('tap', 'node', (evt) => {
        const nodeData = evt.target.data();
        if (onNodeOpen && nodeData.path) {
          onNodeOpen(nodeData.path);
        }
      });

      // --- Double-click: center on node ---
      cy.on('dbltap', 'node', (evt) => {
        cy.animate({
          center: { eles: evt.target },
          zoom: 2,
        } as any, {
          duration: 300,
        });
      });

      // Fit after layout
      cy.one('layoutstop', () => {
        cy.fit(undefined, 40);
      });

      cyRef.current = cy;
    } catch (err) {
      console.error('Failed to load graph:', err);
    }
  }, [voltPath, onNodeOpen]);

  useEffect(() => {
    initCytoscape();
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [initCytoscape]);

  // Re-apply styles on theme change
  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.style(buildStylesheet());
    }
  }, [theme]);

  // Search filter
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Clear all search classes
    cy.elements().removeClass('searchMatch searchDimmed');

    if (!search.trim()) return;

    const query = search.toLowerCase();
    const matched = cy.nodes().filter((n) =>
      n.data('label').toLowerCase().includes(query),
    );

    if (matched.length > 0) {
      cy.elements().addClass('searchDimmed');
      matched.removeClass('searchDimmed').addClass('searchMatch');
      // Also un-dim edges between matched nodes
      matched.edgesWith(matched).removeClass('searchDimmed');
    }
  }, [search]);

  const handleZoomIn = () => {
    const cy = cyRef.current;
    if (cy) cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };

  const handleZoomOut = () => {
    const cy = cyRef.current;
    if (cy) cy.zoom({ level: cy.zoom() / 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };

  const handleFit = () => {
    cyRef.current?.fit(undefined, 40);
  };

  const handleResetLayout = () => {
    const cy = cyRef.current;
    if (cy) {
      cy.layout(LAYOUT_OPTIONS).run();
      cy.one('layoutstop', () => cy.fit(undefined, 40));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Icon name="search" size={14} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder={t('graph.filterPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setSearch(''); }}
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => setSearch('')}>
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
        <div className={styles.toolbarActions}>
          <button className={styles.toolBtn} onClick={handleZoomIn} title={t('graph.zoomIn')}>
            <Icon name="zoomIn" size={15} />
          </button>
          <button className={styles.toolBtn} onClick={handleZoomOut} title={t('graph.zoomOut')}>
            <Icon name="zoomOut" size={15} />
          </button>
          <button className={styles.toolBtn} onClick={handleFit} title={t('graph.fit')}>
            <Icon name="maximize" size={15} />
          </button>
          <button className={styles.toolBtn} onClick={handleResetLayout} title={t('graph.resetLayout')}>
            <Icon name="refreshCw" size={15} />
          </button>
        </div>
        <div className={styles.stats}>
          <span>{t('graph.stats.nodes', { count: nodeCount })}</span>
          <span className={styles.statDot} />
          <span>{t('graph.stats.edges', { count: edgeCount })}</span>
        </div>
      </div>
      <div className={styles.canvasWrap}>
        <div className={styles.canvas} ref={containerRef} />
        {hoverInfo && (
          <div
            className={styles.infoPanel}
            style={{
              left: Math.min(hoverInfo.x + 16, (containerRef.current?.clientWidth || 300) - 180),
              top: Math.max(hoverInfo.y - 20, 8),
            }}
          >
            <div className={styles.infoName}>{hoverInfo.name}</div>
            <div className={styles.infoPath}>{hoverInfo.path}</div>
            <div className={styles.infoMeta}>
              {t('graph.meta', { links: hoverInfo.links, words: hoverInfo.words })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
