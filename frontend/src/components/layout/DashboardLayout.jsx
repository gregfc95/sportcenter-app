import { Outlet } from "react-router-dom";

import DashboardTopAppBar from "./DashboardTopAppBar";
import DashboardSidebar from "./DashboardSidebar";
import BottomNav from "./BottomNav";

const MOCK_USER = { name: "Martín", avatarUrl: null, role: "client" };

export default function DashboardLayout() {
  const stored = localStorage.getItem("user");
  const parsed = stored ? JSON.parse(stored) : null;
  const user = parsed
    ? { ...parsed, name: parsed.first_name }
    : MOCK_USER;

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col overflow-x-hidden">
      <DashboardSidebar />
      <DashboardTopAppBar user={user} />

      <main className="grow pt-16 pb-22 md:pb-lg md:pl-72">
        <Outlet context={{ user }} />
      </main>

      <BottomNav />
    </div>
  );
}
