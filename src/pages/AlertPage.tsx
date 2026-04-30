import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { AlertList } from "@/components/AlertList";
import { StatusBadge } from "@/components/StatusBadge";
import { api, type Alert } from "@/lib/api";

const statusOptions: Array<{ label: string; value: Alert["status"] | "all" }> = [
  { label: "Semua", value: "all" },
  { label: "Open", value: "open" },
  { label: "Ditinjau", value: "acknowledged" },
  { label: "Selesai", value: "resolved" },
];

export function AlertPage() {
  const [status, setStatus] = useState<Alert["status"] | "all">("open");
  const alertsQuery = useQuery({
    queryKey: ["alerts", status],
    queryFn: () => api.alerts(status === "all" ? undefined : status),
    refetchInterval: 6000,
  });
  const allAlertsQuery = useQuery({
    queryKey: ["alerts", "all-counts"],
    queryFn: () => api.alerts(),
    refetchInterval: 6000,
  });

  const alerts = alertsQuery.data ?? [];
  const counts = (allAlertsQuery.data ?? []).reduce(
    (acc, alert) => {
      acc[alert.status] += 1;
      return acc;
    },
    { open: 0, acknowledged: 0, resolved: 0 } satisfies Record<Alert["status"], number>,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Alert</h1>
          <p className="mt-1 text-sm text-muted-foreground">Daftar penumpang gelap yang sudah melewati ambang deteksi berulang.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              className={status === option.value ? "btn-primary h-10 px-3" : "btn-secondary h-10 px-3"}
              type="button"
              onClick={() => setStatus(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Open</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-bold text-danger">{counts.open}</p>
            <StatusBadge status="open" />
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Ditinjau</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-bold text-warning">{counts.acknowledged}</p>
            <StatusBadge status="acknowledged" />
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Selesai</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-bold text-success">{counts.resolved}</p>
            <StatusBadge status="resolved" />
          </div>
        </div>
      </div>

      <section className="panel p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-danger" />
          <h2 className="text-lg font-bold">Daftar Alert</h2>
        </div>
        <AlertList alerts={alerts} />
      </section>
    </div>
  );
}
