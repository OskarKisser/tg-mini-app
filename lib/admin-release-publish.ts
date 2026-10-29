import { RELEASE_STATUS_VALUES, type ReleaseStatus } from "@/lib/db-enums";

const PUBLISH_READY_ALIASES = new Set(["released", "live", "approved", "ready"]);

/**
 * Маппинг «продуктового» статуса (например RELEASED) в значение enum колонки `releases.status`.
 * В БД используется `ready`; значение `RELEASED` в Postgres enum отсутствует — не передавать его в SQL.
 */
export function mapAdminPublishStatusToDb(newStatus: string): ReleaseStatus {
  const key = newStatus.trim().toLowerCase();
  if (PUBLISH_READY_ALIASES.has(key)) return "ready";
  if ((RELEASE_STATUS_VALUES as readonly string[]).includes(key)) {
    return key as ReleaseStatus;
  }
  throw new Error(`Недопустимый newStatus: ожидался выпуск (RELEASED/ready), получено «${newStatus}».`);
}

export function assertHttpsUrl(raw: string): string {
  const t = raw.trim();
  if (!t) throw new Error("Укажите ссылку.");
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    throw new Error("Некорректный URL. Пример: https://…");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Разрешены только ссылки http(s).");
  }
  return u.toString();
}

/** UPC (12 цифр) или EAN-13; пустая строка — не указан. Пробелы и дефисы убираем. */
export function normalizeUpc(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/[\s-]/g, "");
  if (!digits) return null;
  if (!/^\d{12,13}$/.test(digits)) {
    throw new Error("UPC — это 12 или 13 цифр.");
  }
  return digits;
}

/** Дата выхода из админки: строго `YYYY-MM-DD` и реальная дата; пусто — не меняем. */
export function normalizeReleaseDate(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const d = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
  if (!m || !d || d.getUTCDate() !== Number(m[3]) || d.getUTCMonth() !== Number(m[2]) - 1) {
    throw new Error("Дата выхода — в формате ГГГГ-ММ-ДД.");
  }
  return t;
}

const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря"
];

/** «2026-11-06» → «6 ноября»; без локали, чтобы сервер и клиент писали одинаково. */
export function formatReleaseDateDayMonthRu(raw: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw ?? "").trim());
  if (!m) return null;
  const month = MONTHS_GENITIVE[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month}` : null;
}
