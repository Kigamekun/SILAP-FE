import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { AlertPage } from "@/pages/AlertPage";
import { CashierPage } from "@/pages/CashierPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { FleetPage } from "@/pages/FleetPage";
import { MonitoringPage } from "@/pages/MonitoringPage";
import { PassengersPage } from "@/pages/PassengersPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/cashier" element={<CashierPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/alerts" element={<AlertPage />} />
        <Route path="/passengers" element={<PassengersPage />} />
        <Route path="/fleet" element={<FleetPage />} />
      </Route>
    </Routes>
  );
}
