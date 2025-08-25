import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { FaPlug, FaUnlink, FaCog, FaBoxOpen, FaShoppingCart, FaExternalLinkAlt, FaFileImport } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import ModalConfigAnuncioTray from '@/components/modals/tray/ModalConfigAnuncioTray';
import CampoSenha from '@/components/campos/CampoSenha';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import CampoTextsimples from '@/components/campos/CampoTextsimples'; // Importe o campo de texto

const API_URL = import.meta.env.VITE_API_BASE_URL;

// --- Componente de Paginação Reutilizável ---
// Lógica extraída da sua página do Mercado Livre para ser usada aqui.
const Paginacao = ({ paginaAtual, setPaginaAtual, totalPaginas }) => {
    if (totalPaginas <= 1) {
        return null; // Não mostra a paginação se só houver uma página
    }

    return (
        <div className="flex justify-start items-center gap-4 mt-4">
            <button
                onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))}
                disabled={paginaAtual === 1}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Anterior
            </button>
            <span>Página {paginaAtual} de {totalPaginas}</span>
            <button
                onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))}
                disabled={paginaAtual >= totalPaginas}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Próxima
            </button>
        </div>
    );
};


// --- Componente para a aba de anúncios (Atualizado com Paginação) ---
const AbaAnunciosTray = () => {
    const [anuncios, setAnuncios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [filtroTexto, setFiltroTexto] = useState("");
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const itensPorPagina = 10;

    const buscarAnuncios = async () => {
        setLoading(true);
        try {
            const params = { page: paginaAtual, limit: itensPorPagina, filtro_texto: filtroTexto || undefined };
            const { data } = await axios.get(`${API_URL}/tray/anuncios`, { params });
            setAnuncios(data.resultados);
            setTotalPaginas(Math.ceil(data.total / itensPorPagina));
        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao buscar anúncios da Tray.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { buscarAnuncios(); }, [paginaAtual]);
    const handleSearch = (e) => { e.preventDefault(); setPaginaAtual(1); buscarAnuncios(); };

    const handleOpenModal = (product) => {
        setSelectedProduct(product);
        setShowConfigModal(true);
    };

    const handleSaveAnuncio = async (formData) => {
        if (!selectedProduct) return;
        setIsSaving(true);
        const payload = {
            erp_product_id: selectedProduct.erp_product.id,
            tray_listing_id: selectedProduct.tray_listing ? selectedProduct.tray_listing.id : null,
            form_data: formData
        };
        try {
            await axios.post(`${API_URL}/tray/anuncios`, payload);
            toast.success(`Anúncio ${payload.tray_listing_id ? 'atualizado' : 'publicado'} com sucesso!`);
            setShowConfigModal(false);
            setSelectedProduct(null);
            setTimeout(() => { buscarAnuncios(); }, 1000);
        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro desconhecido ao salvar o anúncio.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <form onSubmit={handleSearch} className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <input type="text" placeholder="Buscar por SKU ou Descrição no ERP..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} className="border p-2 rounded text-sm w-full md:w-1/3" />
                <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded">Buscar</button>
            </form>
            <div className="overflow-x-auto">
                <table className="bg-white border border-gray-300 table-auto whitespace-nowrap w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border text-left">SKU ERP</th>
                            <th className="p-2 border text-left">Descrição ERP</th>
                            <th className="p-2 border text-left">Anúncio Tray</th>
                            <th className="p-2 border text-center">Status Sinc.</th>
                            <th className="p-2 border text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (<tr><td colSpan="5" className="text-center p-4">Carregando...</td></tr>)
                            : anuncios.length === 0 ? (<tr><td colSpan="5" className="text-center p-4">Nenhum produto encontrado.</td></tr>)
                                : (anuncios.map((product) => (
                                    <tr key={product.erp_product.id} className="hover:bg-gray-50">
                                        <td className="p-2 border font-mono">{product.erp_product.sku}</td>
                                        <td className="p-2 border">{product.erp_product.descricao}</td>
                                        <td className="p-2 border">
                                            {product.tray_listing ? (
                                                <a
                                                    href={product.tray_listing.admin_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline flex items-center gap-2"
                                                    title="Abrir no painel da Tray"
                                                >
                                                    {product.tray_listing.name} <FaExternalLinkAlt size={12} />
                                                </a>
                                            ) : (<span className="text-gray-400 italic">Não publicado</span>)}
                                        </td>
                                        <td className="p-2 border text-center">
                                            {product.tray_listing ? (<span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Sincronizado</span>) : (<span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">Não Sinc.</span>)}
                                        </td>
                                        <td className="p-2 border text-center">
                                            <button onClick={() => handleOpenModal(product)} title={product.tray_listing ? "Editar Anúncio" : "Publicar na Tray"} className="text-blue-500 hover:text-blue-700 mx-1"><FaCog /></button>
                                        </td>
                                    </tr>
                                )))}
                    </tbody>
                </table>
            </div>

            {/* PAGINAÇÃO ADICIONADA AQUI */}
            {!loading && (
                <Paginacao
                    paginaAtual={paginaAtual}
                    setPaginaAtual={setPaginaAtual}
                    totalPaginas={totalPaginas}
                />
            )}

            {showConfigModal && selectedProduct && (
                <ModalConfigAnuncioTray
                    product={selectedProduct}
                    onClose={() => setShowConfigModal(false)}
                    onSave={handleSaveAnuncio}
                    isSaving={isSaving}
                />
            )}
        </div>
    );
};

// --- Componente para a aba de Pedidos (Adaptado com Paginação) ---
const AbaPedidosTray = () => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [importandoId, setImportandoId] = useState(null);
    const itensPorPagina = 10;

    const buscarPedidos = async () => {
        setLoading(true);
        try {
            const params = { page: paginaAtual, limit: itensPorPagina };
            const { data } = await axios.get(`${API_URL}/tray/pedidos`, { params });
            setPedidos(data.resultados);
            setTotalPaginas(Math.ceil(data.total / itensPorPagina));
        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao buscar pedidos da Tray.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { buscarPedidos(); }, [paginaAtual]);

    const handleImportarPedido = async (pedidoId) => {
        setImportandoId(pedidoId);
        try {
            await axios.post(`${API_URL}/tray/pedidos/${pedidoId}/importar`);
            toast.success(`Pedido #${pedidoId} importado para o ERP com sucesso!`);
        } catch (error) {
            toast.error(error.response?.data?.detail || `Erro ao importar o pedido #${pedidoId}.`);
        } finally {
            setImportandoId(null);
        }
    };

    const formatarData = (dataString) => new Date(dataString).toLocaleString('pt-BR');

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="bg-white border border-gray-300 table-auto whitespace-nowrap w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border text-left">Pedido Tray</th>
                            <th className="p-2 border text-left">Data</th>
                            <th className="p-2 border text-left">Comprador</th>
                            <th className="p-2 border text-right">Total (R$)</th>
                            <th className="p-2 border text-center">Status Tray</th>
                            <th className="p-2 border text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (<tr><td colSpan="6" className="text-center p-4">Carregando pedidos...</td></tr>)
                            : pedidos.length === 0 ? (<tr><td colSpan="6" className="text-center p-4">Nenhum pedido encontrado.</td></tr>)
                                : (pedidos.map((pedido) => (
                                    <tr key={pedido.id} className="hover:bg-gray-50">
                                        <td className="p-2 border font-mono">#{pedido.id}</td>
                                        <td className="p-2 border">{formatarData(pedido.date)}</td>
                                        <td className="p-2 border">{pedido.Customer?.name || 'N/A'}</td>
                                        <td className="p-2 border text-right">{parseFloat(pedido.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                        <td className="p-2 border text-center"><span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-200 text-blue-800">{pedido.status}</span></td>
                                        <td className="p-2 border text-center">
                                            <button onClick={() => handleImportarPedido(pedido.id)} disabled={importandoId === pedido.id} title="Importar para o ERP" className="text-green-600 hover:text-green-800 disabled:text-gray-400">
                                                {importandoId === pedido.id ? 'Importando...' : <FaFileImport />}
                                            </button>
                                        </td>
                                    </tr>
                                )))}
                    </tbody>
                </table>
            </div>

            {/* PAGINAÇÃO ADICIONADA AQUI */}
            {!loading && (
                <Paginacao
                    paginaAtual={paginaAtual}
                    setPaginaAtual={setPaginaAtual}
                    totalPaginas={totalPaginas}
                />
            )}
        </div>
    );
};


// --- Componentes AbaConfiguracoesTray e IntegracaoTrayPage ---
// (O resto do arquivo permanece exatamente como você já tinha)

const AbaConfiguracoesTray = () => {
    const { usuario } = useAuth();
    const [form, setForm] = useState({
        tray_consumer_key: '',
        tray_consumer_secret: '',
        // Adiciona os novos campos ao estado inicial
        store_name: '',
        store_email: '',
        aceite_automatico_pedidos: false,
        vendedor_padrao_id: '',
        situacao_pedido_inicial: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`${API_URL}/configuracoes/tray`);
                setForm(data);
            } catch (error) {
                toast.error("Erro ao carregar as configurações da Tray.");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : value;
        setForm(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_URL}/configuracoes/tray`, form);
            toast.success("Configurações salvas com sucesso!");
        } catch (error) {
            toast.error(error.response?.data?.detail || "Falha ao salvar as configurações.");
        }
    };

    if (loading) {
        return <p className="text-center py-10">Carregando configurações...</p>;
    }

    return (
        <div>
            <form id="form-config-tray" onSubmit={handleSave} className="space-y-8">
                {/* Seção de Credenciais (continua a mesma) */}
                <div className="p-6 bg-white border rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Credenciais da Aplicação</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CampoSenha
                            label="Tray Consumer Key"
                            name="tray_consumer_key"
                            value={form.tray_consumer_key || ''}
                            onChange={handleChange}
                            obrigatorio
                        />
                        <CampoSenha
                            label="Tray Consumer Secret"
                            name="tray_consumer_secret"
                            value={form.tray_consumer_secret || ''}
                            onChange={handleChange}
                            obrigatorio
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <ButtonComPermissao
                        permissoes={["admin"]}
                        type="submit"
                        form="form-config-tray"
                        className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold"
                    >
                        Salvar Alterações
                    </ButtonComPermissao>
                </div>
            </form>
        </div>
    );
};

export default function IntegracaoTrayPage() {
    const [abaAtual, setAbaAtual] = useState("visao_geral");
    const [statusInfo, setStatusInfo] = useState({ status: 'carregando' });

    const abas = [
        { id: "visao_geral", label: "Visão Geral", icon: FaPlug },
        { id: "anuncios", label: "Anúncios", icon: FaBoxOpen },
        { id: "pedidos", label: "Pedidos", icon: FaShoppingCart },
        { id: "configuracoes", label: "Configurações", icon: FaCog },
    ];

    const fetchStatus = async () => {
        setStatusInfo({ status: 'carregando' });
        try {
            const { data } = await axios.get(`${API_URL}/tray/status`);

            // ADICIONE ESTA LINHA
            console.log("Resposta do backend para /tray/status:", data);

            setStatusInfo(data);
        } catch (error) {
            toast.error("Não foi possível verificar o status da integração com a Tray.");
            setStatusInfo({ status: 'erro_conexao', detail: error.response?.data?.detail || "Erro de rede" });
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleDisconnect = async () => {
        if (!statusInfo.store_id) return;
        if (!window.confirm(`Tem certeza que deseja desconectar a loja ${statusInfo.store_name} (${statusInfo.store_id})?`)) return;

        try {
            // Supondo que você adicionou o endpoint DELETE que sugeri anteriormente
            await axios.delete(`${API_URL}/tray/credentials/${statusInfo.store_id}`);
            toast.success("Integração desconectada com sucesso!");
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
                    <p className="text-gray-600 mb-6">Para conectar uma nova loja, instale o aplicativo do seu ERP através da loja de aplicativos da Tray.</p>
                    <p className="text-sm text-gray-500">Após a instalação, a loja aparecerá como "Conectada" aqui.</p>
                </div>
            );
            case 'conectado': return (
                <div className="text-center p-8 border-2 border-dashed rounded-lg border-green-400 bg-green-50">
                    <FaPlug className="mx-auto text-5xl text-green-500 mb-4" />
                    <h2 className="text-2xl font-semibold mb-2 text-green-800">Integração Ativa!</h2>
                    <p className="text-gray-700">Loja conectada: <strong className="font-mono">{statusInfo.store_name}</strong></p>
                    <p className="text-gray-600 text-sm mb-6">({statusInfo.store_email})</p>
                    <button onClick={handleDisconnect} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm">Desconectar</button>
                </div>
            );
            default: return (
                <div className="text-center p-8 border-2 border-dashed rounded-lg border-red-400 bg-red-50">
                    <FaUnlink className="mx-auto text-5xl text-red-500 mb-4" />
                    <h2 className="text-2xl font-semibold mb-2 text-red-800">Erro na Conexão</h2>
                    <p className="text-gray-700 mb-6">Não foi possível validar a conexão. O token pode ter sido revogado na Tray.</p>
                    <button onClick={handleDisconnect} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm">Tente Desconectar</button>
                </div>
            );
        }
    };

    const renderAbaAtual = () => {
        if (statusInfo.status !== 'conectado' && (abaAtual === 'anuncios' || abaAtual === 'pedidos')) {
            return <div className="text-center p-8 text-gray-600">Conecte uma loja na aba "Visão Geral" para acessar esta funcionalidade.</div>;
        }
        switch (abaAtual) {
            case "visao_geral": return renderAbaVisaoGeral();
            case "anuncios": return <AbaAnunciosTray />;
            case "pedidos": return <AbaPedidosTray />;
            case "configuracoes": return <AbaConfiguracoesTray />;
            default: return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 pb-28">
            <h1 className="text-3xl font-bold mb-6">Gestão Tray E-commerce</h1>
            <div className="flex gap-1 border-b mb-6 overflow-x-auto whitespace-nowrap">
                {abas.map((aba) => (
                    <button key={aba.id} onClick={() => setAbaAtual(aba.id)} className={`px-4 py-2 font-medium rounded-t-md transition-all duration-200 flex items-center gap-2 ${abaAtual === aba.id ? "bg-teal-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        <aba.icon /> {aba.label}
                    </button>
                ))}
            </div>
            <div>{renderAbaAtual()}</div>
        </div>
    );
}