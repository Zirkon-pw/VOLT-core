import { test, expect } from '@playwright/test';

test('captures a shortcut in settings even if the binding button loses focus', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto('/__playwright__/settings/shortcuts');
  await expect(page.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeVisible();

  const bindingButton = page.locator('[data-testid="shortcut-binding-button"][data-action-id="workspace.sidebar.toggle"]');
  await expect(bindingButton).toHaveAttribute('data-binding', 'Mod+B');

  await bindingButton.click();
  await expect(bindingButton).toHaveAttribute('data-capturing', 'true');

  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
  });

  await page.keyboard.press('Alt+Shift+P');

  await expect(bindingButton).toHaveAttribute('data-binding', 'Alt+Shift+P');
  await expect(bindingButton).toHaveAttribute('data-capturing', 'false');

  await expect.poll(async () => page.evaluate(() => {
    const raw = window.localStorage.getItem('volt-app-settings');
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      shortcutOverrides?: Record<string, string>;
    };
    return parsed.shortcutOverrides?.['workspace.sidebar.toggle'] ?? null;
  })).toBe('Alt+Shift+P');
});
