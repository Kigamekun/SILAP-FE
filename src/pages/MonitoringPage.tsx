import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Radar } from "lucide-react";
import { CameraCapture } from "@/components/CameraCapture";
import { StatusBadge } from "@/components/StatusBadge";
import {
  api,
  mediaUrl,
  realtimeUrl,
  type Detection,
  type ScanResult,
} from "@/lib/api";
import { formatPercent } from "@/lib/format";

type ScanProgress = {
  camera_id: number;
  stage: string;
  processed: number;
  total: number;
  message: string;
};

export function MonitoringPage() {
  const queryClient = useQueryClient();
  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busesQuery = useQuery({ queryKey: ["buses"], queryFn: api.buses });

  const cameras = useMemo(
    () =>
      (busesQuery.data ?? []).flatMap((bus) =>
        bus.cameras.map((camera) => ({ ...camera, bus })),
      ),
    [busesQuery.data],
  );
  const selectedCamera =
    cameras.find((camera) => camera.id === selectedCameraId) ?? cameras[0];

  useEffect(() => {
    setScanResult(null);
    setScanProgress(null);
    setError(null);
    if (!selectedCamera) return;

    let clearTimer: number | null = null;
    const socket = new WebSocket(realtimeUrl());
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as {
          type?: string;
          payload?: Partial<ScanProgress>;
        };
        if (event.type !== "camera.scan.progress") return;
        const payload = event.payload;
        if (payload?.camera_id !== selectedCamera.id) return;

        setScanProgress(payload as ScanProgress);
        if (payload.stage === "completed") {
          if (clearTimer !== null) window.clearTimeout(clearTimer);
          clearTimer = window.setTimeout(() => setScanProgress(null), 1200);
        }
      } catch {
        return;
      }
    };

    return () => {
      if (clearTimer !== null) window.clearTimeout(clearTimer);
      socket.close();
    };
  }, [selectedCamera?.id]);

  const scanMutation = useMutation({
    mutationFn: (file: File) => api.scanCamera(selectedCamera!.id, file),
    onMutate: () => {
      setScanProgress({
        camera_id: selectedCamera!.id,
        stage: "uploading",
        processed: 0,
        total: 1,
        message: "Mengirim frame ke backend.",
      });
    },
    onSuccess: async (result) => {
      setError(null);
      setScanResult(result);
      setScanProgress({
        camera_id: selectedCamera!.id,
        stage: "completed",
        processed: 1,
        total: 1,
        message: "Scan selesai.",
      });
      window.setTimeout(() => setScanProgress(null), 1200);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
        queryClient.invalidateQueries({ queryKey: ["buses"] }),
      ]);
    },
    onError: (err) => {
      setScanProgress(null);
      setError(err.message);
    },
  });

  const scanBurstMutation = useMutation({
    mutationFn: (files: File[]) =>
      api.scanCameraBurst(selectedCamera!.id, files),
    onMutate: (files) => {
      setScanProgress({
        camera_id: selectedCamera!.id,
        stage: "uploading",
        processed: 0,
        total: files.length,
        message: `Mengirim ${files.length} frame terbaik ke backend.`,
      });
    },
    onSuccess: async (result) => {
      setError(null);
      setScanResult(result);
      setScanProgress({
        camera_id: selectedCamera!.id,
        stage: "completed",
        processed: result.detections.length,
        total: result.detections.length,
        message: `Scan selesai, ${result.detections.length} hasil ditampilkan.`,
      });
      window.setTimeout(() => setScanProgress(null), 1200);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
        queryClient.invalidateQueries({ queryKey: ["buses"] }),
      ]);
    },
    onError: (err) => {
      setScanProgress(null);
      setError(err.message);
    },
  });

  const scanPending = scanMutation.isPending || scanBurstMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Monitoring Bus</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kamera bus menangkap frame otomatis dan mengirim alert ketika wajah
            tidak cocok dengan tiket aktif.
          </p>
        </div>
        <div className="rounded-md border bg-white px-3 py-2 text-xs font-semibold text-muted-foreground">
          {selectedCamera
            ? `${selectedCamera.bus.name} · ${selectedCamera.name}`
            : "Kamera belum tersedia"}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="panel p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Sumber Kamera</h2>
            <Radar className="h-5 w-5 text-primary" />
          </div>

          <div className="mb-4">
            <label className="label" htmlFor="camera">
              Kamera bus
            </label>
            <select
              id="camera"
              className="input mt-1"
              value={selectedCamera?.id ?? ""}
              onChange={(event) =>
                setSelectedCameraId(Number(event.target.value))
              }
            >
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.bus.name} · {camera.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCamera ? (
            <>
              <div className="mb-4 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{selectedCamera.bus.name}</p>
                  <StatusBadge status={selectedCamera.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedCamera.bus.plate_number} ·{" "}
                  {selectedCamera.bus.route_name} · {selectedCamera.location}
                </p>
              </div>

              {error ? (
                <div className="mb-4 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <CameraCapture
                busy={scanMutation.isPending || scanBurstMutation.isPending}
                facingMode="environment"
                autoIntervalMs={3000}
                captureZoom={1}
                sampleCount={5}
                burstCapture
                burstRepeat
                burstFrameCount={9}
                burstSelectedCount={3}
                burstIntervalMs={45}
                uploadLabel="Upload frame uji"
                onCapture={(file) => scanMutation.mutate(file)}
                onBurstCapture={(files) => scanBurstMutation.mutate(files)}
              />
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Tambahkan bus dan kamera terlebih dahulu.
            </div>
          )}
        </section>

        <section className="panel p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Hasil Scan</h2>
              <p className="text-sm text-muted-foreground">
                Deteksi wajah terakhir dari kamera terpilih.
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>

          {scanPending || scanProgress ? (
            <ScanProgressBox pending={scanPending} progress={scanProgress} />
          ) : null}

          {scanResult ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Deteksi</p>
                  <p className="mt-1 text-xl font-bold">
                    {scanResult.detections.length}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Alert baru</p>
                  <p className="mt-1 text-xl font-bold text-danger">
                    {scanResult.alerts_created}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Ambang alert</p>
                  <p className="mt-1 text-xl font-bold">
                    {scanResult.detections[0]?.alert_threshold ?? "-"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Recognition</p>
                  <p className="mt-1 truncate text-sm font-bold">
                    {scanResult.recognition_backend}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {scanResult.detections.map((detection, index) => (
                  <div
                    key={`${detection.crop_url}-${index}`}
                    className="rounded-lg border p-3"
                  >
                    <img
                      src={mediaUrl(detection.crop_url)}
                      alt="Crop wajah hasil scan"
                      className="aspect-square w-full rounded-md object-cover"
                    />
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <StatusBadge status={detection.match_status} />
                      <span className="text-xs text-muted-foreground">
                        {formatPercent(detection.face_confidence)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">
                      {detectionTitle(detection)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {detectionDetail(detection)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
              {scanPending ? (
                <div className="inline-flex items-center gap-2 font-semibold text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Menunggu hasil scan kamera...
                </div>
              ) : (
                "Aktifkan kamera untuk melihat crop wajah dan status match otomatis."
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ScanProgressBox({
  pending,
  progress,
}: {
  pending: boolean;
  progress: ScanProgress | null;
}) {
  const total = Math.max(0, progress?.total ?? 0);
  const processed = Math.max(0, progress?.processed ?? 0);
  const percent =
    total > 0
      ? Math.min(100, Math.round((processed / total) * 100))
      : pending
        ? 20
        : 100;
  const message = progress?.message ?? "Menunggu hasil scan dari backend.";
  const detail =
    total > 0 ? `${processed}/${total}` : pending ? "Memproses" : "Selesai";

  return (
    <div className="mb-4 rounded-lg border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Loader2
            className={`h-4 w-4 shrink-0 ${pending ? "animate-spin text-primary" : "text-success"}`}
          />
          <span className="truncate">{message}</span>
        </div>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
          {detail}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function detectionTitle(detection: Detection): string {
  if (detection.match_status === "ticketed") {
    return detection.passenger?.full_name ?? "Tiket aktif";
  }
  if (detection.match_status === "stowaway") {
    return "Penumpang gelap tidak dikenal";
  }
  return "Belum lolos verifikasi tiket";
}

function detectionDetail(detection: Detection): string {
  const estimatedDistance =
    typeof detection.estimated_distance_m === "number"
      ? `Jarak estimasi ${detection.estimated_distance_m.toFixed(1)} m`
      : "Jarak estimasi belum tersedia";
  const matchScore =
    detection.match_distance !== null
      ? `Skor kecocokan ${detection.match_distance.toFixed(3)}`
      : "Skor kecocokan belum tersedia";
  if (detection.match_status === "ticketed") {
    return `${matchScore}`;
  }

  const count = detection.unknown_detection_count;
  const threshold = detection.alert_threshold;
  if (count !== null && threshold !== null) {
    return `${count}/${threshold} deteksi gagal · ${estimatedDistance} · ${matchScore}`;
  }
  return `Menunggu recognition aktif · ${estimatedDistance} · ${matchScore}`;
}
