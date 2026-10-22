// Trae los datos de las playlists y videos de cada serie y los guarda en content/generated/<slug>.json.
// Uso: YT_API_KEY=... npm run ingest [slug]
// Sin YT_API_KEY usa yt-dlp (debe estar instalado) como respaldo.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parse } from 'yaml';

const run = promisify(execFile);
const KEY = process.env.YT_API_KEY;
const root = new URL('../content/', import.meta.url);
const only = process.argv[2];

const iso8601 = (d = '') => {
  const m = d.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) ?? [];
  return (+(m[1] ?? 0)) * 86400 + (+(m[2] ?? 0)) * 3600 + (+(m[3] ?? 0)) * 60 + (+(m[4] ?? 0));
};

async function api(path, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function playlistViaApi(id) {
  const items = [];
  let pageToken = '';
  let title;
  const meta = await api('playlists', { part: 'snippet', id });
  title = meta.items?.[0]?.snippet?.title;
  do {
    const page = await api('playlistItems', { part: 'contentDetails', playlistId: id, maxResults: 50, pageToken });
    items.push(...page.items.map((i) => i.contentDetails.videoId));
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  return { title, items };
}

async function videosViaApi(ids) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const page = await api('videos', { part: 'snippet,contentDetails,statistics', id: ids.slice(i, i + 50).join(','), maxResults: 50 });
    for (const v of page.items) {
      const t = v.snippet.thumbnails;
      out[v.id] = {
        id: v.id,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        duration: iso8601(v.contentDetails.duration),
        thumb: (t.maxres ?? t.standard ?? t.high ?? t.medium)?.url,
        description: v.snippet.description,
        views: Number(v.statistics?.viewCount ?? 0),
      };
    }
  }
  return out;
}

async function ytdlp(args) {
  const { stdout } = await run('yt-dlp', ['-J', '--no-warnings', ...args], { maxBuffer: 1 << 28 });
  return JSON.parse(stdout);
}

async function playlistViaYtdlp(id) {
  const data = await ytdlp(['--flat-playlist', `https://www.youtube.com/playlist?list=${id}`]);
  return { title: data.title, items: data.entries.map((e) => e.id), entries: data.entries };
}

async function videosViaYtdlp(ids) {
  const out = {};
  for (const id of ids) {
    try {
      const v = await ytdlp([`https://www.youtube.com/watch?v=${id}`]);
      const d = v.upload_date; // YYYYMMDD
      out[id] = {
        id,
        title: v.title,
        publishedAt: d ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T00:00:00Z` : undefined,
        duration: v.duration,
        description: v.description,
        views: v.view_count,
      };
      process.stdout.write('.');
    } catch (e) {
      console.warn(`\n  no se pudo leer ${id}: ${e.message.split('\n')[0]}`);
    }
  }
  return out;
}

const getPlaylist = KEY ? playlistViaApi : playlistViaYtdlp;
const getVideos = KEY ? videosViaApi : videosViaYtdlp;

for (const file of await readdir(new URL('series/', root))) {
  if (!file.endsWith('.yaml')) continue;
  const config = parse(await readFile(new URL(`series/${file}`, root), 'utf8'));
  if (config.demo || (only && config.slug !== only)) continue;

  const outFile = new URL(`generated/${config.slug}.json`, root);
  const previous = await readFile(outFile, 'utf8').then(JSON.parse).catch(() => ({ playlists: {}, videos: {} }));
  const playlists = {};
  const wanted = new Set();

  console.log(`▸ ${config.title}`);
  for (const season of config.seasons) {
    for (const pl of season.playlists ?? []) {
      const { title, items } = await getPlaylist(pl);
      playlists[pl] = { title, items };
      items.forEach((id) => wanted.add(id));
      console.log(`  ${pl}: ${items.length} videos (${title ?? 'sin título'})`);
    }
    for (const { id } of season.insert ?? []) wanted.add(id);
    for (const id of season.order ?? []) wanted.add(id);
  }

  // Solo pedimos los videos nuevos; los ya guardados se reutilizan (ahorra cuota y tiempo).
  const missing = [...wanted].filter((id) => !previous.videos[id] || process.env.REFRESH);
  const fresh = missing.length ? await getVideos(missing) : {};
  const videos = Object.fromEntries([...wanted].map((id) => [id, fresh[id] ?? previous.videos[id]]).filter(([, v]) => v));

  await writeFile(outFile, JSON.stringify({ playlists, videos }, null, 1) + '\n');
  console.log(`\n  ✓ ${Object.keys(videos).length} videos (${missing.length} nuevos)`);
}
