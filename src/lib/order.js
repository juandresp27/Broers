// Compartido entre la web y los scripts: decide el orden final de los episodios de una temporada.
// playlists (en orden, sin duplicados) → exclude → insert. Si la temporada define `order`, manda ese.

/**
 * @param {{ playlists?: string[], exclude?: string[], insert?: { id: string, after?: string | null }[], order?: string[] }} season
 * @param {{ playlists: Record<string, { items: string[] }> }} data
 * @returns {string[]}
 */
export function resolveOrder(season, data) {
  if (season.order?.length) return [...season.order];
  const seen = new Set();
  const ids = [];
  for (const pl of season.playlists ?? []) {
    for (const id of data.playlists[pl]?.items ?? []) {
      if (!seen.has(id)) (seen.add(id), ids.push(id));
    }
  }
  const excluded = new Set(season.exclude ?? []);
  const out = ids.filter((id) => !excluded.has(id));
  for (const { id, after } of season.insert ?? []) {
    const existing = out.indexOf(id);
    if (existing !== -1) out.splice(existing, 1);
    if (after == null) out.unshift(id);
    else {
      const at = out.indexOf(after);
      at === -1 ? out.push(id) : out.splice(at + 1, 0, id);
    }
  }
  return out;
}
