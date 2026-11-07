"use client";

import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useSheet } from "@/shared/ui/SheetHost";
import { FolderEditorSheet } from "../editors/FolderEditorSheet";
import { RoutineCard } from "./RoutineCard";

export function FolderRow({
  folder,
  routines,
}: {
  folder: Doc<"folders">;
  routines: Doc<"routines">[];
}) {
  const { push } = useSheet();
  const t = useTranslations("workout");
  const updateFolder = useMutation(api.workout.updateFolder);
  const open = !folder.collapsed;

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-line">
      <div
        className="flex cursor-pointer items-center gap-2.5 bg-surface-2 px-3.5 py-3"
        onClick={() => updateFolder({ id: folder._id, collapsed: open })}
      >
        <span
          className={`inline-block w-2.5 text-[11px] text-muted-2 transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▸
        </span>
        <span className="text-blue">
          <FolderIcon />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15.5px] font-bold">
          {folder.name}
        </span>
        <span className="rounded-full bg-bg px-2.5 py-0.5 text-[12.5px] font-bold text-muted-2">
          {routines.length}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            push("folder-editor", <FolderEditorSheet existing={folder} />);
          }}
          className="px-1 text-lg leading-none text-muted-2"
          aria-label={t("folderOptions")}
        >
          ⋮
        </button>
      </div>
      {open && (
        <div className="p-3">
          {routines.length === 0 ? (
            <div className="px-1 py-0.5 text-[13px] leading-snug text-muted-2">
              {t("emptyFolder", { name: folder.name })}
            </div>
          ) : (
            <div className="lg:grid lg:grid-cols-2 lg:gap-3">
              {routines.map((r) => (
                <RoutineCard key={r._id} routine={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FolderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4.5 w-4.5"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
