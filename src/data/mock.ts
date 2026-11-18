import { CONFIG } from '../config';
import type {
  DetailsShard,
  GalaxyBinaryData,
  GenreGroup,
  Manifest,
  NeighborItem,
  NeighborShard,
  SearchIndexFile,
  SearchIndexRow,
  TitleDetails,
} from './types';

const MOCK_GENRE_GROUPS: GenreGroup[] = [
  { id: 0, name: 'Action & Adventure', color: '#ff6b35' },
  { id: 1, name: 'Sci-Fi & Fantasy', color: '#a66bff' },
  { id: 2, name: 'Horror', color: '#d00000' },
  { id: 3, name: 'Crime & Thriller', color: '#2ec4b6' },
  { id: 4, name: 'Comedy', color: '#ffd23f' },
  { id: 5, name: 'Romance', color: '#ff77b7' },
  { id: 6, name: 'Drama', color: '#4d96ff' },
  { id: 7, name: 'Animation & Family', color: '#b8e986' },
];

// Anchor clusters in normalized [-0.72, 0.72] space so spiral arms and satellites stay inside [-1, 1]
const CLUSTER_CENTERS: ReadonlyArray<readonly [number, number, number]> = [
  [0.44, 0.14, -0.22],   // 0: Action & Adventure
  [-0.12, 0.22, 0.18],   // 1: Sci-Fi & Fantasy (near core)
  [0.24, -0.32, 0.42],   // 2: Horror
  [-0.36, -0.14, -0.26], // 3: Crime & Thriller
  [0.08, 0.34, -0.46],   // 4: Comedy
  [-0.48, 0.26, 0.32],   // 5: Romance
  [-0.22, -0.28, 0.44],  // 6: Drama
  [0.46, -0.16, 0.24],   // 7: Animation & Family
];

interface SeededTitleSpec {
  title: string;
  year: number;
  type: 0 | 1;
  tmdbId: number;
  genreId: number;
  altTitle?: string;
  offset?: readonly [number, number, number];
  franchise?: string;
}

