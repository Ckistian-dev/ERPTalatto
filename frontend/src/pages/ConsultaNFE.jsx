// src/pages/ConsultaNFE.jsx

import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaFileCsv, FaTable, FaFilter, FaEye, FaFilePdf, FaFileCode } from 'react-icons/fa';
import { toast } from 'react-toastify';

import ModalErro from '@/components/modals/ModalErro';
import ModalFiltroColunas from '@/components/modals/ModalFiltroColunas';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import ModalEditarTabela from '@/components/modals/ModalEditarTabela';
import ModalVisualizarPedido from '@/components/modals/ModalVisualizarPedido';
import { useAuth } from '@/context/AuthContext';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ConsultaNFE() {
    // --- Estados ---
    const [pedidos, setPedidos] = useState([]);
    const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
    const { usuario } = useAuth();
    const [mensagemErro, setMensagemErro] = useState(null);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 12; // Ajustado para o layout
    const [loading, setLoading] = useState(false);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [mostrarFiltroColunas, setMostrarFiltroColunas] = useState(false);
    const [colunasVisiveis, setColunasVisiveis] = useState([]);
    const [todasColunas, setTodasColunas] = useState([]);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [filtrosSelecionados, setFiltrosSelecionados] = useState([]);
    const [mostrarEditarTabela, setMostrarEditarTabela] = useState(false);
    const [filtroRapidoColuna, setFiltroRapidoColuna] = useState('cliente_nome');
    const [filtroRapidoTexto, setFiltroRapidoTexto] = useState('');
    const [ordenacaoColuna, setOrdenacaoColuna] = useState('data_emissao');
    const [ordenacaoAscendente, setOrdenacaoAscendente] = useState(false);
    const [mostrarModalVisualizar, setMostrarModalVisualizar] = useState(false);
    const [opcoesDropdown, setOpcoesDropdown] = useState({});

    const exibirAviso = (mensagem) => toast.warn(mensagem);

    // --- Lógica de Busca (específica para NFE) ---
    const buscarPedidosNFE = async () => {
        setLoading(true);
        try {
            const filtrosStr = [
                ...filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`),
                'situacao_pedido:Expedição',
                'situacao_pedido:Concluído'
            ].join(';');

            const params = {
                page: paginaAtual,
                limit: itensPorPagina,
                filtros: filtrosStr || undefined,
                filtro_rapido_coluna: filtroRapidoTexto ? filtroRapidoColuna : undefined,
                filtro_rapido_texto: filtroRapidoTexto || undefined,
                data_inicio: dataInicio || undefined,
                data_fim: dataFim || undefined,
                ordenar_por: ordenacaoColuna,
                ordenar_direcao: ordenacaoAscendente ? 'asc' : 'desc'
            };
            const res = await axios.get(`${API_URL}/pedidos/paginado`, { params });
            setPedidos(res.data.resultados);
            setTotalPaginas(Math.ceil(res.data.total / itensPorPagina));
        } catch (error) {
            console.error('Erro ao buscar NF-es:', error);
            toast.error("Erro ao buscar NF-es");
            setMensagemErro("Erro ao buscar NF-es");
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers e Funções de Suporte ---
    const handleAplicarFiltros = ({ filtros, data_inicio, data_fim }) => {
        setFiltrosSelecionados(filtros || []);
        setDataInicio(data_inicio || '');
        setDataFim(data_fim || '');
        setPaginaAtual(1);
        setMostrarFiltroColunas(false);
    };

    const formatarCampo = (valor, coluna) => {
        if (["total", "valor_frete", "desconto_total", "total_com_desconto"].includes(coluna)) {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
        }
        if (coluna === "formas_pagamento") {
            try {
                const formas = typeof valor === 'string' ? JSON.parse(valor) : valor;
                if (Array.isArray(formas)) {
                    return formas.map(fp => `${fp.tipo} (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fp.valor || 0)})`).join(' + ');
                }
            } catch { return valor; }
        }
        if (coluna === "lista_itens") {
            try {
                const itens = typeof valor === 'string' ? JSON.parse(valor) : valor;
                if (Array.isArray(itens)) {
                    return itens.map(item => `${item.quantidade_itens}x ${item.produto}`).join(' | ');
                }
            } catch { return valor; }
        }
        if (typeof valor === 'object' && valor !== null) {
            return JSON.stringify(valor);
        }
        return valor;
    };


    const colunasDropdownEditavel = {
        situacao_pedido: "situacao_pedido",
        origem_venda: "origem_venda",
        tipo_frete: "tipo_frete"
    };

    // --- UseEffects ---
    useEffect(() => {
        if (!usuario) return;
        const ordemPadrao = [ "id", "situacao_pedido", "data_emissao", "cliente_nome", "vendedor_nome", "total_com_desconto", "numero_nf", "serie_nfe", "data_nf", "nfe_chave", "nfe_status" ];
        setTodasColunas(ordemPadrao);
        const colunas = usuario.colunas_visiveis_nfe?.length ? usuario.colunas_visiveis_nfe : ordemPadrao;
        setColunasVisiveis(colunas);
    }, [usuario]);

    useEffect(() => {
        const tipo = colunasDropdownEditavel[filtroRapidoColuna];
        if (tipo && !opcoesDropdown[filtroRapidoColuna]) {
            axios.get(`${API_URL}/opcoes/${tipo}`)
                .then(res => setOpcoesDropdown(prev => ({ ...prev, [filtroRapidoColuna]: res.data })))
                .catch(() => console.warn("Erro ao buscar opções para filtro"));
        }
    }, [filtroRapidoColuna]);

    useEffect(() => {
        if (colunasVisiveis.length > 0) {
            buscarPedidosNFE();
        }
    }, [colunasVisiveis, paginaAtual, filtrosSelecionados, filtroRapidoColuna, filtroRapidoTexto, dataInicio, dataFim, ordenacaoColuna, ordenacaoAscendente]);

    // --- JSX (Interface do Usuário) ---
    return (
        <div className="p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Consulta de NF-e</h1>
            <div className="w-auto overflow-auto">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <div className="flex gap-2 flex-wrap">
                        <ButtonComPermissao type="button" onClick={() => toast.info("Função de exportar em desenvolvimento.")} permissoes={["admin"]} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaFileCsv />Exportar CSV
                        </ButtonComPermissao>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <div className="flex gap-2 items-center">
                            <select value={filtroRapidoColuna} onChange={(e) => { setFiltroRapidoColuna(e.target.value); setFiltroRapidoTexto(""); setPaginaAtual(1); }} className="border p-2 rounded text-sm w-48">
                                {colunasVisiveis.map((col) => (<option key={col} value={col}>{col.replace(/_/g, ' ').toUpperCase()}</option>))}
                            </select>
                            <div className="w-64">
                                {colunasDropdownEditavel[filtroRapidoColuna] ? (
                                    <select value={filtroRapidoTexto} onChange={(e) => { setFiltroRapidoTexto(e.target.value); setPaginaAtual(1); }} className="w-full border p-2 rounded text-sm">
                                        <option value="">Selecione</option>
                                        {(opcoesDropdown[filtroRapidoColuna] || []).map((op) => (<option key={op.id} value={op.valor}>{op.valor}</option>))}
                                    </select>
                                ) : (
                                    <input type="text" placeholder="Pesquisar..." value={filtroRapidoTexto} onChange={(e) => { setFiltroRapidoTexto(e.target.value); setPaginaAtual(1); }} className="w-full border p-2 rounded text-sm" />
                                )}
                            </div>
                        </div>
                        <button onClick={() => setMostrarFiltroColunas(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaFilter />Filtro Avançado</button>
                        <button onClick={() => setMostrarEditarTabela(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded flex items-center gap-2"><FaTable />Editar Tabela</button>
                        <button onClick={() => { if (!pedidoSelecionado) return exibirAviso("Selecione um pedido!"); setMostrarModalVisualizar(true); }} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaEye />Visualizar</button>
                        <button onClick={() => { if (pedidoSelecionado?.id) { window.open(`${API_URL}/nfe/${pedidoSelecionado.id}/danfe`, '_blank', 'noopener,noreferrer'); } else { exibirAviso("Selecione um pedido com NF-e autorizada."); } }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaFilePdf /> Ver DANFE
                        </button>
                        <button onClick={() => { if (pedidoSelecionado?.id) { window.open(`${API_URL}/nfe/${pedidoSelecionado.id}/xml`, '_blank', 'noopener,noreferrer'); } else { exibirAviso("Selecione um pedido com NF-e autorizada."); } }} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaFileCode /> Ver XML
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="w-full table-auto whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                                {colunasVisiveis.map(col => <th key={col} className="p-3 border-b-2">{col.replace(/_/g, ' ').toUpperCase()}</th>)}
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (<tr><td colSpan={colunasVisiveis.length} className="text-center p-8">Carregando...</td></tr>)
                                : pedidos.length === 0 ? (<tr><td colSpan={colunasVisiveis.length} className="text-center p-8 text-gray-500">Nenhuma NF-e encontrada.</td></tr>)
                                    : pedidos.map(pedido => (
                                        <tr key={pedido.id} onClick={() => setPedidoSelecionado(pedido)} className={`cursor-pointer hover:bg-teal-50 border-b ${pedidoSelecionado?.id === pedido.id ? 'bg-teal-100' : ''}`}>
                                            {colunasVisiveis.map(coluna => <td key={coluna} className="p-3">{formatarCampo(pedido[coluna], coluna)}</td>)}
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>

                {!loading && totalPaginas > 1 && (
                    <div className="flex justify-end items-center gap-4 mt-4">
                        <button onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))} disabled={paginaAtual === 1} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Anterior</button>
                        <span>Página {paginaAtual} de {totalPaginas}</span>
                        <button onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))} disabled={paginaAtual >= totalPaginas} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Próxima</button>
                    </div>
                )}
            </div>

            {/* Modais */}
            <ModalErro mensagem={mensagemErro} onClose={() => setMensagemErro(null)} />
            {mostrarFiltroColunas && <ModalFiltroColunas colunas={todasColunas} colunasDropdown={colunasDropdownEditavel} onClose={() => setMostrarFiltroColunas(false)} onAplicar={handleAplicarFiltros} />}
            {mostrarEditarTabela && <ModalEditarTabela colunas={todasColunas} selecionadas={colunasVisiveis} onClose={() => setMostrarEditarTabela(false)} onSalvar={({ colunas }) => setColunasVisiveis(colunas)} />}
            {mostrarModalVisualizar && <ModalVisualizarPedido pedido={pedidoSelecionado} onClose={() => setMostrarModalVisualizar(false)} />}
        </div>
    );
}