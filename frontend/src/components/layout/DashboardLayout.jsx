import { Outlet } from "react-router-dom";

import DashboardTopAppBar from "./DashboardTopAppBar";
import BottomNav from "./BottomNav";

const MOCK_USER = { name: "Martín", avatarUrl: null };

export default function DashboardLayout() {
  const user = MOCK_USER;

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col overflow-x-hidden">
      <DashboardTopAppBar user={user} />

      <main className="grow pt-16 pb-22">
        <Outlet context={{ user }} />
      </main>

      <BottomNav />
    </div>
  );
}
