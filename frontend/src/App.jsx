import LandingPage from "./pages/LandingPage";
import { useDarkMode } from "./lib/useDarkMode";

function App() {
  const { isDark, toggle } = useDarkMode();
  return <LandingPage isDark={isDark} onToggleTheme={toggle} />;
}

export default App;
