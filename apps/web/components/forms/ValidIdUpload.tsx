"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { Upload, X, ImageIcon, ZoomIn, Eye } from "lucide-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

interface ValidIdUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  error?: string;
}

export default function ValidIdUpload({
  value,
  onChange,
  disabled = false,
  error,
}: ValidIdUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when value changes
  useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      setFileName(value.name);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
      setFileName(null);
    }
  }, [value]);

  const handleFile = useCallback(
    (file: File) => {
      setUploadError(null);

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setUploadError("Only .jpg, .jpeg, .png, and .webp formats are supported.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setUploadError("Max file size is 5MB.");
        return;
      }

      onChange(file);
    },
    [onChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) handleFile(files[0]);
    },
    [handleFile]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) handleFile(files[0]);
    },
    [handleFile]
  );

  const handleRemoveFile = useCallback(() => {
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onChange]);

  const handleZoneClick = useCallback(() => {
    if (!disabled) fileInputRef.current?.click();
  }, [disabled]);

  const displayError = uploadError || error;

  return (
    <>
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        ref={fileInputRef}
        onChange={handleFileInputChange}
      />

      {!previewUrl ? (
        <div
          onClick={handleZoneClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex flex-col items-center justify-center
            w-full min-h-[180px] p-6
            border-2 border-dashed rounded-lg
            cursor-pointer transition-all duration-200
            ${isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            ${displayError ? "border-red-300" : ""}
          `}
        >
          <div className="flex flex-col items-center">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isDragging ? "bg-primary/10" : "bg-muted"}`}
            >
              <Upload
                className={`w-7 h-7 ${isDragging ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "Drop your file here" : "Drag & drop your Valid ID here"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or <span className="text-primary font-medium">click to browse</span>
            </p>
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span className="px-2 py-1 rounded bg-muted">JPG</span>
              <span className="px-2 py-1 rounded bg-muted">PNG</span>
              <span className="px-2 py-1 rounded bg-muted">WebP</span>
              <span className="text-muted-foreground/60">max 5MB</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full rounded-lg border border-border overflow-hidden bg-muted/30">
          <div className="flex items-start gap-4 p-4">
            <div
              onClick={() => setShowPreviewModal(true)}
              className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer group"
            >
              <img
                src={previewUrl}
                alt="Valid ID Preview"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <div className="flex flex-col items-center text-white">
                  <ZoomIn className="w-5 h-5" />
                  <span className="text-xs mt-1">View</span>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 py-1">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium text-foreground truncate">
                  {fileName || "Valid ID uploaded"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Image uploaded successfully
              </p>

              <div className="flex items-center gap-2 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowPreviewModal(true)}
                  disabled={disabled}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Preview
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleZoneClick}
                  disabled={disabled}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Change
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              onClick={handleRemoveFile}
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Upload a clear photo of your valid government ID (e.g., National ID, Driver&apos;s License, Passport)
      </p>

      {displayError && <p className="text-sm text-red-600">{displayError}</p>}

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90">
          <VisuallyHidden.Root>
            <DialogTitle>Valid ID Preview</DialogTitle>
          </VisuallyHidden.Root>
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Valid ID Full Preview"
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}