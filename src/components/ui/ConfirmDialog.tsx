"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} subtitle={message}>
      <div className="mt-2 flex flex-col gap-2.5">
        <Button
          variant={danger ? "danger" : "primary"}
          size="lg"
          fullWidth
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
        <Button variant="ghost" size="md" fullWidth onClick={onClose}>
          {cancelLabel}
        </Button>
      </div>
    </BottomSheet>
  );
}
