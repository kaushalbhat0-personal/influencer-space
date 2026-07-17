"use client";

type AlignmentClass = "object-top" | "object-center" | "object-bottom";

const objectClasses: Record<string, AlignmentClass> = {
  top: "object-top",
  center: "object-center",
  bottom: "object-bottom",
};

const mobileObjectClasses: Record<string, string> = {
  top: "object-top",
  center: "object-center",
  bottom: "object-bottom",
};

const desktopObjectClasses: Record<string, string> = {
  top: "sm:object-top",
  center: "sm:object-center",
  bottom: "sm:object-bottom",
};

export function heroAlignmentClass(align?: string): AlignmentClass {
  return objectClasses[align || "center"] || "object-center";
}

export function responsiveAlignmentClass(
  desktopAlign?: string,
  mobileAlign?: string,
): string {
  const m = mobileObjectClasses[mobileAlign || "center"] || "object-center";
  const d = desktopObjectClasses[desktopAlign || "center"] || "sm:object-center";
  return `${m} ${d}`;
}

interface HeroMediaProps {
  url: string;
  type: "video" | "image";
  alignmentClass: string;
  opacity?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  loop?: boolean;
  controls?: boolean;
  poster?: string;
  onEnded?: () => void;
}

export function HeroMedia({
  url,
  type,
  alignmentClass,
  opacity = "",
  className = "",
  autoPlay = true,
  muted = true,
  playsInline = true,
  loop = true,
  controls = false,
  poster,
  onEnded,
}: HeroMediaProps) {
  const mediaClass = `w-full h-full object-cover ${alignmentClass} ${opacity} ${className}`.trim();

  if (type === "video") {
    return (
      <video
        key={`${url}-${alignmentClass}`}
        src={url}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        playsInline={playsInline}
        loop={loop}
        controls={controls}
        onEnded={onEnded}
        className={mediaClass}
      />
    );
  }

  return (
    <img
      src={url}
      alt=""
      className={mediaClass}
    />
  );
}
