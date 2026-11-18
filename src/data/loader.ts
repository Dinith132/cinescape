import MiniSearch from 'minisearch';
import { CONFIG } from '../config';
import { getMockDataset } from './mock';
import type {
  DetailsShard,
  GalaxyBinaryData,
  Manifest,
  NeighborItem,
  NeighborShard,
  SearchEntry,
  SearchIndexFile,
  SearchSuggestion,
  TitleDetails,
} from './types';

function resolveDataUrl(relativePath: string, version?: string | number): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const clean = relativePath.replace(/^\/+/, '');
  const query = version !== undefined ? `?v=${encodeURIComponent(String(version))}` : '';
  return `${base}data/${clean}${query}`;
}

export interface SearchEngine {
  miniSearch: MiniSearch<SearchEntry>;
  entries: SearchEntry[];
  keyToIdx: Map<string, number>;
}

const neighborCache = new Map<number, NeighborShard>();
const neighborPending = new Map<number, Promise<NeighborShard>>();
const detailsCache = new Map<number, DetailsShard>();
const detailsPending = new Map<number, Promise<DetailsShard>>();

export function clearShardCaches(): void {
  neighborCache.clear();
  neighborPending.clear();
  detailsCache.clear();
  detailsPending.clear();
}

export async function loadManifest(): Promise<{ manifest: Manifest; isDemoData: boolean }> {
  const url = resolveDataUrl('manifest.json');
  const response = await fetch(url, { cache: 'no-cache' });

  if (response.status === 404) {
    return { manifest: getMockDataset().manifest, isDemoData: true };
  }

  if (!response.ok) {
    throw new Error(`Unable to load dataset manifest (${response.status})`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) {
    // Vite SPA fallback serves index.html when public/data/manifest.json is absent
    return { manifest: getMockDataset().manifest, isDemoData: true };
  }

  const text = await response.text();
  if (text.trimStart().startsWith('<')) {
    return { manifest: getMockDataset().manifest, isDemoData: true };
  }

  const manifest = JSON.parse(text) as Manifest;
  return { manifest, isDemoData: false };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function loadGalaxyBinary(
  manifest: Manifest,
  isDemoData: boolean,
  onProgress: (progress: number) => void,
): Promise<GalaxyBinaryData> {
  const count = manifest.count;
  const expectedBytes = count * 16;

  if (isDemoData) {
    const mock = getMockDataset();
    const steps = CONFIG.MOCK_SIMULATED_CHUNKS;
    for (let i = 1; i <= steps; i++) {
      onProgress(i / steps);
      await sleep(CONFIG.MOCK_CHUNK_DELAY_MS);
    }
    return {
      count,
      positions: new Float32Array(mock.galaxyBuffer, 0, count * 3),
      attributes: new Uint8Array(mock.galaxyBuffer, count * 12, count * 4),
    };
  }

  const url = resolveDataUrl('galaxy.bin', manifest.version);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to download galaxy coordinates (${response.status})`);
  }

  const contentLengthHeader = response.headers.get('content-length');
  const totalBytes = contentLengthHeader ? Number(contentLengthHeader) : expectedBytes;

  let buffer: ArrayBuffer;
  if (response.body) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        const ratio = totalBytes > 0 ? Math.min(1, received / totalBytes) : 0.5;
        onProgress(ratio);
      }
    }

    const merged = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    buffer = merged.buffer;
  } else {
    buffer = await response.arrayBuffer();
    onProgress(1);
  }

  if (buffer.byteLength < expectedBytes) {
    throw new Error(
      `Galaxy data truncated (${buffer.byteLength} of ${expectedBytes} bytes received)`,
    );
  }

  onProgress(1);
  return {
    count,
    positions: new Float32Array(buffer, 0, count * 3),
    attributes: new Uint8Array(buffer, count * 12, count * 4),
  };
}

export async function loadSearchEngine(
  manifest: Manifest,
  isDemoData: boolean,
): Promise<SearchEngine> {
  let file: SearchIndexFile;
  if (isDemoData) {
    file = getMockDataset().searchIndex;
  } else {
    const url = resolveDataUrl('search-index.json', manifest.version);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to load search index (${response.status})`);
    }
    file = (await response.json()) as SearchIndexFile;
  }

  const entries: SearchEntry[] = new Array(file.rows.length);
  const keyToIdx = new Map<string, number>();

  for (let idx = 0; idx < file.rows.length; idx++) {
    const row = file.rows[idx];
    const typeCode = row[2];
    const type = manifest.type_codes[String(typeCode)] ?? (typeCode === 1 ? 'tv' : 'movie');
    const tmdbId = row[3];
    const routeKey = `${type}-${tmdbId}`;

    const entry: SearchEntry = {
      idx,
      title: row[0],
      year: row[1],
      type,
      typeCode,
      tmdbId,
      altTitle: row[4],
      routeKey,
    };

    entries[idx] = entry;
    keyToIdx.set(routeKey, idx);
  }

  const miniSearch = new MiniSearch<SearchEntry>({
    idField: 'idx',
    fields: ['title', 'altTitle'],
    storeFields: ['idx', 'title', 'year', 'type', 'tmdbId', 'routeKey'],
    searchOptions: {
      prefix: true,
      fuzzy: CONFIG.SEARCH_FUZZINESS,
      boost: { title: 2, altTitle: 1.2 },
      // Earlier idx means higher popularity; boost strongly so "incep" surfaces Inception first
      boostDocument: (documentId) => {
        const idx = Number(documentId);
        return 1 + 4.5 * Math.exp(-idx / CONFIG.SEARCH_POPULARITY_DECAY);
      },
    },
  });

  miniSearch.addAll(entries);

  return { miniSearch, entries, keyToIdx };
}

