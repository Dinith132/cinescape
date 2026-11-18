# Cinescape

Cinescape is a static, client-side 3D movie and TV recommendation explorer. Search for any title to place it at the center of an interactive 3D galaxy surrounded by its most similar titles (`closer = more similar`), filter by media type or genre group, inspect full metadata, or browse in an accessible list view.

---

## Running Locally

**Prerequisites:** Node.js 20+ and npm.

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:3000)
npm run dev

# Type-check
npm run lint

# Build production static bundle into dist/
npm run build

# Preview the production build locally
npm run preview
```

Because Cinescape uses relative asset paths (`base: './'`) and hash routing (`#/t/<type>-<tmdbId>`), it runs cleanly from any subpath such as GitHub Pages without server-side routing.

---

## Replacing Demo Data with Real Data

When `public/data/manifest.json` is absent, Cinescape automatically falls back to an in-memory synthetic demo dataset (`demo data` badge) so the app works immediately out of the box.

To serve the real dataset (up to ~20,000+ titles), place your generated static files inside `public/data/`:

```text
public/
├── tmdb-logo.svg
└── data/
    ├── manifest.json
    ├── galaxy.bin
    ├── search-index.json
    ├── posters.json
    ├── neighbors/
    │   ├── 000.json
    │   ├── 001.json
    │   └── ...
    └── details/
        ├── 000.json
        ├── 001.json
        └── ...
```

### Expected Data Formats

- **`manifest.json`**: Dataset metadata (`version`, `count`, `counts`, `shard_size`, `shard_count`, `top_k`, `score_scale`, `genre_groups`, `type_codes`, `image_base`, `image_sizes`, `tmdb_url`, `attribution`). Fetched with `cache: "no-cache"`; all other files are requested with `?v=<manifest.version>`.
- **`galaxy.bin`** (little-endian, `N * 16` bytes):
  - Bytes `0 .. N*12 - 1`: `Float32` `x, y, z` coordinates normalized to `[-1, 1]`.
  - Bytes `N*12 .. N*16 - 1`: `Uint8` quads `[genreGroupId, typeCode, sizeByte, reserved]`.
- **`search-index.json`**: `{ fields, rows }` where each row at index `idx` is `[title, year, typeCode, tmdbId, altTitle?]`.
- **`posters.json`**: Array of `N` TMDB poster paths indexed by `idx`.
- **`neighbors/NNN.json`**: Sharded similarity lists (`{ start, items: [{ n, s, f? }] }`).
- **`details/NNN.json`**: Sharded rich metadata (`{ start, items: [{ i, id, type, title, year, tagline, overview, genres, keywords, cast, creators, rating, votes, runtime, seasons, episodes, status, poster, backdrop, imdb, collection }] }`).

---

## GitHub Pages Deployment

The repository includes `.github/workflows/deploy.yml`, which runs `npm ci` and `npm run build` on every push to `main` and deploys the generated `dist/` directory using `actions/upload-pages-artifact` and `actions/deploy-pages`.

To enable deployment on GitHub:
1. Open **Settings -> Pages** in your repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

---

## TMDB Attribution Requirement

Movie and TV metadata, ratings, and poster/backdrop imagery are sourced from [The Movie Database (TMDB)](https://www.themoviedb.org/).

> This product uses the TMDB API but is not endorsed or certified by TMDB.

The footer on every screen displays `public/tmdb-logo.svg` alongside the `manifest.attribution` notice in accordance with TMDB attribution guidelines.
