import { test, expect } from '@playwright/test';

const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

async function gotoHarness(page: import('@playwright/test').Page) {
  await page.goto('/__playwright__/editor');
  await expect(page.getByTestId('playwright-editor-harness')).toBeVisible();
  await expect(page.locator('.ProseMirror')).toContainText('Alpha paragraph');
}

async function pasteClipboardText(page: import('@playwright/test').Page, text: string) {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(async (value) => {
    await navigator.clipboard.writeText(value);
  }, text);
  await page.keyboard.press(`${modKey}+V`);
}

async function expectNoAppOverflow(page: import('@playwright/test').Page) {
  await expect.poll(async () => page.evaluate(() => {
    const root = document.documentElement;
    return (
      root.scrollWidth - root.clientWidth <= 1
      && root.scrollHeight - root.clientHeight <= 1
      && window.scrollX === 0
      && window.scrollY === 0
    );
  })).toBe(true);
}

async function selectParagraphText(
  page: import('@playwright/test').Page,
  paragraphText: string,
  from: number,
  to: number,
) {
  await page.locator('.ProseMirror').click();
  await page.evaluate(({ paragraphText: text, from: start, to: end }) => {
    const paragraph = Array.from(document.querySelectorAll('.ProseMirror p'))
      .find((node) => node.textContent?.includes(text));

    if (!(paragraph instanceof HTMLElement)) {
      throw new Error(`Paragraph not found: ${text}`);
    }

    const textNode = Array.from(paragraph.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && (node.textContent?.length ?? 0) >= end,
    );

    if (!(textNode instanceof Text)) {
      throw new Error(`Paragraph text node not found: ${text}`);
    }

    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  }, { paragraphText, from, to });
}

test.beforeEach(async ({ page }) => {
  await gotoHarness(page);
});

test('opens command palette with the search shortcut and regular search with double shift', async ({ page }) => {
  const searchInput = page.getByTestId('workspace-search-input');

  await page.locator('.ProseMirror').click();
  await page.keyboard.press(`${modKey}+K`);
  await expect(page.getByTestId('workspace-search-popup')).toBeVisible();
  await expect(searchInput).toHaveValue('>');

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('workspace-search-popup')).toBeHidden();

  await page.getByTestId('playwright-editor-harness').click({ position: { x: 12, y: 12 } });
  await page.keyboard.press('Shift');
  await page.waitForTimeout(120);
  await page.keyboard.press('Shift');

  await expect(page.getByTestId('workspace-search-popup')).toBeVisible();
  await expect(searchInput).toHaveValue('');
});

test('finds matches in the current file with the file-search shortcut', async ({ page }) => {
  const editor = page.locator('.ProseMirror');
  const count = page.getByTestId('find-in-file-count');

  await editor.click();
  await page.keyboard.press(`${modKey}+F`);

  await expect(page.getByTestId('find-in-file-panel')).toBeVisible();
  await page.getByTestId('find-in-file-input').fill('paragraph');
  await expect(count).toContainText('1');
  await expect(count).toContainText('2');

  const firstRange = await page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getSelectionRange() ?? null);
  await page.keyboard.press('Enter');
  await expect(count).toContainText('2');
  await expect(count).toContainText('2');

  const secondRange = await page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getSelectionRange() ?? null);
  expect(secondRange).not.toEqual(firstRange);

  await page.keyboard.press('Shift+Enter');
  const thirdRange = await page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getSelectionRange() ?? null);
  expect(thirdRange).toEqual(firstRange);
});

test('keeps typed content instead of reloading the file', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Typed once and kept');

  await expect(editor).toContainText('Typed once and kept');
  await page.waitForTimeout(800);
  await expect(editor).toContainText('Typed once and kept');
});

test('lets you pick a color and closes on escape', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+a`);
  await page.getByTitle('Text color').click();
  const picker = page.getByTestId('color-picker');
  await expect(picker).toBeVisible();

  const hexInput = picker.locator('input[type="text"]').first();
  const before = await hexInput.inputValue();
  const hue = page.getByTestId('color-picker-hue');
  const hueBox = await hue.boundingBox();
  if (!hueBox) {
    throw new Error('Hue slider bounding box is not available');
  }

  await page.mouse.move(hueBox.x + 4, hueBox.y + hueBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(hueBox.x + hueBox.width - 4, hueBox.y + hueBox.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(hexInput).not.toHaveValue(before);

  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
});

test('closes the color picker on outside click', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+a`);
  await page.getByTitle('Text color').click();
  const picker = page.getByTestId('color-picker');
  await expect(picker).toBeVisible();

  await editor.click({ position: { x: 12, y: 96 } });
  await expect(picker).toBeHidden();
});

