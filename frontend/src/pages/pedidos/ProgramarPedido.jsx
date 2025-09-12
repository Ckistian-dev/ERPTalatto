import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaFileCsv, FaTable, FaFilter, FaEye, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

import ModalErro from '@/components/modals/ModalErro';
import ModalFiltroColunas from '@/components/modals/ModalFiltroColunas';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import ModalEditarTabela from '@/components/modals/ModalEditarTabela';
import ModalVisualizarPedido from '@/components/modals/ModalVisualizarPedido';
import ModalProgramacaoPedido from '@/components/modals/ModalProgramacaoPedido';

import { useAuth } from '@/context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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

    // Modais
    const [mostrarModalVisualizar, setMostrarModalVisualizar] = useState(false);
    const [mostrarModalProgramar, setMostrarModalProgramar] = useState(false);

    // Avisos
    const exibirAviso = (mensagem) => {
        toast.warn(mensagem);
    };

    // Buscar pedidos ao montar
    const buscarpedidos = async () => {
        setLoading(true);
        try {
            const filtrosStr = [
                ...filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`),
                `situacao_pedido:Programação`
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
            const res = await axios.get(`${API_BASE_URL}/pedidos/paginado`, { params });
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
        // ... (lógica de exportação)
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

    useEffect(() => {
        const tipo = colunasDropdownEditavel[filtroRapidoColuna];
        if (tipo && !opcoesDropdown[filtroRapidoColuna]) {
            axios.get(`${API_BASE_URL}/opcoes/${tipo}`)
                .then(res => setOpcoesDropdown(prev => ({ ...prev, [filtroRapidoColuna]: res.data })))
                .catch(() => console.warn("Erro ao buscar opções para", filtroRapidoColuna));
        }
    }, [filtroRapidoColuna]);

    const atualizarPedido = async (pedidoParaAtualizar, alteracoes = {}) => {
        if (!pedidoParaAtualizar) {
            toast.error("Nenhum pedido selecionado para atualização.");
            return;
        }
        try {
            const res = await axios.get(`${API_BASE_URL}/pedidos/paginado`, {
                params: { filtro_rapido_coluna: "id", filtro_rapido_texto: pedidoParaAtualizar.id, limit: 1 }
            });
            const pedidoCompleto = res.data.resultados?.[0];
            if (!pedidoCompleto) {
                toast.error("Erro: Pedido não encontrado no banco de dados.");
                return;
            }

            const payload = { ...pedidoCompleto, ...alteracoes };
            delete payload.id;
            delete payload.criado_em;
            
            payload.lista_itens = JSON.parse(payload.lista_itens || '[]');
            payload.formas_pagamento = JSON.parse(payload.formas_pagamento || '[]');
            payload.endereco_expedicao = JSON.parse(payload.endereco_expedicao || 'null');

            await axios.put(`${API_BASE_URL}/pedidos/${pedidoParaAtualizar.id}`, payload);
            toast.success("Pedido atualizado com sucesso!");
            setpedidoSelecionado(null);
            buscarpedidos();
        } catch (error) {
            console.error("Erro ao atualizar pedido:", error.response?.data || error.message);
            const errorMsg = error.response?.data?.detail?.[0]?.msg || "Erro ao atualizar o pedido.";
            toast.error(errorMsg);
        }
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


    return (
        <div className="p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Programação de Pedidos</h1>
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
                        <button onClick={() => { if (!pedidoSelecionado) { exibirAviso("Selecione um pedido primeiro!"); } else { setMostrarModalProgramar(true); } }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaCheckCircle />Programar Pedido</button>
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
                                : pedidos.length === 0 ? (<tr><td colSpan={colunasVisiveis.length} className="text-center p-8 text-gray-500">Nenhum pedido para programação.</td></tr>)
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
            {mostrarFiltroColunas && <ModalFiltroColunas colunas={todasColunas} colunasDropdown={colunasDropdownEditavel} onClose={() => setMostrarFiltroColunas(false)} onAplicar={handleAplicarFiltros} API_URL={API_BASE_URL} />}
            {mostrarEditarTabela && <ModalEditarTabela colunas={todasColunas} selecionadas={colunasVisiveis} onClose={() => setMostrarEditarTabela(false)} onSalvar={({ colunas, ordenacao }) => { setColunasVisiveis(colunas); if (ordenacao?.coluna) { setOrdenacaoColuna(ordenacao.coluna); setOrdenacaoAscendente(ordenacao.ascendente); } setMostrarEditarTabela(false); }} />}
            {mostrarModalVisualizar && <ModalVisualizarPedido pedido={pedidoSelecionado} onClose={() => setMostrarModalVisualizar(false)} />}
            {mostrarModalProgramar && (
                <ModalProgramacaoPedido
                    pedido={pedidoSelecionado}
                    onClose={() => setMostrarModalProgramar(false)}
                    onConfirmar={async (dadosProgramacao) => {
                        if (!pedidoSelecionado) return;
                        try {
                            await atualizarPedido(pedidoSelecionado, dadosProgramacao);
                            const retiradas = dadosProgramacao.programacao?.retiradas_estoque || [];
                            if (retiradas.length > 0) {
                                const payloadReservas = {
                                    id_pedido: pedidoSelecionado.id,
                                    reservas: retiradas.map(r => ({ id_produto: r.produto_id, quantidade: r.quantidade, ...r.origem }))
                                };
                                await axios.post(`${API_BASE_URL}/api/estoque/reservar`, payloadReservas);
                                toast.success("Estoque reservado com sucesso!");
                            }
                            setMostrarModalProgramar(false);
                        } catch (error) {
                            console.error("Falha no processo de programação ou reserva:", error.response?.data || error.message);
                            const errorMsg = error.response?.data?.detail || "Ocorreu uma falha no processo de reserva.";
                            toast.error(errorMsg);
                        }
                    }}
                />
            )}
        </div>
    );
}