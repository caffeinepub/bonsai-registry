import { useLinkPreview } from "@/hooks/useLinkPreview";
import { useState } from "react";

interface LinkPreviewImageProps {
  url: string;
  className?: string;
  aspectClass?: string;
  fallbackDomain?: string;
}

export function LinkPreviewImage({
  url,
  className = "",
  aspectClass = "aspect-video",
  fallbackDomain,
}: LinkPreviewImageProps) {
  const { imageUrl, loading, ref } = useLinkPreview(url);
  const [faviconError, setFaviconError] = useState(false);

  const showFallback =
    !loading && !imageUrl && !!fallbackDomain && !faviconError;

  return (
    <div
      ref={ref}
      className={`${aspectClass} w-full overflow-hidden rounded ${className}`}
    >
      {loading && !imageUrl && (
        <div className="w-full h-full bg-muted/60 animate-pulse rounded" />
      )}
      {!loading && imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover rounded"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      {showFallback && (
        <div className="w-full h-full bg-muted/30 rounded flex items-center justify-center">
          <img
            src={`https://www.google.com/s2/favicons?domain=${fallbackDomain}&sz=128`}
            alt=""
            width={64}
            height={64}
            className="opacity-60"
            loading="lazy"
            onError={() => setFaviconError(true)}
          />
        </div>
      )}
    </div>
  );
}
