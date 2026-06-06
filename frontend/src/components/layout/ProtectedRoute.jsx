import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const stored = localStorage.getItem("user");
  if (!stored) {
    return <Navigate to="/login" replace />;
  }
  return children;
}