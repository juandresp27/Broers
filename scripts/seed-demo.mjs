// Datos de ejemplo para ver la plataforma sin playlists reales. Se borran cuando lleguen las series de verdad.
import { writeFile } from 'node:fs/promises';

const root = new URL('../content/', import.meta.url);

const series = [
  {
    slug: 'ciudad-neon', title: 'Ciudad Neón', kind: 'GTA V Roleplay', year: 2025, color: '#E4572E', featured: true,
    tagline: 'Llegó sin un peso. Ahora media ciudad le debe un favor.',
    synopsis: 'Un recién llegado sin papeles ni plan intenta abrirse camino en una ciudad donde la policía, las bandas y los negocios turbios se cruzan en cada esquina. Cada decisión tiene consecuencias, y los aliados de hoy son los problemas de mañana.',
    tags: ['crimen', 'comedia', 'drama'],
    cast: [
      { name: 'Tomás "El Broer" Rivas', played_by: 'JuanSGuarnizo', role: 'Protagonista', bio: 'Llegó en un bus sin aire acondicionado y con una sola meta: no volver.' },
      { name: 'La Jefa', played_by: 'Invitada', role: 'Antagonista', bio: 'Controla el puerto. Nadie sabe su nombre real.' },
      { name: 'Comisario Duarte', played_by: 'Invitado', role: 'Policía', bio: 'Lleva diez años detrás de la misma banda y no piensa jubilarse sin atraparla.' },
      { name: 'Mecánico Nacho', played_by: 'Invitado', role: 'Aliado', bio: 'Arregla cualquier carro. No pregunta de dónde salió.' },
    ],
    seasons: [
      { title: 'La llegada', eps: ['Bienvenido a la ciudad', 'El primer trabajo', 'Deudas', 'La noche del puerto', 'Socios', 'Todo o nada'] },
      { title: 'El ascenso', eps: ['Nuevo jefe en el barrio', 'La traición', 'Juicio', 'Fuga', 'El regreso', 'Final de temporada'] },
    ],
  },
  {
    slug: 'el-pueblo', title: 'El Pueblo', kind: 'Minecraft Roleplay', year: 2024, color: '#3FA34D', start_here: true,
    tagline: 'Un alcalde, cuarenta vecinos y cero ganas de pagar impuestos.',
    synopsis: 'Un pueblo pequeño elige al alcalde menos preparado de su historia. Entre elecciones amañadas, guerras de vecinos y una mina que nadie debería abrir, gobernar resulta más difícil de lo que parecía.',
    tags: ['comedia', 'política'],
    cast: [
      { name: 'Alcalde Juancho', played_by: 'JuanSGuarnizo', role: 'Protagonista', bio: 'Ganó las elecciones por un voto. El suyo.' },
      { name: 'Doña Rosa', played_by: 'Invitada', role: 'Vecina', bio: 'Sabe todo lo que pasa en el pueblo antes de que pase.' },
    ],
    seasons: [{ title: 'Temporada 1', eps: ['Campaña', 'El conteo', 'Primer día de gobierno', 'La mina', 'Impuestos', 'Revuelta', 'El túnel', 'Reelección'] }],
  },
  {
    slug: 'los-infiltrados', title: 'Los Infiltrados', kind: 'Roleplay de misterio', year: 2023, color: '#2F6FEB', start_here: true,
    tagline: 'Hay un traidor en el grupo. Puede que seas tú.',
    synopsis: 'Seis desconocidos despiertan en una casa aislada. Uno de ellos trabaja para alguien más. Una serie corta, ideal para empezar.',
    tags: ['misterio', 'suspenso'],
    cast: [{ name: 'Detective Guarnizo', played_by: 'JuanSGuarnizo', role: 'Protagonista', bio: 'Confía en todos. Ese es su problema.' }],
    seasons: [{ title: 'Miniserie', eps: ['Despertar', 'Sospechas', 'La votación', 'El sótano', 'Desenmascarado'] }],
  },
  {
    slug: 'isla-broer', title: 'Isla Broer', kind: 'Supervivencia', year: 2022, color: '#1FA39A',
    tagline: 'Cien días, una isla y muy malas decisiones.',
    synopsis: 'Un naufragio deja al grupo en una isla sin señal. Lo que empieza como unas vacaciones forzadas termina en una pelea por el último coco.',
    tags: ['aventura', 'comedia'],
    cast: [{ name: 'Juan', played_by: 'JuanSGuarnizo', role: 'Náufrago', bio: 'Trajo una guitarra y ninguna comida.' }],
    seasons: [{ title: 'Temporada 1', eps: ['Naufragio', 'El refugio', 'Tormenta', 'La otra tribu', 'Rescate'] }],
  },
];

const yaml = (s) => [
  `# DEMO: serie de ejemplo. Bórrala cuando agregues las series reales.`,
  `demo: true`,
  `slug: ${s.slug}`, `title: ${s.title}`, `kind: ${s.kind}`, `year: ${s.year}`, `color: "${s.color}"`,
  s.featured ? 'featured: true' : '', s.start_here ? 'start_here: true' : '',
  `tagline: ${JSON.stringify(s.tagline)}`, `synopsis: ${JSON.stringify(s.synopsis)}`, `tags: [${s.tags.join(', ')}]`,
  `seasons:`, ...s.seasons.map((x, i) => `  - number: ${i + 1}\n    title: ${x.title}\n    playlists: [demo-${s.slug}-${i + 1}]`),
  `cast:`, ...s.cast.map((c) => `  - name: ${JSON.stringify(c.name)}\n    played_by: ${c.played_by}\n    role: ${c.role}\n    bio: ${JSON.stringify(c.bio)}`),
].filter(Boolean).join('\n') + '\n';

let day = Date.UTC(2025, 0, 6);
for (const s of series) {
  const data = { playlists: {}, videos: {} };
  let prev = null;
  s.seasons.forEach((season, si) => {
    const pl = `demo-${s.slug}-${si + 1}`;
    data.playlists[pl] = { title: `${s.title} T${si + 1}`, items: [] };
    season.eps.forEach((title, ei) => {
      const id = `demo-${s.slug}-${si + 1}-${ei + 1}`;
      data.playlists[pl].items.push(id);
      day += 86400000 * 3;
      data.videos[id] = { id, title, demo: true, duration: 3600 * 2 + ((ei * 1789) % 5400), publishedAt: new Date(day).toISOString() };
      const synopsis = {
        logline: `${title}: un episodio de ejemplo de ${s.title}.`,
        summary: `Texto de ejemplo. Aquí va la sinopsis generada a partir de los subtítulos del stream: qué pasa, quién aparece y por qué importa para la historia de ${s.title}.`,
        previously: prev ? `En "${prev}", la historia dio un giro que deja todo listo para este episodio.` : undefined,
        characters: s.cast.slice(0, 2 + (ei % 2)).map((c) => c.name),
        moments: [{ t: 300, text: 'Arranca el episodio' }, { t: 2400, text: 'El primer giro' }, { t: 5400, text: 'El momento que todos clipearon' }],
      };
      prev = title;
      writeFile(new URL(`synopses/${id}.json`, root), JSON.stringify(synopsis, null, 1) + '\n');
    });
  });
  await writeFile(new URL(`series/${s.slug}.yaml`, root), yaml(s));
  await writeFile(new URL(`generated/${s.slug}.json`, root), JSON.stringify(data, null, 1) + '\n');
}
console.log('Datos de ejemplo listos.');