test('applies inline code from the bubble menu and serializes markdown with backticks', async ({ page }) => {
  await selectParagraphText(page, 'Alpha paragraph', 0, 5);

  await expect(page.getByTestId('text-bubble-menu')).toBeVisible();
  const inlineCodeButton = page.getByTestId('text-bubble-inline-code');
  await inlineCodeButton.click();

  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null))
    .toContain('`Alpha` paragraph');

  await inlineCodeButton.click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null))
    .not.toContain('`Alpha` paragraph');
});

test('opens external links and internal note links', async ({ page }) => {
  await page.locator('.ProseMirror a[href="https://example.com"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getOpenedUrl() ?? null)).toBe('https://example.com');

  await page.locator('.ProseMirror a[href="../files/spec.pdf"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('files/spec.pdf');

  await page.locator('[data-testid="file-tab"][data-path="notes/test.md"]').click();
  await page.locator('.ProseMirror a[href="../docs/guide.md"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('docs/guide.md');
});

test('opens files in a secondary pane with modifier-click and preserves the primary tab', async ({ page }) => {
  await expect(page.getByTestId('workspace-pane-primary')).toHaveAttribute('data-tab-id', 'notes/test.md');

  await page.keyboard.down(modKey);
  await page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]').click();
  await page.keyboard.up(modKey);

  await expect(page.getByTestId('workspace-pane-primary')).toHaveAttribute('data-tab-id', 'notes/test.md');
  await expect(page.getByTestId('workspace-pane-secondary')).toHaveAttribute('data-tab-id', 'notes/target.md');
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getWorkspaceView() ?? null)).toMatchObject({
    primaryTabId: 'notes/test.md',
    secondaryTabId: 'notes/target.md',
    activePane: 'secondary',
  });
});

test('opens internal note links in a secondary pane with modifier-click and restores single-pane mode on close', async ({ page }) => {
  await page.keyboard.down(modKey);
  await page.locator('.ProseMirror a[href="../docs/guide.md"]').click();
  await page.keyboard.up(modKey);

  await expect(page.getByTestId('workspace-pane-secondary')).toHaveAttribute('data-tab-id', 'docs/guide.md');
  await page.getByTestId('workspace-secondary-close').click();
  await expect(page.getByTestId('workspace-pane-secondary')).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getWorkspaceView() ?? null)).toMatchObject({
    primaryTabId: 'notes/test.md',
    secondaryTabId: null,
    activePane: 'primary',
  });
});

test('keeps legacy inline markdown as plain text after inline math removal', async ({ page }) => {
  await expect(page.locator('.ProseMirror')).toContainText('Legacy inline $math$ text');
  await expect(page.locator('.math-inline-node')).toHaveCount(0);
});

test('inserts a file link once from the picker', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('volt:pick-link'));
  });

  await expect(page.getByTestId('link-file-picker')).toBeVisible();
  await page.locator('[data-testid="link-picker-item"][data-path="notes/target.md"]').click();

  const link = page.locator('.ProseMirror a[href="./target.md"]');
  await expect(link).toHaveCount(1);
  await link.click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('notes/target.md');
});

test('restores the editor selection after closing the link picker', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('volt:pick-link'));
  });

  await expect(page.getByTestId('link-file-picker')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('link-file-picker')).toBeHidden();

  await page.keyboard.type('Cursor restored');
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null)).toContain('Cursor restored');
});

test('closes slash commands on escape and inserts math blocks from the slash menu', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.type('/');
  await expect(page.getByTestId('slash-command-menu')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('slash-command-menu')).toBeHidden();

  await page.keyboard.press('Enter');
  await page.keyboard.type('/math');
  await expect(page.getByTestId('slash-command-menu')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page.locator('.math-block-node')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null)).toContain('$$');
});

test('opens embed picker from slash command and inserts a generic preview block', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.type('/embed');
  await expect(page.getByTestId('slash-command-menu')).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('embed-url-picker')).toBeVisible();
  await page.getByTestId('embed-url-input').fill('https://example.com/article');
  await page.getByTestId('embed-url-submit').click();

  await expect(page.getByTestId('embed-block-generic')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null))
    .toContain('<volt-embed url="https://example.com/article"></volt-embed>');
});

