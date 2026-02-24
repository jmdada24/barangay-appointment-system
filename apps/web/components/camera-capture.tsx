"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Camera, X, AlertCircle, Loader2 } from "lucide-react";

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}

export function CameraCapture({
  open,
  onOpenChange,
  onCapture,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Start camera when dialog opens
  useEffect(() => {
    if (open) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      setError(null);
      setDebugInfo("Requesting camera access...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setDebugInfo("Camera access granted, stream obtained");
      streamRef.current = stream;

      if (videoRef.current) {
        setDebugInfo("Setting video source...");
        videoRef.current.srcObject = stream;
        
        // Wait for video to be loadable
        videoRef.current.onloadedmetadata = () => {
          setDebugInfo("Video metadata loaded");
          videoRef.current?.play().then(() => {
            setDebugInfo("Video playing successfully");
            setIsCameraActive(true);
          }).catch((err) => {
            setDebugInfo(`Play error: ${err.message}`);
            setError(`Failed to play video: ${err.message}`);
          });
        };
      } else {
        setDebugInfo("Video ref not found!");
      }
    } catch (err) {
      const errorMessage =
        err instanceof DOMException
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : `Failed to access camera: ${err instanceof Error ? err.message : "Unknown error"}`;
      setError(errorMessage);
      setDebugInfo(`Error: ${errorMessage}`);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setError(null);
    setDebugInfo("");
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Video or canvas reference not available");
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) {
        setError("Could not get canvas context");
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (canvas.width === 0 || canvas.height === 0) {
        setError("Video not ready yet. Please wait a moment.");
        return;
      }

      // Draw video frame to canvas
      context.drawImage(video, 0, 0);

      // Convert canvas to blob and create file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File(
            [blob],
            `face-photo-${Date.now()}.png`,
            {
              type: "image/png",
            }
          );
          onCapture(file);
          stopCamera();
          onOpenChange(false);
        }
      }, "image/png");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to capture photo: ${errorMsg}`);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      stopCamera();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Capture Resident Photo</DialogTitle>
          <DialogDescription>
            Take a clear photo of the resident for in-office verification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {debugInfo && (
            <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded border border-gray-200">
              Debug: {debugInfo}
            </div>
          )}

                    {/* Loading state - shows while camera initializes */}
          {!isCameraActive && (
            <div className="flex flex-col items-center justify-center py-12 bg-muted rounded-lg">
              <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
              <p className="text-muted-foreground text-center">
                Initializing camera...
              </p>
            </div>
          )}

          {/* VIDEO ELEMENT - ALWAYS IN DOM, visible via CSS display property */}
          <div 
            className="relative rounded-lg overflow-hidden bg-black w-full"
            style={{ display: isCameraActive ? "block" : "none" }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-96 object-cover bg-black"
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded">
              Position your face in the center
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Action buttons - only show when camera is active */}
          {isCameraActive && (
            <div className="flex gap-2">
              <Button
                onClick={capturePhoto}
                className="flex-1 h-12 bg-green-600 hover:bg-green-700"
              >
                <Camera className="w-5 h-5 mr-2" />
                Capture Photo
              </Button>
              <Button
                onClick={() => handleOpenChange(false)}
                variant="outline"
                className="flex-1 h-12"
              >
                <X className="w-5 h-5 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}