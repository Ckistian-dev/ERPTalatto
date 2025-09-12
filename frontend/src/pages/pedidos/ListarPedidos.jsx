import { useEffect, useState } from 'react';
import axios from 'axios';
import { FiEdit } from 'react-icons/fi';
import { FaFileCsv, FaFileImport, FaUserPlus, FaTable, FaFilter, FaEye } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import React from 'react';
import { toast } from 'react-toastify';

import ModalErro from '@/components/modals/ModalErro';
import ModalFiltroColunas from '@/components/modals/ModalFiltroColunas';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import ModalEditarTabela from '@/components/modals/ModalEditarTabela';
import ModalVisualizarPedido from '@/components/modals/ModalVisualizarPedido';
import { useAuth } from '@/context/AuthContext';

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function Listapedidos() {
    // Estados principais
    const [pedidos, setpedidos] = useState([]);
    const [pedidoSelecionado, setpedidoSelecionado] = useState(null);
    const [acaoPendente, setAcaoPendente] = useState(null);
    const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

    // Estados de importação de CSV
    const [conflitos, setConflitos] = useState([]);
    const [mostrarModalConflitos, setMostrarModalConflitos] = useState(false);
    const [confirmarLinhas, setConfirmarLinhas] = useState({});
    const [novospedidos, setNovospedidos] = useState([]);

    // Estados de permissão e erro
    const { usuario } = useAuth();
    const [mensagemErro, setMensagemErro] = useState(null);

    // Estados para a paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 12; // Ajustado para corresponder ao layout
    const [loading, setLoading] = useState(false);
    const [totalPaginas, setTotalPaginas] = useState(1);

    // Customização da tabela
    const [mostrarFiltroColunas, setMostrarFiltroColunas] = useState(false);
    const [colunasVisiveis, setColunasVisiveis] = useState([]);
    const [todasColunas, setTodasColunas] = useState([]);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [filtrosSelecionados, setFiltrosSelecionados] = useState([]);
    const [mostrarEditarTabela, setMostrarEditarTabela] = useState(false);
    const [filtroRapidoColuna, setFiltroRapidoColuna] = useState('cliente_nome');
    const [filtroRapidoTexto, setFiltroRapidoTexto] = useState('');
    const [opcoesDropdown, setOpcoesDropdown] = useState({});
    const [ordenacaoColuna, setOrdenacaoColuna] = useState('id');
    const [ordenacaoAscendente, setOrdenacaoAscendente] = useState(true);

    // Visualizar
    const [mostrarModalVisualizar, setMostrarModalVisualizar] = useState(false);

    // Constante para navegação
    const navigate = useNavigate();

    // Buscar pedidos ao montar
    const buscarpedidos = async () => {
        setLoading(true);
        try {
            const filtrosStr = filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`).join(';');
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
            setpedidos(res.data.resultados);
            setTotalPaginas(Math.ceil(res.data.total / itensPorPagina));
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
            setMensagemErro("Erro ao buscar pedidos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!usuario || Object.keys(usuario).length === 0) return;
        const ordemPadrao = ["id", "data_emissao", "data_validade", "cliente_nome", "vendedor_nome", "origem_venda", "lista_itens", "total_com_desconto"];
        setTodasColunas(ordemPadrao);
        const colunas = usuario.colunas_visiveis_pedidos?.length ? usuario.colunas_visiveis_pedidos : ordemPadrao;
        setColunasVisiveis(colunas);
        if (!colunas.includes(filtroRapidoColuna)) {
            setFiltroRapidoColuna(colunas[0] || 'cliente_nome');
        }
    }, [usuario]);

    useEffect(() => {
        if (colunasVisiveis.length > 0) {
            buscarpedidos();
        }
    }, [colunasVisiveis, paginaAtual, filtrosSelecionados, filtroRapidoColuna, filtroRapidoTexto, dataInicio, dataFim, ordenacaoColuna, ordenacaoAscendente]);

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

    const exportarCSV = async () => {
        toast.info("Exportando dados, por favor aguarde...");
        try {
            const filtrosStr = filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`).join(';');
            const params = {
                page: 1,
                limit: 10000, // Limite alto para buscar todos os registros
                filtros: filtrosStr || undefined,
                filtro_rapido_coluna: filtroRapidoTexto ? filtroRapidoColuna : undefined,
                filtro_rapido_texto: filtroRapidoTexto || undefined,
                data_inicio: dataInicio || undefined,
                data_fim: dataFim || undefined,
                ordenar_por: ordenacaoColuna,
                ordenar_direcao: ordenacaoAscendente ? 'asc' : 'desc'
            };

            const res = await axios.get(`${API_URL}/pedidos/paginado`, { params });
            const todosPedidos = res.data.resultados;

            if (!todosPedidos || todosPedidos.length === 0) {
                toast.warn("Não há dados para exportar com os filtros atuais.");
                return;
            }

            const headers = colunasVisiveis;
            const linhas = todosPedidos.map(pedido =>
                headers.map(coluna => {
                    const valor = formatarCampo(pedido[coluna], coluna);
                    if (valor === null || valor === undefined) return '""';
                    // Escapa aspas duplas dentro do valor
                    const valorString = String(valor).replace(/"/g, '""');
                    return `"${valorString}"`;
                }).join(',')
            );

            const csv = [headers.join(','), ...linhas].join('\n');
            const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', 'pedidos.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("CSV exportado com sucesso!");

        } catch (err) {
            toast.error("Erro ao exportar CSV.");
            console.error("Erro ao exportar CSV:", err);
        }
    };

    const handleAplicarFiltros = ({ filtros, data_inicio, data_fim }) => {
        setFiltrosSelecionados(filtros || []);
        setDataInicio(data_inicio || '');
        setDataFim(data_fim || '');
        setPaginaAtual(1);
        setMostrarFiltroColunas(false);
    };

    const colunasDropdownEditavel = {
        situacao_pedido: "situacao_pedido", origem_venda: "origem_venda",
        tipo_frete: "tipo_frete", condicao_pagamento: "condicao_pagamento"
    };

    const editarpedido = () => {
        if (!pedidoSelecionado) return exibirAviso('Você deve selecionar um pedido primeiro!');
        setAcaoPendente('editar');
        setMostrarConfirmacao(true);
    };

    const confirmarAcao = async () => {
        if (!pedidoSelecionado) return;
        if (acaoPendente === 'editar') {
            setMostrarConfirmacao(false);
            setAcaoPendente(null);
            navigate('/pedidos/editar', { state: { pedido: pedidoSelecionado } });
        }
    };

    const exibirAviso = (mensagem) => {
        toast.warn(mensagem);
    };

    useEffect(() => {
        const tipo = colunasDropdownEditavel[filtroRapidoColuna];
        if (tipo && !opcoesDropdown[filtroRapidoColuna]) {
            axios.get(`${API_URL}/opcoes/${tipo}`)
                .then(res => setOpcoesDropdown(prev => ({ ...prev, [filtroRapidoColuna]: res.data })))
                .catch(() => console.warn("Erro ao buscar opções para", filtroRapidoColuna));
        }
    }, [filtroRapidoColuna]);

    return (
        <div className="p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Gestão de Pedidos</h1>
            <div className="w-auto overflow-auto">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/pedidos/novo" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaUserPlus /> Novo Pedido
                        </Link>
                        <ButtonComPermissao type="button" onClick={exportarCSV} permissoes={["admin"]} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaFileCsv />Exportar
                        </ButtonComPermissao>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <div className="flex gap-2 items-center">
                            <select value={filtroRapidoColuna} onChange={(e) => { setFiltroRapidoColuna(e.target.value); setFiltroRapidoTexto(""); setPaginaAtual(1); }} className="border p-2 rounded text-sm w-48">
                                {colunasVisiveis.map((col) => <option key={col} value={col}>{col.replace(/_/g, ' ').toUpperCase()}</option>)}
                            </select>
                            <div className="w-64">
                                {colunasDropdownEditavel[filtroRapidoColuna] ? (
                                    <select value={filtroRapidoTexto} onChange={(e) => { setFiltroRapidoTexto(e.target.value); setPaginaAtual(1); }} className="w-full border p-2 rounded text-sm">
                                        <option value="">Selecione</option>
                                        {(opcoesDropdown[filtroRapidoColuna] || []).map((op) => <option key={op.id} value={op.valor}>{op.valor}</option>)}
                                    </select>
                                ) : (
                                    <input type="text" placeholder="Pesquisar..." value={filtroRapidoTexto} onChange={(e) => { setFiltroRapidoTexto(e.target.value); setPaginaAtual(1); }} className="w-full border p-2 rounded text-sm" />
                                )}
                            </div>
                        </div>
                        <button onClick={() => setMostrarFiltroColunas(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaFilter />Filtro Avançado</button>
                        <button onClick={() => setMostrarEditarTabela(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded flex items-center gap-2"><FaTable />Editar Tabela</button>
                        <button onClick={() => { if (!pedidoSelecionado) exibirAviso("Selecione um pedido!"); else setMostrarModalVisualizar(true); }} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaEye />Visualizar</button>
                        <ButtonComPermissao type="button" onClick={editarpedido} permissoes={["admin"]} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"><FiEdit />Editar</ButtonComPermissao>
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
                                : pedidos.length === 0 ? (<tr><td colSpan={colunasVisiveis.length} className="text-center p-8 text-gray-500">Nenhum pedido encontrado.</td></tr>)
                                    : pedidos.map(pedido => (
                                        <tr key={pedido.id} onClick={() => setpedidoSelecionado(pedido)} className={`cursor-pointer hover:bg-teal-50 border-b ${pedidoSelecionado?.id === pedido.id ? 'bg-teal-100' : ''}`}>
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
            {mostrarConfirmacao && (
                <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Confirmar Edição</h2>
                        <p className="text-gray-600 mb-6">Deseja realmente editar o pedido <span className="font-bold text-gray-900">{pedidoSelecionado?.id}</span>?</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => { setMostrarConfirmacao(false); setAcaoPendente(null); }} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-full font-medium">Cancelar</button>
                            <button onClick={confirmarAcao} className="px-5 py-2 rounded-full font-medium shadow text-white bg-blue-600 hover:bg-blue-700">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
            <ModalErro mensagem={mensagemErro} onClose={() => setMensagemErro(null)} />
            {mostrarModalVisualizar && <ModalVisualizarPedido pedido={pedidoSelecionado} onClose={() => setMostrarModalVisualizar(false)} />}
            {mostrarFiltroColunas && <ModalFiltroColunas colunas={todasColunas} colunasDropdown={colunasDropdownEditavel} onClose={() => setMostrarFiltroColunas(false)} onAplicar={handleAplicarFiltros} API_URL={API_URL} />}
            {mostrarEditarTabela && <ModalEditarTabela colunas={todasColunas} selecionadas={colunasVisiveis} onClose={() => setMostrarEditarTabela(false)} onSalvar={({ colunas, ordenacao }) => { setColunasVisiveis(colunas); if (ordenacao?.coluna) { setOrdenacaoColuna(ordenacao.coluna); setOrdenacaoAscendente(ordenacao.ascendente); } setMostrarEditarTabela(false); }} />}
        </div>
    );
}