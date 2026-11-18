export type MediaType = 'movie' | 'tv';

export interface GenreGroup {
  id: number;
  name: string;
  color: string;
}

export interface Manifest {
  version: string | number;
  count: number;
  counts: {
    movie: number;
    tv: number;
  };
  shard_size: number;
  shard_count: number;
  top_k: number;
  score_scale: number;
  genre_groups: GenreGroup[];
  type_codes: Record<string, MediaType>;
  image_base: string;
  image_sizes: {
    poster_card: string;
    poster_panel: string;
    backdrop: string;
  };
  tmdb_url: {
    movie: string;
    tv: string;
  };
  attribution: string;
}

export interface GalaxyBinaryData {
  count: number;
  /** Interleaved Float32 x, y, z normalized in [-1, 1], length = count * 3 */
  positions: Float32Array;
  /** Interleaved Uint8 [colorGroupId, typeCode, sizeByte, reserved], length = count * 4 */
  attributes: Uint8Array;
}

export type SearchIndexRow = [
  title: string,
  year: number,
  type: 0 | 1,
  tmdb_id: number,
  alt_title?: string,
];

export interface SearchIndexFile {
  fields: string[];
  rows: SearchIndexRow[];
}

export interface SearchEntry {
  idx: number;
  title: string;
  year: number;
  type: MediaType;
  typeCode: 0 | 1;
  tmdbId: number;
  altTitle?: string;
  routeKey: string;
}

export interface SearchSuggestion {
  idx: number;
  title: string;
  year: number;
  type: MediaType;
  tmdbId: number;
  routeKey: string;
  posterPath: string;
  genreId: number;
}

export interface NeighborItem {
  /** Indices of similar titles sorted by similarity descending */
  n: number[];
  /** Similarity scores scaled by manifest.score_scale (0..1000) */
  s: number[];
  /** Ranks in n that belong to the same franchise */
  f?: number[];
}

export interface NeighborShard {
  start: number;
  items: NeighborItem[];
}

export interface CastMember {
  name: string;
  character?: string;
}

export interface TitleDetails {
  i: number;
  id: number;
  type: MediaType;
  title: string;
  year?: number;
  tagline?: string;
  overview?: string;
  genres?: string[];
  keywords?: string[];
  cast?: (string | CastMember)[];
  creators?: string[];
  rating?: number;
  votes?: number;
  runtime?: number;
  seasons?: number;
  episodes?: number;
  status?: string;
  poster?: string;
  backdrop?: string;
  imdb?: string;
  collection?: string;
}

export interface DetailsShard {
  start: number;
  items: TitleDetails[];
}

export type MediaTypeFilter = 'all' | 'movie' | 'tv';