test('converts a pasted standalone url into an embed block only in an empty paragraph', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.appendEmptyParagraphAtEnd();
  });
  await pasteClipboardText(page, 'https://example.com/article');

  await expect(page.getByTestId('embed-block-generic')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null))
    .toContain('<volt-embed url="https://example.com/article"></volt-embed>');
});

test('keeps pasted urls as text when the cursor is inside non-empty text', async ({ page }) => {
  await page.locator('.ProseMirror p', { hasText: 'Alpha paragraph' }).click();
  await page.keyboard.press('End');
  await page.keyboard.type(' ');
  await pasteClipboardText(page, 'https://example.com/article');

  await expect(page.getByTestId('embed-block-generic')).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null))
    .toContain('https://example.com/article');
});

test('renders github repository embeds', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.insertEmbedBlock('https://github.com/example/volt');
  });

  await expect(page.getByTestId('embed-block-github')).toBeVisible();
  await expect(page.locator('.embed-block-title')).toContainText('example/volt');
  await expect(page.getByText('TypeScript')).toBeVisible();
});

test('renders direct video embeds with a playable video element', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.insertEmbedBlock('https://videos.example.com/demo.mp4');
  });

  const video = page.getByTestId('embed-video-player');
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('src', /https:\/\/videos\.example\.com\/demo\.mp4/);
});

test('renders youtube embeds as iframe previews', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.insertEmbedBlock('https://youtu.be/volt-demo-123');
  });

  await expect(page.getByTestId('embed-video-frame')).toHaveAttribute(
    'src',
    /https:\/\/www\.youtube\.com\/embed\/volt-demo-123/,
  );
});

test('saves and reloads embed blocks without losing markdown structure', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.insertEmbedBlock('https://example.com/article');
  });

  await page.waitForTimeout(800);
  await page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]').click();
  await page.locator('[data-testid="file-tree-item"][data-path="notes/test.md"]').click();

  await expect(page.getByTestId('embed-block-generic')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getSavedFile('notes/test.md') ?? null))
    .toContain('<volt-embed url="https://example.com/article"></volt-embed>');
});

test('shows selection-driven table controls, lets you target rows and columns, and keeps the toolbar stable', async ({ page }) => {
  const firstCell = page.locator('.ProseMirror td').first();

  await firstCell.click();
  await expect(page.getByTestId('table-add-col')).toBeVisible();
  await expect(page.getByTestId('table-add-row')).toBeVisible();
  await expect(page.getByTestId('table-select-col')).toBeVisible();
  await expect(page.getByTestId('table-select-row')).toBeVisible();
  await expect(page.getByTestId('table-toolbar')).toBeVisible();

  await page.getByTestId('table-select-row').click();
  await expect(page.locator('.ProseMirror .selectedCell')).toHaveCount(2);
  await expect(page.getByTestId('table-toolbar')).toBeVisible();
  await expect(page.getByTestId('table-toolbar-color-picker')).toBeHidden();

  await page.getByTestId('table-select-col').click();
  await expect(page.locator('.ProseMirror .selectedCell')).toHaveCount(3);

  await firstCell.click();
  await page.getByTestId('table-toolbar-cell-color').click();
  await expect(page.getByTestId('table-toolbar-color-picker')).toBeVisible();
});

test('keeps root overflow locked while editing and opening editor overlays', async ({ page }) => {
  const editor = page.locator('.ProseMirror');
  const firstCell = page.locator('.ProseMirror td').first();
  const alpha = page.locator('.ProseMirror p', { hasText: 'Alpha paragraph' }).first();

  await expectNoAppOverflow(page);

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Regular editing should stay inside the editor canvas.');

  await alpha.hover();
  await expect(page.getByTestId('editor-drag-handle')).toBeVisible();

  await firstCell.hover();
  await firstCell.click();
  await expect(page.getByTestId('table-toolbar')).toBeVisible();
  await page.getByTestId('table-toolbar-cell-color').click();
  await expect(page.getByTestId('table-toolbar-color-picker')).toBeVisible();

  await page.evaluate(() => {
    window.scrollTo(120, 120);
  });

  await expectNoAppOverflow(page);
});

