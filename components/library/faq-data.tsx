import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Compass,
  CircleDot,
  FileAudio,
  ImageIcon,
  ListMusic,
  Mic2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { MAX_WAV_MB } from "@/lib/storage-buckets";
import type { FaqTopicKey } from "@/lib/faq-topics";

export type { FaqTopicKey };

export type FaqItem = {
  id: FaqTopicKey;
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  searchText: string;
  tooltipText: string;
  tone?: "default" | "warning" | "gradient";
  content: ReactNode;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "audio",
    title: "Аудио",
    icon: FileAudio,
    iconClassName: "text-omf-graphite",
    searchText: `wav формат pcm 16 24 float 32 stereo 44.1 48 khz ${MAX_WAV_MB} мб mp3 flac`,
    tooltipText: `Загружайте только WAV (44.1/48 kHz), до ${MAX_WAV_MB} МБ на файл.`,
    content: (
      <ul className="space-y-2.5 text-[15px] leading-relaxed text-omf-graphite">
        <li>
          <span className="font-medium text-omf-ink">Формат:</span> только{" "}
          <span className="text-omf-ink">WAV</span> (PCM 16/24 bit или float 32 bit), стерео.
        </li>
        <li>
          <span className="font-medium text-omf-ink">Частота:</span>{" "}
          <span className="text-omf-ink">44.1 kHz</span> или <span className="text-omf-ink">48 kHz</span>{" "}
          — другие значения загрузчик не примет.
        </li>
        <li>
          <span className="font-medium text-omf-ink">Размер одного файла:</span> до{" "}
          <span className="text-omf-ink">{MAX_WAV_MB} МБ</span>.
        </li>
        <li className="text-omf-graphite">
          MP3, FLAC и другие форматы для этой загрузки не подходят — экспортируйте WAV из DAW.
        </li>
      </ul>
    ),
  },
  {
    id: "cover",
    title: "Обложка",
    icon: ImageIcon,
    iconClassName: "text-omf-graphite",
    searchText: "обложка jpeg png 3000x3000 35 мб квадрат",
    tooltipText: "Обложка: JPEG/PNG, квадрат от 3000×3000, до 35 МБ.",
    content: (
      <ul className="space-y-2.5 text-[15px] leading-relaxed text-omf-graphite">
        <li>
          <span className="font-medium text-omf-ink">Формат:</span> JPEG или PNG.
        </li>
        <li>
          <span className="font-medium text-omf-ink">Размер:</span> квадрат, минимум{" "}
          <span className="text-omf-ink">3000×3000 px</span>; для сторов лучше сразу 3000×3000.
        </li>
        <li>
          <span className="font-medium text-omf-ink">Вес файла:</span> до{" "}
          <span className="text-omf-ink">35 МБ</span>.
        </li>
      </ul>
    ),
  },
  {
    id: "release-date",
    title: "Дата выхода в кабинете",
    icon: CalendarClock,
    iconClassName: "text-omf-graphite",
    searchText: "дата релиза не раньше 5 дней модерация доставка",
    tooltipText: "Выбирайте дату релиза минимум за 5 дней от текущей.",
    content: (
      <p className="text-[15px] leading-relaxed text-omf-graphite">
        В мастере можно выбрать дату релиза{" "}
        <span className="font-medium text-omf-ink">не раньше чем через 5 дней от сегодняшней</span>{" "}
        (по календарю кабинета). Это нужно, чтобы успеть модерацию и доставку на площадки.
      </p>
    ),
  },
  {
    id: "release-type",
    title: "Тип релиза и треки",
    icon: ListMusic,
    iconClassName: "text-omf-graphite",
    searchText: "сингл ep альбом количество треков",
    tooltipText: "Сингл = 1 трек, EP/альбом = от 2 треков.",
    content: (
      <ul className="space-y-2.5 text-[15px] leading-relaxed text-omf-graphite">
        <li>
          <span className="font-medium text-omf-ink">Сингл</span> — ровно{" "}
          <span className="text-omf-ink">один</span> трек и один WAV.
        </li>
        <li>
          <span className="font-medium text-omf-ink">EP или альбом</span> — минимум{" "}
          <span className="text-omf-ink">два</span> трека, у каждого свой WAV.
        </li>
        <li>
          Названия в паспорте релиза и названия треков должны совпадать с тем, что вы хотите видеть в
          сторах; перед отправкой перечитайте шаг «Проверка».
        </li>
      </ul>
    ),
  },
  {
    id: "collab",
    title: "Фит и совместный трек",
    icon: Users,
    iconClassName: "text-omf-graphite",
    searchText: "фит совместный трек дополнительные артисты",
    tooltipText: "Добавляйте фиты через блок «Дополнительные артисты» на шаге «Треки».",
    content: (
      <p className="text-[15px] leading-relaxed text-omf-graphite">
        На шаге <span className="font-medium text-omf-ink">«Треки»</span> есть блок{" "}
        <span className="font-medium text-omf-ink">«Дополнительные артисты»</span>: нажмите
        «Добавить артиста» и введите имя фита или другого участника — данные сохраняются в метаданных
        релиза. При необходимости уточните отображаемое название трека в поле названия (как в сторе).
      </p>
    ),
  },
  {
    id: "metadata",
    title: "Метаданные и маркировки",
    icon: Mic2,
    iconClassName: "text-omf-graphite",
    searchText: "язык explicit 18+ названия спецсимволы track 1",
    tooltipText: "Укажите язык и explicit-маркировку, избегайте служебных названий.",
    content: (
      <ul className="space-y-2.5 text-[15px] leading-relaxed text-omf-graphite">
        <li>
          <span className="font-medium text-omf-ink">Язык исполнения</span> обязателен (список в
          мастере).
        </li>
        <li>
          <span className="font-medium text-omf-ink">Explicit (18+)</span> — отметьте на релизе и при
          необходимости на отдельных треках, если в тексте или подаче есть контент для взрослой
          маркировки.
        </li>
        <li className="text-omf-graphite">
          В названиях избегайте лишних спецсимволов ($, @), длинных отрывков КАПСОМ и служебных фраз
          вроде «Track 1» — иначе кабинет или модерация могут запросить правки.
        </li>
      </ul>
    ),
  },
  {
    id: "moderation",
    title: "Модерация и статусы",
    icon: ShieldCheck,
    iconClassName: "text-omf-graphite",
    searchText: "черновик ожидает на проверке принят готов ссылка пресейв отклонен статус",
    tooltipText: "Проверьте статусы: черновик, проверка, готово или отклонено.",
    content: (
      <ul className="space-y-2.5 text-[15px] leading-relaxed text-omf-graphite">
        <li className="flex gap-2">
          <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-omf-faint" />
          <span>
            <span className="font-medium text-omf-ink">Черновик / ожидает</span> — можно править и
            загружать файлы.
          </span>
        </li>
        <li className="flex gap-2">
          <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-omf-yellow" />
          <span>
            <span className="font-medium text-omf-ink">На проверке</span> — релиз у модераторов; срок
            зависит от очереди (часто от нескольких часов до нескольких рабочих дней).
          </span>
        </li>
        <li className="flex gap-2">
          <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-omf-green" />
          <span>
            <span className="font-medium text-omf-ink">Принят</span> — мы отправили релиз на площадки; их
            модерация обычно занимает 3–5 дней. Потом пришлём ссылку на пресейв — она появится в карточке
            релиза и во вкладке «Ссылки».
          </span>
        </li>
        <li className="flex gap-2">
          <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-omf-red" />
          <span>
            <span className="font-medium text-omf-ink">Отклонён</span> — в карточке будет причина;
            правки можно внести и отправить снова из библиотеки.
          </span>
        </li>
      </ul>
    ),
  },
  {
    id: "wav-warning",
    title: "Важно про WAV после паузы",
    icon: AlertTriangle,
    iconClassName: "text-omf-graphite",
    searchText: "wav пауза закрыли приложение повторно прикрепить отправка",
    tooltipText: "После долгой паузы снова прикрепите WAV перед отправкой.",
    tone: "warning",
    content: (
      <p className="text-[15px] leading-relaxed text-omf-graphite">
        Если вы закрыли приложение или долго не были в мастере, перед отправкой на модерацию снова
        прикрепите WAV на шаге «Треки» в этой сессии — иначе отправка может быть недоступна, даже если
        файлы уже были в базе.
      </p>
    ),
  },
  {
    id: "where-to-open",
    title: "Где что открыть",
    icon: Compass,
    iconClassName: "text-omf-graphite",
    searchText: "релизы ссылки профиль настройки пригласить друга где открыть",
    tooltipText: "Быстрые ссылки: Релизы, Ссылки и Профиль.",
    tone: "gradient",
    content: (
      <ul className="space-y-2.5 text-[15px] text-omf-graphite">
        <li>
          <Link
            href="/library"
            className="omf-focus inline-flex items-center gap-1 font-medium text-omf-ultra-text hover:text-omf-ink"
          >
            Релизы
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>{" "}
          — черновики, проверка, готовые.
        </li>
        <li>
          <Link
            href="/multi-links"
            className="omf-focus inline-flex items-center gap-1 font-medium text-omf-ultra-text hover:text-omf-ink"
          >
            Ссылки
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>{" "}
          — после выпуска, когда ссылки выдаст модерация.
        </li>
        <li>
          <Link
            href="/settings"
            className="omf-focus inline-flex items-center gap-1 font-medium text-omf-ultra-text hover:text-omf-ink"
          >
            Профиль
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>{" "}
          — приглашение друга и выход из веб-версии.
        </li>
      </ul>
    ),
  },
];

export const FAQ_TOOLTIP_TEXT_BY_TOPIC: Record<FaqTopicKey, string> = FAQ_ITEMS.reduce(
  (acc, item) => {
    acc[item.id] = item.tooltipText;
    return acc;
  },
  {} as Record<FaqTopicKey, string>,
);
