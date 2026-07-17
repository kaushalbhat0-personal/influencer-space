function getYouTubeEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export type GalleryItem = {
  id: string;
  url: string;
  caption: string | null;
  isVideo: boolean;
};

function EmptyGallery() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-12">
      <svg className="mb-3 h-10 w-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p className="text-sm font-medium text-zinc-600">No gallery items yet</p>
      <p className="mt-1 text-xs text-zinc-700">Upload images and videos to build your Hall of Fame</p>
    </div>
  );
}

export function GallerySection({
  items,
  preview = false,
}: {
  items: GalleryItem[];
  preview?: boolean;
}) {
  if (items.length === 0) {
    return preview ? <EmptyGallery /> : null;
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Gallery
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="group aspect-square overflow-hidden rounded-xl bg-zinc-900"
          >
            {item.isVideo ? (
              <div className="relative h-full w-full">
                {(() => {
                  const embed = getYouTubeEmbed(item.url);
                  if (embed) {
                    return (
                      <iframe
                        src={embed}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={item.caption ?? ""}
                      />
                    );
                  }
                  return (
                    <video
                      src={item.url}
                      className="h-full w-full object-cover"
                      controls
                      preload="metadata"
                    />
                  );
                })()}
              </div>
            ) : (
              <img
                src={item.url}
                alt={item.caption ?? ""}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
