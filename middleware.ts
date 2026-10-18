import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Документные префиксы Mini App (совпадают с клиентским `TelegramBootstrap` / guards). */
function isTelegramMiniAppShellPath(p: string): boolean {
  if (p === "/" || p === "") return true;
  const roots = [
    "library",
    "multi-links",
    "pitching",
    "release",
    "create",
    "settings",
    "dashboard",
    "admin",
    "requirements"
  ];
  return roots.some((r) => p === `/${r}` || p.startsWith(`/${r}/`));
}

/**
 * Middleware для защиты приватных роутов
 * - Telegram Mini App: пропускается (определяем по заголовкам или отсутствию web auth)
 * - Web: проверяем Supabase auth через cookies
 * - Незалогиненные web пользователи → редирект на /login
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  /**
   * Весь `/_next/*` (static, image, data, webpack-hmr в dev и т.д.) — без Supabase/cookies.
   * Префикс `/_next` без завершающего `/` тоже отсекаем (редко, но иначе matcher мог бы пропустить).
   */
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw-audio.js"
  ) {
    return NextResponse.next();
  }

  // Публичные роуты - доступны всем
  const publicPaths = [
    "/login",
    "/auth/signup",
    "/auth/confirm",
    "/auth/reset-password",
    "/auth/update-password"
  ];
  const isPublicPath = 
    pathname === "/" || 
    publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  /** Playwright / локальный dev: тот же `devUserId`, что и для API-заголовков (см. e2e/release-wizard.spec.ts). */
  const allowDevE2e = process.env.NEXT_PUBLIC_ALLOW_DEV_API_AUTH === "true";
  const devUserIdParam = request.nextUrl.searchParams.get("devUserId");
  if (
    allowDevE2e &&
    devUserIdParam != null &&
    Number.isFinite(Number(devUserIdParam)) &&
    Number(devUserIdParam) > 0
  ) {
    return NextResponse.next();
  }

  /**
   * Shell маршруты приложения отдаём без проверки Supabase cookie.
   * Иначе Telegram Desktop / часть WebView даёт UA без слова «telegram», а `#tgWebApp…` на сервер
   * не передаётся → 307 на /login до гидрации и initData.
   * Доступ к данным: AuthGuard (веб), API — initData / сессия.
   */
  if (isTelegramMiniAppShellPath(pathname)) {
    return NextResponse.next();
  }

  // Для остальных веб-маршрутов выполняем легкую проверку наличия auth-cookie.
  // Полная валидация сессии остается в API и RLS.
  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some((cookie) => /^sb-.*auth-token(?:\.\d+)?$/.test(cookie.name) || cookie.name === "sb-access-token");

  if (!hasSupabaseAuthCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /**
     * Синхронно с телом middleware: не матчить API, весь `/_next…`, Vercel internals, типичные файлы.
     * `_next(?:/|$)` — и `/_next/static/...`, и голый `/_next` (без второго слэша).
     */
    "/((?!api(?:/|$)|_next(?:/|$)|_vercel|favicon\\.ico|robots\\.txt|manifest\\.webmanifest|sw-audio\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
