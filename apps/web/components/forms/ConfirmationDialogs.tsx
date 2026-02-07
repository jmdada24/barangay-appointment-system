"use client";

import { useTransition } from "react";
import { Archive, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onConfirm: () => Promise<void>;
}

export function ArchiveDialog({
  open,
  onOpenChange,
  name,
  onConfirm,
}: ArchiveDialogProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Archive className="w-7 h-7 text-yellow-600" />
          </div>
          <DialogTitle className="text-lg font-semibold">
            Archive Resident?
          </DialogTitle>
          <DialogDescription>
            <strong>{name}</strong> will be archived. An admin can restore them
            later.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-12 bg-yellow-600 hover:bg-yellow-700"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onConfirm: () => Promise<void>;
}

export function DeleteDialog({
  open,
  onOpenChange,
  name,
  onConfirm,
}: DeleteDialogProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="w-7 h-7 text-red-600" />
          </div>
          <DialogTitle className="text-lg font-semibold">
            Delete Resident?
          </DialogTitle>
          <DialogDescription>
            <strong>{name}</strong> will be permanently deleted. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-12 bg-red-600 hover:bg-red-700"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}