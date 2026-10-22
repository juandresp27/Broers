import { parse } from 'yaml';
import type { Episode, Ingested, Season, Series, SeriesConfig, Synopsis, Video } from './types';
import { resolveOrder } from './order.js';

const configFiles = import.meta.glob('/content/series/*.yaml', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const ingestedFiles = import.meta.glob('/content/generated/*.json', { eager: true, import: 'default' }) as Record<string, Ingested>;
const synopsisFiles = import.meta.glob('/content/synopses/*.json', { eager: true, import: 'default' }) as Record<string, Synopsis>;

const fileId = (path: string) => path.split('/').pop()!.replace(/\.\w+$/, '');

const ingestedBySlug = Object.fromEntries(Object.entries(ingestedFiles).map(([p, d]) => [fileId(p), d]));
const synopses = Object.fromEntries(Object.entries(synopsisFiles).map(([p, d]) => [fileId(p), d]));

export const thumbFor = (id: string, quality: 'hq' | 'maxres' | 'mq' = 'hq') =>
  `https://i.ytimg.com/vi/${id}/${quality}default.jpg`;

function build(config: SeriesConfig): Series {
  const data: Ingested = ingestedBySlug[config.slug] ?? { playlists: {}, videos: {} };
  const href = `/rol/${config.slug}`;
  let absolute = 0;
  let runtime = 0;
  let views = 0;
  let lastPublished: string | undefined;

  const seasons: Season[] = config.seasons.map((sc) => {
    const episodes = resolveOrder(sc, data).map((id, i): Episode => {
      const video: Video = data.videos[id] ?? { id, title: '' };
      const override = config.episodes?.[id] ?? {};
      const synopsis: Synopsis = { ...synopses[id] };
      if (override.synopsis) synopsis.summary = override.synopsis;
      absolute += 1;
      runtime += video.duration ?? 0;
      views += video.views ?? 0;
      if (video.publishedAt && (!lastPublished || video.publishedAt > lastPublished)) lastPublished = video.publishedAt;
      return {
        ...video,
        id,
        title: override.title || synopsis.title || cleanTitle(video.title, config.title) || `Episodio ${i + 1}`,
        thumb: video.thumb ?? (video.demo ? undefined : thumbFor(id)),
        series: config.slug,
        season: sc.number,
        number: i + 1,
        absolute,
        synopsis,
        href: `${href}/${id}`,
      };
    });
    return { number: sc.number, title: sc.title ?? (sc.special ? 'Especial' : `Temporada ${sc.number}`), special: sc.special, episodes };
  });

  const first = seasons[0]?.episodes[0];
  const { seasons: _s, episodes: _e, ...meta } = config;
  return {
    ...meta,
    color: config.color ?? '#FFC21A',
    seasons,
    episodeCount: absolute,
    runtime,
    views,
    poster: first?.thumb ? thumbFor(first.id, 'hq') : undefined,
    href,
    lastPublished,
  };
}

/** Quita del título de YouTube el ruido típico: nombre de la serie, "#12", "| JuanSGuarnizo"… */
export function cleanTitle(title: string, seriesTitle: string): string {
  if (!title) return '';
  const esc = seriesTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let t = title
    .replace(/\p{Extended_Pictographic}|\u200d|\ufe0f/gu, '')
    .replace(new RegExp(esc, 'ig'), '')
    .replace(/\|?\|?\s*juans?guarnizo/ig, '')
    .replace(/#\d+/g, '')
    .replace(/\b(ep(isodio)?|cap(itulo|ítulo)?)\.?\s*\d+\b/ig, '')
    .replace(/^[\s\-–—|:·\/?,]+|[\s\-–—|:·\/,]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Títulos EN MAYÚSCULAS → frase normal (los nombres propios los corrige la sinopsis generada o un override)
  if (t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(t)) t = t.toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const allSeries: Series[] = Object.values(configFiles)
  .map((raw) => build(parse(raw) as SeriesConfig))
  .sort((a, b) => (b.lastPublished ?? '').localeCompare(a.lastPublished ?? '') || a.title.localeCompare(b.title));

export const getSeries = (slug: string) => allSeries.find((s) => s.slug === slug);

export const allEpisodes = (s: Series) => s.seasons.flatMap((x) => x.episodes);

export function neighbours(s: Series, id: string) {
  const eps = allEpisodes(s);
  const i = eps.findIndex((e) => e.id === id);
  return { prev: eps[i - 1], current: eps[i], next: eps[i + 1] };
}

export function formatDuration(seconds?: number) {
  if (!seconds) return '';
  const mins = Math.round(seconds / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}
