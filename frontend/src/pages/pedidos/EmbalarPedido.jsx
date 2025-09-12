import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaFileCsv, FaTable, FaFilter, FaEye, FaCheckCircle, FaClipboardList } from 'react-icons/fa';
import { toast } from 'react-toastify';

import ModalErro from '@/components/modals/ModalErro';
import ModalFiltroColunas from '@/components/modals/ModalFiltroColunas';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import ModalEditarTabela from '@/components/modals/ModalEditarTabela';
import ModalVisualizarPedido from '@/components/modals/ModalVisualizarPedido';
import ModalExpedicaoPedido from '@/components/modals/ModalExpedicaoPedido';
import ModalVisualizarItensProgramados from '@/components/modals/ModalVisualizarItensProgramados';

import { useAuth } from '@/context/AuthContext';

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function Listapedidos() {
    // Estados principais
    const [pedidos, setpedidos] = useState([]);
    const [pedidoSelecionado, setpedidoSelecionado] = useState(null);
    const [mensagemErro, setMensagemErro] = useState(null);

    // Estados de permissão e paginação
    const { usuario } = useAuth();
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 12; // Ajustado para corresponder ao layout
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

    // Estados dos Modais
    const [mostrarModalVisualizar, setMostrarModalVisualizar] = useState(false);
    const [mostrarModalItens, setMostrarModalItens] = useState(false);
    const [mostrarModalExpedicao, setMostrarModalExpedicao] = useState(false);

    // Avisos
    const exibirAviso = (mensagem) => {
        toast.warn(mensagem); // Usando toast para avisos para manter consistência
    };

    const buscarpedidos = async () => {
        setLoading(true);
        try {
            const filtrosStr = [
                ...filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`),
                `situacao_pedido:Embalagem`
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
        const ordemPadrao = [
            "id", "data_emissao", "data_validade",
            "cliente_nome", "vendedor_nome", "origem_venda", "lista_itens",
            "total_com_desconto"
        ];
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

    const exportarCSV = async () => {
        try {
            const filtrosStr = [
                ...filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`),
                `situacao_pedido:Embalagem`
            ].filter(Boolean).join(';');

            const params = {
                page: 1, limit: 10000,
                filtros: filtrosStr || undefined,
                data_inicio: dataInicio || undefined,
                data_fim: dataFim || undefined,
                ordenar_por: ordenacaoColuna,
                ordenar_direcao: ordenacaoAscendente ? 'asc' : 'desc'
            };
            const res = await axios.get(`${API_URL}/pedidos/paginado`, { params });
            if (!res.data || !Array.isArray(res.data.resultados)) {
                toast.error("Erro: dados inválidos retornados da API.");
                return;
            }
            const todos = res.data.resultados;
            const headers = colunasVisiveis;
            const linhas = todos.map(pedido =>
                headers.map(h => {
                    const valor = pedido[h];
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
            link.setAttribute('download', 'pedidos_para_embalagem.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("CSV exportado com sucesso!");
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

    const colunasDropdownEditavel = { situacao_pedido: "situacao_pedido", origem_venda: "origem_venda", tipo_frete: "tipo_frete", condicao_pagamento: "condicao_pagamento" };

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

    const atualizarPedido = async (alteracoes = {}) => {
        if (!pedidoSelecionado) return;
        try {
            const res = await axios.get(`${API_URL}/pedidos/paginado`, {
                params: { filtro_rapido_coluna: "id", filtro_rapido_texto: pedidoSelecionado.id, page: 1, limit: 1 }
            });
            const pedidoCompleto = res.data.resultados?.[0];
            if (!pedidoCompleto) {
                toast.error("Pedido não encontrado.");
                return;
            }
            const payload = {
                data_emissao: pedidoCompleto.data_emissao, data_validade: pedidoCompleto.data_validade,
                cliente: pedidoCompleto.cliente_id, cliente_nome: pedidoCompleto.cliente_nome,
                vendedor: pedidoCompleto.vendedor_id, vendedor_nome: pedidoCompleto.vendedor_nome,
                origem_venda: pedidoCompleto.origem_venda, tipo_frete: pedidoCompleto.tipo_frete,
                transportadora: pedidoCompleto.transportadora_id, transportadora_nome: pedidoCompleto.transportadora_nome,
                valor_frete: pedidoCompleto.valor_frete, total: pedidoCompleto.total,
                desconto_total: pedidoCompleto.desconto_total, total_com_desconto: pedidoCompleto.total_com_desconto,
                lista_itens: JSON.parse(pedidoCompleto.lista_itens || "[]"),
                formas_pagamento: JSON.parse(pedidoCompleto.formas_pagamento || "[]"),
                observacao: pedidoCompleto.observacao || "", data_finalizacao: pedidoCompleto.data_finalizacao || null,
                ordem_finalizacao: pedidoCompleto.ordem_finalizacao || null,
                endereco_expedicao: JSON.parse(pedidoCompleto.endereco_expedicao || "{}"),
                hora_expedicao: pedidoCompleto.hora_expedicao || null, usuario_expedicao: pedidoCompleto.usuario_expedicao || null,
                numero_nf: pedidoCompleto.numero_nf || null, data_nf: pedidoCompleto.data_nf || null,
                ...alteracoes
            };
            await axios.put(`${API_URL}/pedidos/${pedidoSelecionado.id}`, payload);
            toast.success("Pedido atualizado com sucesso!");
            setpedidoSelecionado(null);
            buscarpedidos();
        } catch (error) {
            console.error("Erro ao atualizar pedido:", error);
            toast.error("Erro ao atualizar o pedido.");
        }
    };

    // FUNÇÃO COPIADA DO PRIMEIRO CÓDIGO
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

    // LAYOUT (JSX) COPIADO E ADAPTADO DO PRIMEIRO CÓDIGO
    return (
        <div className="p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Pedidos para Embalagem</h1>
            <div className="w-auto overflow-auto">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <div className="flex gap-2 flex-wrap">
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
                        <button onClick={() => { if (!pedidoSelecionado) exibirAviso("Selecione um pedido!"); else setMostrarModalItens(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaClipboardList /> Itens</button>
                        <button onClick={() => { if (!pedidoSelecionado) exibirAviso("Selecione um pedido!"); else setMostrarModalExpedicao(true); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaCheckCircle />Finalizar Embalagem</button>
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
                                : pedidos.length === 0 ? (<tr><td colSpan={colunasVisiveis.length} className="text-center p-8 text-gray-500">Nenhum pedido para embalagem.</td></tr>)
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

            <ModalErro mensagem={mensagemErro} onClose={() => setMensagemErro(null)} />

            {mostrarFiltroColunas && (<ModalFiltroColunas colunas={todasColunas} colunasDropdown={colunasDropdownEditavel} onClose={() => setMostrarFiltroColunas(false)} onAplicar={handleAplicarFiltros} API_URL={API_URL} />)}

            {mostrarEditarTabela && (<ModalEditarTabela colunas={todasColunas} selecionadas={colunasVisiveis} onClose={() => setMostrarEditarTabela(false)} onSalvar={({ colunas, ordenacao }) => { setColunasVisiveis(colunas); if (ordenacao?.coluna) { setOrdenacaoColuna(ordenacao.coluna); setOrdenacaoAscendente(ordenacao.ascendente); } setMostrarEditarTabela(false); }} />)}

            {mostrarModalVisualizar && (<ModalVisualizarPedido pedido={pedidoSelecionado} onClose={() => setMostrarModalVisualizar(false)} />)}

            {mostrarModalExpedicao && (
                <ModalExpedicaoPedido
                    usuario={usuario}
                    pedido={pedidoSelecionado}
                    onClose={() => setMostrarModalExpedicao(false)}
                    onErro={(msg) => setMensagemErro(msg)}
                    onConfirmar={async (dadosExpedicao) => {
                        try {
                            await atualizarPedido(dadosExpedicao);
                            setMostrarModalExpedicao(false);
                        } catch (err) {
                            setMensagemErro("Erro ao atualizar pedido com expedição.");
                        }
                    }}
                    API_URL={API_URL}
                />
            )}

            {mostrarModalItens && (
                <ModalVisualizarItensProgramados
                    pedido={pedidoSelecionado}
                    onClose={() => setMostrarModalItens(false)}
                />
            )}
        </div>
    );
}