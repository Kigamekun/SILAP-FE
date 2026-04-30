import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Ticket, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export function PassengersPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const passengersQuery = useQuery({ queryKey: ["passengers"], queryFn: api.passengers });
  const deleteMutation = useMutation({
    mutationFn: api.deletePassenger,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["passengers"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
      ]);
    },
  });

  const passengers = useMemo(() => {
    const keyword = query.toLowerCase().trim();
    return (passengersQuery.data ?? []).filter((passenger) => {
      if (!keyword) return true;
      return [passenger.full_name, passenger.identity_number ?? "", passenger.ticket_code, passenger.route_name]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [passengersQuery.data, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Penumpang</h1>
          <p className="mt-1 text-sm text-muted-foreground">Daftar tiket dan status enrollment wajah.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="input pl-9" placeholder="Cari nama, tiket, rute" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_120px_140px_90px] gap-4 border-b bg-muted px-4 py-3 text-xs font-bold uppercase text-muted-foreground lg:grid">
          <span>Penumpang</span>
          <span>Tiket</span>
          <span>Rute</span>
          <span>Status</span>
          <span>Dibuat</span>
          <span>Aksi</span>
        </div>
        <div className="divide-y">
          {passengers.map((passenger) => (
            <div key={passenger.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1.4fr_1fr_1fr_120px_140px_90px] lg:items-center">
              <div className="min-w-0">
                <p className="font-semibold">{passenger.full_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{passenger.identity_number ?? "Identitas belum diisi"} · {passenger.capture_count} capture</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Ticket className="h-4 w-4 text-primary" />
                {passenger.ticket_code}
              </div>
              <p className="text-sm text-muted-foreground">{passenger.route_name} · {passenger.seat_number ?? "-"}</p>
              <StatusBadge status={passenger.status} />
              <p className="text-sm text-muted-foreground">{formatDateTime(passenger.created_at)}</p>
              <button
                className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-danger/25 bg-danger/10 px-3 text-sm font-semibold text-danger transition hover:bg-danger/15 disabled:opacity-50"
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  const confirmed = window.confirm(`Hapus penumpang ${passenger.full_name} dan seluruh capture wajahnya?`);
                  if (confirmed) {
                    deleteMutation.mutate(passenger.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Hapus
              </button>
            </div>
          ))}
          {passengers.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Tidak ada data penumpang.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
