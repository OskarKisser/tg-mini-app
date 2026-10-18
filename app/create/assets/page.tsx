"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { CreateShell } from "@/features/release/createRelease/components/CreateShell";
import { WizardActionBar } from "@/features/release/createRelease/components/WizardActionBar";
import { StepGate } from "@/features/release/createRelease/components/StepGate";
import { useStepGuard } from "@/features/release/createRelease/guards";
import {
  ensureDraftRelease,
  saveDraftAction,
  uploadArtworkForDraft
} from "@/features/release/createRelease/actions";
import { RELEASE_FILE_LIMITS } from "@/repositories/releases/types";
import { useCreateReleaseDraftStore } from "@/features/release/createRelease/store";
import { FormFieldError } from "@/components/FormFieldError";
import { debugInit } from "@/lib/debug";
import { logClientError } from "@/lib/logger";
import {
  acquireTelegramClosingConfirmation,
  releaseTelegramClosingConfirmation,
  triggerHaptic
} from "@/lib/telegram";
import { toast } from "sonner";
import { BusyLabel } from "@/components/BusyLabel";

const FileUploader = dynamic(
  () => import("@/components/FileUploader").then((m) => m.FileUploader),
  { ssr: false }
);

export default function CreateAssetsPage() {
  const router = useRouter();
  const guard = useStepGuard("assets");

  const artworkUrl = useCreateReleaseDraftStore((s) => s.artworkUrl);
  // artworkFile lives in Zustand memory (non-persisted) so it survives navigation
  // within the same session. FileUploader receives it as initialFile to restore its UI.
  const artworkFile = useCreateReleaseDraftStore((s) => s.artworkFile);
  const setArtworkFile = useCreateReleaseDraftStore((s) => s.setArtworkFile);
  const submitError = useCreateReleaseDraftStore((s) => s.submitError);
  const setSubmitError = useCreateReleaseDraftStore((s) => s.setSubmitError);
  const releaseId = useCreateReleaseDraftStore((s) => s.releaseId);

  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setSubmitError(null);
  }, [setSubmitError]);

  // "Next" is enabled when a file has been chosen in this session OR when artwork
  // was already uploaded in a previous step (artworkUrl persisted in store).
  const canGoNext = useMemo(
    () => Boolean(artworkFile) || Boolean(artworkUrl),
    [artworkFile, artworkUrl]
  );

  const handleNext = useCallback(async () => {
    triggerHaptic("light");
    debugInit("create/assets", "handleNext start", {
      hasArtworkUrl: Boolean(artworkUrl),
      hasArtworkFile: Boolean(artworkFile),
      hasReleaseId: Boolean(releaseId)
    });
    if (artworkUrl && !artworkFile) {
      debugInit("create/assets", "skip upload, artwork already exists");
      const saved = await saveDraftAction();
      if (!saved.ok) {
        if (saved.message) toast.error(saved.message);
        return;
      }
      router.push("/create/tracks");
      return;
    }
    if (!artworkFile) {
      debugInit("create/assets", "blocked: artwork file missing");
      setSubmitError("Сначала выбери обложку: JPG или PNG от 3000×3000 пикселей.");
      return;
    }
    setIsUploading(true);
    setSubmitError(null);
    acquireTelegramClosingConfirmation();
    try {
      if (!releaseId) {
        debugInit("create/assets", "ensureDraftRelease start");
        const draft = await ensureDraftRelease();
        if (!draft) {
          debugInit("create/assets", "ensureDraftRelease returned null");
          const errMsg = useCreateReleaseDraftStore.getState().submitError;
          if (errMsg) toast.error(errMsg);
          return;
        }
        debugInit("create/assets", "ensureDraftRelease success", { releaseId: draft.id });
      }
      debugInit("create/assets", "uploadArtworkForDraft start");
      const url = await uploadArtworkForDraft(artworkFile);
      if (!url) {
        debugInit("create/assets", "uploadArtworkForDraft returned empty URL");
        const errMsg = useCreateReleaseDraftStore.getState().submitError;
        if (errMsg) toast.error(errMsg);
        return;
      }
      debugInit("create/assets", "uploadArtworkForDraft success", { hasUrl: true });
      const saved = await saveDraftAction();
      if (!saved.ok) {
        if (saved.message) toast.error(saved.message);
        return;
      }
      router.push("/create/tracks");
    } catch (e: unknown) {
      console.error("[CreateAssetsPage] Upload error:", e);
      logClientError({
        error: e,
        screenName: "CreateAssets_upload",
        route: "/create/assets"
      });
      setSubmitError(
        e instanceof Error ? e.message : "Произошла ошибка при загрузке обложки."
      );
      toast.error(
        e instanceof Error ? e.message : "Произошла ошибка при загрузке обложки."
      );
    } finally {
      debugInit("create/assets", "handleNext finished");
      releaseTelegramClosingConfirmation();
      setIsUploading(false);
    }
  }, [artworkFile, artworkUrl, releaseId, router, setSubmitError]);

  return (
    <CreateShell title="Обложка">
      {!guard.allowed ? (
        <StepGate
          title={guard.title}
          description={guard.description}
          actionLabel={guard.actionLabel}
          onAction={() => router.push(`/create/${guard.redirectTo}`)}
        />
      ) : (
        <div className="space-y-6">
          <div>
            <div>
              <FileUploader
                accept=".jpg,.jpeg,.png"
                maxSizeMb={RELEASE_FILE_LIMITS.artworkMaxMb}
                type="cover"
                initialFile={artworkFile}
                initialPreviewUrl={artworkUrl}
                onFileChange={setArtworkFile}
              />
            </div>
          </div>

          <FormFieldError message={submitError ?? undefined} messageClassName="text-center" />

          <WizardActionBar>
            <button
              type="button"
              disabled={!canGoNext || isUploading}
              onClick={handleNext}
              className="create-flow-submit-target omf-btn-primary h-[52px] w-full text-[16px] font-medium"
            >
              <BusyLabel busy={isUploading} busyText="Загружаем обложку…">Дальше: треки</BusyLabel>
            </button>
          </WizardActionBar>
        </div>
      )}
    </CreateShell>
  );
}
