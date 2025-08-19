import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { FaPlug, FaUnlink, FaCog, FaCalculator, FaTruck, FaMapMarkerAlt, FaSave, FaBoxOpen, FaShippingFast, FaEye, FaTimes } from 'react-icons/fa';

import CampoImportarOrcamento from "@/components/campos/CampoImportarOrcamento";
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import CampoTextsimples from "@/components/campos/CampoTextsimples";

const API_URL = import.meta.env.VITE_API_BASE_URL;

// --- MODAL DE DETALHES DO PEDIDO ---
const ModalDetalhesPedido = ({ isOpen, onClose, pedidoData }) => {
    if (!isOpen || !pedidoData) return null;

    const { content: pedido } = pedidoData;
    const history = pedido.shipment_order_volume_state_history || [];

    const formatarData = (dataString) => new Date(dataString).toLocaleString('pt-BR');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Detalhes do Envio #{pedido.order_number}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><FaTimes size={20} /></button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border rounded-lg bg-gray-50">
                            <h3 className="font-bold text-lg mb-2">Status Atual</h3>
                            <p className="text-2xl font-semibold text-teal-600">{pedido.status_description}</p>
                            <p className="text-sm text-gray-500">Última atualização: {formatarData(pedido.updated)}</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-gray-50">
                            <h3 className="font-bold text-lg mb-2">Rastreamento</h3>
                            <p><strong>Código:</strong> {pedido.tracking_code || 'Aguardando'}</p>
                            {pedido.tracking_url && <a href={pedido.tracking_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Link de Rastreio</a>}
                        </div>
                    </div>
                    <div className="mt-6">
                        <h3 className="font-bold text-lg mb-2">Histórico de Status</h3>
                        <ul className="border rounded-lg p-2 bg-gray-50">
                            {history.map(evento => (
                                <li key={evento.id} className="p-2 border-b">
                                    <p><strong>{evento.shipment_order_volume_state_localized}</strong></p>
                                    <p className="text-sm text-gray-600">{formatarData(evento.created_iso)} - {evento.provider_message}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- ABA DE DESPACHO ---
const AbaDespacho = () => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [despachandoId, setDespachandoId] = useState(null);
    const [modalAberto, setModalAberto] = useState(false);
    const [pedidoSelecionado, setPedidoSelecionado] = useState(null);

    const itensPorPagina = 15;

    const buscarPedidos = async () => {
        setLoading(true);
        try {
            const params = {
                page: paginaAtual, limit: itensPorPagina,
                filtros: "situacao_pedido:Aguardando Envio;situacao_pedido:Faturado"
            };
            const { data } = await axios.get(`${API_URL}/pedidos/paginado`, { params });
            setPedidos(data.resultados);
            setTotalPaginas(Math.ceil(data.total / itensPorPagina));
        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao buscar pedidos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        buscarPedidos();
    }, [paginaAtual]);

    const handleDespachar = async (pedidoId) => {
        setDespachandoId(pedidoId);
        try {
            await axios.post(`${API_URL}/intelipost/pedidos/${pedidoId}/despachar`);
            toast.success(`Pedido #${pedidoId} enviado para a Intelipost com sucesso!`);
            buscarPedidos();
        } catch (error) {
            toast.error(error.response?.data?.detail || `Erro ao despachar pedido #${pedidoId}.`);
        } finally {
            setDespachandoId(null);
        }
    };

    const handleAbrirDetalhes = async (pedido) => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${API_URL}/intelipost/pedidos/${pedido.intelipost_order_number}/status`);
            setPedidoSelecionado(data);
            setModalAberto(true);
        } catch (error) {
            toast.error("Erro ao buscar detalhes do pedido na Intelipost.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Envie seus pedidos faturados para a Intelipost para gerar o envio.</p>
            </div>
            <div className="overflow-x-auto">
                <table className="bg-white border border-gray-300 table-auto whitespace-nowrap w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border text-left">Pedido ERP</th>
                            <th className="p-2 border text-left">Cliente</th>
                            <th className="p-2 border text-center">Status ERP</th>
                            <th className="p-2 border text-center">Status Intelipost</th>
                            <th className="p-2 border text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="text-center p-4">Carregando pedidos...</td></tr>
                        ) : pedidos.length === 0 ? (
                            <tr><td colSpan="5" className="text-center p-4">Nenhum pedido aguardando despacho foi encontrado.</td></tr>
                        ) : (
                            pedidos.map(pedido => (
                                <tr key={pedido.id} className={`hover:bg-gray-50 ${pedido.intelipost_order_number ? 'bg-green-50' : ''}`}>
                                    <td className="p-2 border font-mono">#{pedido.id}</td>
                                    <td className="p-2 border">{pedido.cliente_nome}</td>
                                    <td className="p-2 border text-center">
                                        <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
                                            {pedido.situacao_pedido}
                                        </span>
                                    </td>
                                    <td className="p-2 border text-center">
                                        {pedido.intelipost_shipment_status ? (
                                            <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">
                                                {pedido.intelipost_shipment_status}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">
                                                Não Enviado
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-2 border text-center">
                                        {pedido.intelipost_order_number ? (
                                            <button onClick={() => handleAbrirDetalhes(pedido)} title="Ver Detalhes do Envio" className="text-blue-600 hover:text-blue-800"><FaEye /></button>
                                        ) : (
                                            <button onClick={() => handleDespachar(pedido.id)} disabled={despachandoId === pedido.id} title="Despachar Pedido" className="text-green-600 hover:text-green-800 disabled:text-gray-400">
                                                {despachandoId === pedido.id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mx-auto"></div>
                                                ) : <FaShippingFast />}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <ModalDetalhesPedido isOpen={modalAberto} onClose={() => setModalAberto(false)} pedidoData={pedidoSelecionado} />
        </div>
    );
};

// --- Componente Principal da Página ---
export default function IntegracaoIntelipostPage() {
    // ... (lógica existente sem alterações)
    const [abaAtual, setAbaAtual] = useState("visao_geral");
    const [statusInfo, setStatusInfo] = useState({ status: 'carregando' });

    const abas = [
        { id: "visao_geral", label: "Visão Geral", icon: FaPlug },
        { id: "cotacao", label: "Cotação", icon: FaCalculator },
        { id: "despacho", label: "Despacho", icon: FaBoxOpen },
        { id: "configuracoes", label: "Configurações", icon: FaCog },
    ];

    // ... (funções fetchStatus, renderAbaVisaoGeral, etc. sem alterações)
    const fetchStatus = async () => {
        setStatusInfo({ status: 'carregando' });
        try {
            const { data } = await axios.get(`${API_URL}/intelipost/configuracoes`);
            if (data.api_key && data.origin_zip_code) {
                setStatusInfo({ status: 'conectado', ...data });
            } else {
                setStatusInfo({ status: 'desconectado' });
            }
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

    useEffect(() => {
        fetchStatus();
    }, []);

    const renderAbaVisaoGeral = () => {
        switch (statusInfo.status) {
            case 'carregando':
                return <p className="text-center py-10">Verificando status da conexão...</p>;
            case 'desconectado':
                return (
                    <div className="text-center p-8 border-2 border-dashed rounded-lg">
                        <FaUnlink className="mx-auto text-5xl text-gray-400 mb-4" />
                        <h2 className="text-2xl font-semibold mb-2">Integração Desconectada</h2>
                        <p className="text-gray-600 mb-6">Vá para a aba 'Configurações' para inserir sua API Key e ativar a integração.</p>
                        <button onClick={() => setAbaAtual('configuracoes')} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold">
                            Ir para Configurações
                        </button>
                    </div>
                );
            case 'conectado':
                return (
                    <div className="text-center p-8 border-2 border-dashed rounded-lg border-green-400 bg-green-50">
                        <FaPlug className="mx-auto text-5xl text-green-500 mb-4" />
                        <h2 className="text-2xl font-semibold mb-2 text-green-800">Integração Ativa!</h2>
                        <p className="text-gray-700">O sistema está pronto para realizar cotações.</p>
                        <p className="text-gray-600 text-sm mb-6 flex items-center justify-center gap-2">
                           <FaMapMarkerAlt /> CEP de Origem Padrão: <strong>{statusInfo.origin_zip_code}</strong>
                        </p>
                        <button onClick={() => setAbaAtual('cotacao')} className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-sm">
                            Fazer uma cotação
                        </button>
                    </div>
                );
            default:
                return (
                    <div className="text-center p-8 border-2 border-dashed rounded-lg border-red-400 bg-red-50">
                        <FaUnlink className="mx-auto text-5xl text-red-500 mb-4" />
                        <h2 className="text-2xl font-semibold mb-2 text-red-800">Erro na Conexão</h2>
                        <p className="text-gray-700 mb-6">Não foi possível conectar com o backend.</p>
                        <p className="font-mono bg-red-100 text-red-800 p-2 rounded text-sm mb-6">{JSON.stringify(statusInfo.detail)}</p>
                    </div>
                );
        }
    };

    const renderAbaAtual = () => {
        const isConnected = statusInfo.status === 'conectado';
        switch (abaAtual) {
            case "visao_geral": return renderAbaVisaoGeral();
            case "cotacao": return <AbaCotacao isConnected={isConnected} />;
            case "despacho": return <AbaDespacho />;
            case "configuracoes": return <AbaConfiguracoes onConfigUpdate={fetchStatus} />;
            default: return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 pb-28">
            <h1 className="text-3xl font-bold mb-6">Gestão de Fretes Intelipost</h1>
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
            <div>{renderAbaAtual()}</div>
        </div>
    );
}

// --- Componentes AbaCotacao e AbaConfiguracoes (sem alterações) ---
const AbaCotacao = ({ isConnected }) => {
    const [orcamentoId, setOrcamentoId] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [freteSelecionado, setFreteSelecionado] = useState(null);
    const [salvando, setSalvando] = useState(false);

    const handleOrcamentoChange = (e) => {
        const { value } = e.target;
        setOrcamentoId(value);
        setResultado(null);
        setFreteSelecionado(null);
    };

    const handleCotar = async (e) => {
        e.preventDefault();
        if (!isConnected) {
            toast.warn("Por favor, configure a API Key e o CEP de Origem na aba 'Configurações' primeiro.");
            return;
        }
        if (!orcamentoId) {
            toast.warn("Por favor, selecione um orçamento para cotar.");
            return;
        }

        setLoading(true);
        setResultado(null);
        setFreteSelecionado(null);

        try {
            const response = await axios.post(`${API_URL}/intelipost/cotacao_por_orcamento`, null, {
                params: { orcamento_id: orcamentoId }
            });
            
            if (response.data && response.data.cotacao && response.data.volumes) {
                 setResultado(response.data);
                 toast.success("Cotação realizada com sucesso!");
            } else {
                setResultado(null);
                toast.warn("A resposta da cotação não teve o formato esperado.");
            }

        } catch (err) {
            console.error("Erro ao realizar cotação:", err);
            const errorMsg = err?.response?.data?.detail || "Ocorreu um erro desconhecido.";
            const displayError = Array.isArray(errorMsg) 
                ? errorMsg.map(m => m.text).join(' ') 
                : errorMsg;
            toast.error(displayError);
        } finally {
            setLoading(false);
        }
    };

    const handleSalvarFrete = async () => {
        if (!freteSelecionado || !orcamentoId) {
            toast.warn("Nenhuma opção de frete foi selecionada.");
            return;
        }
        setSalvando(true);
        try {
            const payload = {
                carrier_name_from_api: String(freteSelecionado.delivery_method_name || ''),
                final_shipping_cost: Number(freteSelecionado.final_shipping_cost || 0),
                delivery_estimate_business_days: parseInt(freteSelecionado.delivery_estimate_business_days || 0, 10),
            };

            await axios.put(`${API_URL}/orcamentos/${orcamentoId}/frete`, payload);
            toast.success(`Frete atualizado no Orçamento #${orcamentoId} com sucesso!`);
            setFreteSelecionado(null);

        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao atualizar o orçamento.");
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Selecione um orçamento para cotar o frete de todos os seus itens.</p>
            </div>
            <form onSubmit={handleCotar} className="p-6 border rounded-lg bg-white shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <CampoImportarOrcamento
                            label="Selecionar Orçamento"
                            value={orcamentoId}
                            onChange={handleOrcamentoChange}
                            API_URL={API_URL}
                        />
                    </div>
                    <div className="flex items-end">
                        <ButtonComPermissao
                            type="submit"
                            className="w-full h-10 px-6 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold transition-colors disabled:bg-gray-400"
                            disabled={loading || !orcamentoId}
                            permissoes={["admin"]}
                        >
                            {loading ? 'Cotando...' : 'Realizar Cotação'}
                        </ButtonComPermissao>
                    </div>
                </div>
            </form>

            {resultado && (
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="p-4 border rounded-lg bg-white shadow-sm">
                        <h2 className="text-xl font-bold mb-4 text-gray-700">Volumes Calculados ({resultado.volumes.length})</h2>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            {resultado.volumes.map((volume, index) => (
                                <div key={index} className="p-3 border rounded-md bg-gray-50">
                                    <div className="flex justify-between items-center font-bold text-gray-800 mb-2">
                                        <span>Volume {index + 1}</span>
                                        <span className="text-teal-600">{volume.weight.toFixed(2)} kg</span>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p>Dimensões: {volume.height} x {volume.width} x {volume.length} cm</p>
                                        <p>Itens no volume: {volume.products_quantity}</p>
                                        <p>Valor da mercadoria: {Number(volume.cost_of_goods).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg bg-white shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-700">Opções de Frete</h2>
                            {freteSelecionado && (
                                <ButtonComPermissao
                                    onClick={handleSalvarFrete}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold flex items-center gap-2 transition-colors disabled:bg-gray-400"
                                    disabled={salvando}
                                    permissoes={["admin"]}
                                >
                                    <FaSave />
                                    {salvando ? 'Salvando...' : 'Atualizar Orçamento'}
                                </ButtonComPermissao>
                            )}
                        </div>
                        <div className="space-y-3">
                            {resultado.cotacao.content.delivery_options && resultado.cotacao.content.delivery_options.length > 0 ? (
                                resultado.cotacao.content.delivery_options.map((opcao) => (
                                    <div 
                                        key={opcao.delivery_method_id} 
                                        onClick={() => setFreteSelecionado(opcao)}
                                        className={`p-4 border rounded-md flex flex-wrap items-center justify-between gap-x-6 gap-y-3 cursor-pointer transition-all
                                            ${freteSelecionado?.delivery_method_id === opcao.delivery_method_id 
                                                ? 'bg-teal-50 border-2 border-teal-500 shadow-md' 
                                                : 'bg-gray-50 hover:bg-gray-100'}`
                                        }
                                    >
                                        <div className="flex items-center gap-4">
                                            <FaTruck className="text-2xl text-gray-500" />
                                            <div>
                                                <p className="font-bold text-lg text-gray-800">{opcao.delivery_method_name}</p>
                                                <p className="text-sm text-gray-600">Provedor: {opcao.provider_name}</p>
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500">Prazo Estimado</p>
                                            <p className="font-medium text-lg">{opcao.delivery_estimate_business_days} dias úteis</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500">Custo do Frete</p>
                                            <p className="font-bold text-xl text-teal-600">
                                                {opcao.final_shipping_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-4">Nenhuma opção de frete foi encontrada para os dados informados.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
const AbaConfiguracoes = ({ onConfigUpdate }) => {
    const [form, setForm] = useState({ api_key: '', origin_zip_code: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`${API_URL}/intelipost/configuracoes`);
                setForm(data);
            } catch (error) {
                toast.error("Erro ao carregar as configurações da Intelipost.");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'origin_zip_code') {
            setForm(prev => ({ ...prev, [name]: value.replace(/\D/g, '') }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.api_key || !form.origin_zip_code) {
            toast.warn("Ambos os campos, API Key e CEP de Origem, são obrigatórios.");
            return;
        }
        try {
            await axios.put(`${API_URL}/intelipost/configuracoes`, form);
            toast.success("Configurações salvas com sucesso!");
            onConfigUpdate();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Falha ao salvar as configurações.");
        }
    };

    if (loading) {
        return <p className="text-center py-10">Carregando configurações...</p>;
    }

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Insira suas credenciais da Intelipost para ativar a integração.</p>
            </div>
            <form id="form-config-intelipost" onSubmit={handleSave} className="space-y-8">
                <div className="p-6 bg-white border rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Credenciais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <CampoTextsimples
                            label="API Key" name="api_key" value={form.api_key || ''}
                            onChange={handleChange} placeholder="Sua chave de API" type="password" required
                        />
                        <CampoTextsimples
                            label="CEP de Origem (Padrão)" name="origin_zip_code" value={form.origin_zip_code || ''}
                            onChange={handleChange} placeholder="00000000" maxLength={8} required
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <ButtonComPermissao
                        permissoes={["admin"]} type="submit" form="form-config-intelipost"
                        className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold"
                    >
                        Salvar Alterações
                    </ButtonComPermissao>
                </div>
            </form>
        </div>
    );
};
