"use client";

import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AlertDialog } from "@/shared/ui/AlertDialog";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { SheetHeader } from "@/shared/ui/SheetHeader";
import { useSheet } from "@/shared/ui/SheetHost";

export function FolderEditorSheet({
  existing,
}: {
  existing?: { _id: Id<"folders">; name: string } | null;
}) {
  const { pop } = useSheet();
  const createFolder = useMutation(api.workout.createFolder);
  const updateFolder = useMutation(api.workout.updateFolder);
  const deleteFolder = useMutation(api.workout.deleteFolder);

  const t = useTranslations("workout");
  const [name, setName] = useState(existing?.name ?? "");
  const [alert, setAlert] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function save() {
    if (!name.trim()) {
      setAlert(t("folderNameRequired"));
      return;
    }
    if (existing) {
      await updateFolder({ id: existing._id, name });
    } else {
      await createFolder({ name });
    }
    pop();
  }

  return (
    <div className="p-4">
      <SheetHeader title={existing ? t("folderTitle") : t("newFolderTitle")} onClose={pop} />

      <div className="mb-4">
        <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">
          {t("folderName")}
        </label>
        <input
          autoFocus
          placeholder={t("folderPlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink outline-none focus:border-blue"
        />
      </div>

      <button
        type="button"
        onClick={save}
        className="w-full rounded-2xl bg-blue py-4 text-[15.5px] font-bold text-white"
      >
        {t("saveFolder")}
      </button>

      {existing && (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="mx-auto mt-4.5 block text-[15px] font-semibold text-danger"
        >
          {t("deleteFolder")}
        </button>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        danger
        message={t("deleteFolderConfirm", { name: existing?.name ?? "" })}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={async () => {
          setConfirmingDelete(false);
          if (existing) await deleteFolder({ id: existing._id });
          pop();
        }}
      />
      <AlertDialog
        open={alert !== null}
        message={alert ?? ""}
        onClose={() => setAlert(null)}
      />
    </div>
  );
}
