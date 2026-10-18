/** Имя артиста для шапки: то, что чаще всего стоит в его релизах, иначе имя из профиля. */
export function pickHeroArtistName(
  releases: readonly { artist_name?: string | null }[],
  fallback: string
): string {
  const counts = new Map<string, number>();
  for (const r of releases) {
    const name = r.artist_name?.trim();
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  counts.forEach((count, name) => {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  });
  return best ?? fallback;
}
