"use client";

interface SettingsLivePreviewProps {
  heroUrl: string;
  mobileAlignment: "top" | "center" | "bottom";
  profileUrl: string | null;
  name: string;
  tagline: string;
  bio: string;
  liveBadgeText: string;
  showLiveBadge: boolean;
}

const objectClasses: Record<string, string> = {
  top: "object-top",
  center: "object-center",
  bottom: "object-bottom",
};

export function SettingsLivePreview({
  heroUrl,
  mobileAlignment,
  profileUrl,
  name,
  tagline,
  bio,
  liveBadgeText,
  showLiveBadge,
}: SettingsLivePreviewProps) {
  const objectPos = objectClasses[mobileAlignment] || "object-center";

  return (
    <div className="w-full max-w-[320px] mx-auto bg-[#0f0f13] rounded-[2.5rem] border-[6px] border-zinc-800 overflow-hidden shadow-2xl shadow-black/50">
      <div className="relative w-full bg-zinc-950" style={{ height: 230 }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-7 bg-zinc-800 rounded-b-2xl z-20" />

        <div className="relative w-full h-full overflow-hidden bg-neutral-950">
          {heroUrl ? (
            <img
              src={heroUrl}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover opacity-60 ${objectPos}`}
            />
          ) : (
            <div className="absolute inset-0 bg-zinc-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0f0f13]" />

          {showLiveBadge && liveBadgeText && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-red-400">
                {liveBadgeText}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 flex justify-center -mt-12">
        <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white/10 ring-4 ring-[#0f0f13] bg-zinc-800">
          {profileUrl ? (
            <img
              src={profileUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <svg className="h-full w-full p-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
      </div>

      <div className="px-5 pt-3 pb-6 text-center">
        <h2 className="text-sm font-bold text-white leading-tight">
          {name || "Your Name"}
        </h2>
        {tagline && (
          <p className="mt-1 text-[11px] text-zinc-400 leading-snug">{tagline}</p>
        )}
        {bio && (
          <p className="mt-2 text-[10px] text-zinc-500 leading-relaxed">{bio}</p>
        )}
      </div>

      <div className="border-t border-white/5 px-5 py-3">
        <div className="flex justify-center gap-2">
          <div className="h-8 w-8 rounded-full bg-zinc-800" />
          <div className="h-8 w-8 rounded-full bg-zinc-800" />
          <div className="h-8 w-8 rounded-full bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
