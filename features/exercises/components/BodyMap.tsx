"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { SVG_BACK, SVG_FRONT } from "../library/bodySvg";

type BodyMapProps =
  | { mode: "roles"; primary: string[]; secondary: string[] }
  | { mode: "load"; load: Record<string, number> };

/**
 * Front+back schematic body silhouette. Sets each `.m` muscle shape's fill
 * imperatively after mount/update — computed intensities and role-based
 * colors aren't expressible as static Tailwind classes, so this is one of
 * the deliberate inline-style exceptions called out in the styling plan.
 */
export function BodyMap(props: BodyMapProps) {
  const t = useTranslations("exercises");
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    for (const container of [frontRef.current, backRef.current]) {
      if (!container) continue;
      const sil = container.querySelector<SVGGElement>(".sil");
      if (sil) sil.style.fill = "#3A3A3E";

      container.querySelectorAll<SVGElement>(".m").forEach((shape) => {
        const classes = (shape.getAttribute("class") ?? "").split(/\s+/);
        if (props.mode === "roles") {
          const isPrimary = classes.some((c) => props.primary.includes(c));
          const isSecondary =
            !isPrimary && classes.some((c) => props.secondary.includes(c));
          shape.style.fill = isPrimary
            ? "var(--color-blue)"
            : isSecondary
              ? "var(--color-orange)"
              : "transparent";
        } else {
          let intensity = 0;
          for (const c of classes) {
            if (c === "m") continue;
            const v = props.load[c];
            if (v != null && v > intensity) intensity = v;
          }
          shape.style.fill =
            intensity > 0
              ? `rgba(47,128,255,${(0.3 + 0.7 * Math.min(1, intensity)).toFixed(2)})`
              : "transparent";
        }
      });
    }
  });

  return (
    <div className="my-2 flex justify-center gap-4">
      <div className="text-center">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-2">
          {t("front")}
        </div>
        <div
          ref={frontRef}
          className="[&_svg]:mx-auto [&_svg]:block [&_svg]:h-57.75 [&_svg]:w-32.5"
          dangerouslySetInnerHTML={{ __html: SVG_FRONT }}
        />
      </div>
      <div className="text-center">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-2">
          {t("back")}
        </div>
        <div
          ref={backRef}
          className="[&_svg]:mx-auto [&_svg]:block [&_svg]:h-57.75 [&_svg]:w-32.5"
          dangerouslySetInnerHTML={{ __html: SVG_BACK }}
        />
      </div>
    </div>
  );
}
