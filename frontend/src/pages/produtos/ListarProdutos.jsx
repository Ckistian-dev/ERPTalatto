import { useEffect, useState } from 'react';
import axios from 'axios';
import { FiEdit } from 'react-icons/fi';
import { FaFileCsv, FaFileImport, FaUserPlus, FaTable, FaFilter } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import React from 'react';
import { toast } from 'react-toastify';
import Papa from 'papaparse';

import ModalErro from '@/components/modals/ModalErro';
import ModalFiltroColunas from '@/components/modals/ModalFiltroColunas';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import ModalEditarTabela from '@/components/modals/ModalEditarTabela';

import { useAuth } from '@/context/AuthContext';

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ListarProdutos() {
    // Estados principais
    const [produtos, setprodutos] = useState([]);
    const [produtoSelecionado, setprodutoSelecionado] = useState(null);
    const [acaoPendente, setAcaoPendente] = useState(null);
    const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

    // Estados de importação de CSV
    const [conflitos, setConflitos] = useState([]);
    const [mostrarModalConflitos, setMostrarModalConflitos] = useState(false);
    const [confirmarLinhas, setConfirmarLinhas] = useState({});
    const [novosprodutos, setNovosprodutos] = useState([]);

    // Estados de permissão e erro
    const { usuario } = useAuth();
    const [mensagemErro, setMensagemErro] = useState(null);

    // Estados para a paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 12; // Ajustado para o layout
    const [loading, setLoading] = useState(false);
    const [totalPaginas, setTotalPaginas] = useState(1);

    // Customização da tabela
    const [mostrarFiltroColunas, setMostrarFiltroColunas] = useState(false);
    const [mostrarEditarTabela, setMostrarEditarTabela] = useState(false);
    const [colunasVisiveis, setColunasVisiveis] = useState([]);
    const [todasColunas, setTodasColunas] = useState([]);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [filtrosSelecionados, setFiltrosSelecionados] = useState([]);
    const [filtroRapidoColuna, setFiltroRapidoColuna] = useState('descricao');
    const [filtroRapidoTexto, setFiltroRapidoTexto] = useState('');
    const [opcoesDropdown, setOpcoesDropdown] = useState({});
    const [ordenacaoColuna, setOrdenacaoColuna] = useState('id');
    const [ordenacaoAscendente, setOrdenacaoAscendente] = useState(true);

    // Constante para navegação
    const navigate = useNavigate();

    // Buscar produtos ao montar
    const buscarprodutos = async () => {
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
            const res = await axios.get(`${API_URL}/produtos/paginado`, { params });
            setprodutos(res.data.resultados);
            setTotalPaginas(Math.ceil(res.data.total / itensPorPagina));
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            setMensagemErro("Erro ao buscar produtos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!usuario || Object.keys(usuario).length === 0) return;
        const ordemPadrao = [
            "id", "sku", "codigo_barras", "descricao", "grupo", "situacao"
        ];
        setTodasColunas(ordemPadrao);
        const colunas = usuario.colunas_visiveis_produtos?.length ? usuario.colunas_visiveis_produtos : ordemPadrao;
        setColunasVisiveis(colunas);
        if (!colunas.includes(filtroRapidoColuna)) {
            setFiltroRapidoColuna(colunas[0] || 'descricao');
        }
    }, [usuario]);

    useEffect(() => {
        if (colunasVisiveis.length > 0) {
            buscarprodutos();
        }
    }, [colunasVisiveis, paginaAtual, filtrosSelecionados, filtroRapidoColuna, filtroRapidoTexto, dataInicio, dataFim, ordenacaoColuna, ordenacaoAscendente]);

    const exportarCSV = async () => {
        try {
            const filtrosStr = filtrosSelecionados
                .map(f => `${f.coluna}:${f.texto}`)
                .join(';');

            const params = {
                page: 1,
                limit: 10000,
                filtro_rapido_coluna: filtroRapidoColuna,
                filtro_rapido_texto: filtroRapidoTexto,
                filtros: filtrosStr || undefined,
                data_inicio: dataInicio || undefined,
                data_fim: dataFim || undefined,
                ordenar_por: ordenacaoColuna || undefined,
                ordenar_direcao: ordenacaoAscendente ? 'asc' : 'desc'
            };

            // USO DA VARIÁVEL DE AMBIENTE AQUI
            const res = await axios.get(`${API_URL}/produtos/paginado`, { params });

            if (!res.data || !Array.isArray(res.data.resultados)) {
                toast.error("Erro: dados inválidos retornados da API.");
                return;
            }

            const todos = res.data.resultados;
            const headers = colunasVisiveis;

            const linhas = todos.map(produto =>
                headers.map(h => {
                    const valor = produto[h];
                    if (valor === null || valor === undefined) return '""';
                    if (typeof valor === 'object') {
                        return `"${JSON.stringify(valor).replace(/"/g, '""')}"`;
                    }
                    return `"${String(valor).replace(/"/g, '""')}"`;
                }).join(',')
            );

            const csv = [headers.join(','), ...linhas].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', 'produtos.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            toast.error("Erro ao exportar CSV");
            console.error("Erro exportar CSV:", err);
        }
    };


    const handleAplicarFiltros = ({ filtros, data_inicio, data_fim }) => {
        setFiltrosSelecionados(filtros || []);
        setDataInicio(data_inicio || '');
        setDataFim(data_fim || '');
        setPaginaAtual(1);
        setMostrarFiltroColunas(false);
    };

    const colunasDropdownEditavel = { /* ... suas colunas ... */ };

    useEffect(() => {
        const tipo = colunasDropdownEditavel[filtroRapidoColuna];
        if (tipo && !opcoesDropdown[filtroRapidoColuna]) {
            axios.get(`${API_URL}/opcoes/${tipo}`)
                .then(res => setOpcoesDropdown(prev => ({ ...prev, [filtroRapidoColuna]: res.data })))
                .catch(() => console.warn("Erro ao buscar opções para", filtroRapidoColuna));
        }
    }, [filtroRapidoColuna]);

    const editarproduto = () => {
        if (!produtoSelecionado) return exibirAviso('Você deve selecionar um produto primeiro!');
        setAcaoPendente('editar');
        setMostrarConfirmacao(true);
    };

    const confirmarAcao = async () => {
        if (!produtoSelecionado || acaoPendente !== 'editar') return;
        setMostrarConfirmacao(false);
        setAcaoPendente(null);
        navigate('/produtos/editar', { state: { produto: produtoSelecionado } });
    };

    const exibirAviso = (mensagem) => {
        toast.warn(mensagem);
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Gestão de Produtos</h1>
            <div className="w-auto overflow-auto">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/produtos/novo" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaUserPlus /> Novo Produto
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
                        <ButtonComPermissao type="button" onClick={editarproduto} permissoes={["admin"]} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"><FiEdit />Editar</ButtonComPermissao>
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
                                : produtos.length === 0 ? (<tr><td colSpan={colunasVisiveis.length} className="text-center p-8 text-gray-500">Nenhum produto encontrado.</td></tr>)
                                    : produtos.map(produto => (
                                        <tr key={produto.id} onClick={() => setprodutoSelecionado(produto)} className={`cursor-pointer hover:bg-teal-50 border-b ${produtoSelecionado?.id === produto.id ? 'bg-teal-100' : ''}`}>
                                            {colunasVisiveis.map(coluna => <td key={coluna} className="p-3">{String(produto[coluna] ?? '')}</td>)}
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
                        <p className="text-gray-600 mb-6">Deseja realmente editar o produto <span className="font-bold text-gray-900">{produtoSelecionado?.descricao}</span>?</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => { setMostrarConfirmacao(false); setAcaoPendente(null); }} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-full font-medium">Cancelar</button>
                            <button onClick={confirmarAcao} className="px-5 py-2 rounded-full font-medium shadow text-white bg-blue-600 hover:bg-blue-700">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
            {mostrarModalConflitos && (<div className="fixed inset-0 bg-black bg-opacity-50 z-50">...Seu Modal de Conflitos aqui...</div>)}
            <ModalErro mensagem={mensagemErro} onClose={() => setMensagemErro(null)} />
            {mostrarFiltroColunas && <ModalFiltroColunas colunas={todasColunas} colunasDropdown={colunasDropdownEditavel} onClose={() => setMostrarFiltroColunas(false)} onAplicar={handleAplicarFiltros} API_URL={API_URL} />}
            {mostrarEditarTabela && <ModalEditarTabela colunas={todasColunas} selecionadas={colunasVisiveis} onClose={() => setMostrarEditarTabela(false)} onSalvar={({ colunas, ordenacao }) => { setColunasVisiveis(colunas); if (ordenacao?.coluna) { setOrdenacaoColuna(ordenacao.coluna); setOrdenacaoAscendente(ordenacao.ascendente); } setMostrarEditarTabela(false); }} />}
        </div>
    );
}