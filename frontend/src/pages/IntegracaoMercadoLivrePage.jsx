import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { useAuth } from "@/context/AuthContext"; // Importa o hook de autenticação

import {
    FaPlug, FaUnlink, FaCog, FaBoxOpen, FaShoppingCart,
    FaQuestionCircle, FaExternalLinkAlt, FaFileImport
} from 'react-icons/fa';

// Importa os componentes de formulário que seu sistema já usa
import CampoDropdownDb from '@/components/campos/CampoDropdownDb';
import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";

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
                        {loading ? (<tr><td colSpan="5" className="text-center p-4">A carregar...</td></tr>
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
                        {loading ? (<tr><td colSpan="7" className="text-center p-4">A carregar pedidos...</td></tr>
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

const AbaPerguntas = () => {
    const [perguntas, setPerguntas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [respostas, setRespostas] = useState({});
    const [respondendoId, setRespondendoId] = useState(null);
    const itensPorPagina = 10;

    // Função para buscar as perguntas da API
    const buscarPerguntas = async (page) => {
        setLoading(true);
        try {
            const params = { page: page, limit: itensPorPagina };
            const { data } = await axios.get(`${API_URL}/mercadolivre/perguntas`, { params });
            setPerguntas(data.resultados);
            setTotalPaginas(Math.ceil(data.total / itensPorPagina));
            // Se a página atual ficar vazia (e não for a primeira), volta para a anterior
            if (data.resultados.length === 0 && page > 1) {
                setPaginaAtual(p => p - 1);
            }
        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao buscar perguntas.");
        } finally {
            setLoading(false);
        }
    };

    // Efeito para buscar perguntas quando a página muda
    useEffect(() => {
        buscarPerguntas(paginaAtual);
    }, [paginaAtual]);

    // Função auxiliar para formatar datas, como na aba de Pedidos
    const formatarData = (dataString) => {
        if (!dataString) return '-';
        return new Date(dataString).toLocaleString('pt-BR');
    };

    // Atualiza o state com o texto da resposta
    const handleRespostaChange = (questionId, text) => {
        setRespostas(prev => ({ ...prev, [questionId]: text }));
    };

    // Envia a resposta para a API
    const handleResponder = async (questionId) => {
        const textoResposta = respostas[questionId];
        if (!textoResposta || textoResposta.trim() === '') {
            toast.warn("A resposta não pode estar vazia.");
            return;
        }
        setRespondendoId(questionId);
        try {
            await axios.post(`${API_URL}/mercadolivre/perguntas/${questionId}/responder`, { text: textoResposta });
            toast.success("Resposta enviada com sucesso!");

            // Limpa o campo de resposta e recarrega os dados da página atual
            setRespostas(prev => {
                const novasRespostas = { ...prev };
                delete novasRespostas[questionId];
                return novasRespostas;
            });
            buscarPerguntas(paginaAtual); // Recarrega os dados para atualizar a lista

        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao enviar resposta.");
        } finally {
            setRespondendoId(null);
        }
    };

    return (
        <div>
            {/* Cabeçalho da Aba */}
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Perguntas de clientes aguardando resposta.</p>
            </div>

            {/* Nova estrutura com Tabela */}
            <div className="overflow-x-auto">
                <table className="bg-white border border-gray-300 table-auto whitespace-nowrap w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border text-left">Data</th>
                            <th className="p-2 border text-left">Anúncio</th>
                            <th className="p-2 border text-left" style={{ whiteSpace: 'normal' }}>Pergunta</th>
                            <th className="p-2 border text-left" style={{ minWidth: '300px' }}>Responder</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="text-center p-4">A carregar perguntas...</td></tr>
                        ) : perguntas.length === 0 ? (
                            <tr><td colSpan="4" className="text-center p-4">Nenhuma pergunta pendente.</td></tr>
                        ) : (
                            perguntas.map((pergunta) => (
                                <tr key={pergunta.id} className="hover:bg-gray-50 align-top">
                                    <td className="p-2 border font-mono text-sm">{formatarData(pergunta.date_created)}</td>
                                    <td className="p-2 border">
                                        <a
                                            href={`https://produto.mercadolivre.com.br/${pergunta.item_id.replace('MLB', 'MLB-')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-sm flex items-center gap-2"
                                            title={pergunta.item.title}
                                        >
                                            <span className="truncate" style={{ maxWidth: '250px' }}>{pergunta.item.title}</span>
                                            <FaExternalLinkAlt size={12} />
                                        </a>
                                    </td>
                                    <td className="p-2 border text-sm" style={{ whiteSpace: 'normal' }}>
                                        {pergunta.text}
                                    </td>
                                    <td className="p-2 border">
                                        <div className="flex flex-col gap-2">
                                            <textarea
                                                value={respostas[pergunta.id] || ''}
                                                onChange={(e) => handleRespostaChange(pergunta.id, e.target.value)}
                                                placeholder="Digite sua resposta aqui..."
                                                className="w-full p-2 border rounded text-sm"
                                                rows="2"
                                            />
                                            <button
                                                onClick={() => handleResponder(pergunta.id)}
                                                disabled={respondendoId === pergunta.id}
                                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold text-sm disabled:bg-gray-400 self-end"
                                            >
                                                {respondendoId === pergunta.id ? 'A enviar...' : 'Responder'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Controles de Paginação (idênticos aos de outras abas) */}
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

// --- Componente para a aba de Configurações ---
const AbaConfiguracoes = ({ usuario }) => {
    const [form, setForm] = useState({
        aceite_automatico_pedidos: false,
        cliente_padrao_id: '',
        vendedor_padrao_id: '',
        situacao_pedido_inicial: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`${API_URL}/configuracoes/mercadolivre`);
                setForm(data);
            } catch (error) {
                toast.error("Erro ao carregar as configurações.");
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_URL}/configuracoes/mercadolivre`, form);
            toast.success("Configurações salvas com sucesso!");
        } catch (error) {
            toast.error(error.response?.data?.detail || "Falha ao salvar as configurações.");
        }
    };

    if (loading) {
        return <p className="text-center py-10">A carregar configurações...</p>;
    }

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Defina as regras e padrões para a integração com o Mercado Livre.</p>
            </div>
            <form id="form-config-ml" onSubmit={handleSave} className="space-y-8">
                <div className="p-6 bg-white border rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Pedidos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CampoDropdownDb
                            label="Cliente Padrão (para compradores não cadastrados)"
                            name="cliente_padrao_id"
                            value={form.cliente_padrao_id || ""}
                            onChange={handleChange}
                            url={`${API_URL}/cadastros_dropdown`}
                            filtro={{ tipo_cadastro: ["Cliente"] }}
                            campoValor="id"
                            campoLabel="nome_razao"
                        />
                        <CampoDropdownDb
                            label="Vendedor Padrão"
                            name="vendedor_padrao_id"
                            value={form.vendedor_padrao_id || ""}
                            onChange={handleChange}
                            url={`${API_URL}/cadastros_dropdown`}
                            filtro={{ tipo_cadastro: ["Vendedor"] }}
                            campoValor="id"
                            campoLabel="nome_razao"
                        />
                        <CampoDropdownEditavel
                            label="Situação Inicial do Pedido no ERP"
                            name="situacao_pedido_inicial"
                            value={form.situacao_pedido_inicial || ""}
                            onChange={handleChange}
                            tipo="situacao_pedido"
                            usuario={usuario}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <ButtonComPermissao
                        permissoes={["admin"]}
                        type="submit"
                        form="form-config-ml"
                        className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold"
                    >
                        Salvar Alterações
                    </ButtonComPermissao>
                </div>
            </form>
        </div>
    );
};


// --- Componente Principal da Página ---
export default function IntegracaoMercadoLivrePage() {
    const [abaAtual, setAbaAtual] = useState("visao_geral");
    const [statusInfo, setStatusInfo] = useState({ status: 'carregando', nickname: '', email: '' });
    const { usuario } = useAuth(); // Busca o usuário do contexto de autenticação

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
        if (abaAtual === 'visao_geral') { fetchStatus(); }
    }, [abaAtual]);

    const handleConnect = () => { window.location.href = `${API_URL}/mercadolivre/auth`; };

    const handleDisconnect = async () => {
        if (!window.confirm("Tem certeza que deseja desconectar a integração com o Mercado Livre? A autorização será removida.")) {
            return;
        }
        try {
            await axios.delete(`${API_URL}/mercadolivre/credentials`);
            toast.success("Integração desconectada com sucesso!");
            setStatusInfo({ status: 'desconectado' });
        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao desconectar a integração.");
        }
    };

    const renderAbaVisaoGeral = () => {
        switch (statusInfo.status) {
            case 'carregando': return <p className="text-center py-10">A verificar o estado da ligação...</p>;
            case 'desconectado': return (<div className="text-center p-8 border-2 border-dashed rounded-lg"><FaUnlink className="mx-auto text-5xl text-gray-400 mb-4" /><h2 className="text-2xl font-semibold mb-2">Integração Desligada</h2><p className="text-gray-600 mb-6">Ligue o seu ERP à sua conta do Mercado Livre para começar a sincronizar.</p><button onClick={handleConnect} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold">Ligar ao Mercado Livre</button></div>);
            case 'conectado': return (<div className="text-center p-8 border-2 border-dashed rounded-lg border-green-400 bg-green-50"><FaPlug className="mx-auto text-5xl text-green-500 mb-4" /><h2 className="text-2xl font-semibold mb-2 text-green-800">Integração Ativa!</h2><p className="text-gray-700">Ligado como: <strong className="font-mono">{statusInfo.nickname}</strong></p><p className="text-gray-600 text-sm mb-6">({statusInfo.email})</p><button onClick={handleDisconnect} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm">Desligar</button></div>);
            default: return (<div className="text-center p-8 border-2 border-dashed rounded-lg border-red-400 bg-red-50"><FaUnlink className="mx-auto text-5xl text-red-500 mb-4" /><h2 className="text-2xl font-semibold mb-2 text-red-800">Erro na Ligação</h2><p className="text-gray-700 mb-6">Não foi possível validar a ligação. O token pode ter sido revogado.</p><p className="font-mono bg-red-100 text-red-800 p-2 rounded text-sm mb-6">{JSON.stringify(statusInfo.detail)}</p><button onClick={handleConnect} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold">Tentar Ligar Novamente</button></div>);
        }
    };

    const renderAbaAtual = () => {
        switch (abaAtual) {
            case "visao_geral": return renderAbaVisaoGeral();
            case "anuncios": return <AbaAnuncios />;
            case "pedidos": return <AbaPedidos />;
            case "perguntas": return <AbaPerguntas />;
            case "configuracoes": return <AbaConfiguracoes usuario={usuario} />;
            default: return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 pb-28">
            <h1 className="text-3xl font-bold mb-6">Gestão Mercado Livre</h1>
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
