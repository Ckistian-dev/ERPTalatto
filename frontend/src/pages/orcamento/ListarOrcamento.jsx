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

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function Listaorcamentos() {
    // Estados principais
    const [orcamentos, setorcamentos] = useState([]);
    const [orcamentoSelecionado, setorcamentoSelecionado] = useState(null);
    const [acaoPendente, setAcaoPendente] = useState(null);
    const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

    // Estados de importação de CSV
    const [conflitos, setConflitos] = useState([]);
    const [mostrarModalConflitos, setMostrarModalConflitos] = useState(false);
    const [confirmarLinhas, setConfirmarLinhas] = useState({});
    const [novosorcamentos, setNovosorcamentos] = useState([]);

    // Estados de permissão e erro
    const { usuario } = useAuth();
    const [mensagemErro, setMensagemErro] = useState(null);

    // Estados para a paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 12;
    const [loading, setLoading] = useState(false);
    const [totalPaginas, setTotalPaginas] = useState(1);

    // Customização da tabela e filtros
    const [mostrarFiltroColunas, setMostrarFiltroColunas] = useState(false);
    const [mostrarEditarTabela, setMostrarEditarTabela] = useState(false);
    const [colunasVisiveis, setColunasVisiveis] = useState([]);
    const [todasColunas, setTodasColunas] = useState([]);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [filtrosSelecionados, setFiltrosSelecionados] = useState([]);
    const [filtroRapidoColuna, setFiltroRapidoColuna] = useState('cliente_nome');
    const [filtroRapidoTexto, setFiltroRapidoTexto] = useState('');
    const [opcoesDropdown, setOpcoesDropdown] = useState({});
    const [ordenacaoColuna, setOrdenacaoColuna] = useState('id');
    const [ordenacaoAscendente, setOrdenacaoAscendente] = useState(true);

    // Visualizar
    const [mostrarModalVisualizar, setMostrarModalVisualizar] = useState(false);

    const navigate = useNavigate();

    const buscarorcamentos = async () => {
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

            const res = await axios.get(`${API_URL}/orcamentos/paginado`, { params });
            setorcamentos(res.data.resultados);
            setTotalPaginas(Math.ceil(res.data.total / itensPorPagina));
        } catch (error) {
            console.error('Erro ao buscar orcamentos:', error);
            setMensagemErro("Erro ao buscar orçamentos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!usuario || Object.keys(usuario).length === 0) return;
        const ordemPadrao = [
            "id", "data_emissao", "data_validade",
            "cliente_nome", "vendedor_nome", "origem_venda", "lista_itens",
            "total_com_desconto"
        ];
        setTodasColunas(ordemPadrao);
        const colunas = usuario.colunas_visiveis_orcamentos?.length ? usuario.colunas_visiveis_orcamentos : ordemPadrao;
        setColunasVisiveis(colunas);
        if (!colunas.includes(filtroRapidoColuna)) {
            setFiltroRapidoColuna(colunas[0] || 'cliente_nome');
        }
    }, [usuario]);
    
    useEffect(() => {
        if (colunasVisiveis.length > 0) {
            buscarorcamentos();
        }
    }, [
        colunasVisiveis, paginaAtual, filtrosSelecionados, filtroRapidoColuna,
        filtroRapidoTexto, dataInicio, dataFim, ordenacaoColuna, ordenacaoAscendente
    ]);

    const exportarCSV = async () => {
        try {
            const filtrosStr = filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`).join(';');
            const params = {
                page: 1, limit: 10000,
                filtro_rapido_coluna: filtroRapidoColuna, filtro_rapido_texto: filtroRapidoTexto,
                filtros: filtrosStr || undefined, data_inicio: dataInicio || undefined,
                data_fim: dataFim || undefined, ordenar_por: ordenacaoColuna || undefined,
                ordenar_direcao: ordenacaoAscendente ? 'asc' : 'desc'
            };
            const res = await axios.get(`${API_URL}/orcamentos/paginado`, { params });
            if (!res.data || !Array.isArray(res.data.resultados)) {
                toast.error("Erro: dados inválidos retornados da API.");
                return;
            }
            const todos = res.data.resultados;
            const headers = colunasVisiveis;
            const linhas = todos.map(orcamento =>
                headers.map(h => {
                    const valor = orcamento[h];
                    if (valor === null || valor === undefined) return '""';
                    if (typeof valor === 'object') {
                        return `"${JSON.stringify(valor).replace(/"/g, '""')}"`;
                    }
                    return `"${String(valor).replace(/"/g, '""')}"`;
                }).join(',')
            );
            const csv = [headers.join(','), ...linhas].join('\n');
            const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', 'orcamentos.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("CSV exportado com sucesso!");
        } catch (err) {
            toast.error("Erro ao exportar CSV");
            console.error("Erro exportar CSV:", err);
        }
    };

    const importarCSV = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const texto = e.target.result;
                const delimitador = texto.includes(';') ? ';' : ',';
                const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
                const headers = linhas[0].split(delimitador).map(h => h.trim().replace(/"/g, ''));
                const registros = linhas.slice(1).map((linha) => {
                    const valores = linha.split(delimitador).map(v => v.trim().replace(/"/g, ''));
                    return headers.reduce((obj, header, i) => {
                        obj[header] = valores[i] || '';
                        return obj;
                    }, {});
                });
                const res = await axios.post(`${API_URL}/orcamentos/validar_importacao`, { registros });
                if (res.data.conflitos.length > 0) {
                    setConflitos(res.data.conflitos || []);
                    setNovosorcamentos(res.data.novos || []);
                    setMostrarModalConflitos(true);
                    const confirmadosInicial = {};
                    res.data.conflitos.forEach((_, idx) => confirmadosInicial[idx] = true);
                    setConfirmarLinhas(confirmadosInicial);
                } else {
                    await axios.post(`${API_URL}/orcamentos/importar_csv_confirmado`, { registros: [...res.data.novos] });
                    toast.success("Importação concluída com sucesso!");
                    buscarorcamentos();
                }
            } catch (err) {
                const msg = err?.response?.data;
                if (msg?.erros?.length) {
                    setMensagemErro(msg.erros.join('\n'));
                } else {
                    const detalhe = msg?.detail || "Erro inesperado ao importar dados.";
                    setMensagemErro(typeof detalhe === "string" ? detalhe : JSON.stringify(detalhe, null, 2));
                }
            }
        };
        reader.readAsText(file, 'utf-8');
        event.target.value = '';
    };

    const handleAplicarFiltros = ({ filtros, data_inicio, data_fim }) => {
        setFiltrosSelecionados(filtros || []);
        setDataInicio(data_inicio || '');
        setDataFim(data_fim || '');
        setPaginaAtual(1);
        setMostrarFiltroColunas(false);
    };

    const colunasDropdownEditavel = {
        situacao_orcamento: "situacao_orcamento",
        origem_venda: "origem_venda",
        tipo_frete: "tipo_frete",
        condicao_pagamento: "condicao_pagamento"
    };

    const handleEditar = () => {
        if (!orcamentoSelecionado) {
            toast.warn('Você deve selecionar um orçamento primeiro!');
            return;
        }
        setAcaoPendente('editar');
        setMostrarConfirmacao(true);
    };
    
    const handleVisualizar = () => {
        if (!orcamentoSelecionado) {
            toast.warn('Você deve selecionar um orçamento primeiro!');
            return;
        }
        setMostrarModalVisualizar(true);
    };

    const confirmarAcao = async () => {
        if (!orcamentoSelecionado || acaoPendente !== 'editar') return;
        setMostrarConfirmacao(false);
        setAcaoPendente(null);
        navigate('/orcamentos/editar', { state: { orcamento: orcamentoSelecionado } });
    };

    useEffect(() => {
        const tipo = colunasDropdownEditavel[filtroRapidoColuna];
        if (tipo && !opcoesDropdown[filtroRapidoColuna]) {
            axios.get(`${API_URL}/opcoes/${tipo}`)
                .then(res => {
                    setOpcoesDropdown(prev => ({ ...prev, [filtroRapidoColuna]: res.data }));
                })
                .catch(() => console.warn("Erro ao buscar opções para", filtroRapidoColuna));
        }
    }, [filtroRapidoColuna]);

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

    return (
        <div className="p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Orçamentos</h1>
            <div className="w-auto overflow-auto">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/orcamentos/novo" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaUserPlus /> Novo
                        </Link>
                        <ButtonComPermissao permissoes={["admin"]}>
                            <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 cursor-pointer">
                                <FaFileImport /> Importar
                                <input type="file" accept=".csv" onChange={importarCSV} className="hidden" />
                            </label>
                        </ButtonComPermissao>
                        <ButtonComPermissao type="button" onClick={exportarCSV} permissoes={["admin"]} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaFileCsv />Exportar
                        </ButtonComPermissao>
                    </div>

                    <div className="flex gap-2">
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
                        <button onClick={handleVisualizar} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaEye />Visualizar</button>
                        <ButtonComPermissao type="button" onClick={handleEditar} permissoes={["admin"]} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"><FiEdit />Editar</ButtonComPermissao>
                    </div>
                </div>

                {mostrarConfirmacao && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Confirmar Edição</h2>
                            <p className="text-gray-600 mb-6">Deseja realmente editar o orçamento do cliente <span className="font-bold text-gray-900">{orcamentoSelecionado?.cliente_nome}</span>?</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setMostrarConfirmacao(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-full font-medium">Cancelar</button>
                                <button onClick={confirmarAcao} className='bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-full font-medium shadow text-white'>Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="w-full table-auto whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                                {colunasVisiveis.map(col => <th key={col} className="p-3 border-b-2">{col.replace(/_/g, ' ').toUpperCase()}</th>)}
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (<tr><td colSpan={colunasVisiveis.length} className="text-center p-8">Carregando...</td></tr>)
                            : orcamentos.length === 0 ? (<tr><td colSpan={colunasVisiveis.length} className="text-center p-8 text-gray-500">Nenhum orçamento encontrado.</td></tr>)
                            : orcamentos.map(orcamento => (
                                <tr key={orcamento.id} onClick={() => setorcamentoSelecionado(orcamento)} className={`cursor-pointer hover:bg-teal-50 border-b ${orcamentoSelecionado?.id === orcamento.id ? 'bg-teal-100' : ''}`}>
                                    {colunasVisiveis.map(coluna => <td key={coluna} className="p-3">{formatarCampo(orcamento[coluna], coluna)}</td>)}
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
            
            {/* ... (O restante dos seus modais e componentes de erro permanecem aqui) ... */}
            <ModalErro mensagem={mensagemErro} onClose={() => setMensagemErro(null)} />
            {mostrarFiltroColunas && (<ModalFiltroColunas colunas={todasColunas} colunasDropdown={colunasDropdownEditavel} onClose={() => setMostrarFiltroColunas(false)} onAplicar={handleAplicarFiltros} API_URL={API_URL} />)}
            {mostrarEditarTabela && (<ModalEditarTabela colunas={todasColunas} selecionadas={colunasVisiveis} onClose={() => setMostrarEditarTabela(false)} onSalvar={({ colunas, ordenacao }) => { setColunasVisiveis(colunas); if (ordenacao?.coluna) { setOrdenacaoColuna(ordenacao.coluna); setOrdenacaoAscendente(ordenacao.ascendente); } setMostrarEditarTabela(false); }} />)}
            {mostrarModalVisualizar && (<ModalVisualizarPedido pedido={orcamentoSelecionado} onClose={() => setMostrarModalVisualizar(false)} />)}
        </div>
    );
}