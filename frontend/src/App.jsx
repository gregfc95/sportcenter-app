import { BrowserRouter, Routes, Route } from "react-router-dom";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import { useDarkMode } from "./lib/useDarkMode";

function App() {
  const { isDark, toggle } = useDarkMode();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage isDark={isDark} onToggleTheme={toggle} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;