test('resizes split panes from the seam and collapses the sidebar from the seam control', async ({ page }) => {
  await page.keyboard.down(modKey);
  await page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]').click();
  await page.keyboard.up(modKey);

  const primaryPane = page.getByTestId('workspace-pane-primary');
  const splitSeam = page.getByTestId('workspace-split-seam');
  const before = await primaryPane.boundingBox();
  const seamBox = await splitSeam.boundingBox();

  if (!before || !seamBox) {
    throw new Error('Split pane bounds are not available');
  }

  await page.mouse.move(seamBox.x + seamBox.width / 2, seamBox.y + seamBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(seamBox.x + seamBox.width / 2 + 96, seamBox.y + seamBox.height / 2, { steps: 8 });
  await page.mouse.up();

  const after = await primaryPane.boundingBox();
  if (!after) {
    throw new Error('Primary pane bounds are not available after resize');
  }

  expect(after.width).toBeGreaterThan(before.width + 40);

  await expect(page.getByTestId('sidebar-pane')).toBeVisible();
  await page.getByTestId('sidebar-toggle').click();
  await expect(page.getByTestId('sidebar-pane')).toHaveCount(0);
  await page.getByTestId('sidebar-toggle').click();
  await expect(page.getByTestId('sidebar-pane')).toBeVisible();
});

test('keeps breadcrumbs inside an auto-width capsule', async ({ page }) => {
  const capsule = page.getByTestId('breadcrumbs-capsule');
  const pane = page.getByTestId('workspace-pane-primary');
  const capsuleBox = await capsule.boundingBox();
  const paneBox = await pane.boundingBox();

  if (!capsuleBox || !paneBox) {
    throw new Error('Breadcrumb bounds are not available');
  }

  expect(capsuleBox.width).toBeLessThan(paneBox.width * 0.6);
});

test('stays stable after closing the last open tab', async ({ page }) => {
  await page.locator('[data-testid="file-tab"][data-path="notes/test.md"] button').click();
  await expect(page.getByTestId('file-tabs')).toHaveCount(0);
  await expect(page.getByTestId('workspace-pane-primary')).toBeVisible();
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
});

test('opens empty math block for typing instead of deleting it', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.insertMathBlock();
  });

  const textarea = page.locator('.math-block-textarea');
  await expect(textarea).toBeVisible();
  await textarea.fill('E = mc^2');
  await page.keyboard.press(`${modKey}+Enter`);

  await expect(page.locator('.math-block-render')).toContainText('E');
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null)).toContain('$$\nE = mc^2\n$$');
});

test('drops a file from the tree into the editor only once', async ({ page }) => {
  const source = page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]');
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await source.dragTo(editor);

  await expect(page.locator('.ProseMirror a[href="./target.md"]')).toHaveCount(1);
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null)).toContain('[target](./target.md)');
  const markdown = await page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null);
  expect(markdown).not.toMatch(/target\s+\[target\]\(target\.md\)/);
});

test('keeps the drag handle visible and reorders blocks', async ({ page }) => {
  const alpha = page.locator('.ProseMirror p', { hasText: 'Alpha paragraph' }).first();
  const beta = page.locator('.ProseMirror p', { hasText: 'Beta paragraph' }).first();

  await alpha.hover();
  const handle = page.getByTestId('editor-drag-handle');
  await expect(handle).toBeVisible();

  await handle.hover();
  await expect(handle).toBeVisible();

  const betaBox = await beta.boundingBox();
  if (!betaBox) {
    throw new Error('Target paragraph bounding box is not available');
  }

  const handleBox = await handle.boundingBox();
  if (!handleBox) {
    throw new Error('Drag handle bounding box is not available');
  }

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(betaBox.x + betaBox.width / 2, betaBox.y + Math.max(betaBox.height - 4, 1), {
    steps: 12,
  });
  await page.mouse.up();

  const paragraphs = await page.locator('.ProseMirror p').allTextContents();
  const alphaIndex = paragraphs.findIndex((text) => text.includes('Alpha paragraph'));
  const betaIndex = paragraphs.findIndex((text) => text.includes('Beta paragraph'));
  expect(alphaIndex).toBeGreaterThan(betaIndex);
});

test('flushes pending autosave before switching files and updates shell chrome', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Pending save survives file switch');

  await page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]').click();

  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getSavedFile('notes/test.md') ?? null)).toContain('Pending save survives file switch');
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('notes/target.md');
  await expect(page.locator('[data-testid="file-tab"][data-path="notes/target.md"]')).toBeVisible();
  await expect(page.getByTestId('breadcrumb-active')).toHaveText('target.md');
});

