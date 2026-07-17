export type PublicFeedItemData = {
  id: string;
  platform: string;
  mediaType: "image" | "video";
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  permalink: string | null;
};

function FeedCard({ item }: { item: PublicFeedItemData }) {
  const isReel = item.mediaType === "video";

  return (
    <a
      href={item.permalink ?? "#"}
      target={item.permalink ? "_blank" : undefined}
      rel={item.permalink ? "noopener noreferrer" : undefined}
      className="group relative overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/[0.06] transition-all hover:ring-white/20"
      style={{ aspectRatio: isReel ? "9 / 16" : "1 / 1" }}
    >
      {item.thumbnailUrl || item.url ? (
        <img
          src={item.thumbnailUrl || item.url}
          alt={item.caption ?? ""}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-zinc-800">
          <span className="text-xs text-zinc-600">No media</span>
        </div>
      )}

      {isReel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-transform group-hover:scale-110">
            <svg className="ml-0.5 h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {item.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="line-clamp-2 text-xs leading-relaxed text-white/90">
            {item.caption}
          </p>
        </div>
      )}

      <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm">
        {item.platform}
      </div>
    </a>
  );
}

export function ContentFeed({
  items,
}: {
  items: PublicFeedItemData[];
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Latest Content
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
