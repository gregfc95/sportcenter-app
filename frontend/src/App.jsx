import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CrearTurnoPage from "./pages/CrearTurnoPage";
 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/crear-turno" element={<CrearTurnoPage />} />

        <Route path="/" element={<Navigate to="/crear-turno" replace />} />


      </Routes>
    </BrowserRouter>
  );
}

export default App;