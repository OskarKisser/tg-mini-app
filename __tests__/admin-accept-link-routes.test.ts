import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createSupabaseMock, type MockCall, type MockResult } from "./helpers/supabase-mock";

const guard = vi.fn();
const notifyArtist = vi.fn();
const deleteAudio = vi.fn();

vi.mock("../lib/admin-release-api-guard", () => ({
  requireAdminSupabaseClient: (...a: unknown[]) => guard(...a)
}));
vi.mock("../lib/api/with-telegram-auth", () => ({
  getTelegramAuthContextFromRequest: () => null
}));
vi.mock("../lib/server/artist-notify", () => ({
  notifyArtist: (...a: unknown[]) => notifyArtist(...a)
}));
vi.mock("../lib/release-audio-cleanup.server", () => ({
  deleteApprovedReleaseAudio: (...a: unknown[]) => deleteAudio(...a)
}));
vi.mock("../lib/server/release-list-cache", () => ({
  invalidateMyReleasesCache: async () => {}
}));

const ID = "11111111-1111-4111-8111-111111111111";

function useDb(row: Record<string, unknown> | null) {
  const db = createSupabaseMock((call: MockCall): MockResult => {
    if (call.table === "release_logs") return { data: null, error: null };
    if (call.op === "update") return { data: { ...row, ...(call.payload as object) }, error: null };
    return { data: row, error: null };
  });
  guard.mockResolvedValue({ ok: true, supabase: db.client });
  return db;
}

