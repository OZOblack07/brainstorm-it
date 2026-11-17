// Needs Supabase env vars in .env.local with both migrations applied and Anonymous sign-ins enabled.
import { test, expect } from '@playwright/test';
test('two players: same disguised answer => duplicates, nobody scores', async ({ browser }) => {
  const host = await (await browser.newContext()).newPage(), guest = await (await browser.newContext()).newPage();
  await host.goto('/'); await host.getByPlaceholder('Your nickname').fill('HostPlayer');
  await host.locator('input[type=number]').nth(0).fill('20'); await host.locator('input[type=number]').nth(1).fill('1');
  await host.getByRole('button', { name: 'Create room' }).click(); await host.waitForURL(/\/room\//);
  const code = host.url().split('/room/')[1].toUpperCase();
  await guest.goto('/room/' + code); await guest.getByPlaceholder('Your nickname').fill('GuestPlayer'); await guest.getByRole('button', { name: 'Join' }).click();
  await expect(host.getByText('GuestPlayer')).toBeVisible();
  await host.getByRole('button', { name: 'Start game' }).click();
  await expect(host.locator('[data-testid=letter]')).toBeVisible(); await expect(guest.locator('[data-testid=letter]')).toBeVisible();
  const L = (await host.locator('[data-testid=letter]').innerText()).trim();
  const fill = async (pg: typeof host, word: string) => { for (const i of await pg.locator('input.inp').all()) await i.fill(word); await pg.getByRole('button', { name: 'Submit answers' }).click(); };
  await fill(host, `${L}ogg`); await fill(guest, `${L}OG`); // OGG vs OG: same underlying word
  for (const pg of [host, guest]) { // poll vote: every player must vote before results appear
    await pg.getByRole('button', { name: 'Submit my votes' }).waitFor({ timeout: 20000 });
    const all = pg.getByRole('button', { name: 'Mark all right' }); if (await all.isVisible()) await all.click();
    await pg.getByRole('button', { name: 'Submit my votes' }).click();
  }
  await expect(host.getByText(/duplicate/).first()).toBeVisible({ timeout: 15000 });
  await expect(guest.getByText(/same underlying word/).first()).toBeVisible();
});
