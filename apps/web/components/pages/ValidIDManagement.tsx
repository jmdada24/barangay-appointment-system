"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Download } from "lucide-react";

interface ValidIDViewerProps {
  validIDUrl: string | null;
  residentName: string;
}

export function ValidIDViewer({ validIDUrl, residentName }: ValidIDViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!validIDUrl) {
    return <span className="text-muted-foreground">No valid ID uploaded</span>;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Eye className="w-4 h-4" />
        View Valid ID
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Valid ID - {residentName}</DialogTitle>
          </DialogHeader>

          <div className="relative w-full h-96">
            <Image
              src={validIDUrl}
              alt={`${residentName}'s valid ID`}
              fill
              className="object-contain"
              onError={(e) => {
                console.error("Image load error:", validIDUrl);
                e.currentTarget.src = "/placeholder-image.png";
              }}
            />
          </div>

          <div className="flex gap-2">
            <a
              href={validIDUrl}
              download
              className="flex-1"
            >
              <Button variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </a>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}