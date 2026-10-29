import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminSupabaseClient } from "@/lib/admin-release-api-guard";
import { getTelegramAuthContextFromRequest } from "@/lib/api/with-telegram-auth";
import { assertHttpsUrl, mapAdminPublishStatusToDb, normalizeReleaseDate, normalizeUpc } from "@/lib/admin-release-publish";
import { getReleaseDisplayTitle, type ReleaseRecord } from "@/repositories/releases.repo";
import { notifyArtist } from "@/lib/server/artist-notify";
import { invalidateMyReleasesCache } from "@/lib/server/release-list-cache";
import { linkReadyMessage } from "@/lib/server/release-notify-texts";
import { logAccepted } from "@/lib/server/release-accepted-at";
import { deleteApprovedReleaseAudio } from "@/lib/release-audio-cleanup.server";

const bodySchema = z.object({
  releaseId: z.string().uuid(),
  newStatus: z.string().min(1),
  smartLink: z.string().min(1).max(2048),
  /** UPC от дистрибьютора (необязательно), пишется в `releases.upc`. */
  upc: z.string().max(32).optional(),
  /** Дата выхода `YYYY-MM-DD`, если артист её перенёс; пишется в `releases.release_date` и в сообщение. */
  releaseDate: z.string().max(32).optional()
});

/**
 * Ссылка на пресейв (BandLink и т.п.):
 * - релиз на проверке → принять сразу со ссылкой;
 * - уже принятый (`ready`) → добавить или поправить ссылку после модерации площадок.
 * Когда ссылка есть, релиз вышел — WAV из хранилища удаляем.
 */
async function handlePublishReleaseSmartLink(request: NextRequest): Promise<Response> {
  const guard = await requireAdminSupabaseClient(
    request,
    getTelegramAuthContextFromRequest(request)
  );
  if (!guard.ok) return guard.response;
  const supabase = guard.supabase;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Некорректное тело запроса." }, { status: 400 });
  }

  let dbStatus: ReturnType<typeof mapAdminPublishStatusToDb>;
  let normalizedUrl: string;
  let upc: string | null;
  let releaseDate: string | null;
  try {
    dbStatus = mapAdminPublishStatusToDb(parsed.data.newStatus);
    normalizedUrl = assertHttpsUrl(parsed.data.smartLink);
    upc = normalizeUpc(parsed.data.upc);
    releaseDate = normalizeReleaseDate(parsed.data.releaseDate);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Некорректные данные.";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  if (dbStatus !== "ready") {
    return NextResponse.json(
      { ok: false, error: "Для выпуска со smart link статус должен быть RELEASED/ready." },
      { status: 400 }
    );
  }

  const { releaseId } = parsed.data;

  const { data: row, error: loadErr } = await supabase
    .from("releases")
    .select("*")
    .eq("id", releaseId)
    .maybeSingle();

  if (loadErr) {
    console.error("[admin/publish-release-smart-link] load:", loadErr.message);
    return NextResponse.json({ ok: false, error: "Не удалось загрузить релиз." }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ ok: false, error: "Релиз не найден." }, { status: 404 });
  }

  const status = String(row.status ?? "").toLowerCase();
  const acceptingNow = status === "processing" || status === "review";
  if (!acceptingNow && status !== "ready") {
    return NextResponse.json(
      {
        ok: false,
        error: "Ссылку можно добавить релизу на проверке или уже принятому."
      },
      { status: 409 }
    );
  }
  const hadLink = typeof row.smart_link === "string" && row.smart_link.trim().length > 0;

  const { data: updated, error: updErr } = await supabase
    .from("releases")
    .update({
      status: "ready",
      smart_link: normalizedUrl,
      ...(upc ? { upc } : {}),
      ...(releaseDate ? { release_date: releaseDate } : {}),
      ...(acceptingNow ? { error_message: null, admin_notes: null } : {})
    })
    .eq("id", releaseId)
    .select("*")
    .maybeSingle();

  if (updErr) {
    const detail = [updErr.message, (updErr as { details?: string }).details]
      .filter(Boolean)
      .join(" — ");
    console.error("[admin/publish-release-smart-link] update:", detail, updErr);
    return NextResponse.json(
      {
        ok: false,
        error: "Не удалось сохранить ссылку.",
        detail: detail || undefined
      },
      { status: 500 }
    );
  }

  if (!updated) {
    return NextResponse.json({ ok: false, error: "Обновление не применилось." }, { status: 500 });
  }

  const rec = updated as ReleaseRecord;
  await invalidateMyReleasesCache(rec as Record<string, unknown>);
  if (acceptingNow) await logAccepted(supabase, releaseId);
  // Поправили уже выданную ссылку — артиста второй раз не дёргаем.
  if (!hadLink) {
    await notifyArtist(rec, linkReadyMessage(getReleaseDisplayTitle(rec), normalizedUrl, {
        acceptedNow: acceptingNow,
        releaseDate: rec.release_date
      }));
  }
  await deleteApprovedReleaseAudio(supabase, releaseId);
  return NextResponse.json({ ok: true, record: rec });
}

export const POST = handlePublishReleaseSmartLink;
