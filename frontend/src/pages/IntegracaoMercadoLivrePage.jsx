import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";

// Importe ícones se desejar, como nos seus outros componentes
import { FaPlug, FaUnlink, FaCog, FaBoxOpen, FaShoppingCart, FaQuestionCircle } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function IntegracaoMercadoLivrePage() {
    const [abaAtual, setAbaAtual] = useState("visao_geral");
    const [statusInfo, setStatusInfo] = useState({ status: 'carregando', nickname: '', email: '' });

    // Abas para a navegação da página de integração
    const abas = [
        { id: "visao_geral", label: "Visão Geral", icon: FaPlug },
        { id: "anuncios", label: "Anúncios", icon: FaBoxOpen },
        { id: "pedidos", label: "Pedidos", icon: FaShoppingCart },
        { id: "perguntas", label: "Perguntas", icon: FaQuestionCircle },
        { id: "configuracoes", label: "Configurações", icon: FaCog },
    ];

    // Efeito para buscar o status da conexão quando a página carrega
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/mercadolivre/status`);
                setStatusInfo(data);
            } catch (error) {
                toast.error("Não foi possível verificar o status da integração.");
                setStatusInfo({ status: 'erro_conexao', detail: error.response?.data?.detail || "Erro de rede" });
            }
        };
        fetchStatus();
    }, []);

    // Função para iniciar a conexão (redireciona para o backend)
    const handleConnect = () => {
        // A URL completa é necessária para o redirecionamento funcionar
        const authUrl = `${API_URL}/mercadolivre/auth`;
        window.location.href = authUrl;
    };

    // Conteúdo da aba "Visão Geral"
    const renderAbaVisaoGeral = () => {
        switch (statusInfo.status) {
            case 'carregando':
                return <p className="text-center py-10">Verificando status da conexão...</p>;

            case 'desconectado':
                return (
                    <div className="text-center p-8 border-2 border-dashed rounded-lg">
                        <FaUnlink className="mx-auto text-5xl text-gray-400 mb-4" />
                        <h2 className="text-2xl font-semibold mb-2">Integração Desconectada</h2>
                        <p className="text-gray-600 mb-6">Conecte seu ERP à sua conta do Mercado Livre para começar a sincronizar produtos, pedidos e muito mais.</p>
                        <button
                            onClick={handleConnect}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                        >
                            Conectar ao Mercado Livre
                        </button>
                    </div>
                );
            
            case 'conectado':
                return (
                     <div className="text-center p-8 border-2 border-dashed rounded-lg border-green-400 bg-green-50">
                        <FaPlug className="mx-auto text-5xl text-green-500 mb-4" />
                        <h2 className="text-2xl font-semibold mb-2 text-green-800">Integração Ativa!</h2>
                        <p className="text-gray-700">
                            Conectado como: <strong className="font-mono">{statusInfo.nickname}</strong>
                        </p>
                         <p className="text-gray-600 text-sm mb-6">
                            ({statusInfo.email})
                        </p>
                        {/* No futuro, o botão de desconectar virá aqui */}
                        <button className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all text-sm">
                            Desconectar
                        </button>
                    </div>
                );

            default:
                 return (
                    <div className="text-center p-8 border-2 border-dashed rounded-lg border-red-400 bg-red-50">
                        <FaUnlink className="mx-auto text-5xl text-red-500 mb-4" />
                        <h2 className="text-2xl font-semibold mb-2 text-red-800">Erro na Conexão</h2>
                        <p className="text-gray-700 mb-6">
                            Não foi possível validar a conexão com o Mercado Livre. O token pode ter sido revogado.
                        </p>
                        <p className="font-mono bg-red-100 text-red-800 p-2 rounded text-sm mb-6">{JSON.stringify(statusInfo.detail)}</p>
                        <button
                            onClick={handleConnect}
                            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                        >
                            Tentar Conectar Novamente
                        </button>
                    </div>
                );
        }
    };
    
    // Função principal que renderiza a aba correta
    const renderAbaAtual = () => {
        switch (abaAtual) {
            case "visao_geral":
                return renderAbaVisaoGeral();
            case "anuncios":
                return <div className="p-4">Conteúdo da aba Anúncios virá aqui...</div>;
            case "pedidos":
                return <div className="p-4">Conteúdo da aba Pedidos virá aqui...</div>;
            case "perguntas":
                return <div className="p-4">Conteúdo da aba Perguntas virá aqui...</div>;
            case "configuracoes":
                return <div className="p-4">Conteúdo da aba Configurações virá aqui...</div>;
            default:
                return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 pb-28">
            <h1 className="text-3xl font-bold mb-6">
                Gerenciamento Mercado Livre
            </h1>
            <div className="flex gap-1 border-b mb-6 overflow-x-auto whitespace-nowrap">
                {abas.map((aba) => (
                    <button
                        key={aba.id}
                        onClick={() => setAbaAtual(aba.id)}
                        className={`px-4 py-2 font-medium rounded-t-md transition-all duration-200 flex items-center gap-2 ${abaAtual === aba.id ? "bg-teal-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                        <aba.icon /> {aba.label}
                    </button>
                ))}
            </div>
            
            <div>
                {renderAbaAtual()}
            </div>
        </div>
    );
}
