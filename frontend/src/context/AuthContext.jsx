// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

// A URL base da sua API será puxada de uma variável de ambiente do Vite.
// Para desenvolvimento local, crie um arquivo .env na raiz do seu projeto frontend:
// VITE_API_BASE_URL=http://localhost:8000
// Para produção no Vercel, defina a variável de ambiente no painel do Vercel:
// VITE_API_BASE_URL=https://erptalatto-production.up.railway.app
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCarregando(false);
      return;
    }

    // Usar a variável API_BASE_URL aqui
    axios.get(`${API_BASE_URL}/auth/usuario-logado`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setUsuario(res.data))
      .catch((error) => {
        console.error("Erro ao verificar sessão do usuário:", error);
        localStorage.removeItem("token");
        navigate("/login");
      })
      .finally(() => setCarregando(false));
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ usuario, setUsuario, carregando }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
