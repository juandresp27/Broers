# Broers

Fan page de JuanSGuarnizo: las series de rol como en una plataforma de streaming, clips, juegos y la zona de la comunidad.

## Stack

- **Astro** genera todo el sitio como HTML estático. Cada página carga solo el JavaScript que necesita (reproductor, "Continuar viendo"), así que abre rápido incluso en celular.
- **Svelte** para las partes interactivas que vienen (quiz, bingo, predicciones, álbum).
- **Vercel** (o cualquier hosting estático) para publicar. Un GitHub Action puede reconstruir el sitio a diario para traer episodios nuevos.
- **Supabase** (más adelante) para lo que necesita guardarse entre usuarios: votos, puntos, álbum, rangos, con login de Twitch.

No hay servidor propio: lo costoso (leer YouTube, subtítulos, sinopsis) se hace una vez al construir y queda guardado en `content/`.

## Cómo se arman las series

1. Cada serie es un archivo en `content/series/*.yaml` (ver `content/series/README.md`).
   Ahí se ponen las playlists, se reordena, se meten videos sueltos o se sacan los que sobran.
2. `npm run ingest` trae títulos, fechas, duraciones y vistas de YouTube a `content/generated/<serie>.json`.
   Usa `YT_API_KEY` (YouTube Data API, gratis) si existe; si no, usa `yt-dlp`.
3. `npm run synopsis` baja los subtítulos automáticos de cada episodio y genera con Claude la sinopsis,
   el "Anteriormente en…", los personajes y los momentos clave. Guarda un archivo por episodio en
   `content/synopses/` y nunca regenera los que ya existen (se pueden editar a mano).

## Desarrollo

```sh
npm install
npm run dev       # http://localhost:4321
npm run build
```

Requiere Node 22.23 o superior.

`node scripts/seed-demo.mjs` crea series de ejemplo (marcadas con `demo: true`) para ver el diseño sin datos reales.
