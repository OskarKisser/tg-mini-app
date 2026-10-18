"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BotAvatar } from "bot-avatars";
import { AuthGuard } from "@/components/AuthGuard";
import { FeedbackCard } from "@/components/FeedbackCard";
import { LibraryWebAside } from "@/components/library/LibraryWebAside";
import { parseFaqTopic } from "@/lib/faq-topics";

function FaqWithTopic() {
  const topic = parseFaqTopic(useSearchParams().get("topic"));
  return <LibraryWebAside openTopic={topic} />;
}

export default function RequirementsPage() {
  return (
    <AuthGuard>
      <div className="mx-auto min-h-app w-full max-w-lg px-1 pb-40 pt-6 text-omf-ink">
        <header className="mb-6">
          <p className="text-[13px] text-omf-graphite">Правила и ответы</p>
          <h1 className="mt-1 text-[40px] font-extrabold leading-[0.92] tracking-[-0.045em]">Помощь</h1>
          <div className="mt-5 flex items-center gap-4">
            <BotAvatar type="blob" color="#2f3fe0" size={88} className="shrink-0" aria-label="Бот-помощник" />
            <div className="min-w-0">
              <p className="text-[17px] font-medium leading-snug text-omf-ink">
                Ответим про релиз, модерацию и оплату
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-omf-graphite">
                Требования к файлам, даты выхода, фиты и статусы модерации.
              </p>
            </div>
          </div>
        </header>
        <Suspense fallback={<LibraryWebAside />}>
          <FaqWithTopic />
        </Suspense>
        <div className="mt-8">
          <FeedbackCard />
        </div>
      </div>
    </AuthGuard>
  );
}
