// src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function PrivateRoute({ children }) {
  const { usuario, carregando } = useAuth();

  if (carregando) return null; // ou um loader/spinner
  if (!usuario) return <Navigate to="/login" />;
  return children;
}
