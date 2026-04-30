import { NavLink, Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Bus, Camera, LayoutDashboard, Menu, Radar, ShieldAlert, Ticket, Users, X } from "lucide-react";
import { useState } from "react";
import { useRealtime } from "@/hooks/useRealtime";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cashier", label: "Kasir Tiket", icon: Camera },
  { to: "/monitoring", label: "Monitoring Bus", icon: Radar },
  { to: "/alerts", label: "Alert", icon: ShieldAlert },
  { to: "/passengers", label: "Penumpang", icon: Users },
  { to: "/fleet", label: "Armada", icon: Bus },
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const realtime = useRealtime(queryClient);
  const realtimeActive = realtime.state === "connected";

  return (
    <div className="min-h-screen bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold">SPPG</p>
              <p className="text-xs text-white/55">Face Recognition</p>
            </div>
          </div>
          <button className="rounded-md p-2 hover:bg-white/10 lg:hidden" type="button" onClick={() => setOpen(false)} aria-label="Tutup menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                  isActive ? "bg-primary text-primary-foreground" : "text-white/75 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur md:px-6">
          <button className="rounded-md border p-2 lg:hidden" type="button" onClick={() => setOpen(true)} aria-label="Buka menu">
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Operasional Tiket & Bus</p>
            <p className="text-sm font-semibold">Sistem Pendeteksi Penumpang Gelap</p>
          </div>
          <div className="hidden items-center gap-2 rounded-md border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground sm:flex">
            <Activity className={`h-4 w-4 ${realtimeActive ? "text-success" : "text-warning"}`} />
            {realtimeActive ? "Realtime aktif" : "Menghubungkan realtime"}
          </div>
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