const SEEDED_TITLES: readonly SeededTitleSpec[] = [
  { title: 'Inception', year: 2010, type: 0, tmdbId: 27205, genreId: 1, offset: [0.0, 0.0, 0.0], franchise: 'inception' },
  { title: 'Interstellar', year: 2014, type: 0, tmdbId: 157336, genreId: 1, offset: [0.06, 0.04, -0.05] },
  { title: 'The Dark Knight', year: 2008, type: 0, tmdbId: 155, genreId: 0, offset: [-0.08, -0.02, 0.04], franchise: 'tdk' },
  { title: 'The Dark Knight Rises', year: 2012, type: 0, tmdbId: 49026, genreId: 0, offset: [-0.07, -0.03, 0.05], franchise: 'tdk' },
  { title: 'The Prestige', year: 2006, type: 0, tmdbId: 1124, genreId: 3, offset: [0.05, 0.02, 0.03] },
  { title: 'Memento', year: 2000, type: 0, tmdbId: 77, genreId: 3, offset: [0.08, 0.05, 0.02] },
  { title: 'Tenet', year: 2020, type: 0, tmdbId: 577922, genreId: 1, offset: [-0.05, -0.04, 0.06] },
  { title: 'Blade Runner 2049', year: 2017, type: 0, tmdbId: 335984, genreId: 1, offset: [0.09, -0.03, -0.07], franchise: 'bladerunner' },
  { title: 'Blade Runner', year: 1982, type: 0, tmdbId: 78, genreId: 1, offset: [0.08, -0.02, -0.06], franchise: 'bladerunner' },
  { title: 'Dune', year: 2021, type: 0, tmdbId: 438631, genreId: 1, offset: [-0.07, 0.07, -0.04], franchise: 'dune' },
  { title: 'Dune: Part Two', year: 2024, type: 0, tmdbId: 693134, genreId: 1, offset: [-0.08, 0.08, -0.05], franchise: 'dune' },
  { title: 'Arrival', year: 2016, type: 0, tmdbId: 329865, genreId: 1, offset: [0.11, 0.06, 0.04] },
  { title: 'The Matrix', year: 1999, type: 0, tmdbId: 603, genreId: 1, offset: [0.04, -0.06, 0.08] },
  { title: 'Shutter Island', year: 2010, type: 0, tmdbId: 11324, genreId: 3, offset: [0.04, 0.01, 0.09] },
  { title: 'Breaking Bad', year: 2008, type: 1, tmdbId: 1396, genreId: 3, franchise: 'abq' },
  { title: 'Better Call Saul', year: 2015, type: 1, tmdbId: 60059, genreId: 3, franchise: 'abq' },
  { title: 'Dark', year: 2017, type: 1, tmdbId: 70523, genreId: 1, offset: [-0.03, 0.06, 0.05] },
  { title: 'Severance', year: 2022, type: 1, tmdbId: 95396, genreId: 1, offset: [0.02, 0.08, -0.03] },
  { title: 'Stranger Things', year: 2016, type: 1, tmdbId: 66732, genreId: 1 },
  { title: 'Parasite', year: 2019, type: 0, tmdbId: 496243, genreId: 6, altTitle: 'Gisaengchung' },
  { title: 'Spirited Away', year: 2001, type: 0, tmdbId: 129, genreId: 7, altTitle: 'Sen to Chihiro no Kamikakushi' },
  { title: 'Paprika', year: 2006, type: 0, tmdbId: 4977, genreId: 7, offset: [-0.14, 0.08, -0.05] },
  { title: 'Eternal Sunshine of the Spotless Mind', year: 2004, type: 0, tmdbId: 38, genreId: 5 },
  { title: 'Everything Everywhere All at Once', year: 2022, type: 0, tmdbId: 545611, genreId: 1 },
  { title: 'Oppenheimer', year: 2023, type: 0, tmdbId: 872585, genreId: 6 },
  { title: 'Mad Max: Fury Road', year: 2015, type: 0, tmdbId: 76341, genreId: 0 },
  { title: 'Spider-Man: Into the Spider-Verse', year: 2018, type: 0, tmdbId: 324857, genreId: 7 },
  { title: 'The Grand Budapest Hotel', year: 2014, type: 0, tmdbId: 120467, genreId: 4 },
  { title: 'The Shining', year: 1980, type: 0, tmdbId: 694, genreId: 2 },
  { title: 'Hereditary', year: 2018, type: 0, tmdbId: 493922, genreId: 2 },
  { title: 'Get Out', year: 2017, type: 0, tmdbId: 419430, genreId: 2 },
  { title: 'Pulp Fiction', year: 1994, type: 0, tmdbId: 680, genreId: 3 },
  { title: 'Zodiac', year: 2007, type: 0, tmdbId: 1949, genreId: 3 },
  { title: 'Her', year: 2013, type: 0, tmdbId: 152601, genreId: 5 },
  { title: 'Past Lives', year: 2023, type: 0, tmdbId: 666277, genreId: 5 },
  { title: 'Chernobyl', year: 2019, type: 1, tmdbId: 87108, genreId: 6 },
  { title: 'The Bear', year: 2022, type: 1, tmdbId: 136315, genreId: 6 },
  { title: 'Arcane', year: 2021, type: 1, tmdbId: 94605, genreId: 7 },
  { title: 'Andor', year: 2022, type: 1, tmdbId: 83867, genreId: 1 },
  { title: 'Inception: The Cobol Job', year: 2010, type: 0, tmdbId: 990101, genreId: 1, offset: [0.03, 0.02, -0.02], franchise: 'inception' },
  { title: 'Inception: Motion Comics', year: 2010, type: 1, tmdbId: 990102, genreId: 7, offset: [-0.02, 0.04, 0.03], franchise: 'inception' },
  { title: 'Source Code', year: 2011, type: 0, tmdbId: 45612, genreId: 1, offset: [0.06, -0.05, 0.03] },
  { title: 'Edge of Tomorrow', year: 2014, type: 0, tmdbId: 137113, genreId: 0 },
];

