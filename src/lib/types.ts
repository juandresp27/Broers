export interface Video {
  id: string;
  title: string;
  publishedAt?: string;
  duration?: number; // segundos
  thumb?: string;
  description?: string;
  views?: number;
  demo?: boolean;
}

export interface Synopsis {
  logline?: string;
  summary?: string;
  previously?: string;
  characters?: string[];
  moments?: { t: number; text: string }[];
}

export interface CastMember {
  name: string;
  played_by?: string;
  role?: string;
  bio?: string;
  image?: string;
}

export interface SeasonConfig {
  number: number;
  title?: string;
  playlists?: string[];
  exclude?: string[];
  insert?: { id: string; after?: string | null }[];
  order?: string[];
}

export interface SeriesConfig {
  slug: string;
  title: string;
  kind?: string;
  year?: number;
  color?: string;
  tagline?: string;
  synopsis?: string;
  tags?: string[];
  featured?: boolean;
  start_here?: boolean;
  demo?: boolean;
  seasons: SeasonConfig[];
  episodes?: Record<string, { title?: string; synopsis?: string }>;
  cast?: CastMember[];
}

export interface Ingested {
  playlists: Record<string, { title?: string; items: string[] }>;
  videos: Record<string, Video>;
}

export interface Episode extends Video {
  series: string;
  season: number;
  number: number; // dentro de la temporada
  absolute: number; // dentro de la serie
  synopsis: Synopsis;
  href: string;
}

export interface Season {
  number: number;
  title: string;
  episodes: Episode[];
}

export interface Series extends Omit<SeriesConfig, 'seasons' | 'episodes'> {
  color: string;
  seasons: Season[];
  episodeCount: number;
  runtime: number; // segundos totales
  views: number;
  poster?: string;
  href: string;
  lastPublished?: string;
}
