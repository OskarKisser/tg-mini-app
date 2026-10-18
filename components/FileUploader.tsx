"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "react-error-boundary";
import { Check, ImagePlus, Music2, Plus } from "lucide-react";
import { FormFieldError } from "@/components/FormFieldError";
import { ALLOWED_AUDIO_MIME } from "@/repositories/releases.repo";
import { triggerHaptic } from "@/lib/telegram";
import { AppOrb } from "@/components/AppOrb";

/** WebGL-мозаика (three.js) грузится только когда пользователь выбрал обложку. */
const CoverMosaic = dynamic(() => import("@/components/CoverMosaic"), { ssr: false });

const MOSAIC_THUMB_PX = 512;

/** Миниатюра для WebGL; null — если canvas недоступен или включено «меньше движения». */
function makeMosaicThumb(img: HTMLImageElement): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return Promise.resolve(null);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = MOSAIC_THUMB_PX;
    canvas.height = MOSAIC_THUMB_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);
    ctx.drawImage(img, 0, 0, MOSAIC_THUMB_PX, MOSAIC_THUMB_PX);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), "image/jpeg", 0.85);
    });
  } catch {
    return Promise.resolve(null);
  }
}

type Props = {
  label?: string;
  accept: string;
  maxSizeMb: number;
  type: "wav" | "cover";
  onFileChange: (file: File | null) => void;
  /** Pass a File already held in the Zustand store to restore the UI after navigation. */
  initialFile?: File | null;
  /** Persisted remote URL shown as preview when initialFile is unavailable (e.g. after F5). */
  initialPreviewUrl?: string | null;
  /** Подсветка ошибки валидации с родителя (glass + красная обводка). */
  invalid?: boolean;
  /** Реальный прогресс загрузки (0–100), например WAV на сервер; только для type `wav`. */
  uploadProgressPercent?: number | null;
  helperText?: string;
};