const ADJECTIVES = [
  'Silent', 'Glass', 'Velvet', 'Midnight', 'Orbital', 'Pale', 'Crimson', 'Silver',
  'Distant', 'Golden', 'Broken', 'Hollow', 'Electric', 'Northern', 'Southern', 'Last',
  'First', 'Hidden', 'Shattered', 'Wandering', 'Parallel', 'Endless', 'Static', 'Bright',
  'Forgotten', 'Paper', 'Iron', 'Cobalt', 'Amber', 'Nocturnal', 'Solar', 'Lunar',
];

const NOUNS = [
  'Horizon', 'Echo', 'Signal', 'Archive', 'Harbor', 'Winter', 'Corridor', 'Mirage',
  'Transit', 'Protocol', 'Meridian', 'Cipher', 'Threshold', 'Voyage', 'Requiem', 'Vanguard',
  'Frequency', 'Silhouette', 'Labyrinth', 'Solstice', 'Odyssey', 'Beacon', 'Canyon', 'Station',
  'Memory', 'Compass', 'Orbit', 'Shadow', 'Lantern', 'Theorem', 'Cascade', 'Drift',
];

const SUFFIXES = [
  '', '', '', '', ' II', ' Chronicles', ' Files', ' Rising', ' Protocol', ': Zero',
];

function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export interface MockDataset {
  manifest: Manifest;
  galaxyBuffer: ArrayBuffer;
  searchIndex: SearchIndexFile;
  posters: string[];
  getNeighborShard: (shardId: number) => NeighborShard;
  getDetailsShard: (shardId: number) => DetailsShard;
}

let cachedMockDataset: MockDataset | null = null;

