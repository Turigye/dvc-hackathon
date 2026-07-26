"use client";

import Image from "next/image";
import { useState } from "react";

type GameArtProps = {
  active: boolean;
  className: string;
  src: string;
};

/**
 * Presentation-only game artwork. The parent keeps its code-native geometry;
 * this image never receives input and disappears cleanly if the asset fails.
 */
export function GameArt({ active, className, src }: GameArtProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!active || failedSrc === src) return null;

  return (
    <Image
      alt=""
      aria-hidden="true"
      className={`game-art ${className}`}
      decoding="async"
      draggable={false}
      height={512}
      loading="eager"
      onError={() => setFailedSrc(src)}
      sizes="96px"
      src={src}
      unoptimized
      width={512}
    />
  );
}
