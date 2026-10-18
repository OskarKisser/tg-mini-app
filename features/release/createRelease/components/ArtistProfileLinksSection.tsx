"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Disc3, MessageCircle, Music2, Radio } from "lucide-react";
import { WizardToggleRow } from "./WizardToggleRow";
import { useCreateReleaseDraftStore } from "@/features/release/createRelease/store";
import type { ArtistLinksState } from "@/lib/artist-links";
import { EMPTY_ARTIST_LINKS } from "@/lib/artist-links";
import { GLASS_FIELD_BASE } from "@/lib/glass-form-classes";
import { hapticMap } from "@/lib/haptic-map";

const FIELDS: {
  key: keyof ArtistLinksState;
  label: string;
  Icon: typeof Music2;
  placeholder: string;
}[] = [
  {
    key: "spotify",
    label: "Spotify",
    Icon: Music2,
    placeholder: "https://open.spotify.com/artist/…"
  },
  {
    key: "apple",
    label: "Apple Music",
    Icon: Disc3,
    placeholder: "https://music.apple.com/…/artist/…"
  },
  {
    key: "yandex",
    label: "Yandex Music",
    Icon: Radio,
    placeholder: "https://music.yandex.ru/artist/…"
  },
  {
    key: "vk",
    label: "VK",
    Icon: MessageCircle,
    placeholder: "https://vk.com/artist/…"
  }
];

export function ArtistProfileLinksSection() {
  const releaseArtistLinks = useCreateReleaseDraftStore((s) => s.releaseArtistLinks);
  const setReleaseArtistLinks = useCreateReleaseDraftStore((s) => s.setReleaseArtistLinks);

  const hasAnyLink = FIELDS.some(({ key }) => releaseArtistLinks[key].trim().length > 0);
  /** По умолчанию «новый артист»; раскрытие только после включения тумблера или при уже сохранённых ссылках. */
  const [hasProfiles, setHasProfiles] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasAnyLink) setHasProfiles(true);
  }, [hasAnyLink]);

  useEffect(() => {
    if (!hasProfiles) return;
    const id = window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [hasProfiles]);

  const toggleProfiles = (next: boolean) => {
    setHasProfiles(next);
    if (!next) {
      setReleaseArtistLinks({ ...EMPTY_ARTIST_LINKS });
    }
  };

  return (
    <div ref={panelRef} className="min-w-0 space-y-3">
      <WizardToggleRow
        id="artist-has-profiles"
        label="У меня есть профили на площадках"
        hint={hasProfiles ? "Добавь хотя бы одну ссылку на свой профиль" : "Если только начинаешь, оставь выключенным"}
        checked={hasProfiles}
        onChange={toggleProfiles}
      />

      <AnimatePresence initial={false}>
        {hasProfiles && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.32 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 pt-1">
              {FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className="min-w-0 space-y-1">
                  <label className="block text-[13px] text-omf-graphite">
                    {label}
                  </label>
                  <input
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    value={releaseArtistLinks[key]}
                    onChange={(e) => setReleaseArtistLinks({ [key]: e.target.value })}
                    placeholder={placeholder}
                    className={`${GLASS_FIELD_BASE} min-h-[48px] text-[15px]`}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
