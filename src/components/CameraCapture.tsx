import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Play, Square } from "lucide-react";

type CameraCaptureProps = {
  busy?: boolean;
  facingMode?: "user" | "environment";
  autoCapture?: boolean;
  autoIntervalMs?: number;
  captureCount?: number;
  maxCaptures?: number;
  showUpload?: boolean;
  uploadLabel?: string;
  onCapture: (file: File) => void;
};

export function CameraCapture({
  busy = false,
  facingMode = "user",
  autoCapture = true,
  autoIntervalMs = 2000,
  captureCount = 0,
  maxCaptures,
  showUpload = true,
  uploadLabel = "Upload uji",
  onCapture,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureLockedRef = useRef(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limitReached = maxCaptures !== undefined && captureCount >= maxCaptures;

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      setError("Kamera browser tidak bisa diakses. Gunakan upload frame manual.");
    }
  }

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  }, [onCapture]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (!active || !autoCapture || busy || limitReached) return;

    const captureOnce = () => {
      if (captureLockedRef.current || busy || limitReached) return;
      captureLockedRef.current = true;
      captureFrame();
      window.setTimeout(() => {
        captureLockedRef.current = false;
      }, Math.max(600, autoIntervalMs - 150));
    };

    const firstShot = window.setTimeout(captureOnce, 700);
    const interval = window.setInterval(captureOnce, autoIntervalMs);
    return () => {
      window.clearTimeout(firstShot);
      window.clearInterval(interval);
    };
  }, [active, autoCapture, autoIntervalMs, busy, captureFrame, limitReached]);

  return (
    <div className="space-y-3">
      <div className="aspect-video overflow-hidden rounded-lg border bg-slate-950">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        {!active ? (
          <div className="flex h-full -translate-y-full items-center justify-center text-sm text-white/75">
            Kamera belum aktif
          </div>
        ) : null}
      </div>

      {error ? <p className="rounded-md border border-warning/25 bg-warning/10 px-3 py-2 text-sm text-warning">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {!active ? (
          <button className="btn-secondary" type="button" onClick={startCamera}>
            <Play className="h-4 w-4" />
            Aktifkan
          </button>
        ) : (
          <button className="btn-secondary" type="button" onClick={stopCamera}>
            <Square className="h-4 w-4" />
            Stop
          </button>
        )}
        <div className="inline-flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-sm font-semibold text-muted-foreground">
          <Camera className={`h-4 w-4 ${active && !limitReached ? "text-success" : ""}`} />
          {limitReached ? "Target capture tercapai" : active ? "Auto capture aktif" : "Auto capture siap"}
        </div>
        {showUpload ? (
          <label className="btn-secondary cursor-pointer">
            <ImageUp className="h-4 w-4" />
            {uploadLabel}
            <input
              className="hidden"
              type="file"
              accept="image/*"
              disabled={busy || limitReached}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onCapture(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}
