import { useState } from "react";
import { Outlet } from "react-router-dom";

import TopAppBar from "./TopAppBar";
import NavigationDrawer from "./NavigationDrawer";
import Footer from "./Footer";

export default function PublicLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col overflow-x-hidden">
      <TopAppBar onMenuClick={() => setDrawerOpen(true)} />
      <NavigationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main className="flex-grow pt-16 md:pt-20">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
