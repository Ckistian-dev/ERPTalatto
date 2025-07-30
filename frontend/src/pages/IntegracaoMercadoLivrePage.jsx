import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";

import {
    FaPlug, FaUnlink, FaCog, FaBoxOpen, FaShoppingCart,
    FaQuestionCircle, FaExternalLinkAlt, FaFileImport
} from 'react-icons/fa';

// Importa o modal de configuração de anúncio que criamos
import ModalConfigAnuncio from '@/components/modals/mercadolivre/ModalConfigAnuncio';

const API_URL = import.meta.env.VITE_API_BASE_URL;

// --- Componente para a aba de anúncios ---
const AbaAnuncios = () => {
    const [anuncios, setAnuncios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [filtroTexto, setFiltroTexto] = useState("");
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const itensPorPagina = 15;

    const buscarAnuncios = async () => {
        setLoading(true);
        try {
            const params = {
                page: paginaAtual,
                limit: itensPorPagina,
                filtro_texto: filtroTexto || undefined,
            };
            const { data } = await axios.get(`${API_URL}/mercadolivre/anuncios`, { params });
            setAnuncios(data.resultados);
            setTotalPaginas(Math.ceil(data.total / itensPorPagina));
        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao buscar anúncios.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        buscarAnuncios();
    }, [paginaAtual]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPaginaAtual(1);
        buscarAnuncios();
    };

    const handleOpenModal = (product) => {
        setSelectedProduct(product);
        setShowConfigModal(true);
    };

    const handleSaveAnuncio = async (formData) => {
        if (!selectedProduct) return;
        setIsSaving(true);
        const payload = {
            erp_product_id: selectedProduct.erp_product.id,
            ml_listing_id: selectedProduct.ml_listing ? selectedProduct.ml_listing.id : null,
            form_data: formData
        };
        try {
            await axios.post(`${API_URL}/mercadolivre/anuncios`, payload);
            toast.success(`Anúncio ${payload.ml_listing_id ? 'atualizado' : 'publicado'} com sucesso!`);
            setShowConfigModal(false);
            setSelectedProduct(null);
            setTimeout(() => { buscarAnuncios(); }, 2000);
        } catch (error) {
            const errorMsg = error.response?.data?.detail || "Erro desconhecido ao salvar o anúncio.";
            toast.error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <form onSubmit={handleSearch} className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <input type="text" placeholder="Buscar por SKU ou Descrição no ERP..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} className="border p-2 rounded text-sm w-full md:w-1/3" />
                <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded flex items-center gap-2">Buscar</button>
            </form>
            <div className="overflow-x-auto">
                <table className="bg-white border border-gray-300 table-auto whitespace-nowrap w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border text-left">SKU ERP</th>
                            <th className="p-2 border text-left">Descrição ERP</th>
                            <th className="p-2 border text-left">Anúncio Mercado Livre</th>
                            <th className="p-2 border text-center">Status Sinc.</th>
                            <th className="p-2 border text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (<tr><td colSpan="5" className="text-center p-4">Carregando...</td></tr>
                        ) : anuncios.length === 0 ? (<tr><td colSpan="5" className="text-center p-4">Nenhum produto encontrado.</td></tr>
                        ) : (
                            anuncios.map(({ erp_product, ml_listing }) => (
                                <tr key={erp_product.id} className="hover:bg-gray-50">
                                    <td className="p-2 border font-mono">{erp_product.sku}</td>
                                    <td className="p-2 border">{erp_product.descricao}</td>
                                    <td className="p-2 border">
                                        {ml_listing ? (<a href={ml_listing.permalink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-2">{ml_listing.title} <FaExternalLinkAlt size={12} /></a>) : (<span className="text-gray-400 italic">Não publicado</span>)}
                                    </td>
                                    <td className="p-2 border text-center">
                                        {ml_listing ? (<span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Sincronizado</span>) : (<span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">Não Sinc.</span>)}
                                    </td>
                                    <td className="p-2 border text-center">
                                        <button onClick={() => handleOpenModal({ erp_product, ml_listing })} title={ml_listing ? "Editar Anúncio" : "Publicar no ML"} className="text-blue-500 hover:text-blue-700 mx-1"><FaCog /></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {!loading && totalPaginas > 1 && (
                <div className="flex justify-start items-start gap-4 mt-4">
                    <button onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))} disabled={paginaAtual === 1} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Anterior</button>
                    <span>Página {paginaAtual} de {totalPaginas}</span>
                    <button onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))} disabled={paginaAtual >= totalPaginas} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Próxima</button>
                </div>
            )}
            {showConfigModal && selectedProduct && (<ModalConfigAnuncio product={selectedProduct} onClose={() => setShowConfigModal(false)} onSave={handleSaveAnuncio} isSaving={isSaving} />)}
        </div>
    );
};

// --- Componente para a aba de Pedidos ---
const AbaPedidos = () => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [aceiteAutomatico, setAceiteAutomatico] = useState(false);
    const [pedidosImportados, setPedidosImportados] = useState(new Set());
    const [importandoId, setImportandoId] = useState(null);
    const itensPorPagina = 15;

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/configuracoes/mercadolivre`);
                setAceiteAutomatico(data.aceite_automatico_pedidos);
            } catch (error) {
                toast.error("Erro ao carregar as configurações de aceite automático.");
            }
        };
        fetchConfig();
    }, []);

    const buscarPedidos = async () => {
        setLoading(true);
        try {
            const params = { page: paginaAtual, limit: itensPorPagina };
            const { data } = await axios.get(`${API_URL}/mercadolivre/pedidos`, { params });
            setPedidos(data.resultados);
            setTotalPaginas(Math.ceil(data.total / itensPorPagina));
            return data.resultados;
        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao buscar pedidos.");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const handleImportarPedido = async (pedidoId) => {
        if (pedidosImportados.has(pedidoId)) {
            toast.info("Este pedido já foi importado.");
            return;
        }
        setImportandoId(pedidoId);
        try {
            await axios.post(`${API_URL}/mercadolivre/pedidos/${pedidoId}/importar`);
            toast.success(`Pedido #${pedidoId} importado para o ERP com sucesso!`);
            setPedidosImportados(prev => new Set(prev).add(pedidoId));
        } catch (error) {
            toast.error(error.response?.data?.detail || `Erro ao importar o pedido #${pedidoId}.`);
        } finally {
            setImportandoId(null);
        }
    };

    useEffect(() => {
        buscarPedidos().then(novosPedidos => {
            if (aceiteAutomatico && novosPedidos.length > 0) {
                toast.info("Aceite automático ativado. Verificando novos pedidos...");
                novosPedidos.forEach(pedido => {
                    if (pedido.status === 'paid' && !pedidosImportados.has(pedido.id)) {
                        handleImportarPedido(pedido.id);
                    }
                });
            }
        });
    }, [paginaAtual]);

    useEffect(() => {
        if (aceiteAutomatico && pedidos.length > 0) {
            pedidos.forEach(pedido => {
                if (pedido.status === 'paid' && !pedidosImportados.has(pedido.id)) {
                    handleImportarPedido(pedido.id);
                }
            });
        }
    }, [aceiteAutomatico, pedidos]);

    const handleToggleAceiteAutomatico = async () => {
        const novoValor = !aceiteAutomatico;
        setAceiteAutomatico(novoValor);
        try {
            await axios.put(`${API_URL}/configuracoes/mercadolivre`, { aceite_automatico_pedidos: novoValor });
            toast.success(`Aceite automático ${novoValor ? 'ativado' : 'desativado'}!`);
        } catch (error) {
            setAceiteAutomatico(!novoValor);
            toast.error("Falha ao salvar a configuração.");
        }
    };

    const formatarData = (dataString) => {
        if (!dataString) return '-';
        return new Date(dataString).toLocaleString('pt-BR');
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Pedidos de venda recebidos do Mercado Livre.</p>
                <div className="flex items-center gap-2">
                    <label htmlFor="aceite-automatico" className="font-medium text-gray-700">Aceite Automático</label>
                    <button id="aceite-automatico" onClick={handleToggleAceiteAutomatico} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${aceiteAutomatico ? 'bg-teal-600' : 'bg-gray-300'}`}>
                        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${aceiteAutomatico ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="bg-white border border-gray-300 table-auto whitespace-nowrap w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border text-left">Pedido ML</th>
                            <th className="p-2 border text-left">Data</th>
                            <th className="p-2 border text-left">Comprador</th>
                            <th className="p-2 border text-right">Total (R$)</th>
                            <th className="p-2 border text-center">Status ML</th>
                            <th className="p-2 border text-center">Status ERP</th>
                            <th className="p-2 border text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (<tr><td colSpan="7" className="text-center p-4">Carregando pedidos...</td></tr>
                        ) : pedidos.length === 0 ? (<tr><td colSpan="7" className="text-center p-4">Nenhum pedido encontrado.</td></tr>
                        ) : (
                            pedidos.map((pedido) => (
                                <tr key={pedido.id} className={`hover:bg-gray-50 ${pedidosImportados.has(pedido.id) ? 'bg-green-50' : ''}`}>
                                    <td className="p-2 border font-mono"><a href={`https://www.mercadolivre.com.br/vendas/${pedido.id}/detalhe`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">#{pedido.id} <FaExternalLinkAlt size={10} /></a></td>
                                    <td className="p-2 border">{formatarData(pedido.date_created)}</td>
                                    <td className="p-2 border">{pedido.buyer.nickname}</td>
                                    <td className="p-2 border text-right">{pedido.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="p-2 border text-center"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${pedido.status === 'paid' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>{pedido.status}</span></td>
                                    <td className="p-2 border text-center">{pedidosImportados.has(pedido.id) ? (<span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Importado</span>) : (<span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">Não Importado</span>)}</td>
                                    <td className="p-2 border text-center">
                                        <button onClick={() => handleImportarPedido(pedido.id)} disabled={pedidosImportados.has(pedido.id) || importandoId === pedido.id} title="Importar para o ERP" className="text-green-600 hover:text-green-800 disabled:text-gray-400 disabled:cursor-not-allowed mx-1">
                                            {importandoId === pedido.id ? (<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>) : (<FaFileImport />)}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {!loading && totalPaginas > 1 && (
                <div className="flex justify-start items-start gap-4 mt-4">
                    <button onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))} disabled={paginaAtual === 1} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Anterior</button>
                    <span>Página {paginaAtual} de {totalPaginas}</span>
                    <button onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))} disabled={paginaAtual >= totalPaginas} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Próxima</button>
                </div>
            )}
        </div>
    );
};

