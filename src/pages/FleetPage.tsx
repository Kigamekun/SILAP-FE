import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bus, Camera, Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export function FleetPage() {
  const queryClient = useQueryClient();
  const [busForm, setBusForm] = useState({ name: "", plate_number: "", route_name: "" });
  const [cameraForm, setCameraForm] = useState({ bus_id: "", name: "", location: "Kabin", stream_url: "" });
  const [error, setError] = useState<string | null>(null);
  const busesQuery = useQuery({ queryKey: ["buses"], queryFn: api.buses });

  const createBus = useMutation({
    mutationFn: api.createBus,
    onSuccess: async () => {
      setError(null);
      setBusForm({ name: "", plate_number: "", route_name: "" });
      await queryClient.invalidateQueries({ queryKey: ["buses"] });
      await queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: (err) => setError(err.message),
  });

  const createCamera = useMutation({
    mutationFn: () =>
      api.createCamera(Number(cameraForm.bus_id), {
        name: cameraForm.name,
        location: cameraForm.location,
        stream_url: cameraForm.stream_url || null,
      }),
    onSuccess: async () => {
      setError(null);
      setCameraForm({ ...cameraForm, name: "", stream_url: "" });
      await queryClient.invalidateQueries({ queryKey: ["buses"] });
      await queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: (err) => setError(err.message),
  });

  function submitBus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createBus.mutate(busForm);
  }

  function submitCamera(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCamera.mutate();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <section className="space-y-6">
        <div className="panel p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bus className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Tambah Bus</h1>
          </div>
          <form className="space-y-4" onSubmit={submitBus}>
            <div>
              <label className="label" htmlFor="bus_name">Nama bus</label>
              <input id="bus_name" className="input mt-1" value={busForm.name} onChange={(event) => setBusForm({ ...busForm, name: event.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="plate_number">Nomor polisi</label>
              <input id="plate_number" className="input mt-1" value={busForm.plate_number} onChange={(event) => setBusForm({ ...busForm, plate_number: event.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="bus_route">Rute</label>
              <input id="bus_route" className="input mt-1" value={busForm.route_name} onChange={(event) => setBusForm({ ...busForm, route_name: event.target.value })} required />
            </div>
            <button className="btn-primary w-full" type="submit" disabled={createBus.isPending}>
              <Plus className="h-4 w-4" />
              Simpan bus
            </button>
          </form>
        </div>

        <div className="panel p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Tambah Kamera</h2>
          </div>
          {error ? <div className="mb-4 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div> : null}
          <form className="space-y-4" onSubmit={submitCamera}>
            <div>
              <label className="label" htmlFor="camera_bus">Bus</label>
              <select id="camera_bus" className="input mt-1" value={cameraForm.bus_id} onChange={(event) => setCameraForm({ ...cameraForm, bus_id: event.target.value })} required>
                <option value="">Pilih bus</option>
                {(busesQuery.data ?? []).map((bus) => (
                  <option key={bus.id} value={bus.id}>{bus.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="camera_name">Nama kamera</label>
              <input id="camera_name" className="input mt-1" value={cameraForm.name} onChange={(event) => setCameraForm({ ...cameraForm, name: event.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="camera_location">Lokasi</label>
              <input id="camera_location" className="input mt-1" value={cameraForm.location} onChange={(event) => setCameraForm({ ...cameraForm, location: event.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="stream_url">Stream URL</label>
              <input id="stream_url" className="input mt-1" value={cameraForm.stream_url} onChange={(event) => setCameraForm({ ...cameraForm, stream_url: event.target.value })} />
            </div>
            <button className="btn-primary w-full" type="submit" disabled={createCamera.isPending}>
              <Plus className="h-4 w-4" />
              Simpan kamera
            </button>
          </form>
        </div>
      </section>

      <section className="panel p-4 md:p-5">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Armada & Kamera</h1>
          <p className="mt-1 text-sm text-muted-foreground">Satu bus dapat memiliki banyak kamera untuk dashboard petugas.</p>
        </div>
        <div className="space-y-4">
          {(busesQuery.data ?? []).map((bus) => (
            <div key={bus.id} className="rounded-lg border p-4">
              <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                <div>
                  <p className="font-bold">{bus.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{bus.plate_number} · {bus.route_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={bus.status} />
                  <span className="rounded-full bg-danger/10 px-2 py-1 text-xs font-bold text-danger">{bus.open_alerts} alert</span>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {bus.cameras.map((camera) => (
                  <div key={camera.id} className="rounded-lg bg-muted p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{camera.name}</p>
                      <StatusBadge status={camera.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{camera.location} · Last seen {formatDateTime(camera.last_seen_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
