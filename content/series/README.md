# Series

Cada archivo `.yaml` de esta carpeta es una serie del catálogo. Lo único obligatorio
es `slug`, `title` y al menos una temporada con una playlist.

```yaml
slug: mi-serie            # va en la URL: /rol/mi-serie
title: Mi Serie
kind: GTA V Roleplay      # se muestra como género
year: 2024
color: "#E4572E"          # color de la serie (póster, acentos)
tagline: Frase corta para el póster
synopsis: >
  Sinopsis larga de la serie.
tags: [acción, comedia]
featured: true            # opcional: candidata al banner principal
start_here: true          # opcional: aparece en "Empieza aquí"

seasons:
  - number: 1
    title: La llegada
    playlists: [PLxxxxxxxxxxxxxxxx]   # una o varias, en orden
    exclude: [videoId]                # sacar videos de la playlist
    insert:                           # meter videos que no están en la playlist
      - { id: videoId, after: otroVideoId }   # after: null = al inicio
    order: []                         # opcional: orden completo y explícito de ids

episodes:                 # retoques por episodio (clave = id del video)
  videoId:
    title: "El juicio"    # reemplaza el título de YouTube
    synopsis: "..."       # reemplaza la sinopsis generada

cast:
  - name: Nombre del personaje
    played_by: JuanSGuarnizo
    role: Protagonista
    bio: Quién es.
```

Después de editar, corre `npm run ingest` para traer los datos de YouTube y
`npm run synopsis` para generar las sinopsis que falten.
