import { test, expect } from '@playwright/test';
test('how-to page loads', async ({ page }) => { await page.goto('/how-to-play'); await expect(page.getByText('Unique valid answer')).toBeVisible(); });
test('solo game: play a round, see transparent results', async ({ page }) => {
  await page.goto('/solo');
  await page.getByPlaceholder('Your nickname').fill('Tester');
  await page.getByRole('button', { name: 'Start game' }).click();
  const letter = (await page.locator('.text-8xl').innerText()).trim();
  await page.getByPlaceholder(`Name starting with ${letter}`).fill(`${letter}xqzv`);
  await page.getByRole('button', { name: 'Submit answers' }).click();
  await expect(page.getByText(/Round 1 results/)).toBeVisible();
  await expect(page.getByText('Tester', { exact: true }).first()).toBeVisible();
});