test('opens a custom context menu, closes it with escape and outside click, and does not hijack plain inputs', async ({ page }) => {
  const fileTreeItem = page.locator('[data-testid="file-tree-item"][data-path="notes/target.md"]');

  await fileTreeItem.click({ button: 'right' });
  await expect(page.getByTestId('context-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('context-menu')).toHaveCount(0);

  await fileTreeItem.click({ button: 'right' });
  await expect(page.getByTestId('context-menu')).toBeVisible();
  await page.getByTestId('context-menu-overlay').click({ position: { x: 2, y: 2 } });
  await expect(page.getByTestId('context-menu')).toHaveCount(0);

  await page.locator('.ProseMirror').click();
  await page.keyboard.press(`${modKey}+F`);
  const input = page.getByTestId('find-in-file-input');
  await expect(input).toBeVisible();
  await input.click({ button: 'right' });
  await expect(page.getByTestId('context-menu')).toHaveCount(0);
});

test('opens the editor context menu from the keyboard without duplicating bubble actions', async ({ page }) => {
  const editor = page.locator('.ProseMirror');

  await editor.click();
  await page.keyboard.press(`${modKey}+End`);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+F10');

  await expect(page.getByTestId('context-menu')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Undo' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Select all' })).toBeVisible();
  await expect(page.getByTestId('context-menu-item')).toHaveCount(6);
  await expect(page.getByRole('menuitem', { name: 'Bold' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Italic' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Underline' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Strikethrough' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Add link' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Heading 1' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Table' })).toHaveCount(0);
});

test('shows only link navigation actions in the editor context menu for links', async ({ page }) => {
  const link = page.locator('.ProseMirror a[href="https://example.com"]').first();

  await link.click({ button: 'right' });
  await expect(page.getByTestId('context-menu')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Copy link' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Open link' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Add link' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Bold' })).toHaveCount(0);
});

test('opens editor table actions from the context menu', async ({ page }) => {
  const firstCell = page.locator('.ProseMirror td').first();

  await firstCell.click({ button: 'right' });
  await expect(page.getByTestId('context-menu')).toBeVisible();
  await expect(page.getByTestId('context-menu-item')).toHaveCount(9);
  await expect(page.getByRole('menuitem', { name: 'Select row' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Select column' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Select table' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Heading 1' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Bold' })).toHaveCount(0);
});

test('keeps editor menus floating on small screens and still opens the touch context menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.press(`${modKey}+a`);
  await expect(page.getByTestId('text-bubble-menu')).toBeVisible();
  await expect(page.getByTestId('text-bubble-sheet')).toHaveCount(0);
  await expectNoAppOverflow(page);

  await page.keyboard.press(`${modKey}+F`);
  await expect(page.getByTestId('find-in-file-panel')).toBeVisible();
  await expectNoAppOverflow(page);
  await page.keyboard.press('Escape');

  await page.evaluate(async () => {
    const target = document.querySelector('.ProseMirror p');
    if (!(target instanceof HTMLElement)) {
      throw new Error('Editor paragraph not found');
    }

    const rect = target.getBoundingClientRect();
    const x = rect.left + 28;
    const y = rect.top + rect.height / 2;

    target.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
    }));

    await new Promise((resolve) => window.setTimeout(resolve, 450));

    target.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true,
      pointerType: 'touch',
      clientX: x,
      clientY: y,
    }));
  });

  await expect(page.getByTestId('context-menu')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Undo' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Bold' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Heading 1' })).toHaveCount(0);
});

test('sets the code block language from the floating selector and closes it on escape', async ({ page }) => {
  await page.evaluate(() => {
    window.__VOLT_PLAYWRIGHT__?.insertCodeBlock();
  });

  const languageButton = page.getByTestId('codeblock-language-button');
  await expect(languageButton).toBeVisible();

  await languageButton.click();
  const dropdown = page.getByTestId('codeblock-language-dropdown');
  await expect(dropdown).toBeVisible();

  await page.getByTestId('codeblock-language-search').fill('javascript');
  await page.locator('[data-testid="codeblock-language-item"][data-language="javascript"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null)).toContain('```javascript');

  await languageButton.click();
  await expect(dropdown).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dropdown).toBeHidden();
});
