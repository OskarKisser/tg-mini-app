import { describe, it, expect } from "vitest";
import { formatReleaseDateDayMonthRu, normalizeReleaseDate, normalizeUpc } from "@/lib/admin-release-publish";
import { acceptedMessage, linkReadyMessage, releaseDateChangedMessage } from "@/lib/server/release-notify-texts";

describe("normalizeUpc", () => {
  it("пусто — null, 12/13 цифр с пробелами и дефисами — ок", () => {
    expect(normalizeUpc("")).toBeNull();
    expect(normalizeUpc(undefined)).toBeNull();
    expect(normalizeUpc(" 1234 5678-9012 ")).toBe("123456789012");
    expect(normalizeUpc("1234567890123")).toBe("1234567890123");
  });
  it("иначе ошибка", () => {
    expect(() => normalizeUpc("123")).toThrow("12 или 13 цифр");
    expect(() => normalizeUpc("12345678901a")).toThrow();
  });
});

describe("normalizeReleaseDate", () => {
  it("пусто — null, ГГГГ-ММ-ДД — как есть", () => {
    expect(normalizeReleaseDate("")).toBeNull();
    expect(normalizeReleaseDate(undefined)).toBeNull();
    expect(normalizeReleaseDate(" 2026-11-06 ")).toBe("2026-11-06");
  });
  it("кривой формат или несуществующий день — ошибка", () => {
    expect(() => normalizeReleaseDate("06.11.2026")).toThrow("ГГГГ-ММ-ДД");
    expect(() => normalizeReleaseDate("2026-02-30")).toThrow();
    expect(() => normalizeReleaseDate("2026-13-01")).toThrow();
  });
  it("формат «6 ноября»", () => {
    expect(formatReleaseDateDayMonthRu("2026-11-06")).toBe("6 ноября");
    expect(formatReleaseDateDayMonthRu("2026-10-30T00:00:00Z")).toBe("30 октября");
    expect(formatReleaseDateDayMonthRu(null)).toBeNull();
  });
});

describe("тексты бота", () => {
  it("принят: срок площадок и обещание ссылки, HTML экранирован", () => {
    const m = acceptedMessage("A<b>");
    expect(m).toContain("A&lt;b&gt;");
    expect(m).toContain("3–5 дней");
    expect(m).toContain("пресейв");
  });
  it("ссылка: разный заголовок для «сразу» и «позже»", () => {
    expect(linkReadyMessage("X", "https://band.link/x", { acceptedNow: false })).toContain("прошёл модерацию площадок");
    expect(linkReadyMessage("X", "https://band.link/x", { acceptedNow: true })).toContain("принят и уже прошёл");
    expect(linkReadyMessage("X", "https://band.link/x?a=1&b=2", { acceptedNow: false })).toContain("a=1&amp;b=2");
  });
  it("ссылка: дата выхода в сообщении, без даты — строки нет", () => {
    expect(linkReadyMessage("X", "https://band.link/x", { acceptedNow: false, releaseDate: "2026-11-06" })).toContain(
      "Дата выхода: <b>6 ноября</b>"
    );
    expect(linkReadyMessage("X", "https://band.link/x", { acceptedNow: false })).not.toContain("Дата выхода");
  });
  it("перенос даты", () => {
    expect(releaseDateChangedMessage("Лето", "2026-11-06")).toContain("«Лето» — 6 ноября");
  });
});
