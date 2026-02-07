"use client";

import { useTransition, useState } from "react";
import { Users, CheckCircle, XCircle, Loader2, Eye, X, ZoomIn } from "lucide-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { updateVerificationStatus } from "@/actions/residents";
import type { ResidentWithUser, VerificationStatus } from "@/types/resident";

function StatusPill({ status }: { status: VerificationStatus }) {
  const styles = {
    verified: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    rejected: "bg-rose-50 text-rose-700",
  };

  const labels = {
    verified: "Verified",
    pending: "Pending",
    rejected: "Rejected",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "-"}</span>
    </div>
  );
}

interface ResidentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resident: ResidentWithUser | null;
  onSuccess: () => void;
}

export default function ResidentViewDialog({
  open,
  onOpenChange,
  resident,
  onSuccess,
}: ResidentViewDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [showValidIdModal, setShowValidIdModal] = useState(false);

  async function handleStatusChange(status: VerificationStatus) {
    if (!resident) return;

    startTransition(async () => {
      const { error } = await updateVerificationStatus(resident.id, status);

      if (error) {
        console.error("Failed to update status:", error);
        return;
      }

      onOpenChange(false);
      onSuccess();
    });
  }

  if (!resident) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              Resident Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{resident.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {resident.users?.email}
                </p>
                <div className="mt-1">
                  <StatusPill status={resident.verification_status} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <DetailRow label="Phone" value={resident.phone_number} />
              <DetailRow label="Address" value={resident.address} />
              <DetailRow label="Sex" value={resident.sex} />
              <DetailRow
                label="Birthdate"
                value={
                  resident.birthdate
                    ? new Date(resident.birthdate).toLocaleDateString()
                    : null
                }
              />
              <DetailRow
                label="Registered"
                value={new Date(resident.created_at).toLocaleDateString()}
              />
            </div>

            {/* Valid ID Section */}
            {resident.valid_id_url && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Valid ID Document</p>
                <div className="relative w-full h-40 rounded-lg border border-border overflow-hidden bg-muted/30 cursor-pointer group"
                  onClick={() => setShowValidIdModal(true)}>
                  <img
                    src={resident.valid_id_url}
                    alt="Valid ID"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="flex flex-col items-center text-white">
                      <ZoomIn className="w-6 h-6" />
                      <span className="text-sm mt-2">Click to enlarge</span>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setShowValidIdModal(true)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Full Size
                </Button>
              </div>
            )}

            {/* Verification Actions */}
            {resident.verification_status === "pending" && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Verification Actions</p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleStatusChange("verified")}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleStatusChange("rejected")}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Valid ID Full Preview Modal */}
      {showValidIdModal && resident.valid_id_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowValidIdModal(false)}
        >
          <button
            onClick={() => setShowValidIdModal(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div
            className="relative max-w-[90vw] max-h-[90vh] rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resident.valid_id_url}
              alt="Valid ID Full Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-white text-sm font-medium">
                {resident.name} - Valid ID
              </p>
              <p className="text-white/70 text-xs mt-1">
                Click outside or press ESC to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}