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
            .then(res => {
                setUsuario(res.data);
                localStorage.setItem('nome', res.data.nome); // ⬅️ SALVA O NOME AO RECARREGAR
            })
            .catch(() => {
                localStorage.removeItem("token");
                localStorage.removeItem("nome"); // ⬅️ REMOVE O NOME SE O TOKEN FOR INVÁLIDO
                delete axios.defaults.headers.common['Authorization'];
                setUsuario(null);
            })
            .finally(() => setCarregando(false));
    }, []);

    const login = async (email, senha) => {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, senha });
        const { access_token, ...dadosUsuario } = response.data;

        localStorage.setItem('token', access_token);
        localStorage.setItem('nome', dadosUsuario.nome); // ⬅️ SALVA O NOME NO LOCALSTORAGE
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        setUsuario(dadosUsuario);
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("nome"); // ⬅️ REMOVE O NOME DO LOCALSTORAGE
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