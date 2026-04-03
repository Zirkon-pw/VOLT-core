import { test, expect } from '@playwright/test';

const modKey = process.platform === 'darwin' ? 'Meta' : 'Control';

async function gotoHarness(page: import('@playwright/test').Page) {
  await page.goto('/__playwright__/editor');
  await expect(page.getByTestId('playwright-editor-harness')).toBeVisible();
  await expect(page.locator('.ProseMirror')).toContainText('Alpha paragraph');
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

  await page.locator('.ProseMirror a[href="../docs/guide.md"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('docs/guide.md');

  await page.locator('.ProseMirror a[href="../files/spec.pdf"]').click();
  await expect.poll(async () => page.evaluate(() => window.__VOLT_PLAYWRIGHT__?.getActiveTab() ?? null)).toBe('files/spec.pdf');
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

test('does not show table toolbar on hover only, but shows notion-like controls on selection', async ({ page }) => {
  const firstCell = page.locator('.ProseMirror td').first();

  await firstCell.hover();
  await expect(page.getByTestId('table-add-col')).toBeVisible();
  await expect(page.getByTestId('table-add-row')).toBeVisible();
  await expect(page.getByTestId('table-toolbar')).toBeHidden();

  await firstCell.click();

  await expect(page.getByTestId('table-toolbar')).toBeVisible();
  await expect(page.getByTestId('table-toolbar-color-picker')).toBeHidden();
  await page.getByTestId('table-toolbar-cell-color').click();
  await expect(page.getByTestId('table-toolbar-color-picker')).toBeVisible();
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
