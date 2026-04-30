import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bus, Camera, ShieldCheck, Ticket, Users } from "lucide-react";
import { AlertList } from "@/components/AlertList";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";

export function DashboardPage() {
  const summaryQuery = useQuery({ queryKey: ["summary"], queryFn: api.summary, refetchInterval: 8000 });
  const busesQuery = useQuery({ queryKey: ["buses"], queryFn: api.buses, refetchInterval: 10000 });

  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ringkasan tiket, kamera, dan alert bus aktif.</p>
        </div>
        <div className="rounded-md border bg-white px-3 py-2 text-xs font-semibold text-muted-foreground">
          Match threshold: {summary?.model_status.face_match_threshold ?? "-"}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total Penumpang" value={summary?.passengers_total ?? 0} icon={Users} />
        <MetricCard title="Tiket Approved" value={summary?.passengers_approved ?? 0} icon={Ticket} tone="success" />
        <MetricCard title="Bus Terdaftar" value={summary?.buses_total ?? 0} icon={Bus} />
        <MetricCard title="Kamera Online" value={summary?.cameras_online ?? 0} icon={Camera} tone="success" />
        <MetricCard title="Alert Terbuka" value={summary?.open_alerts ?? 0} icon={AlertTriangle} tone="danger" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="panel p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Alert Terbaru</h2>
              <p className="text-sm text-muted-foreground">Crop wajah dan konteks kamera muncul di sini.</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-success" />
          </div>
          <AlertList alerts={summary?.recent_alerts ?? []} />
        </section>

        <aside className="space-y-4">
          <section className="panel p-4">
            <h2 className="text-base font-bold">Status Model</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Face detector</span>
                <StatusBadge status={summary?.model_status.detector_loaded ? "online" : "pending"} />
              </div>
              <p className="break-words rounded-md bg-muted p-3 text-xs text-muted-foreground">
                {summary?.model_status.detector_backend ?? "Memuat"} · {summary?.model_status.detector_error ?? "Checkpoint siap"}
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Recognition</span>
                <StatusBadge status={summary?.model_status.recognition_verification_enabled ? "online" : "pending"} />
              </div>
              <p className="break-words rounded-md bg-muted p-3 text-xs text-muted-foreground">
                {summary?.model_status.recognition_backend ?? "Memuat"} · {summary?.model_status.recognition_error ?? "Embedding siap"}
              </p>
              {!summary?.model_status.recognition_verification_enabled ? (
                <p className="rounded-md border border-warning/25 bg-warning/10 p-3 text-xs font-semibold text-warning">
                  ResNet belum aktif. Sistem tidak akan meloloskan match otomatis agar tidak ada false positive.
                </p>
              ) : null}
            </div>
          </section>

          <section className="panel p-4">
            <h2 className="text-base font-bold">Armada Aktif</h2>
            <div className="mt-3 space-y-3">
              {(busesQuery.data ?? []).map((bus) => (
                <div key={bus.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{bus.name}</p>
                    <StatusBadge status={bus.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{bus.plate_number} · {bus.route_name}</p>
                  <p className="mt-2 text-xs font-semibold text-danger">{bus.open_alerts} alert terbuka</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