// --- Componente Principal da Página ---
export default function IntegracaoMercadoLivrePage() {
    const [abaAtual, setAbaAtual] = useState("visao_geral");
    const [statusInfo, setStatusInfo] = useState({ status: 'carregando', nickname: '', email: '' });

    const abas = [{ id: "visao_geral", label: "Visão Geral", icon: FaPlug }, { id: "anuncios", label: "Anúncios", icon: FaBoxOpen }, { id: "pedidos", label: "Pedidos", icon: FaShoppingCart }, { id: "perguntas", label: "Perguntas", icon: FaQuestionCircle }, { id: "configuracoes", label: "Configurações", icon: FaCog },];

    const fetchStatus = async () => {
        setStatusInfo({ status: 'carregando' });
        try {
            const { data } = await axios.get(`${API_URL}/mercadolivre/status`);
            setStatusInfo(data);
        } catch (error) {
            toast.error("Não foi possível verificar o status da integração.");
            setStatusInfo({ status: 'erro_conexao', detail: error.response?.data?.detail || "Erro de rede" });
        }
    };

    useEffect(() => {
        if (abaAtual === 'visao_geral') {
            fetchStatus();
        }
    }, [abaAtual]);

    const handleConnect = () => { window.location.href = `${API_URL}/mercadolivre/auth`; };

    // ===================================================================
    // NOVA FUNÇÃO PARA DESCONECTAR
    // ===================================================================
    const handleDisconnect = async () => {
        // Usamos um 'confirm' simples para uma ação destrutiva
        if (!window.confirm("Tem certeza que deseja desconectar a integração com o Mercado Livre? A autorização será removida.")) {
            return;
        }

        try {
            // Chama o novo endpoint DELETE no backend
            await axios.delete(`${API_URL}/mercadolivre/credentials`);
            toast.success("Integração desconectada com sucesso!");

            // Atualiza o estado da UI para refletir a mudança imediatamente
            setStatusInfo({ status: 'desconectado' });
        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao desconectar a integração.");
        }
    };

    const renderAbaVisaoGeral = () => {
        switch (statusInfo.status) {
            case 'carregando': return <p className="text-center py-10">Verificando status da conexão...</p>;
            case 'desconectado': return (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                    <FaUnlink className="mx-auto text-5xl text-gray-400 mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">Integração Desconectada</h2>
                    <p className="text-gray-600 mb-6">Conecte seu ERP à sua conta do Mercado Livre para começar a sincronizar.</p>
                    <button onClick={handleConnect} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold">Conectar ao Mercado Livre</button>
                </div>
            );
            case 'conectado': return (
                <div className="text-center p-8 border-2 border-dashed rounded-lg border-green-400 bg-green-50">
                    <FaPlug className="mx-auto text-5xl text-green-500 mb-4" />
                    <h2 className="text-2xl font-semibold mb-2 text-green-800">Integração Ativa!</h2>
                    <p className="text-gray-700">Conectado como: <strong className="font-mono">{statusInfo.nickname}</strong></p>
                    <p className="text-gray-600 text-sm mb-6">({statusInfo.email})</p>
                    {/* Botão de Desconectar agora chama a nova função */}
                    <button 
                        onClick={handleDisconnect} 
                        className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm"
                    >
                        Desconectar
                    </button>
                </div>
            );
            default: return (
                <div className="text-center p-8 border-2 border-dashed rounded-lg border-red-400 bg-red-50">
                    <FaUnlink className="mx-auto text-5xl text-red-500 mb-4" />
                    <h2 className="text-2xl font-semibold mb-2 text-red-800">Erro na Conexão</h2>
                    <p className="text-gray-700 mb-6">Não foi possível validar a conexão. O token pode ter sido revogado.</p>
                    <p className="font-mono bg-red-100 text-red-800 p-2 rounded text-sm mb-6">{JSON.stringify(statusInfo.detail)}</p>
                    <button onClick={handleConnect} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold">Tentar Conectar Novamente</button>
                </div>
            );
        }
    };
    
    const renderAbaAtual = () => {
        switch (abaAtual) {
            case "visao_geral": return renderAbaVisaoGeral();
            case "anuncios": return <AbaAnuncios />; 
            case "pedidos": return <AbaPedidos />;
            case "perguntas": return <div className="p-4">Conteúdo da aba Perguntas virá aqui...</div>;
            case "configuracoes": return <div className="p-4">Conteúdo da aba Configurações virá aqui...</div>;
            default: return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 pb-28">
            <h1 className="text-3xl font-bold mb-6">Gerenciamento Mercado Livre</h1>
            <div className="flex gap-1 border-b mb-6 overflow-x-auto whitespace-nowrap">
                {abas.map((aba) => (
                    <button key={aba.id} onClick={() => setAbaAtual(aba.id)} className={`px-4 py-2 font-medium rounded-t-md transition-all duration-200 flex items-center gap-2 ${abaAtual === aba.id ? "bg-teal-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`} >
                       <aba.icon /> {aba.label}
                    </button>
                ))}
            </div>
            <div>{renderAbaAtual()}</div>
        </div>
    );
    
    return (
        <div className="max-w-7xl mx-auto p-6 pb-28">
            <h1 className="text-3xl font-bold mb-6">Gerenciamento Mercado Livre</h1>
            <div className="flex gap-1 border-b mb-6 overflow-x-auto whitespace-nowrap">
                {abas.map((aba) => (
                    <button key={aba.id} onClick={() => setAbaAtual(aba.id)} className={`px-4 py-2 font-medium rounded-t-md transition-all duration-200 flex items-center gap-2 ${abaAtual === aba.id ? "bg-teal-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`} >
                        <aba.icon /> {aba.label}
                    </button>
                ))}
            </div>
            <div>{renderAbaAtual()}</div>
        </div>
    );
}
