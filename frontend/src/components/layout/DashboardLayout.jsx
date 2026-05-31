import { useState } from "react";
import { Outlet } from "react-router-dom";

import DashboardTopAppBar from "./DashboardTopAppBar";
import DashboardSidebar from "./DashboardSidebar";
import BottomNav from "./BottomNav";

const MOCK_USER = { name: "Martín", avatarUrl: null, role: "client" };

function readStoredUser() {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function DashboardLayout() {
  const [stored, setStored] = useState(readStoredUser);

  const updateUser = (patch) => {
    setStored((prev) => {
      const next = { ...(prev ?? {}), ...patch };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  };

  const user = stored
    ? { ...stored, name: stored.first_name }
    : MOCK_USER;

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col overflow-x-hidden">
      <DashboardSidebar user={user} />
      <DashboardTopAppBar user={user} />

      <main className="grow pt-16 pb-22 md:pb-lg md:pl-72">
        <Outlet context={{ user, updateUser }} />
      </main>

      <BottomNav user={user} />
    </div>
  );
}
