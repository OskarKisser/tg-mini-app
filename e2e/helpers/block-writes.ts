import type { Page } from "@playwright/test";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * В CI вместо Supabase заглушка, но локально E2E видят настоящий проект из .env.local. Чтобы прогон
 * не создавал черновики и не писал логи от имени devUserId, любые записи в наше API и в Supabase отвечают ошибкой,
 * если тест сам не подменил маршрут (`page.route`, зарегистрированный позже, срабатывает раньше).
 */
export async function blockBackendWrites(page: Page): Promise<void> {
  const handler = async (route: Parameters<Parameters<Page["route"]>[1]>[0]) => {
    if (READ_METHODS.has(route.request().method())) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "e2e: запись в бэкенд заблокирована" })
    });
  };
  await page.route("**/api/**", handler);
  await page.route("**/rest/v1/**", handler);
  await page.route("**/storage/v1/**", handler);
}