function post(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

beforeEach(() => {
  guard.mockReset();
  notifyArtist.mockReset();
  deleteAudio.mockReset();
});

describe("«Принять» (update-release-status approve)", () => {
  it("ready без ссылки, сообщение «принят», лог времени, WAV не удаляем", async () => {
    const db = useDb({ id: ID, title: "LAFFERA", status: "processing", telegram_id: "1" });
    const { POST } = await import("@/app/api/admin/update-release-status/route");
    const res = await POST(post("/api/admin/update-release-status", { releaseId: ID, action: "approve" }));
    expect(res.status).toBe(200);

    const upd = db.calls.find((c) => c.table === "releases" && c.op === "update");
    expect(upd?.payload).toMatchObject({ status: "ready" });
    expect((upd?.payload as Record<string, unknown>).smart_link).toBeUndefined();

    const log = db.calls.find((c) => c.table === "release_logs" && c.op === "insert");
    expect(log?.payload).toMatchObject({ release_id: ID, stage: "status", status: "ready" });

    expect(String(notifyArtist.mock.calls[0][1])).toContain("принят");
    expect(deleteAudio).not.toHaveBeenCalled();
  });
});

describe("ссылка на пресейв (publish-release-smart-link)", () => {
  const body = (extra: Record<string, unknown> = {}) => ({
    releaseId: ID,
    newStatus: "RELEASED",
    smartLink: "https://band.link/laffera",
    ...extra
  });

  it("принятому релизу: ссылка + UPC, сообщение «прошёл модерацию площадок», WAV удаляем", async () => {
    const db = useDb({ id: ID, title: "LAFFERA", status: "ready", smart_link: null, telegram_id: "1" });
    const { POST } = await import("@/app/api/admin/publish-release-smart-link/route");
    const res = await POST(post("/api/admin/publish-release-smart-link", body({ upc: "1234 5678 9012" })));
    expect(res.status).toBe(200);

    const upd = db.calls.find((c) => c.table === "releases" && c.op === "update");
    expect(upd?.payload).toMatchObject({ status: "ready", smart_link: "https://band.link/laffera", upc: "123456789012" });
    expect(db.calls.some((c) => c.table === "release_logs")).toBe(false);
    expect(String(notifyArtist.mock.calls[0][1])).toContain("прошёл модерацию площадок");
    expect(deleteAudio).toHaveBeenCalledWith(expect.anything(), ID);
  });

  it("из очереди сразу со ссылкой: лог приёма и сообщение «принят и уже прошёл»", async () => {
    const db = useDb({ id: ID, title: "LAFFERA", status: "processing", smart_link: null, telegram_id: "1" });
    const { POST } = await import("@/app/api/admin/publish-release-smart-link/route");
    expect((await POST(post("/api/admin/publish-release-smart-link", body()))).status).toBe(200);
    expect(db.calls.some((c) => c.table === "release_logs" && c.op === "insert")).toBe(true);
    expect(String(notifyArtist.mock.calls[0][1])).toContain("принят и уже прошёл");
  });

  it("новая дата выхода: пишем в релиз и в сообщение артисту", async () => {
    const db = useDb({ id: ID, title: "LAFFERA", status: "ready", smart_link: null, telegram_id: "1", release_date: "2026-10-30" });
    const { POST } = await import("@/app/api/admin/publish-release-smart-link/route");
    const res = await POST(post("/api/admin/publish-release-smart-link", body({ releaseDate: "2026-11-06" })));
    expect(res.status).toBe(200);
    const upd = db.calls.find((c) => c.table === "releases" && c.op === "update");
    expect(upd?.payload).toMatchObject({ release_date: "2026-11-06" });
    const text = String(notifyArtist.mock.calls[0][1]);
    expect(text).toContain("6 ноября");
    expect(text).not.toContain("30 октября");
  });

  it("без новой даты — дату не трогаем, в сообщении текущая", async () => {
    const db = useDb({ id: ID, title: "LAFFERA", status: "ready", smart_link: null, telegram_id: "1", release_date: "2026-10-30" });
    const { POST } = await import("@/app/api/admin/publish-release-smart-link/route");
    expect((await POST(post("/api/admin/publish-release-smart-link", body()))).status).toBe(200);
    const upd = db.calls.find((c) => c.table === "releases" && c.op === "update");
    expect(upd?.payload).not.toHaveProperty("release_date");
    expect(String(notifyArtist.mock.calls[0][1])).toContain("30 октября");
  });

  it("кривая дата — 400", async () => {
    useDb({ id: ID, status: "ready" });
    const { POST } = await import("@/app/api/admin/publish-release-smart-link/route");
    expect((await POST(post("/api/admin/publish-release-smart-link", body({ releaseDate: "06.11" })))).status).toBe(400);
  });

  it("правка уже выданной ссылки — без повторного сообщения", async () => {
    useDb({ id: ID, title: "LAFFERA", status: "ready", smart_link: "https://band.link/old", telegram_id: "1" });
    const { POST } = await import("@/app/api/admin/publish-release-smart-link/route");
    expect((await POST(post("/api/admin/publish-release-smart-link", body()))).status).toBe(200);
    expect(notifyArtist).not.toHaveBeenCalled();
  });

  it("409 для черновика или отклонённого, 400 для кривого UPC", async () => {
    const { POST } = await import("@/app/api/admin/publish-release-smart-link/route");
    useDb({ id: ID, status: "failed" });
    expect((await POST(post("/api/admin/publish-release-smart-link", body()))).status).toBe(409);
    useDb({ id: ID, status: "ready" });
    expect((await POST(post("/api/admin/publish-release-smart-link", body({ upc: "123" })))).status).toBe(400);
    expect(deleteAudio).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/awaiting-link", () => {
  it("принятые без ссылки, время приёма из лога, дольше ждущие сверху", async () => {
    const db = createSupabaseMock((call) => {
      if (call.table === "release_logs") {
        return { data: [{ release_id: "b", created_at: "2026-10-10T10:00:00Z" }], error: null };
      }
      return {
        data: [
          { id: "a", title: "A", artist_name: "X", created_at: "2026-10-11T10:00:00Z" },
          { id: "b", title: "B", artist_name: "Y", created_at: "2026-10-12T10:00:00Z" }
        ],
        error: null
      };
    });
    guard.mockResolvedValue({ ok: true, supabase: db.client });
    const { GET } = await import("@/app/api/admin/awaiting-link/route");
    const res = await GET(new NextRequest("http://localhost/api/admin/awaiting-link"));
    const json = (await res.json()) as { rows: { id: string; accepted_at: string }[] };
    expect(json.rows.map((r) => r.id)).toEqual(["b", "a"]);
    expect(json.rows[0].accepted_at).toBe("2026-10-10T10:00:00Z");
    const rel = db.calls.find((c) => c.table === "releases");
    expect(rel?.filters).toContainEqual(["eq", "status", "ready"]);
    expect(rel?.filters).toContainEqual(["or", "smart_link.is.null,smart_link.eq."]);
  });
});

describe("PATCH /api/admin/releases/[releaseId] — перенос даты", () => {
  const patch = (body: unknown) =>
    [
      new NextRequest(`http://localhost/api/admin/releases/${ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }),
      { params: { releaseId: ID } }
    ] as const;

  it("сохраняет дату и по флагу пишет артисту", async () => {
    notifyArtist.mockResolvedValue(true);
    const db = useDb({ id: ID, title: "Лето", status: "ready", telegram_id: "1", release_date: "2026-10-30" });
    const { PATCH } = await import("@/app/api/admin/releases/[releaseId]/route");
    const res = await PATCH(...patch({ releaseDate: "2026-11-06", notify: true }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { notified: boolean }).notified).toBe(true);
    const upd = db.calls.find((c) => c.table === "releases" && c.op === "update");
    expect(upd?.payload).toEqual({ release_date: "2026-11-06" });
    expect(String(notifyArtist.mock.calls[0][1])).toContain("6 ноября");
  });

  it("без notify — молча", async () => {
    useDb({ id: ID, title: "Лето", status: "ready", telegram_id: "1" });
    const { PATCH } = await import("@/app/api/admin/releases/[releaseId]/route");
    expect((await PATCH(...patch({ releaseDate: "2026-11-06" }))).status).toBe(200);
    expect(notifyArtist).not.toHaveBeenCalled();
  });

  it("кривая дата — 400, нет релиза — 404", async () => {
    const { PATCH } = await import("@/app/api/admin/releases/[releaseId]/route");
    useDb({ id: ID });
    expect((await PATCH(...patch({ releaseDate: "2026-02-30" }))).status).toBe(400);
    const empty = createSupabaseMock(() => ({ data: null, error: null }));
    guard.mockResolvedValue({ ok: true, supabase: empty.client });
    expect((await PATCH(...patch({ releaseDate: "2026-11-06" }))).status).toBe(404);
  });
});
