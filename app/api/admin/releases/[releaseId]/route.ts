import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSupabaseClient } from "@/lib/admin-release-api-guard";
import { getTelegramAuthContextFromRequest } from "@/lib/api/with-telegram-auth";
import { deleteAllReleaseFiles } from "@/lib/release-audio-cleanup.server";
import { invalidateMyReleasesCache } from "@/lib/server/release-list-cache";
import { getReleaseReferral, type ReleaseReferral } from "@/lib/server/referrals";
import type { ReleaseRecord, ReleaseTrackRow } from "@/repositories/releases.repo";
import { loadPressKit } from "@/lib/server/press-kit";
import type { PressKit } from "@/lib/press-kit";
import { normalizeReleaseDate } from "@/lib/admin-release-publish";
import { notifyArtist } from "@/lib/server/artist-notify";
import { releaseDateChangedMessage } from "@/lib/server/release-notify-texts";
import { getReleaseDisplayTitle } from "@/repositories/releases.repo";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  releaseId: z.string().uuid()
});

async function handleGetAdminRelease(
  request: NextRequest,
  routeContext: { params: { releaseId: string } }
): Promise<Response> {
  const guard = await requireAdminSupabaseClient(
    request,
    getTelegramAuthContextFromRequest(request)
  );
  if (!guard.ok) return guard.response;

  const parsed = paramsSchema.safeParse(routeContext.params);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Некорректный ID релиза." }, { status: 400 });
  }

  const { releaseId } = parsed.data;

  const { data: release, error: relErr } = await guard.supabase
    .from("releases")
    .select("*")
    .eq("id", releaseId)
    .maybeSingle();

  if (relErr) {
    console.error("[admin/releases GET] load:", relErr.message);
    return NextResponse.json({ ok: false, error: "Не удалось загрузить релиз." }, { status: 500 });
  }

  if (!release) {
    return NextResponse.json({ ok: false, error: "Релиз не найден." }, { status: 404 });
  }

  const { data: tracks, error: trErr } = await guard.supabase
    .from("tracks")
    .select("id, release_id, user_id, index, position, title, explicit, file_path, lyrics, duration")
    .eq("release_id", releaseId)
    .order("index", { ascending: true });

  if (trErr) {
    console.error("[admin/releases GET] tracks:", trErr.message);
    return NextResponse.json({ ok: false, error: "Не удалось загрузить треки." }, { status: 500 });
  }

  const [referral, pressKit] = await Promise.all([
    getReleaseReferral(guard.supabase, {
      id: releaseId,
      telegram_id: (release as ReleaseRecord).telegram_id
    }),
    loadPressKit(guard.supabase, releaseId)
  ]);

  const body: {
    ok: true;
    release: ReleaseRecord;
    tracks: ReleaseTrackRow[];
    referral: ReleaseReferral | null;
    pressKit: PressKit | null;
  } = {
    ok: true,
    release: release as ReleaseRecord,
    tracks: (tracks ?? []) as ReleaseTrackRow[],
    referral,
    pressKit
  };

  return NextResponse.json(body);
}

export async function GET(
  request: NextRequest,
  routeContext: { params: { releaseId: string } }
): Promise<Response> {
  return handleGetAdminRelease(request, routeContext);
}

/**
 * Удалить релиз целиком (тестовые, дубли). Треки, логи и AI-проверки уходят каскадом по FK,
 * файлы чистим после — best effort. Артисту ничего не пишем. Необратимо.
 */
