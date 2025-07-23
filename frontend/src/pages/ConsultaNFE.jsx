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
    const itensPorPagina = 15;
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
    const [ordenacaoColuna, setOrdenacaoColuna] = useState(null);
    const [ordenacaoAscendente, setOrdenacaoAscendente] = useState(true);
    const [mostrarModalVisualizar, setMostrarModalVisualizar] = useState(false);
    const [opcoesDropdown, setOpcoesDropdown] = useState({});

    const exibirAviso = (mensagem) => setMensagemErro(mensagem);

    // --- Lógica de Busca (específica para NFE) ---
    const buscarPedidosNFE = async () => {
        setLoading(true);
        try {
            // Filtra por pedidos que já passaram pelo faturamento e estão na expedição ou concluídos
            const filtrosStr = [
                ...filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`),
                'situacao_pedido:Expedição',
                'situacao_pedido:Concluído'
            ].join(';');

            const params = {
                page: paginaAtual,
                limit: itensPorPagina,
                filtro_rapido_coluna: filtroRapidoColuna,
                filtro_rapido_texto: filtroRapidoTexto,
                filtros: filtrosStr || undefined,
                data_inicio: dataInicio || undefined,
                data_fim: dataFim || undefined,
                ordenar_por: ordenacaoColuna || 'data_emissao',
                ordenar_direcao: 'desc'
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
        if (valor === null || valor === undefined) return '';
        if (["lista_itens", "formas_pagamento", "endereco_expedicao"].includes(coluna)) {
            let dadosJson = valor;
            if (typeof dadosJson === "string") {
                try { dadosJson = JSON.parse(dadosJson); } catch (e) { return valor; }
            }
            if (Array.isArray(dadosJson)) return `[${dadosJson.length} itens]`;
            if (typeof dadosJson === 'object') return '{...}';
        }
        // Formata data para o padrão brasileiro
        if (coluna === 'data_emissao' || coluna === 'data_nf' || coluna === 'criado_em') {
            try {
                return new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            } catch (e) {
                return valor;
            }
        }
        return String(valor);
    };

    const colunasDropdownEditavel = {
        situacao_pedido: "situacao_pedido",
        origem_venda: "origem_venda",
        tipo_frete: "tipo_frete"
    };

    // --- UseEffects ---
    useEffect(() => {
        if (!usuario) return;
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
            "serie_nfe",
            "data_nf",
            "nfe_chave",
            "nfe_status",
            "nfe_recibo",
            "nfe_protocolo",
            "nfe_data_autorizacao",
            "nfe_rejeicao_motivo",
            "nfe_xml_path",
            "nfe_danfe_path",
            "natureza_operacao"
        ];
        setTodasColunas(ordemPadrao);
        // Utiliza um campo de visibilidade específico para a tela de consulta de NFe
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
            <div className="w-auto overflow-auto">
                {/* Barra de Ações e Filtros */}
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <div className="flex gap-2 flex-wrap">
                        {/* Botão de exportar pode ser implementado no futuro */}
                        <ButtonComPermissao type="button" onClick={() => toast.info("Função de exportar em desenvolvimento.")} permissoes={["admin"]} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded flex items-center gap-2">
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
                        <button onClick={() => { if (!pedidoSelecionado) return exibirAviso("Selecione um pedido primeiro!"); setMostrarModalVisualizar(true); }} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaEye />Visualizar</button>

                        {/* Botões específicos da ConsultaNFE com a lógica correta */}
                        <button
                            onClick={() => {
                                if (pedidoSelecionado?.id) {
                                    window.open(`${API_URL}/nfe/${pedidoSelecionado.id}/danfe`, '_blank', 'noopener,noreferrer');
                                } else {
                                    toast.warn("Selecione um pedido com NF-e autorizada.");
                                }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <FaFilePdf /> Ver DANFE
                        </button>
                        <button
                            onClick={() => {
                                if (pedidoSelecionado?.id) {
                                    window.open(`${API_URL}/nfe/${pedidoSelecionado.id}/xml`, '_blank', 'noopener,noreferrer');
                                } else {
                                    toast.warn("Selecione um pedido com NF-e autorizada.");
                                }
                            }}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <FaFileCode /> Ver XML
                        </button>
                    </div>
                </div>

                {/* Tabela de pedidos */}
                <div className="overflow-x-auto">
                    <div className="max-w-screen-lg">
                        <table className="bg-white border border-gray-300 table-auto whitespace-nowrap w-full">
                            <thead>
                                <tr>
                                    {colunasVisiveis.map((coluna) => (
                                        <th key={coluna} className="p-2 border whitespace-nowrap">
                                            {coluna === 'id' ? '#' : coluna.replace(/_/g, ' ').toUpperCase()}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pedidos.length === 0 ? (
                                    <tr>
                                        <td colSpan={colunasVisiveis.length}>
                                            <div className="flex items-center pl-[63vh] h-[63vh]">
                                                <span className="text-gray-500 text-lg">Nenhum pedido encontrado.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {pedidos.map((pedido, i) => (
                                            <tr
                                                key={pedido.id || i}
                                                onClick={() => setpedidoSelecionado(pedido)}
                                                className={`cursor-pointer ${pedidoSelecionado?.id === pedido.id ? 'bg-gray-100' : ''}`}
                                            >
                                                {colunasVisiveis.map((coluna) => (
                                                    <td key={coluna} className="p-2 border whitespace-nowrap">
                                                        {pedido[coluna]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}

                                        {/* Preenche espaço visual com linhas invisíveis */}
                                        {pedidos.length < 15 &&
                                            Array.from({ length: 15 - pedidos.length }).map((_, idx) => (
                                                <tr key={`espaco-${idx}`} className="opacity-0 pointer-events-none select-none">
                                                    {colunasVisiveis.map((_, i) => (
                                                        <td key={i} className="p-2 whitespace-nowrap">&nbsp;</td>
                                                    ))}
                                                </tr>
                                            ))
                                        }
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Paginação */}
                <div className="flex justify-start items-start gap-4 mt-4">
                    <button onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))} disabled={paginaAtual === 1} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Anterior</button>
                    <span>Página {paginaAtual} de {totalPaginas}</span>
                    <button onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))} disabled={paginaAtual >= totalPaginas} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Próxima</button>
                </div>
            </div>

            {/* Modais */}
            <ModalErro mensagem={mensagemErro} onClose={() => setMensagemErro(null)} />
            {mostrarFiltroColunas && <ModalFiltroColunas colunas={todasColunas} colunasDropdown={colunasDropdownEditavel} onClose={() => setMostrarFiltroColunas(false)} onAplicar={handleAplicarFiltros} />}
            {mostrarEditarTabela && <ModalEditarTabela colunas={todasColunas} selecionadas={colunasVisiveis} onClose={() => setMostrarEditarTabela(false)} onSalvar={({ colunas }) => setColunasVisiveis(colunas)} />}
            {mostrarModalVisualizar && <ModalVisualizarPedido pedido={pedidoSelecionado} onClose={() => setMostrarModalVisualizar(false)} />}
        </div>
    );
}

