import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CrearTurnoPage from "./pages/CrearTurnoPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import PublicLayout from "./components/layout/PublicLayout";
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import { ThemeProvider } from "./lib/ThemeContext";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <ThemeProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/crear-turno" element={<CrearTurnoPage />} />
            <Route path="/dashboard/client" element={<DashboardPage />} />
            <Route path="/dashboard/client/perfil" element={<ProfilePage />} />
            <Route path="/dashboard/employee" element={<DashboardPage />} />
            <Route path="/dashboard/admin" element={<DashboardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;