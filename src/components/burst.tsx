"use client";

import { useCallback, useEffect, useState } from "react";

export type BurstSpec = { id: number; x: number; y: number; tone: "score" | "fail" | "power" };

/** Renders short-lived particle bursts. Capped at four live bursts; each one
 *  cleans itself up. Purely decorative — never covers the play surface. */
export function Bursts({ bursts }: { bursts: BurstSpec[] }) {
  return (
    <div className="bursts" aria-hidden="true">
      {bursts.slice(-4).map((burst) => (
        <span key={burst.id} className={`burst is-${burst.tone}`} style={{ left: `${burst.x}%`, top: `${burst.y}%` }}>
          {Array.from({ length: 8 }, (_, index) => (
            <i key={index} style={{ ["--a" as string]: `${index * 45}deg`, ["--d" as string]: `${28 + (index % 3) * 12}px` }} />
          ))}
        </span>
      ))}
    </div>
  );
}

/** Small helper so games can fire a burst without owning cleanup logic. */
export function useBursts() {
  const [bursts, setBursts] = useState<BurstSpec[]>([]);
  useEffect(() => {
    if (!bursts.length) return;
    const id = window.setTimeout(() => setBursts((current) => current.slice(1)), 520);
    return () => window.clearTimeout(id);
  }, [bursts]);
  const fire = useCallback((x: number, y: number, tone: BurstSpec["tone"] = "score") => {
    setBursts((current) => [...current.slice(-3), { id: Date.now() + Math.random(), x, y, tone }]);
  }, []);
  return { bursts, fire };
}
