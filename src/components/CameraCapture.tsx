import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Play, Square } from "lucide-react";

type CameraCaptureProps = {
  busy?: boolean;
  facingMode?: "user" | "environment";
  autoCapture?: boolean;
  autoIntervalMs?: number;
  captureZoom?: number;
  sampleCount?: number;
  burstCapture?: boolean;
  burstRepeat?: boolean;
  burstFrameCount?: number;
  burstSelectedCount?: number;
  burstIntervalMs?: number;
  captureCount?: number;
  maxCaptures?: number;
  showUpload?: boolean;
  uploadLabel?: string;
  onCapture: (file: File) => void;
  onBurstCapture?: (files: File[]) => void;
};

const VIDEO_CONSTRAINTS = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  aspectRatio: { ideal: 16 / 9 },
  frameRate: { ideal: 24, max: 30 },
} satisfies MediaTrackConstraints;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function centeredZoomFrame(video: HTMLVideoElement, zoom: number) {
  const safeZoom = Math.max(1, zoom);
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  if (!context) return null;

  const sourceWidth = video.videoWidth / safeZoom;
  const sourceHeight = video.videoHeight / safeZoom;
  const sourceX = (video.videoWidth - sourceWidth) / 2;
  const sourceY = (video.videoHeight - sourceHeight) / 2;

  context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function scoreSharpness(canvas: HTMLCanvasElement) {
  const width = Math.min(160, canvas.width);
  const height = Math.max(1, Math.round((canvas.height / canvas.width) * width));
  const sample = document.createElement("canvas");
  sample.width = width;
  sample.height = height;

  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) return 0;

  context.drawImage(canvas, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  let score = 0;
  let count = 0;

  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;
      const right = index + 4;
      const down = index + width * 4;
      const luminance = pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
      const rightLuminance = pixels[right] * 0.299 + pixels[right + 1] * 0.587 + pixels[right + 2] * 0.114;
      const downLuminance = pixels[down] * 0.299 + pixels[down + 1] * 0.587 + pixels[down + 2] * 0.114;
      score += Math.abs(luminance - rightLuminance) + Math.abs(luminance - downLuminance);
      count += 1;
    }
  }

  return count > 0 ? score / count : 0;
}

function canvasToJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
  });
}

export function CameraCapture({
  busy = false,
  facingMode = "user",
  autoCapture = true,
  autoIntervalMs = 2000,
  captureZoom = 1,
  sampleCount = 1,
  burstCapture = false,
  burstRepeat = false,
  burstFrameCount = 60,
  burstSelectedCount = 12,
  burstIntervalMs = 60,
  captureCount = 0,
  maxCaptures,
  showUpload = true,
  uploadLabel = "Upload uji",
  onCapture,
  onBurstCapture,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureLockedRef = useRef(false);
  const burstStartedRef = useRef(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string | null>(null);
  const [burstProgress, setBurstProgress] = useState<number | null>(null);
  const limitReached = maxCaptures !== undefined && captureCount >= maxCaptures;
  const remainingCaptures = maxCaptures !== undefined ? Math.max(0, maxCaptures - captureCount) : burstSelectedCount;

  const updateResolution = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    setResolution(`${video.videoWidth}x${video.videoHeight}`);
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...VIDEO_CONSTRAINTS,
          facingMode: { ideal: facingMode },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        updateResolution();
      }
      setActive(true);
    } catch {
      setError("Kamera browser tidak bisa diakses. Gunakan upload frame manual.");
    }
  }

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    burstStartedRef.current = false;
    setActive(false);
    setResolution(null);
    setBurstProgress(null);
  }, []);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const totalSamples = Math.max(1, Math.round(sampleCount));
    let bestFrame: { blob: Blob; score: number } | null = null;

    for (let index = 0; index < totalSamples; index += 1) {
      const canvas = centeredZoomFrame(video, captureZoom);
      if (!canvas) return;

      const blob = await canvasToJpeg(canvas);
      if (blob) {
        const score = scoreSharpness(canvas);
        if (!bestFrame || score > bestFrame.score) {
          bestFrame = { blob, score };
        }
      }

      if (index < totalSamples - 1) {
        await wait(110);
      }
    }

    if (!bestFrame) return;
    onCapture(new File([bestFrame.blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }));
  }, [captureZoom, onCapture, sampleCount]);

  const captureBurst = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0 || !onBurstCapture) return;

    const totalFrames = Math.max(1, Math.round(burstFrameCount));
    const selectedLimit = Math.max(1, Math.min(Math.round(burstSelectedCount), remainingCaptures));
    const bestFrames: { blob: Blob; score: number; index: number }[] = [];

    for (let index = 0; index < totalFrames; index += 1) {
      setBurstProgress(index + 1);
      const canvas = centeredZoomFrame(video, captureZoom);
      if (!canvas) return;

      const score = scoreSharpness(canvas);
      const weakestScore = bestFrames.length > 0 ? Math.min(...bestFrames.map((frame) => frame.score)) : -1;
      if (bestFrames.length < selectedLimit || score > weakestScore) {
        const blob = await canvasToJpeg(canvas);
        if (blob) {
          bestFrames.push({ blob, score, index });
          bestFrames.sort((left, right) => right.score - left.score);
          bestFrames.splice(selectedLimit);
        }
      }

      if (index < totalFrames - 1) {
        await wait(Math.max(20, burstIntervalMs));
      }
    }

    const files = bestFrames
      .sort((left, right) => right.score - left.score)
      .map((frame, index) => new File([frame.blob], `burst-${Date.now()}-${index + 1}.jpg`, { type: "image/jpeg" }));

    if (files.length > 0) {
      onBurstCapture(files);
    }
  }, [burstFrameCount, burstIntervalMs, burstSelectedCount, captureZoom, onBurstCapture, remainingCaptures]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    if (!active || !autoCapture || busy || limitReached) return;

    const captureOnce = () => {
      if (captureLockedRef.current || busy || limitReached) return;
      if (burstCapture && !burstRepeat && burstStartedRef.current) return;
      captureLockedRef.current = true;
      if (burstCapture && !burstRepeat) {
        burstStartedRef.current = true;
      }

      const captureTask = burstCapture && onBurstCapture ? captureBurst() : captureFrame();
      void captureTask.finally(() => {
        setBurstProgress(null);
        window.setTimeout(() => {
          captureLockedRef.current = false;
        }, Math.max(300, autoIntervalMs - 150));
      });
    };

    const firstShot = window.setTimeout(captureOnce, 1200);
    const interval = window.setInterval(captureOnce, autoIntervalMs);
    return () => {
      window.clearTimeout(firstShot);
      window.clearInterval(interval);
    };
  }, [active, autoCapture, autoIntervalMs, burstCapture, burstRepeat, busy, captureBurst, captureFrame, limitReached, onBurstCapture]);

  const autoCaptureLabel =
    burstProgress !== null
      ? `Burst ${burstProgress}/${Math.max(1, Math.round(burstFrameCount))}`
      : active
        ? `Auto capture aktif${resolution ? ` · ${resolution}` : ""}`
        : "Auto capture siap";

  return (
    <div className="space-y-3">
      <div className="aspect-video overflow-hidden rounded-lg border bg-slate-950">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          onLoadedMetadata={updateResolution}
          style={{ transform: captureZoom > 1 ? `scale(${captureZoom})` : undefined }}
        />
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
          {limitReached ? "Target capture tercapai" : autoCaptureLabel}
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
