import Image from "next/image";
import clsx from "clsx";

export const LUCKY_77_LOCAL_ART: Record<string, string> = {
  APPLE: "/assets/lucky-77/apple.png",
  WATERMELON: "/assets/lucky-77/watermelon.png",
  SEVENTY_SEVEN: "/assets/lucky-77/seven-emblem.png",
};

export const LUCKY_77_LABELS: Record<string, string> = {
  APPLE: "Apple",
  WATERMELON: "Watermelon",
  SEVENTY_SEVEN: "77",
};

export function lucky77DisplayName(code: string, fallback?: string) {
  return LUCKY_77_LABELS[code] ?? fallback ?? code.replaceAll("_", " ");
}

export function Lucky77Symbol({
  code,
  imageUrl,
  className,
  priority = false,
}: {
  code: string;
  imageUrl?: string | null;
  className?: string;
  priority?: boolean;
}) {
  const src = imageUrl || LUCKY_77_LOCAL_ART[code];
  if (!src) {
    return (
      <span className={clsx("l77-symbol l77-symbol--fallback", className)} aria-hidden="true">
        {code.slice(0, 1)}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "l77-symbol l77-symbol--image",
        code === "SEVENTY_SEVEN" && "l77-symbol--77",
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="96px"
        priority={priority}
        unoptimized={Boolean(imageUrl)}
        draggable={false}
      />
    </span>
  );
}