function revokeIfBlobUrl(url: string | null): void {
  if (!url) return;
  if (url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}

export function FileUploader({
  label,
  accept,
  maxSizeMb,
  type,
  onFileChange,
  initialFile,
  initialPreviewUrl,
  invalid = false,
  uploadProgressPercent = null,
  helperText
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const successFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mosaicSrc, setMosaicSrc] = useState<string | null>(null);
  /** Blob URL created by this component for `initialFile` (cover); revoked on replace/unmount. */
  const ownedBlobUrlRef = useRef<string | null>(null);

  const revokeOwnedBlob = () => {
    if (ownedBlobUrlRef.current) {
      URL.revokeObjectURL(ownedBlobUrlRef.current);
      ownedBlobUrlRef.current = null;
    }
  };

  // Sync from props when Zustand rehydrates after mount or parent updates initialFile / artwork URL.
  useEffect(() => {
    revokeOwnedBlob();
    setError(null);

    if (initialFile) {
      setFile(initialFile);
      if (type === "cover") {
        const url = URL.createObjectURL(initialFile);
        ownedBlobUrlRef.current = url;
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
      return;
    }

    setFile(null);
    if (type === "cover" && initialPreviewUrl?.trim()) {
      setPreviewUrl(initialPreviewUrl.trim());
    } else {
      setPreviewUrl(null);
    }
  }, [initialFile, initialPreviewUrl, type]);

  useEffect(() => {
    return () => {
      revokeOwnedBlob();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (successFlashTimerRef.current != null) {
        clearTimeout(successFlashTimerRef.current);
        successFlashTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      revokeIfBlobUrl(mosaicSrc);
    };
  }, [mosaicSrc]);

  // Таймер мозаики живёт в CoverMosaic: он стартует, когда компонент смонтирован, а не раньше.
  const clearMosaic = useCallback(() => setMosaicSrc(null), []);

  const playMosaic = async (img: HTMLImageElement) => {
    const thumb = await makeMosaicThumb(img);
    if (!thumb) return;
    setMosaicSrc(thumb);
  };

  const scheduleSuccessFlash = () => {
    if (successFlashTimerRef.current != null) {
      clearTimeout(successFlashTimerRef.current);
    }
    setIsUploading(true);
    setUploadSuccess(true);
    triggerHaptic("success");
    successFlashTimerRef.current = setTimeout(() => {
      successFlashTimerRef.current = null;
      setIsUploading(false);
      setUploadSuccess(false);
    }, 1200);
  };

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setError(null);

    if (!selected) {
      setFile(null);
      setIsUploading(false);
      onFileChange(null);
      return;
    }

    const sizeMb = selected.size / (1024 * 1024);
    if (sizeMb > maxSizeMb) {
      setError(`Файл больше ${maxSizeMb} МБ. Выбери файл поменьше.`);
      setFile(null);
      onFileChange(null);
      if (previewUrl) {
        revokeIfBlobUrl(previewUrl);
        setPreviewUrl(null);
      }
      setIsUploading(false);
      return;
    }

    if (type === "wav") {
      if (!selected.name.toLowerCase().endsWith(".wav")) {
        setError("Нужен файл в формате WAV.");
        setFile(null);
        onFileChange(null);
        if (previewUrl) {
          revokeIfBlobUrl(previewUrl);
          setPreviewUrl(null);
        }
        setIsUploading(false);
        return;
      }
      const mime = selected.type.trim();
      const mimeOk =
        mime === "" ||
        ALLOWED_AUDIO_MIME.has(mime) ||
        mime === "application/octet-stream" ||
        (mime.startsWith("audio/") && selected.name.toLowerCase().endsWith(".wav"));
      if (!mimeOk) {
        setError("Этот файл не похож на WAV. Выбери файл с расширением .wav.");
        setFile(null);
        onFileChange(null);
        if (previewUrl) {
          revokeIfBlobUrl(previewUrl);
          setPreviewUrl(null);
        }
        setIsUploading(false);
        return;
      }
    }

    if (type === "cover") {
      const mime = selected.type.trim().toLowerCase();
      const lowerName = selected.name.toLowerCase();
      const isPng = mime === "image/png" || lowerName.endsWith(".png");
      const isJpg =
        mime === "image/jpeg" ||
        mime === "image/jpg" ||
        lowerName.endsWith(".jpg") ||
        lowerName.endsWith(".jpeg");
      const isOctet = mime === "application/octet-stream";
      const isJpgOrPng =
        isPng ||
        isJpg ||
        ((mime === "" || isOctet) &&
          (lowerName.endsWith(".png") ||
            lowerName.endsWith(".jpg") ||
            lowerName.endsWith(".jpeg")));
      if (!isJpgOrPng) {
        setError("Обложка должна быть в формате JPG или PNG.");
        setFile(null);
        onFileChange(null);
        if (previewUrl) {
          revokeIfBlobUrl(previewUrl);
          setPreviewUrl(null);
        }
        setIsUploading(false);
        return;
      }

      const objectUrl = URL.createObjectURL(selected);
      const img = new Image();
      img.onload = () => {
        if (img.width < 3000 || img.height < 3000) {
          setError("Обложка меньше 3000×3000 пикселей. Выбери изображение побольше.");
          URL.revokeObjectURL(objectUrl);
        } else {
          // Parent updates `initialFile` → sync effect sets file + owned blob preview.
          onFileChange(selected);
          scheduleSuccessFlash();
          void playMosaic(img).finally(() => URL.revokeObjectURL(objectUrl));
        }
      };
      img.onerror = () => {
        setError("Не получилось открыть изображение. Попробуй другой файл.");
        URL.revokeObjectURL(objectUrl);
        setIsUploading(false);
      };
      img.src = objectUrl;
      return;
    }

    setFile(selected);
    onFileChange(selected);
    // WAV: реальная загрузка в Supabase Storage запускается с родителя — без «фейкового» прогресса.
    if (type !== "wav") {
      scheduleSuccessFlash();
    }
  };

  const hasCover = type === "cover" && Boolean(previewUrl);
  const clampedProgress =
    uploadProgressPercent != null && Number.isFinite(uploadProgressPercent)
      ? Math.round(Math.min(100, Math.max(0, uploadProgressPercent)))
      : null;
  const isWavUploading = type === "wav" && clampedProgress != null;
  const hasError = invalid || Boolean(error);

  const frame = `omf-focus relative flex cursor-pointer overflow-hidden transition-colors duration-150 focus-within:border-omf-ultra ${
    hasError ? "border-omf-red" : "border-omf-line-strong hover:border-omf-graphite"
  }`;

  return (
    <div className="space-y-2">
      {label ? <p className="text-[13px] text-omf-graphite">{label}</p> : null}

      {type === "cover" ? (
        <>
        <label
          className={`${frame} mx-auto aspect-square w-full max-w-[280px] flex-col items-center justify-center rounded-[4px] ${
            hasCover ? "border border-omf-line" : `omf-first-cover omf-first-cover--flat px-6 text-center ${hasError ? "border border-omf-red" : ""}`
          }`}
        >
          <input type="file" accept={accept} className="sr-only" onChange={handleChange} />
          {hasCover && previewUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Предпросмотр обложки" className="absolute inset-0 h-full w-full object-cover" />
              {mosaicSrc ? (
                <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
                  <ErrorBoundary fallback={null} onError={clearMosaic}>
                    <CoverMosaic key={mosaicSrc} src={mosaicSrc} onDone={clearMosaic} />
                  </ErrorBoundary>
                </div>
              ) : null}
              <span className="absolute inset-x-0 bottom-0 bg-omf-bg/85 px-3 py-2.5 text-center text-[14px] text-omf-ink">
                {isUploading ? "Обложка выбрана" : "Нажми, чтобы заменить"}
              </span>
            </>
          ) : (
            <>
              <span className="relative z-[1] flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/30">
                <Plus className="h-[22px] w-[22px] text-white" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="relative z-[1] mt-3 text-[16px] font-semibold text-white">Выбрать обложку</span>
            </>
          )}
        </label>
        <p className="mt-3 text-center text-[13px] leading-relaxed text-omf-graphite">
          <span className="font-medium text-omf-ink">Квадрат JPG или PNG</span>
          <br />
          От 3000×3000 пикселей, до {maxSizeMb} МБ
        </p>
        </>
      ) : (
        <label
          className={`${frame} min-h-[88px] flex-col justify-center rounded-control px-4 py-4 ${
            file || isWavUploading ? "border bg-omf-surface" : "border-[1.5px] border-dashed"
          }`}
        >
          <input type="file" accept={accept} className="sr-only" onChange={handleChange} />
          {isWavUploading ? (
            <div aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-[14px]">
                <AppOrb state="listening" size={20} />
                <span className="min-w-0 flex-1 truncate">{file?.name ?? "Загружаем WAV"}</span>
                <span className="shrink-0 tabular-nums text-omf-ultra-text">{clampedProgress}%</span>
              </div>
              <div
                className="mt-3 h-1 w-full overflow-hidden rounded-full bg-omf-line"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={clampedProgress ?? 0}
              >
                <div
                  className="h-full rounded-full bg-omf-ultra transition-[width] duration-200 ease-out"
                  style={{ width: `${clampedProgress}%` }}
                />
              </div>
            </div>
          ) : file ? (
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-omf-green text-white">
                <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[15px] text-omf-ink" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[13px] text-omf-graphite">Нажми, чтобы заменить</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Music2 className="h-6 w-6 shrink-0 text-omf-graphite" strokeWidth={1.5} aria-hidden />
              <div>
                <p className="text-[16px] font-medium text-omf-ink">Выбери WAV</p>
                <p className="text-[13px] text-omf-graphite">Файл до {maxSizeMb} МБ</p>
              </div>
            </div>
          )}
        </label>
      )}

      {helperText ? <p className="text-[13px] text-omf-graphite">{helperText}</p> : null}

      <FormFieldError message={error ?? undefined} />
    </div>
  );
}
