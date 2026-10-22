// Genera sinopsis, resumen "Anteriormente en…" y personajes de cada episodio a partir de sus subtítulos.
// Uso: ANTHROPIC_API_KEY=... npm run synopsis [slug]
// Requiere yt-dlp para bajar los subtítulos automáticos. Solo procesa episodios que aún no tienen archivo.
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parse } from 'yaml';
import Anthropic from '@anthropic-ai/sdk';

const run = promisify(execFile);
const root = new URL('../content/', import.meta.url);
const cache = new URL('../.cache/subs/', import.meta.url);
const only = process.argv[2];
const client = new Anthropic();

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'logline', 'summary', 'previously', 'characters', 'moments'],
  properties: {
    title: { type: 'string', description: 'Título limpio del episodio, en mayúsculas y minúsculas normales, con nombres propios bien escritos. Basado en el título del video, sin el nombre de la serie, del streamer ni numeración.' },
    logline: { type: 'string', description: 'Una frase gancho, máximo 140 caracteres, sin spoilers del final.' },
    summary: { type: 'string', description: 'Sinopsis de 2 a 4 frases, tono de plataforma de streaming.' },
    previously: { type: 'string', description: 'Resumen "Anteriormente en…" de 1 a 2 frases para quien vio el episodio anterior.' },
    characters: { type: 'array', items: { type: 'string' }, description: 'Personajes que aparecen con peso en el episodio.' },
    moments: {
      type: 'array',
      description: 'De 3 a 6 momentos clave con el segundo aproximado donde ocurren.',
      items: {
        type: 'object', additionalProperties: false, required: ['t', 'text'],
        properties: { t: { type: 'integer' }, text: { type: 'string' } },
      },
    },
  },
};

/** Baja los subtítulos (manuales o automáticos en español) y los deja como texto con marcas de tiempo cada ~30 s. */
async function transcript(id) {
  await mkdir(cache, { recursive: true });
  const base = new URL(id, cache).pathname;
  try {
    await run('yt-dlp', ['--skip-download', '--write-subs', '--write-auto-subs', '--sub-langs', 'es.*,es', '--sub-format', 'json3', '-o', base, `https://www.youtube.com/watch?v=${id}`]);
  } catch (e) {
    return null;
  }
  const file = (await readdir(cache)).find((f) => f.startsWith(`${id}.`) && f.endsWith('.json3'));
  if (!file) return null;
  const data = JSON.parse(await readFile(new URL(file, cache), 'utf8'));
  let out = '';
  let lastMark = -30;
  for (const ev of data.events ?? []) {
    const text = (ev.segs ?? []).map((s) => s.utf8).join('').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const t = Math.floor((ev.tStartMs ?? 0) / 1000);
    if (t - lastMark >= 30) (out += `\n[${t}s] `), (lastMark = t);
    out += text + ' ';
  }
  return out.trim();
}

async function summarize({ series, episode, transcript, previous }) {
  const stream = client.beta.messages.stream({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    system:
      'Escribes las fichas de episodios de una serie de roleplay de un streamer, como lo haría una plataforma de streaming. ' +
      'Español latinoamericano, natural y con gracia, sin exagerar ni inventar. Solo afirmas lo que se desprende de la transcripción. ' +
      'La transcripción viene de subtítulos automáticos: corrige nombres mal escritos usando el reparto conocido.',
    messages: [{
      role: 'user',
      content:
        `Serie: ${series.title} (${series.kind ?? 'roleplay'})\n` +
        `Sinopsis de la serie: ${series.synopsis ?? '—'}\n` +
        `Reparto conocido: ${(series.cast ?? []).map((c) => `${c.name}${c.played_by ? ` (${c.played_by})` : ''}`).join(', ') || '—'}\n\n` +
        `Episodio anterior: ${previous?.summary ?? 'ninguno, es el primero'}\n\n` +
        `Título del video: ${episode.title}\nDescripción: ${(episode.description ?? '').slice(0, 1500)}\n\n` +
        `<transcripcion>\n${transcript}\n</transcripcion>`,
    }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('el modelo rechazó el episodio');
  const text = msg.content.find((b) => b.type === 'text')?.text;
  return JSON.parse(text);
}

for (const file of await readdir(new URL('series/', root))) {
  if (!file.endsWith('.yaml')) continue;
  const series = parse(await readFile(new URL(`series/${file}`, root), 'utf8'));
  if (series.demo || (only && series.slug !== only)) continue;
  const data = JSON.parse(await readFile(new URL(`generated/${series.slug}.json`, root), 'utf8'));
  console.log(`▸ ${series.title}`);

  // Mismo orden que la web, para que "Anteriormente en…" tenga contexto del episodio previo.
  const { resolveOrder } = await import('../src/lib/order.js');
  let previous = null;
  for (const season of series.seasons) {
    for (const id of resolveOrder(season, data)) {
      const out = new URL(`synopses/${id}.json`, root);
      const existing = await readFile(out, 'utf8').then(JSON.parse).catch(() => null);
      if (existing) { previous = existing; continue; }
      const episode = data.videos[id] ?? { id, title: '' };
      const text = await transcript(id);
      if (!text) { console.warn(`  ${id}: sin subtítulos, se omite`); continue; }
      try {
        previous = await summarize({ series, episode, transcript: text, previous });
        await writeFile(out, JSON.stringify(previous, null, 1) + '\n');
        console.log(`  ✓ ${id} ${previous.logline}`);
      } catch (e) {
        console.warn(`  ${id}: ${e.message}`);
      }
    }
  }
}
await rm(cache, { recursive: true, force: true });
