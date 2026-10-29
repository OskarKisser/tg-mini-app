import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminSupabaseClient } from "@/lib/admin-release-api-guard";
import { getTelegramAuthContextFromRequest } from "@/lib/api/with-telegram-auth";
import { loadAcceptedAt } from "@/lib/server/release-accepted-at";
import type { AdminAwaitingLinkRelease } from "@/types/admin";

export const dynamic = "force-dynamic";

const LIMIT = 100;

/** Принятые релизы без ссылки на пресейв: ждут модерации площадок и ссылки от модератора. */
async function handleAwaitingLink(request: NextRequest): Promise<Response> {
  const guard = await requireAdminSupabaseClient(request, getTelegramAuthContextFromRequest(request));
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.supabase
    .from("releases")
    .select("id, title, track_name, artist_name, artwork_url, telegram_username, upc, release_date, created_at")
    .eq("status", "ready")
    .or("smart_link.is.null,smart_link.eq.")
    .order("created_at", { ascending: true })
    .limit(LIMIT);
  if (error) {
    console.error("[admin/awaiting-link]:", error.message);
    return NextResponse.json({ ok: false, error: "Не удалось загрузить список." }, { status: 500 });
  }

  const rows = (data ?? []) as {
    id: string;
    title: string | null;
    track_name: string | null;
    artist_name: string | null;
    artwork_url: string | null;
    telegram_username: string | null;
    upc: string | null;
    release_date: string | null;
    created_at: string;
  }[];
  const acceptedAt = await loadAcceptedAt(
    guard.supabase,
    rows.map((r) => r.id)
  );

  const out: AdminAwaitingLinkRelease[] = rows
    .map((r) => ({
      id: r.id,
      title: r.title?.trim() || r.track_name?.trim() || "Без названия",
      artist_name: r.artist_name?.trim() || "—",
      artwork_url: r.artwork_url,
      telegram_username: r.telegram_username,
      upc: r.upc,
      release_date: r.release_date ?? null,
      accepted_at: acceptedAt.get(r.id) ?? r.created_at
    }))
    // Дольше всех ждущие — сверху.
    .sort((a, b) => a.accepted_at.localeCompare(b.accepted_at));

  return NextResponse.json({ ok: true, rows: out });
}

export const GET = handleAwaitingLink;
