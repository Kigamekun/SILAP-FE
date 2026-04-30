import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Check, Ticket } from "lucide-react";
import { CameraCapture } from "@/components/CameraCapture";
import { StatusBadge } from "@/components/StatusBadge";
import { api, mediaUrl, type Passenger } from "@/lib/api";
import { formatPercent, todayInputValue } from "@/lib/format";

type PassengerForm = {
  full_name: string;
  identity_number: string;
  route_name: string;
  seat_number: string;
  travel_date: string;
};

const initialForm: PassengerForm = {
  full_name: "",
  identity_number: "",
  route_name: "Terminal Kota - Bandara",
  seat_number: "",
  travel_date: todayInputValue(),
};

export function CashierPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PassengerForm>(initialForm);
  const [activePassenger, setActivePassenger] = useState<Passenger | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summaryQuery = useQuery({ queryKey: ["summary"], queryFn: api.summary });
  const passengersQuery = useQuery({ queryKey: ["passengers"], queryFn: api.passengers });
  const capturesQuery = useQuery({
    queryKey: ["captures", activePassenger?.id],
    queryFn: () => api.passengerCaptures(activePassenger!.id),
    enabled: Boolean(activePassenger),
  });

  const createMutation = useMutation({
    mutationFn: api.createPassenger,
    onSuccess: async (passenger) => {
      setError(null);
      setActivePassenger(passenger);
      setForm(initialForm);
      await queryClient.invalidateQueries({ queryKey: ["passengers"] });
      await queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: (err) => setError(err.message),
  });

  const captureMutation = useMutation({
    mutationFn: (file: File) => api.uploadPassengerCapture(activePassenger!.id, file),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["captures", activePassenger?.id] });
      await queryClient.invalidateQueries({ queryKey: ["passengers"] });
    },
    onError: (err) => setError(err.message),
  });

  const approveMutation = useMutation({
    mutationFn: () => api.approvePassenger(activePassenger!.id),
    onSuccess: async (passenger) => {
      setError(null);
      setActivePassenger(passenger);
      await queryClient.invalidateQueries({ queryKey: ["passengers"] });
      await queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: (err) => setError(err.message),
  });

  const target = summaryQuery.data?.model_status.enrollment_capture_target ?? 10;
  const minimum = summaryQuery.data?.model_status.min_enrollment_captures ?? 3;
  const captures = capturesQuery.data ?? [];
  const progress = Math.min(captures.length / target, 1);

  function submitPassenger(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate({
      full_name: form.full_name,
      identity_number: form.identity_number || null,
      route_name: form.route_name,
      seat_number: form.seat_number || null,
      travel_date: form.travel_date,
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <section className="panel p-4 md:p-5">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Kasir Tiket</h1>
          <p className="mt-1 text-sm text-muted-foreground">Buat tiket, capture wajah terdekat, lalu approve enrollment.</p>
        </div>

        <form className="space-y-4" onSubmit={submitPassenger}>
          <div>
            <label className="label" htmlFor="full_name">Nama penumpang</label>
            <input id="full_name" className="input mt-1" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="identity_number">Nomor identitas</label>
            <input id="identity_number" className="input mt-1" value={form.identity_number} onChange={(event) => setForm({ ...form, identity_number: event.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="route_name">Rute</label>
            <input id="route_name" className="input mt-1" value={form.route_name} onChange={(event) => setForm({ ...form, route_name: event.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="seat_number">Kursi</label>
              <input id="seat_number" className="input mt-1" value={form.seat_number} onChange={(event) => setForm({ ...form, seat_number: event.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="travel_date">Tanggal</label>
              <input id="travel_date" className="input mt-1" type="date" value={form.travel_date} onChange={(event) => setForm({ ...form, travel_date: event.target.value })} required />
            </div>
          </div>
          <button className="btn-primary w-full" type="submit" disabled={createMutation.isPending}>
            <Ticket className="h-4 w-4" />
            Buat tiket
          </button>
        </form>

        <div className="mt-6">
          <h2 className="mb-3 text-sm font-bold uppercase text-muted-foreground">Tiket terakhir</h2>
          <div className="space-y-2">
            {(passengersQuery.data ?? []).slice(0, 6).map((passenger) => (
              <button
                key={passenger.id}
                className="w-full rounded-lg border p-3 text-left transition hover:bg-muted"
                type="button"
                onClick={() => setActivePassenger(passenger)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{passenger.full_name}</p>
                  <StatusBadge status={passenger.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{passenger.ticket_code} · {passenger.route_name}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel p-4 md:p-5">
        {activePassenger ? (
          <div className="space-y-5">
            <div className="flex flex-col justify-between gap-3 border-b pb-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold">{activePassenger.full_name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{activePassenger.ticket_code} · {activePassenger.seat_number ?? "Kursi belum diisi"}</p>
              </div>
              <StatusBadge status={activePassenger.status} />
            </div>

            {error ? <div className="rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div> : null}

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold">Capture wajah</span>
                <span className="text-muted-foreground">{captures.length}/{target} · min {minimum}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>

            <CameraCapture
              busy={captureMutation.isPending || activePassenger.status === "approved"}
              facingMode="user"
              captureCount={captures.length}
              maxCaptures={target}
              autoIntervalMs={1400}
              showUpload={activePassenger.status !== "approved" && captures.length < target}
              uploadLabel="Upload uji"
              onCapture={(file) => captureMutation.mutate(file)}
            />

            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-primary" type="button" disabled={captures.length < minimum || approveMutation.isPending || activePassenger.status === "approved"} onClick={() => approveMutation.mutate()}>
                <BadgeCheck className="h-4 w-4" />
                Approve & cetak tiket
              </button>
              {activePassenger.status === "approved" ? (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-success">
                  <Check className="h-4 w-4" />
                  Tiket siap digunakan
                </span>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {captures.map((capture) => (
                <div key={capture.id} className="rounded-lg border p-2">
                  <img src={mediaUrl(capture.crop_url)} alt="Capture wajah" className="aspect-square w-full rounded-md object-cover" />
                  <p className="mt-2 text-xs text-muted-foreground">Conf {formatPercent(capture.face_confidence)} · Q {capture.quality_score.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
            Pilih atau buat tiket untuk memulai capture wajah.
          </div>
        )}
      </section>
    </div>
  );
}
