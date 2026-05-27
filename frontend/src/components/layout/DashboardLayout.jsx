import { Outlet } from "react-router-dom";
import DashboardTopAppBar from "./DashboardTopAppBar";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";

const MOCK_USER = { name: "Martín", avatarUrl: null, role: "client" };

export default function DashboardLayout() {
  const stored = localStorage.getItem("user");
  const parsed = stored ? JSON.parse(stored) : null;
  const user = parsed
    ? { ...parsed, name: parsed.first_name }
    : MOCK_USER;

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col overflow-x-hidden">
      <DashboardTopAppBar user={user} />
      <div className="flex flex-1 pt-16">
        <Sidebar user={user} />
        <main className="flex-1 md:ml-52 pb-22 md:pb-6">
          <Outlet context={{ user }} />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}