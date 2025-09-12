// /pages/Listapedidos.jsx

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FaFileCsv, FaTable, FaFilter, FaEye, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react'; // Ícone de carregamento

// Seus imports de componentes
import ModalErro from '@/components/modals/ModalErro';
import ModalFiltroColunas from '@/components/modals/ModalFiltroColunas';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import ModalEditarTabela from '@/components/modals/ModalEditarTabela';
import ModalVisualizarPedido from '@/components/modals/ModalVisualizarPedido';
import ModalFaturarPedido from '@/components/modals/ModalFaturarPedido';
import { useAuth } from '@/context/AuthContext';
import { useNfeStatusPoller } from '@/hooks/useNfeStatusPoller'; // <-- IMPORTA O HOOK

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function Listapedidos() {
    // Estados principais
    const [pedidos, setPedidos] = useState([]);
    const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
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
    const [ordenacaoColuna, setOrdenacaoColuna] = useState('data_emissao');
    const [ordenacaoAscendente, setOrdenacaoAscendente] = useState(false);

    // Estados dos Modais
    const [mostrarModalVisualizar, setMostrarModalVisualizar] = useState(false);
    const [mostrarModalFaturar, setMostrarModalFaturar] = useState(false);


    // Função para atualizar um pedido no estado local da UI
    const atualizarPedidoLocalmente = useCallback((pedidoId, alteracoes) => {
        setPedidos(pedidosAnteriores =>
            pedidosAnteriores.map(p =>
                p.id === pedidoId ? { ...p, ...alteracoes } : p
            )
        );
        if (pedidoSelecionado?.id === pedidoId) {
            setPedidoSelecionado(prev => ({ ...prev, ...alteracoes }));
        }
    }, [pedidoSelecionado]);


    // --- INTEGRAÇÃO DO POLLING ---
    const { startPolling, isPollingFor } = useNfeStatusPoller({
        API_URL,
        onSuccess: (pedidoId, dadosApi) => {
            // Atualiza o pedido com os dados finais da NF-e autorizada
            atualizarPedidoLocalmente(pedidoId, {
                nfe_status: 'autorizado',
                numero_nf: dadosApi.numero,
                serie_nfe: dadosApi.serie,
                nfe_chave: dadosApi.chave_nfe,
                nfe_protocolo: dadosApi.protocolo,
                nfe_danfe_path: dadosApi.caminho_danfe,
                nfe_xml_path: dadosApi.caminho_xml_nfe,
                data_nf: new Date().toISOString(),
            });
        },
        onError: (pedidoId, alteracoes) => {
            // Atualiza o pedido com o status de erro
            atualizarPedidoLocalmente(pedidoId, alteracoes);
        }
    });

    // Inicia o polling para pedidos que já estão em processamento ao carregar a página
    useEffect(() => {
        pedidos.forEach(p => {
            if (p.nfe_status === 'processando_autorizacao' && !isPollingFor(p.id)) {
                startPolling(p.id);
            }
        });
    }, [pedidos, startPolling, isPollingFor]);


    // Callback para quando a NF-e é enviada para processamento
    const handleNfeProcessando = ({ pedido_id, ...dadosNfe }) => {
        atualizarPedidoLocalmente(pedido_id, dadosNfe);
        startPolling(pedido_id); // Inicia a consulta periódica
    };

    const buscarPedidos = async () => {
        setLoading(true);
        try {
            const filtrosStr = [
                ...filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`),
                `situacao_pedido:Faturamento`,
                `situacao_pedido:Em Processamento (NF-e)`,
                `situacao_pedido:Rejeitado`
            ].join(';');

            const params = {
                page: paginaAtual,
                limit: itensPorPagina,
                filtro_rapido_coluna: filtroRapidoColuna,
                filtro_rapido_texto: filtroRapidoTexto,
                filtros: filtrosStr,
                data_inicio: dataInicio || undefined,
                data_fim: dataFim || undefined,
                ordenar_por: ordenacaoColuna,
                ordenar_direcao: ordenacaoAscendente ? 'asc' : 'desc'
            };
            const res = await axios.get(`${API_URL}/pedidos/paginado`, { params });
            setPedidos(res.data.resultados);
            setTotalPaginas(Math.ceil(res.data.total / itensPorPagina));
        } catch (error) {
            toast.error("Erro ao buscar pedidos para faturamento.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmarFaturamento = async () => {
        if (!pedidoSelecionado || pedidoSelecionado.nfe_status !== 'autorizado') {
            toast.warn("Apenas pedidos com NF-e AUTORIZADA podem ser movidos.");
            return;
        }
        try {
            await axios.put(`${API_URL}/pedidos/${pedidoSelecionado.id}`, { situacao_pedido: 'Expedição' });
            toast.success("Pedido movido para expedição!");
            setMostrarModalFaturar(false);
            setPedidos(prev => prev.filter(p => p.id !== pedidoSelecionado.id));
            setPedidoSelecionado(null);
        } catch (error) {
            toast.error("Erro ao confirmar faturamento do pedido.");
        }
    };

    const exportarCSV = async () => {
        if (pedidos.length === 0) {
            toast.warn("Não há dados para exportar.");
            return;
        }
        // Lógica de exportação robusta
        try {
            const headers = colunasVisiveis;
            const linhas = pedidos.map(pedido =>
                headers.map(h => {
                    const valor = pedido[h];
                    if (valor === null || valor === undefined) return '""';
                    const valorFormatado = formatarCampo(valor, h);
                    if (typeof valorFormatado === 'object') {
                        return `"${JSON.stringify(valorFormatado).replace(/"/g, '""')}"`;
                    }
                    return `"${String(valorFormatado).replace(/"/g, '""')}"`;
                }).join(',')
            );
            const csv = [headers.join(','), ...linhas].join('\n');
            const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', 'pedidos_faturamento.csv');
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

    useEffect(() => {
        if (usuario) {
            const ordemPadrao = [
                "id", "data_emissao", "data_validade",
                "cliente_nome", "vendedor_nome", "origem_venda", "lista_itens",
                "total_com_desconto"
            ];
            setTodasColunas(ordemPadrao);
            setColunasVisiveis(usuario.colunas_visiveis_pedidos || ordemPadrao);
        }
    }, [usuario]);

    useEffect(() => {
        if (colunasVisiveis.length > 0) {
            buscarPedidos();
        }
    }, [paginaAtual, filtrosSelecionados, filtroRapidoTexto, dataInicio, dataFim, ordenacaoColuna, ordenacaoAscendente, colunasVisiveis]);

    const colunasDropdownEditavel = { situacao_pedido: "situacao_pedido", origem_venda: "origem_venda", tipo_frete: "tipo_frete", condicao_pagamento: "condicao_pagamento" };

    useEffect(() => {
        const tipo = colunasDropdownEditavel[filtroRapidoColuna];
        if (tipo && !opcoesDropdown[filtroRapidoColuna]) {
            axios.get(`${API_URL}/opcoes/${tipo}`)
                .then(res => { setOpcoesDropdown(prev => ({ ...prev, [filtroRapidoColuna]: res.data })) })
                .catch(() => console.warn("Erro ao buscar opções para", filtroRapidoColuna))
        }
    }, [filtroRapidoColuna]);

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
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Pedidos para Faturamento</h1>
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
                        <button onClick={() => { if (!pedidoSelecionado) return toast.warn("Você deve selecionar um pedido primeiro!"); setMostrarModalVisualizar(true); }} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaEye />Visualizar</button>
                        <button onClick={() => { if (!pedidoSelecionado) return toast.warn("Selecione um pedido primeiro!"); setMostrarModalFaturar(true); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaCheckCircle />Faturar Pedido</button>
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
                                : pedidos.length === 0 ? (<tr><td colSpan={colunasVisiveis.length} className="text-center p-8 text-gray-500">Nenhum pedido para faturamento.</td></tr>)
                                    : pedidos.map(pedido => (
                                        <tr key={pedido.id} onClick={() => setPedidoSelecionado(pedido)} className={`cursor-pointer hover:bg-teal-50 border-b ${pedidoSelecionado?.id === pedido.id ? 'bg-teal-100' : ''}`}>
                                            {colunasVisiveis.map(coluna => (
                                                <td key={coluna} className="p-3">
                                                    {coluna === 'nfe_status' ? (
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${{
                                                            'autorizado': 'bg-green-100 text-green-800',
                                                            'erro_autorizacao': 'bg-red-100 text-red-800',
                                                            'processando_autorizacao': 'bg-yellow-100 text-yellow-800',
                                                        }[pedido.nfe_status] || 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {isPollingFor(pedido.id) && <Loader2 size={12} className="animate-spin inline-block mr-1" />}
                                                            {pedido.nfe_status || 'N/A'}
                                                        </span>
                                                    ) : (
                                                        formatarCampo(pedido[coluna], coluna)
                                                    )}
                                                </td>
                                            ))}
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
            {mostrarFiltroColunas && <ModalFiltroColunas colunas={todasColunas} colunasDropdown={colunasDropdownEditavel} onClose={() => setMostrarFiltroColunas(false)} onAplicar={handleAplicarFiltros} API_URL={API_URL} />}
            {mostrarEditarTabela && <ModalEditarTabela colunas={todasColunas} selecionadas={colunasVisiveis} onClose={() => setMostrarEditarTabela(false)} onSalvar={({ colunas }) => setColunasVisiveis(colunas)} />}
            {mostrarModalVisualizar && <ModalVisualizarPedido pedido={pedidoSelecionado} onClose={() => setMostrarModalVisualizar(false)} />}
            {mostrarModalFaturar && (
                <ModalFaturarPedido
                    pedidoSelecionado={pedidoSelecionado}
                    onClose={() => setMostrarModalFaturar(false)}
                    onNfeProcessando={handleNfeProcessando}
                    onConfirmarFaturamento={handleConfirmarFaturamento}
                    API_URL={API_URL}
                />
            )}
        </div>
    );
}