"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ResidentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resident: {
    id: number;
    name: string;
    address: string;
    phone_number: string;
    birthdate: string;
    sex: "male" | "female";
    valid_id_url?: string;
    face_photo_url?: string;
    verification_status: "verified" | "pending" | "rejected";
  } | null;
}

function StatusPill({
  status,
}: {
  status: "verified" | "pending" | "rejected";
}) {
  const styles = {
    verified: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    rejected: "bg-rose-50 text-rose-700",
  };

  const labels = {
    verified: "✓ Verified",
    pending: "⏳ Pending",
    rejected: "✗ Rejected",
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
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
    <div className="flex justify-between py-3 border-b last:border-b-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground font-medium">
        {value || "—"}
      </span>
    </div>
  );
}

function ImagePreviewModal({
  open,
  onOpenChange,
  imageUrl,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full h-auto rounded-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ResidentViewDialog({
  open,
  onOpenChange,
  resident,
}: ResidentViewDialogProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

  // Guard: Return early if no resident
  if (!resident) {
    return null;
  }

  const handleImagePreview = (url: string, title: string) => {
    setPreviewImage({ url, title });
    setPreviewOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              {resident.name}
            </DialogTitle>
          </DialogHeader>

          {/* Basic Information */}
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Verification Status</h3>
              <StatusPill status={resident.verification_status} />
            </div>

            {/* Personal Information */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Personal Information
              </h3>
              <div className="bg-muted/30 rounded-lg p-4">
                <DetailRow label="Name" value={resident.name} />
                <DetailRow label="Address" value={resident.address} />
                <DetailRow
                  label="Contact Number"
                  value={resident.phone_number}
                />
                <DetailRow label="Date of Birth" value={resident.birthdate} />
                <DetailRow
                  label="Sex"
                  value={resident.sex?.charAt(0).toUpperCase() + resident.sex?.slice(1)}
                />
              </div>
            </div>

            {/* Valid ID Document */}
            {resident.valid_id_url && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Valid ID Document
                </h3>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={resident.valid_id_url}
                        alt="Valid ID"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleImagePreview(resident.valid_id_url!, "Valid ID")
                      }
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Full Size
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Face Photo */}
            {resident.face_photo_url && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Resident Face Photo
                </h3>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={resident.face_photo_url}
                        alt="Face Photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleImagePreview(
                          resident.face_photo_url!,
                          "Resident Face Photo"
                        )
                      }
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Full Size
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!resident.valid_id_url && !resident.face_photo_url && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  ⚠️ No documents uploaded yet
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          imageUrl={previewImage.url}
          title={previewImage.title}
        />
      )}
    </>
  );
}