async function handleDeleteAdminRelease(
  request: NextRequest,
  routeContext: { params: { releaseId: string } }
): Promise<Response> {
  const guard = await requireAdminSupabaseClient(
    request,
    getTelegramAuthContextFromRequest(request)
  );
  if (!guard.ok) return guard.response;

  const parsed = paramsSchema.safeParse(routeContext.params);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Некорректный ID релиза." }, { status: 400 });
  }

  const { releaseId } = parsed.data;

  const { data: release, error: relErr } = await guard.supabase
    .from("releases")
    .select("id, status, artwork_url, audio_url, telegram_id, user_id, user_uuid")
    .eq("id", releaseId)
    .maybeSingle();

  if (relErr) {
    console.error("[admin/releases DELETE] load:", relErr.message);
    return NextResponse.json({ ok: false, error: "Не удалось загрузить релиз." }, { status: 500 });
  }

  if (!release) {
    return NextResponse.json({ ok: false, error: "Релиз не найден." }, { status: 404 });
  }

  // Ссылки на файлы треков — до удаления: строки tracks уйдут каскадом вместе с релизом.
  const { data: tracks, error: trErr } = await guard.supabase
    .from("tracks")
    .select("file_path")
    .eq("release_id", releaseId);

  if (trErr) {
    console.error("[admin/releases DELETE] tracks:", trErr.message);
    return NextResponse.json({ ok: false, error: "Не удалось загрузить треки." }, { status: 500 });
  }

  const { error: delErr } = await guard.supabase.from("releases").delete().eq("id", releaseId);

  if (delErr) {
    console.error("[admin/releases DELETE] delete:", delErr.message);
    return NextResponse.json({ ok: false, error: "Не удалось удалить релиз." }, { status: 500 });
  }

  const row = release as { id: string; status: string; artwork_url: string | null; audio_url: string | null };
  await deleteAllReleaseFiles(
    guard.supabase,
    row,
    (tracks ?? []).map((t) => String((t as { file_path?: string | null }).file_path ?? ""))
  );
  // Иначе у артиста до 20 с висит удалённый релиз в «Моих релизах».
  await invalidateMyReleasesCache(release as Record<string, unknown>);
  console.info("[admin/releases DELETE] deleted", releaseId, "status:", row.status);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  routeContext: { params: { releaseId: string } }
): Promise<Response> {
  return handleDeleteAdminRelease(request, routeContext);
}

const patchBodySchema = z.object({
  releaseDate: z.string().min(1).max(32),
  /** Написать артисту в бот о новой дате. */
  notify: z.boolean().optional()
});

/**
 * Перенос даты выхода из админки: артист передумал, пока релиз шёл через модерацию,
 * или площадки поставили другую. Без этого в приложении и в сообщениях остаётся старая дата.
 */
async function handlePatchAdminRelease(
  request: NextRequest,
  routeContext: { params: { releaseId: string } }
): Promise<Response> {
  const guard = await requireAdminSupabaseClient(
    request,
    getTelegramAuthContextFromRequest(request)
  );
  if (!guard.ok) return guard.response;

  const parsedParams = paramsSchema.safeParse(routeContext.params);
  if (!parsedParams.success) {
    return NextResponse.json({ ok: false, error: "Некорректный ID релиза." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Некорректное тело запроса." }, { status: 400 });
  }

  let releaseDate: string;
  try {
    releaseDate = normalizeReleaseDate(parsed.data.releaseDate) as string;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Некорректная дата.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  const { releaseId } = parsedParams.data;
  const { data: updated, error: updErr } = await guard.supabase
    .from("releases")
    .update({ release_date: releaseDate })
    .eq("id", releaseId)
    .select("*")
    .maybeSingle();

  if (updErr) {
    console.error("[admin/releases PATCH] update:", updErr.message);
    return NextResponse.json({ ok: false, error: "Не удалось сохранить дату." }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Релиз не найден." }, { status: 404 });
  }

  const rec = updated as ReleaseRecord;
  await invalidateMyReleasesCache(rec as Record<string, unknown>);
  let notified = false;
  if (parsed.data.notify) {
    notified = await notifyArtist(rec, releaseDateChangedMessage(getReleaseDisplayTitle(rec), releaseDate));
  }
  return NextResponse.json({ ok: true, release: rec, notified });
}

export async function PATCH(
  request: NextRequest,
  routeContext: { params: { releaseId: string } }
): Promise<Response> {
  return handlePatchAdminRelease(request, routeContext);
}
