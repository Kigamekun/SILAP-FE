import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, ShieldAlert, Trash2 } from "lucide-react";
import { api, type Alert, mediaUrl } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

type AlertListProps = {
  alerts: Alert[];
};

export function AlertList({ alerts }: AlertListProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Alert["status"] }) => api.updateAlert(id, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
        queryClient.invalidateQueries({ queryKey: ["buses"] }),
      ]);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteAlert(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
        queryClient.invalidateQueries({ queryKey: ["buses"] }),
      ]);
    },
  });

  function handleDelete(alert: Alert) {
    const confirmed = window.confirm(`Hapus alert dari ${alert.bus_name} - ${alert.camera_name}? Data alert akan hilang dari dashboard.`);
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(alert.id);
  }

  if (alerts.length === 0) {
    return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada alert.</div>;
  }

  return (
    <div className="divide-y">
      {alerts.map((alert) => (
        <div key={alert.id} className="grid gap-3 py-4 md:grid-cols-[96px_1fr_auto]">
          <img src={mediaUrl(alert.crop_url)} alt="Crop wajah alert" className="h-24 w-24 rounded-md border object-cover" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-danger" />
              <p className="font-semibold">{alert.bus_name}</p>
              <StatusBadge status={alert.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{alert.camera_name} · {formatDateTime(alert.created_at)}</p>
            <p className="mt-2 text-sm">{alert.message}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Confidence wajah {Math.round(alert.face_confidence * 100)}%
              {alert.match_distance !== null ? ` · Skor kecocokan ${alert.match_distance.toFixed(3)}` : ""}
            </p>
          </div>
          <div className="flex items-start gap-2 md:flex-col">
            {alert.status === "open" ? (
              <button className="btn-secondary h-9 px-3" type="button" onClick={() => mutation.mutate({ id: alert.id, status: "acknowledged" })}>
                <Eye className="h-4 w-4" />
                Tinjau
              </button>
            ) : null}
            {alert.status !== "resolved" ? (
              <button className="btn-secondary h-9 px-3" type="button" onClick={() => mutation.mutate({ id: alert.id, status: "resolved" })}>
                <CheckCircle2 className="h-4 w-4" />
                Selesai
              </button>
            ) : null}
            <button className="btn-secondary h-9 px-3 text-danger" type="button" onClick={() => handleDelete(alert)}>
              <Trash2 className="h-4 w-4" />
              Hapus
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
