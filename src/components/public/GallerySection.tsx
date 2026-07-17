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

export function GallerySection({ items }: { items: GalleryItem[] }) {
  if (items.length === 0) return null;

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
