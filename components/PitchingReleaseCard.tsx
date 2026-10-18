"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { ReleaseSleeve } from "@/components/ReleaseSleeve";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { savePressKit, uploadPressPhoto, validatePressPhoto } from "@/features/pitching/api";
import {
  PRESS_PHOTO_MAX_MB,
  PRESS_TEXT_MAX,
  formatPressKitUpdatedAt,
  isPressKitFilled,
  normalizePressText,
  pressTextLength,
  type PressKit
} from "@/lib/press-kit";
import { hapticMap } from "@/lib/haptic-map";
import { cn } from "@/lib/utils";

type Props = {
  releaseId: string;
  title: string;
  artist: string;
  coverUrl?: string | null;
  kit: PressKit | null;
  open: boolean;
  onToggle: () => void;
  onSaved: (kit: PressKit | null) => void;
};

/** Релиз во вкладке «Питчинг»: строка со статусом, по тапу форма пресс-релиза выезжает листом снизу. */
export function PitchingReleaseCard({ releaseId, title, artist, coverUrl, kit, open, onToggle, onSaved }: Props) {
  const filled = isPressKitFilled(kit);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          hapticMap.impactLight();
          onToggle();
        }}
        aria-haspopup="dialog"
        className="omf-focus grid w-full grid-cols-[56px_1fr_18px] items-center gap-3.5 rounded-[18px] bg-omf-surface p-2.5 text-left transition-transform active:scale-[0.98]"
      >
        <span className="block w-14">
          <ReleaseSleeve seed={releaseId} title={title} artist={artist} coverUrl={coverUrl} size="thumb" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-semibold tracking-[-0.01em] text-omf-ink">{title}</span>
          <span className={cn("mt-0.5 block truncate text-[12.5px]", filled ? "text-omf-green" : "text-omf-ultra-text")}>
            {filled ? "Отправлено модератору" : "Заполни пресс-релиз"}
          </span>
        </span>
        <ChevronRight className="h-[18px] w-[18px] text-omf-faint" aria-hidden />
      </button>

      <BottomSheet
        open={open}
        onClose={onToggle}
        header={(titleId) => (
          <div className="grid grid-cols-[48px_1fr] items-center gap-3">
            <span className="block w-12">
              <ReleaseSleeve seed={releaseId} title={title} artist={artist} coverUrl={coverUrl} size="thumb" />
            </span>
            <span className="min-w-0">
              <span id={titleId} className="block truncate text-[17px] font-semibold text-omf-ink">
                {title}
              </span>
              <span className="block truncate text-[12.5px] text-omf-graphite">{artist}</span>
            </span>
          </div>
        )}
      >
        <PressKitForm
          releaseId={releaseId}
          kit={kit}
          onSaved={(next) => {
            onSaved(next);
            if (next) onToggle();
          }}
        />
      </BottomSheet>
    </>
  );
}

function PressKitForm({
  releaseId,
  kit,
  onSaved
}: {
  releaseId: string;
  kit: PressKit | null;
  onSaved: (kit: PressKit | null) => void;
}) {
  const textId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(kit?.press_text ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const length = pressTextLength(text);
  const tooLong = length > PRESS_TEXT_MAX;
  const textChanged = normalizePressText(text) !== normalizePressText(kit?.press_text);
  const photoChanged = file != null || removePhoto;
  const shownPhoto = preview ?? (removePhoto ? null : kit?.photo_url ?? null);
  const canSave = (textChanged || photoChanged) && !tooLong && !saving;

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setPhotoError(null);
    try {
      const err = await validatePressPhoto(f);
      if (err) {
        setPhotoError(err);
        hapticMap.notificationError();
        return;
      }
    } catch (e: unknown) {
      setPhotoError(e instanceof Error ? e.message : "Не получилось открыть фото.");
      return;
    }
    setFile(f);
    setRemovePhoto(false);
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const patch: { pressText?: string | null; photoPath?: string | null } = {};
      if (textChanged) patch.pressText = normalizePressText(text);
      if (file) patch.photoPath = await uploadPressPhoto(releaseId, file);
      else if (removePhoto) patch.photoPath = null;
      const next = await savePressKit(releaseId, patch);
      setFile(null);
      setRemovePhoto(false);
      onSaved(next);
      hapticMap.notificationSuccess();
      toast.success("Сохранили, модератор увидит");
    } catch (e: unknown) {
      hapticMap.notificationError();
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={textId} className="text-[13px] text-omf-graphite">
          О чём трек, настроение, на что похоже
        </label>
        <textarea
          id={textId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Например: «Летний поп-трек про первую поездку к морю…»"
          className={cn(
            "omf-focus mt-1.5 w-full resize-none rounded-control border bg-omf-bg px-4 py-3 text-[16px] leading-relaxed text-omf-ink outline-none placeholder:text-omf-faint focus:border-omf-ultra",
            tooLong ? "border-omf-red" : "border-omf-line"
          )}
          aria-describedby={`${textId}-count`}
        />
        <p
          id={`${textId}-count`}
          className={cn("mt-1 text-right text-[13px] tabular-nums", tooLong ? "text-omf-red" : "text-omf-faint")}
        >
          {length} / {PRESS_TEXT_MAX}
        </p>
      </div>

      <div>
        <p className="text-[13px] text-omf-graphite">Фото артиста</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-omf-faint">
          Светлый однотонный фон, по пояс, без надписей. JPG, PNG или WEBP до {PRESS_PHOTO_MAX_MB} МБ.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {shownPhoto ? (
          <div className="mt-3 flex items-end gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: превью или signed URL */}
            <img
              src={shownPhoto}
              alt="Фото артиста"
              className="h-32 w-32 rounded-control bg-omf-surface object-cover"
            />
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="omf-focus rounded-full py-1 text-left text-[14px] text-omf-ultra-text hover:text-omf-ink"
              >
                Заменить
              </button>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setRemovePhoto(Boolean(kit?.photo_url));
                }}
                className="omf-focus inline-flex items-center gap-1 rounded-full py-1 text-left text-[14px] text-omf-graphite hover:text-omf-ink"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Убрать
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="omf-btn-secondary mt-3 w-full gap-2"
          >
            <ImagePlus className="h-4 w-4" aria-hidden />
            Выбрать фото
          </button>
        )}
        {photoError ? <p className="mt-2 text-[13px] text-omf-red">{photoError}</p> : null}
      </div>

      <div>
        <button type="button" disabled={!canSave} onClick={() => void save()} className="omf-btn-primary w-full disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {saving ? "Сохраняем…" : isPressKitFilled(kit) ? "Сохранить" : "Отправить модератору"}
        </button>
        {kit?.updated_at && !textChanged && !photoChanged ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-omf-graphite">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Сохранено {formatPressKitUpdatedAt(kit.updated_at)}. Можно поправить в любой момент.
          </p>
        ) : null}
      </div>
    </div>
  );
}