export function getMockDataset(): MockDataset {
  if (cachedMockDataset) return cachedMockDataset;

  const N = CONFIG.MOCK_COUNT;
  const shardSize = CONFIG.MOCK_SHARD_SIZE;
  const shardCount = Math.ceil(N / shardSize);
  const topK = CONFIG.MOCK_TOP_K;
  const rng = createRng(4202025);

  const buffer = new ArrayBuffer(N * 16);
  const positions = new Float32Array(buffer, 0, N * 3);
  const attributes = new Uint8Array(buffer, N * 12, N * 4);

  const rows: SearchIndexRow[] = new Array(N);
  const posters: string[] = new Array(N);
  let movieCount = 0;
  let tvCount = 0;

  for (let i = 0; i < N; i++) {
    const seeded = i < SEEDED_TITLES.length ? SEEDED_TITLES[i] : null;
    const genreId = seeded ? seeded.genreId : Math.floor(rng() * MOCK_GENRE_GROUPS.length);
    const typeCode: 0 | 1 = seeded ? seeded.type : rng() < 0.72 ? 0 : 1;

    if (typeCode === 0) movieCount++;
    else tvCount++;

    const center = CLUSTER_CENTERS[genreId];
    let x: number;
    let y: number;
    let z: number;

    if (seeded?.offset) {
      x = center[0] + seeded.offset[0];
      y = center[1] + seeded.offset[1];
      z = center[2] + seeded.offset[2];
    } else {
      // Spiral + Gaussian-like cluster spread
      const angle = rng() * Math.PI * 2;
      const radius = Math.pow(rng(), 0.75) * 0.34;
      const armTwist = radius * 2.2;
      const dx = Math.cos(angle + armTwist) * radius + (rng() - 0.5) * 0.09;
      const dz = Math.sin(angle + armTwist) * radius + (rng() - 0.5) * 0.09;
      const dy = (rng() - 0.5) * 0.24 * (1 - radius * 0.8);

      x = clamp(center[0] + dx, -0.96, 0.96);
      y = clamp(center[1] + dy, -0.96, 0.96);
      z = clamp(center[2] + dz, -0.96, 0.96);
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Popularity size byte decreases slowly with idx
    const popularityFactor = Math.max(0.08, 1 - Math.pow(i / N, 0.45));
    const sizeByte = seeded
      ? Math.round(215 + rng() * 40)
      : Math.round(35 + popularityFactor * 175 + rng() * 35);

    attributes[i * 4] = genreId;
    attributes[i * 4 + 1] = typeCode;
    attributes[i * 4 + 2] = clamp(sizeByte, 10, 255);
    attributes[i * 4 + 3] = 0;

    if (seeded) {
      rows[i] = seeded.altTitle
        ? [seeded.title, seeded.year, seeded.type, seeded.tmdbId, seeded.altTitle]
        : [seeded.title, seeded.year, seeded.type, seeded.tmdbId];
    } else {
      const adj = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)];
      const noun = NOUNS[Math.floor(rng() * NOUNS.length)];
      const suffix = SUFFIXES[Math.floor(rng() * SUFFIXES.length)];
      const title = `${adj} ${noun}${suffix}`;
      const year = 1968 + Math.floor(rng() * 58);
      const tmdbId = 1000000 + i;
      rows[i] = [title, year, typeCode, tmdbId];
    }

    // Empty poster path in demo mode so zero unverified external URLs are fetched
    posters[i] = '';
  }

  const manifest: Manifest = {
    version: 'demo-1',
    count: N,
    counts: { movie: movieCount, tv: tvCount },
    shard_size: shardSize,
    shard_count: shardCount,
    top_k: topK,
    score_scale: CONFIG.MOCK_SCORE_SCALE,
    genre_groups: MOCK_GENRE_GROUPS,
    type_codes: { '0': 'movie', '1': 'tv' },
    image_base: 'https://image.tmdb.org/t/p/',
    image_sizes: {
      poster_card: 'w185',
      poster_panel: 'w342',
      backdrop: 'w780',
    },
    tmdb_url: {
      movie: 'https://www.themoviedb.org/movie/',
      tv: 'https://www.themoviedb.org/tv/',
    },
    attribution: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
  };

  const searchIndex: SearchIndexFile = {
    fields: ['title', 'year', 'type', 'tmdb_id', 'alt_title'],
    rows,
  };

  const galaxyView: GalaxyBinaryData = {
    count: N,
    positions,
    attributes,
  };

  const neighborShardCache = new Map<number, NeighborShard>();
  const detailsShardCache = new Map<number, DetailsShard>();

  function computeNeighbors(idx: number): NeighborItem {
    const px = galaxyView.positions[idx * 3];
    const py = galaxyView.positions[idx * 3 + 1];
    const pz = galaxyView.positions[idx * 3 + 2];

    const best: { idx: number; distSq: number }[] = [];
    for (let j = 0; j < N; j++) {
      if (j === idx) continue;
      const dx = galaxyView.positions[j * 3] - px;
      const dy = galaxyView.positions[j * 3 + 1] - py;
      const dz = galaxyView.positions[j * 3 + 2] - pz;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (best.length < topK) {
        best.push({ idx: j, distSq });
        if (best.length === topK) {
          best.sort((a, b) => a.distSq - b.distSq);
        }
      } else if (distSq < best[topK - 1].distSq) {
        best[topK - 1] = { idx: j, distSq };
        best.sort((a, b) => a.distSq - b.distSq);
      }
    }
    if (best.length < topK) {
      best.sort((a, b) => a.distSq - b.distSq);
    }

    const centerFranchise =
      idx < SEEDED_TITLES.length ? SEEDED_TITLES[idx].franchise : undefined;
    const franchiseRanks: number[] = [];
    const nIndices = best.map((item) => item.idx);
    const scores = best.map((item, rank) => {
      const dist = Math.sqrt(item.distSq);
      const neighborFranchise =
        item.idx < SEEDED_TITLES.length ? SEEDED_TITLES[item.idx].franchise : undefined;
      if (centerFranchise && neighborFranchise === centerFranchise) {
        franchiseRanks.push(rank);
      }
      // Spread scores smoothly across [0.35..0.93] based on Euclidean distance & rank
      const raw = 930 - dist * 1450 - rank * 12;
      return Math.round(clamp(raw, 340, 930));
    });

    return franchiseRanks.length > 0
      ? { n: nIndices, s: scores, f: franchiseRanks }
      : { n: nIndices, s: scores };
  }

  function getNeighborShard(shardId: number): NeighborShard {
    const existing = neighborShardCache.get(shardId);
    if (existing) return existing;

    const start = shardId * shardSize;
    const end = Math.min(N, start + shardSize);
    const items: NeighborItem[] = [];
    for (let idx = start; idx < end; idx++) {
      items.push(computeNeighbors(idx));
    }
    const shard: NeighborShard = { start, items };
    neighborShardCache.set(shardId, shard);
    return shard;
  }

  function getDetailsShard(shardId: number): DetailsShard {
    const existing = detailsShardCache.get(shardId);
    if (existing) return existing;

    const start = shardId * shardSize;
    const end = Math.min(N, start + shardSize);
    const items: TitleDetails[] = [];

    const sampleCastPool = [
      'Leonardo DiCaprio',
      'Cillian Murphy',
      'Rebecca Ferguson',
      'Elliot Page',
      'Oscar Isaac',
      'Tilda Swinton',
      'Steven Yeun',
      'Florence Pugh',
    ];
    const sampleKeywords = [
      'nonlinear narrative',
      'parallel realities',
      'memory',
      'atmospheric',
      'psychological',
      'ensemble',
    ];

    for (let idx = start; idx < end; idx++) {
      const row = rows[idx];
      const genreId = attributes[idx * 4];
      const genreName = MOCK_GENRE_GROUPS[genreId]?.name ?? 'Drama';
      const isTv = row[2] === 1;
      const seeded = idx < SEEDED_TITLES.length ? SEEDED_TITLES[idx] : null;

      items.push({
        i: idx,
        id: row[3],
        type: isTv ? 'tv' : 'movie',
        title: row[0],
        year: row[1] || undefined,
        tagline: seeded
          ? `Explore the cosmic neighborhood of ${row[0]}.`
          : 'A synthetic preview entry in the Cinescape demo galaxy.',
        overview: seeded
          ? `${row[0]} sits in the ${genreName} region of the Cinescape similarity map, surrounded by titles sharing tonal, thematic, and structural DNA.`
          : `Demo dataset placeholder overview for ${row[0]} (${row[1] || 'Unknown year'}). Drop real data files into public/data to view full TMDB metadata and posters.`,
        genres: [genreName],
        keywords: [
          genreName.toLowerCase(),
          sampleKeywords[idx % sampleKeywords.length],
          sampleKeywords[(idx + 2) % sampleKeywords.length],
        ],
        cast: [
          sampleCastPool[idx % sampleCastPool.length],
          sampleCastPool[(idx + 3) % sampleCastPool.length],
          sampleCastPool[(idx + 5) % sampleCastPool.length],
        ],
        creators: idx <= 11 ? ['Christopher Nolan'] : [`Creator ${String.fromCharCode(65 + (idx % 26))}`],
        rating: Number((6.6 + ((idx * 17) % 24) / 10).toFixed(1)),
        votes: 1200 + ((idx * 313) % 24500),
        runtime: isTv ? undefined : 98 + ((idx * 13) % 64),
        seasons: isTv ? 1 + (idx % 5) : undefined,
        episodes: isTv ? 8 + ((idx * 7) % 42) : undefined,
        status: isTv ? (idx % 2 === 0 ? 'Ended' : 'Returning Series') : 'Released',
        collection: seeded?.franchise ? `${seeded.franchise.toUpperCase()} Collection` : undefined,
      });
    }

    const shard: DetailsShard = { start, items };
    detailsShardCache.set(shardId, shard);
    return shard;
  }

  cachedMockDataset = {
    manifest,
    galaxyBuffer: buffer,
    searchIndex,
    posters,
    getNeighborShard,
    getDetailsShard,
  };

  return cachedMockDataset;
}
