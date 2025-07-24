// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setCarregando(false);
            return;
        }

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        axios.get(`${API_BASE_URL}/auth/usuario-logado`)
            .then(res => setUsuario(res.data))
            .catch(() => {
                localStorage.removeItem("token");
                delete axios.defaults.headers.common['Authorization'];
                setUsuario(null);
            })
            .finally(() => setCarregando(false));
    }, []);

    // ✅ FUNÇÃO DE LOGIN ADICIONADA
    const login = async (email, senha) => {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, senha });
        const { access_token, ...dadosUsuario } = response.data;

        localStorage.setItem('token', access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        setUsuario(dadosUsuario); // ATUALIZA O ESTADO DO CONTEXTO
    };

    // ✅ FUNÇÃO DE LOGOUT ADICIONADA
    const logout = () => {
        localStorage.removeItem("token");
        delete axios.defaults.headers.common['Authorization'];
        setUsuario(null);
    };

    const value = { usuario, carregando, login, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);