export function querySearchSuggestions(
  engine: SearchEngine,
  query: string,
  posters: string[] | null,
  galaxyAttributes: Uint8Array | null,
  mediaFilter: 'all' | 'movie' | 'tv',
): SearchSuggestion[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const rawResults = engine.miniSearch.search(trimmed, {
    prefix: true,
    fuzzy: CONFIG.SEARCH_FUZZINESS,
    boost: { title: 2, altTitle: 1.2 },
    boostDocument: (documentId) => {
      const idx = Number(documentId);
      return 1 + 4.5 * Math.exp(-idx / CONFIG.SEARCH_POPULARITY_DECAY);
    },
  });

  const suggestions: SearchSuggestion[] = [];
  for (const hit of rawResults) {
    const idx = Number(hit.id);
    const entry = engine.entries[idx];
    if (!entry) continue;
    if (mediaFilter !== 'all' && entry.type !== mediaFilter) continue;

    suggestions.push({
      idx,
      title: entry.title,
      year: entry.year,
      type: entry.type,
      tmdbId: entry.tmdbId,
      routeKey: entry.routeKey,
      posterPath: posters?.[idx] ?? '',
      genreId: galaxyAttributes ? galaxyAttributes[idx * 4] : 0,
    });

    if (suggestions.length >= CONFIG.MAX_SEARCH_SUGGESTIONS) break;
  }

  return suggestions;
}

export async function loadPosters(
  manifest: Manifest,
  isDemoData: boolean,
): Promise<string[]> {
  if (isDemoData) {
    return getMockDataset().posters;
  }

  const url = resolveDataUrl('posters.json', manifest.version);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load posters (${response.status})`);
  }
  return (await response.json()) as string[];
}

function getShardId(idx: number, shardSize: number): number {
  return Math.floor(idx / shardSize);
}

function formatShardId(shardId: number): string {
  return String(shardId).padStart(3, '0');
}

export async function loadNeighborShard(
  manifest: Manifest,
  isDemoData: boolean,
  idx: number,
): Promise<NeighborShard> {
  const shardId = getShardId(idx, manifest.shard_size);
  const cached = neighborCache.get(shardId);
  if (cached) return cached;

  const inFlight = neighborPending.get(shardId);
  if (inFlight) return inFlight;

  const promise = (async () => {
    if (isDemoData) {
      const shard = getMockDataset().getNeighborShard(shardId);
      neighborCache.set(shardId, shard);
      return shard;
    }

    const url = resolveDataUrl(`neighbors/${formatShardId(shardId)}.json`, manifest.version);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to load neighbor shard ${shardId}`);
    }
    const shard = (await response.json()) as NeighborShard;
    neighborCache.set(shardId, shard);
    return shard;
  })();

  neighborPending.set(shardId, promise);
  try {
    return await promise;
  } finally {
    neighborPending.delete(shardId);
  }
}

export async function getNeighborsForTitle(
  manifest: Manifest,
  isDemoData: boolean,
  idx: number,
): Promise<NeighborItem | null> {
  const shard = await loadNeighborShard(manifest, isDemoData, idx);
  return shard.items[idx - shard.start] ?? null;
}

export async function loadDetailsShard(
  manifest: Manifest,
  isDemoData: boolean,
  idx: number,
): Promise<DetailsShard> {
  const shardId = getShardId(idx, manifest.shard_size);
  const cached = detailsCache.get(shardId);
  if (cached) return cached;

  const inFlight = detailsPending.get(shardId);
  if (inFlight) return inFlight;

  const promise = (async () => {
    if (isDemoData) {
      const shard = getMockDataset().getDetailsShard(shardId);
      detailsCache.set(shardId, shard);
      return shard;
    }

    const url = resolveDataUrl(`details/${formatShardId(shardId)}.json`, manifest.version);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to load details shard ${shardId}`);
    }
    const shard = (await response.json()) as DetailsShard;
    detailsCache.set(shardId, shard);
    return shard;
  })();

  detailsPending.set(shardId, promise);
  try {
    return await promise;
  } finally {
    detailsPending.delete(shardId);
  }
}

export async function getDetailsForTitle(
  manifest: Manifest,
  isDemoData: boolean,
  idx: number,
): Promise<TitleDetails | null> {
  const shard = await loadDetailsShard(manifest, isDemoData, idx);
  return shard.items[idx - shard.start] ?? null;
}

export function getCachedDetailsSync(
  manifest: Manifest | null,
  idx: number,
): TitleDetails | null {
  if (!manifest) return null;
  const shardId = getShardId(idx, manifest.shard_size);
  const shard = detailsCache.get(shardId);
  if (!shard) return null;
  return shard.items[idx - shard.start] ?? null;
}

export function buildImageUrl(
  manifest: Manifest | null,
  path: string | undefined,
  sizeKey: keyof Manifest['image_sizes'],
): string | null {
  if (!manifest || !path) return null;
  const size = manifest.image_sizes[sizeKey];
  return `${manifest.image_base}${size}${path}`;
}
