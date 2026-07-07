import { test, expect } from '@playwright/test';

/**
 * Read-only checks against the live app — no login, no writes. If any
 * of these fail, the app is down or a deploy broke a public route; see
 * RUNBOOK.md § "The app is down".
 */

test('landing page renders for a logged-out visitor', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(400);
  await expect(page).toHaveURL(/\/$/);
});

test('login page renders the sign-in form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
});

test('register page renders and links to terms + privacy', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
});

test('privacy policy page renders', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
});

test('terms of use page renders', async ({ page }) => {
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Terms of Use' })).toBeVisible();
});
