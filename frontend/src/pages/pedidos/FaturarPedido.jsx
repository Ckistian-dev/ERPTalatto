// /pages/Listapedidos.jsx

import { useEffect, useState } from 'react';
import axios from 'axios';
import { FaFileCsv, FaTable, FaFilter, FaEye, FaCheckCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Seus imports de componentes
import ModalErro from '@/components/modals/ModalErro';
import ModalFiltroColunas from '@/components/modals/ModalFiltroColunas';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import ModalEditarTabela from '@/components/modals/ModalEditarTabela';
import ModalVisualizarPedido from '@/components/modals/ModalVisualizarPedido';
import ModalFaturarPedido from '@/components/modals/ModalFaturarPedido';
import { useAuth } from '@/context/AuthContext';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function Listapedidos() {
    // Estados principais
    const [pedidos, setPedidos] = useState([]);
    const [pedidoSelecionado, setPedidoSelecionado] = useState(null);

    // Estados de UI e Modais
    const { usuario } = useAuth();
    const [mensagemErro, setMensagemErro] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mostrarModalFaturar, setMostrarModalFaturar] = useState(false);
    const [mostrarModalVisualizar, setMostrarModalVisualizar] = useState(false);
    const [mostrarFiltroColunas, setMostrarFiltroColunas] = useState(false);
    const [mostrarEditarTabela, setMostrarEditarTabela] = useState(false);

    // Estados para paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 15;
    const [totalPaginas, setTotalPaginas] = useState(1);

    // Estados para customização da tabela (filtros, colunas, ordenação)
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

    // Função para buscar os pedidos
    const buscarPedidos = async () => {
        setLoading(true);
        try {
            const filtrosStr = [
                ...filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`),
                `situacao_pedido:Faturamento`,
                `situacao_pedido:Em processamento (NF-e)`,
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

    // Função para atualizar um pedido no estado local da UI
    const atualizarPedidoLocalmente = (pedidoId, alteracoes) => {
        setPedidos(pedidosAnteriores =>
            pedidosAnteriores.map(p =>
                p.id === pedidoId ? { ...p, ...alteracoes } : p
            )
        );
        if (pedidoSelecionado?.id === pedidoId) {
            setPedidoSelecionado(prev => ({ ...prev, ...alteracoes }));
        }
    };

    // Callback para quando a NF-e é enviada para processamento
    const handleNfeProcessando = ({ pedido_id, ...dadosNfe }) => {
        atualizarPedidoLocalmente(pedido_id, dadosNfe);
    };

    // Callback para confirmar o faturamento e mover para expedição
    const handleConfirmarFaturamento = async () => {
        if (!pedidoSelecionado || pedidoSelecionado.nfe_status !== 'AUTORIZADO') {
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

    // Função para exportar os dados da tabela para um arquivo CSV
    const exportarCSV = () => {
        if (pedidos.length === 0) {
            toast.warn("Não há dados para exportar.");
            return;
        }
        const colunas = colunasVisiveis;
        const header = colunas.join(',') + '\n';
        const rows = pedidos.map(pedido => {
            return colunas.map(col => {
                let value = formatarCampo(pedido[col], col);
                if (typeof value === 'string') {
                    value = `"${value.replace(/"/g, '""')}"`; // Escapa aspas
                }
                return value;
            }).join(',');
        }).join('\n');

        const csvContent = header + rows;
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "pedidos_faturamento.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Função para formatar campos complexos para exibição na tabela
    const formatarCampo = (valor, coluna) => {
        if (valor === null || valor === undefined) return '';
        if (["lista_itens", "formas_pagamento", "endereco_expedicao"].includes(coluna)) {
            let dadosJson = valor;
            if (typeof dadosJson === "string") {
                try { dadosJson = JSON.parse(dadosJson); } catch (e) { return valor; }
            }
            if (Array.isArray(dadosJson)) return `[${dadosJson.length} itens]`;
            if (typeof dadosJson === 'object') return '{...}';
        }
        return String(valor);
    };

    const handleAplicarFiltros = ({ filtros, data_inicio, data_fim }) => {
        setFiltrosSelecionados(filtros || []);
        setDataInicio(data_inicio || '');
        setDataFim(data_fim || '');
        setPaginaAtual(1);
        setMostrarFiltroColunas(false);
    };

    // Efeitos para inicialização e busca de dados
    useEffect(() => {
        if (usuario) {
            const ordemPadrao = [
                "id",
                "situacao_pedido",
                "data_emissao",
                "data_validade",
                "cliente_id",
                "cliente_nome",
                "vendedor_id",
                "vendedor_nome",
                "origem_venda",
                "tipo_frete",
                "transportadora_id",
                "transportadora_nome",
                "valor_frete",
                "total",
                "desconto_total",
                "total_com_desconto",
                "lista_itens",
                "formas_pagamento",
                "observacao",
                "criado_em",
                "data_finalizacao",
                "ordem_finalizacao",
                "endereco_expedicao",
                "hora_expedicao",
                "usuario_expedicao",
                "numero_nf",
                "data_nf"
            ];
            setTodasColunas(ordemPadrao); // Simplificado para este contexto
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

    return (
        <div className="p-6">
            <div className="w-auto overflow-auto">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <div className="flex gap-2 flex-wrap">
                        <ButtonComPermissao type="button" onClick={exportarCSV} permissoes={["admin"]} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaFileCsv />Exportar CSV
                        </ButtonComPermissao>
                    </div>
                    <div className="flex gap-2">
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
                        <button onClick={() => { if (!pedidoSelecionado) return toast.warn("Você deve selecionar um pedido primeiro!"); setMostrarModalVisualizar(true); }} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaEye />Visualizar</button>
                        <button onClick={() => { if (!pedidoSelecionado) return toast.warn("Selecione um pedido primeiro!"); setMostrarModalFaturar(true); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaCheckCircle />Faturar Pedido</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <div className="max-w-screen-lg">
                        <table className="bg-white border border-gray-300 table-auto whitespace-nowrap w-full">
                            <thead>
                                <tr>
                                    {colunasVisiveis.map((coluna) => (<th key={coluna} className="p-2 border whitespace-nowrap">{coluna === 'id' ? '#' : coluna.replace(/_/g, ' ').toUpperCase()}</th>))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={colunasVisiveis.length} className="text-center py-10">Carregando...</td></tr>
                                ) : pedidos.length === 0 ? (
                                    <tr><td colSpan={colunasVisiveis.length}><div className="flex items-center pl-[63vh] h-[63vh]"><span className="text-gray-500 text-lg">Nenhum pedido encontrado.</span></div></td></tr>
                                ) : (
                                    <>
                                        {pedidos.map((pedido) => (
                                            <tr key={pedido.id} onClick={() => setPedidoSelecionado(pedido)} className={`cursor-pointer ${pedidoSelecionado?.id === pedido.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                                                {colunasVisiveis.map((coluna) => (
                                                    <td key={coluna} className="p-2 border whitespace-nowrap text-sm">
                                                        {coluna === 'nfe_status' ? (
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pedido.nfe_status === 'AUTORIZADO' ? 'bg-green-100 text-green-800' :
                                                                pedido.nfe_status === 'REJEITADO' ? 'bg-red-100 text-red-800' :
                                                                    pedido.nfe_status === 'PROCESSANDO' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {pedido.nfe_status || 'N/A'}
                                                            </span>
                                                        ) : (
                                                            formatarCampo(pedido[coluna], coluna)
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {pedidos.length < itensPorPagina && Array.from({ length: itensPorPagina - pedidos.length }).map((_, idx) => (
                                            <tr key={`espaco-${idx}`} className="opacity-0 pointer-events-none select-none">
                                                {colunasVisiveis.map((_, i) => (<td key={i} className="p-2 whitespace-nowrap">&nbsp;</td>))}
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {!loading && (
                    <div className="flex justify-start items-start gap-4 mt-4">
                        <button onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))} disabled={paginaAtual === 1} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Anterior</button>
                        <span>Página {paginaAtual} de {totalPaginas}</span>
                        <button onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))} disabled={paginaAtual >= totalPaginas} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Próxima</button>
                    </div>
                )}
            </div>

            {/* Modais */}
            <ModalErro mensagem={mensagemErro} onClose={() => setMensagemErro(null)} />
            {mostrarFiltroColunas && <ModalFiltroColunas colunas={todasColunas} colunasDropdown={colunasDropdownEditavel} onClose={() => setMostrarFiltroColunas(false)} onAplicar={handleAplicarFiltros} />}
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
