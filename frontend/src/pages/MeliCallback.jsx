import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import { toast } from 'react-toastify';

const MeliCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const processed = useRef(false);

    useEffect(() => {
        const code = searchParams.get('code');
        
        if (code && !processed.current) {
            processed.current = true; // Evita chamada dupla em React StrictMode
            
            const verifier = localStorage.getItem('meli_verifier');

            if (!verifier) {
                toast.warn("Aviso: Verificador de autenticação não encontrado.");
            }
            
            api.post('/mercadolivre/auth', { code, code_verifier: verifier })
                .then(() => {
                    localStorage.removeItem('meli_verifier');
                    toast.success('Conectado ao Mercado Livre com sucesso!');
                    // Redireciona de volta para a lista
                    navigate('/mercadolivre_pedidos');
                })
                .catch((err) => {
                    toast.error('Falha na autenticação com Mercado Livre.');
                    navigate('/mercadolivre_pedidos');
                });
        }
    }, [searchParams, navigate]);

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-xl font-semibold text-gray-700">
                Finalizando conexão com Mercado Livre...
            </div>
        </div>
    );
};

export default MeliCallback;