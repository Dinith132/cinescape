import { useState } from 'react';
import { Film, Tv } from 'lucide-react';
import { buildImageUrl } from '../data/loader';
import type { Manifest, MediaType } from '../data/types';

interface PosterImageProps {
  manifest: Manifest | null;
  posterPath: string;
  title: string;
  type: MediaType;
  sizeKey?: keyof Manifest['image_sizes'];
  className?: string;
}

export function PosterImage({
  manifest,
  posterPath,
  title,
  type,
  sizeKey = 'poster_card',
  className = 'w-10 h-14',
}: PosterImageProps) {
  const url = buildImageUrl(manifest, posterPath, sizeKey);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const isFailed = !url || failedUrl === url;
  const isLoaded = Boolean(url && loadedUrl === url);

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[#141726] border border-white/10 flex-shrink-0 flex items-center justify-center ${className}`}
    >
      {isFailed ? (
        <div className="flex flex-col items-center justify-center text-[#8b93a7]/60">
          {type === 'tv' ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-[#1a1f33] animate-pulse" aria-hidden="true" />
          )}
          <img
            src={url}
            alt={`${title} poster`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => setLoadedUrl(url)}
            onError={() => setFailedUrl(url)}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      )}
    </div>
  );
}
