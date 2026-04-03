import { test, expect } from '@playwright/test';

const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

async function gotoHarness(page: import('@playwright/test').Page) {
  await page.goto('/__playwright__/editor');
  await expect(page.getByTestId('playwright-editor-harness')).toBeVisible();
  await expect(page.locator('.ProseMirror')).toContainText('Alpha paragraph');
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

  await page.locator('[data-testid="markdown-editor-surface"]').click({ position: { x: 8, y: 8 } });
  await expect(picker).toBeHidden();
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
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect(page.locator('.math-block-node')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getMarkdown() ?? null)).toContain('$$');
});

test('shows quiet table controls, lets you target rows and columns, and keeps the toolbar stable', async ({ page }) => {
  const firstCell = page.locator('.ProseMirror td').first();

  await firstCell.hover();
  await expect(page.getByTestId('table-add-col')).toBeVisible();
  await expect(page.getByTestId('table-add-row')).toBeVisible();
  await expect(page.getByTestId('table-select-col')).toBeVisible();
  await expect(page.getByTestId('table-select-row')).toBeVisible();
  await expect(page.getByTestId('table-toolbar')).toBeHidden();

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
