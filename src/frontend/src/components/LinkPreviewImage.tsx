import { useLinkPreview } from "@/hooks/useLinkPreview";

interface LinkPreviewImageProps {
  url: string;
  /** Tailwind classes for the wrapper div */
  className?: string;
  /** Aspect ratio class, default 'aspect-video' */
  aspectClass?: string;
}

export function LinkPreviewImage({
  url,
  className = "",
  aspectClass = "aspect-video",
}: LinkPreviewImageProps) {
  const { imageUrl, loading, ref } = useLinkPreview(url);

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
    </div>
  );
}
