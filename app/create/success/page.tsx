"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateShell } from "@/features/release/createRelease/components/CreateShell";
import { useCreateReleaseDraftStore } from "@/features/release/createRelease/store";
import { SuccessReleaseModal } from "@/components/SuccessReleaseModal";
import { getTelegramUserId, isTelegramMiniApp, triggerHaptic } from "@/lib/telegram";
import { AppOrb } from "@/components/AppOrb";

type LeavingIntent = "home" | "create" | null;

export default function CreateSuccessPage() {
  const router = useRouter();
  /** State, а не ref: экран «Переход…» должен перерисоваться до навигации. */
  const [leaving, setLeaving] = useState<LeavingIntent>(null);
  const [notifiesInTelegram, setNotifiesInTelegram] = useState(false);
  const summary = useCreateReleaseDraftStore((s) => s.successSummary);
  const resetDraft = useCreateReleaseDraftStore((s) => s.resetDraft);
  const resetSubmissionUi = useCreateReleaseDraftStore((s) => s.resetSubmissionUi);
  const hasHydrated = useCreateReleaseDraftStore((s) => s.hasHydrated);

  useEffect(() => {
    resetSubmissionUi();
    setNotifiesInTelegram(isTelegramMiniApp() || getTelegramUserId() != null);
  }, [resetSubmissionUi]);

  /** Открыли «Готово» без отправки (закладка, назад после выхода) — показывать нечего, ведём в релизы. */
  useEffect(() => {
    if (hasHydrated && !summary && !leaving) router.replace("/library");
  }, [hasHydrated, summary, leaving, router]);

  useEffect(() => {
    if (summary) {
      try {
        triggerHaptic("success");
      } catch {
        /* ignore */
      }
    }
  }, [summary]);

  if (leaving) {
    return (
      <CreateShell>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4">
          <AppOrb state="composing" />
          <p className="text-center text-[14px] text-omf-graphite">
            {leaving === "home" ? "Переход на главную…" : "Открываем новый релиз…"}
          </p>
        </div>
      </CreateShell>
    );
  }

  return (
    <CreateShell>
      {!summary ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <AppOrb state="composing" />
        </div>
      ) : (
        <SuccessReleaseModal
          summary={summary}
          notifiesInTelegram={notifiesInTelegram}
          onGoHome={() => {
            setLeaving("home");
            resetDraft();
            router.push("/library?fromCreate=1");
          }}
          onUploadAnother={() => {
            setLeaving("create");
            resetDraft();
            router.push("/create/metadata");
          }}
        />
      )}
    </CreateShell>
  );
}
