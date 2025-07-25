import { useEffect, useState } from 'react'
import axios from 'axios'
import { FaFileCsv, FaTable, FaFilter, FaEye, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

import { toast } from 'react-toastify'

import ModalErro from '@/components/modals/ModalErro'
import ModalFiltroColunas from '@/components/modals/ModalFiltroColunas'
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import ModalEditarTabela from '@/components/modals/ModalEditarTabela'
import ModalVisualizarPedido from '@/components/modals/ModalVisualizarPedido'


import { useAuth } from '@/context/AuthContext'

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function Listapedidos() {
    // Estados principais
    const [pedidos, setpedidos] = useState([])
    const [colunaFiltro, setColunaFiltro] = useState('cliente_nome')
    const [pedidoSelecionado, setpedidoSelecionado] = useState(null)

    // Estados de permissão e erro
    const { usuario } = useAuth()
    const [mensagemErro, setMensagemErro] = useState(null)

    // Estados para a paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 15; // ajuste conforme necessário
    const [loading, setLoading] = useState(false)
    const [totalPaginas, setTotalPaginas] = useState(1)

    // Customização da tabela
    const [mostrarFiltroColunas, setMostrarFiltroColunas] = useState(false)
    const [colunasVisiveis, setColunasVisiveis] = useState([]);
    const [todasColunas, setTodasColunas] = useState([]);
    const [dataInicio, setDataInicio] = useState('')
    const [dataFim, setDataFim] = useState('')
    const [filtrosSelecionados, setFiltrosSelecionados] = useState([])
    const [mostrarEditarTabela, setMostrarEditarTabela] = useState(false)
    const [filtroRapidoColuna, setFiltroRapidoColuna] = useState('cliente_nome')
    const [filtroRapidoTexto, setFiltroRapidoTexto] = useState('')
    const [opcoesDropdown, setOpcoesDropdown] = useState({})
    const [ordenacaoColuna, setOrdenacaoColuna] = useState(null);
    const [ordenacaoAscendente, setOrdenacaoAscendente] = useState(true);

    // Avisos
    const exibirAviso = (mensagem) => {
        setMensagemErro(mensagem);
    };

    // Visualizar
    const [mostrarModalVisualizar, setMostrarModalVisualizar] = useState(false)


    // Buscar pedidos ao montar
    const buscarpedidos = async () => {
        setLoading(true)

        try {
            const filtrosStr = [
                ...filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`),
                `situacao_pedido:Produção` // Filtro fixo para pedidos em Produção
            ].filter(Boolean).join(';'); // Garante que elementos nulos/vazios sejam removidos

            const params = {
                page: paginaAtual,
                limit: itensPorPagina,
                filtro_rapido_coluna: filtroRapidoColuna,
                filtro_rapido_texto: filtroRapidoTexto,
                filtros: filtrosStr || undefined,
                data_inicio: dataInicio || undefined,
                data_fim: dataFim || undefined,
                ordenar_por: ordenacaoColuna || 'ordem_finalizacao,data_finalizacao,data_emissao',
                ordenar_direcao: ordenacaoAscendente ? 'asc' : 'desc'
            }

            // USO DA VARIÁVEL DE AMBIENTE AQUI
            const res = await axios.get(`${API_URL}/pedidos/paginado`, { params })
            console.log("Dados recebidos:", res.data.resultados);

            setpedidos(res.data.resultados)
            setTotalPaginas(Math.ceil(res.data.total / itensPorPagina))
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error)
            setMensagemErro("Erro ao buscar pedidos")
        } finally {
            setLoading(false)
        }
    }


    useEffect(() => {
        if (!usuario || Object.keys(usuario).length === 0) return;

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
            "programacao",
            "criado_em",
            "data_finalizacao",
            "ordem_finalizacao",
            "endereco_expedicao",
            "hora_expedicao",
            "usuario_expedicao",
            "numero_nf",
            "data_nf"
        ];


        setTodasColunas(ordemPadrao);

        const colunas = usuario.colunas_visiveis_pedidos?.length
            ? usuario.colunas_visiveis_pedidos
            : ordemPadrao;

        setColunasVisiveis(colunas);

        if (!colunas.includes(colunaFiltro)) {
            setColunaFiltro(colunas[0]);
        }
    }, [usuario]);


    useEffect(() => {
        if (pedidos.length === 0) return;

        // Detecta novas colunas que não estavam em todasColunas
        const colunasDosPedidos = Array.from(
            new Set(pedidos.flatMap(obj => Object.keys(obj)))
        );

        setTodasColunas(prev => {
            const novas = colunasDosPedidos.filter(c => !prev.includes(c));
            return [...prev, ...novas];
        });
    }, [pedidos]);


    useEffect(() => {
        if (colunasVisiveis.length > 0) {
            buscarpedidos();
        }
    }, [
        colunasVisiveis,
        paginaAtual,
        filtrosSelecionados,
        filtroRapidoColuna,
        filtroRapidoTexto,
        dataInicio,
        dataFim,
        ordenacaoColuna,
        ordenacaoAscendente
    ]);




    useEffect(() => {
        if (colunasVisiveis.length > 0) {
            // Se a coluna atual não estiver mais visível, atualiza
            if (!colunasVisiveis.includes(colunaFiltro)) {
                setColunaFiltro(colunasVisiveis[0]) // define a primeira coluna visível
            }
        }
    }, [colunasVisiveis])


    const exportarCSV = async () => {
        try {
            const filtrosStr = [
                ...filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`),
                filtroRapidoTexto.trim() ? `${filtroRapidoColuna}:${filtroRapidoTexto}` : null,
                `situacao_pedido:Produção` // Filtro fixo para exportação de pedidos em Produção
            ].filter(Boolean).join(';');

            const params = {
                page: 1,
                limit: 10000,
                filtros: filtrosStr || undefined,
                data_inicio: dataInicio || undefined,
                data_fim: dataFim || undefined,
                ordenar_por: ordenacaoColuna || 'ordem_finalizacao,data_finalizacao,data_emissao',
                ordenar_direcao: ordenacaoAscendente ? 'asc' : 'desc'
            };

            // USO DA VARIÁVEL DE AMBIENTE AQUI
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
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', 'pedidos.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            toast.error("Erro ao exportar CSV");
            console.error("Erro exportar CSV:", err);
        }
    };

    const handleAplicarFiltros = ({ filtros, data_inicio, data_fim }) => {
        setFiltrosSelecionados(filtros || [])
        setDataInicio(data_inicio || '')
        setDataFim(data_fim || '')
        setPaginaAtual(1)
        setMostrarFiltroColunas(false)
    }


    const colunasDropdownEditavel = {
        situacao_pedido: "situacao_pedido",
        origem_venda: "origem_venda",
        tipo_frete: "tipo_frete",
        condicao_pagamento: "condicao_pagamento"
    };

    useEffect(() => {
        const tipo = colunasDropdownEditavel[filtroRapidoColuna]
        if (tipo && !opcoesDropdown[filtroRapidoColuna]) {
            // USO DA VARIÁVEL DE AMBIENTE AQUI
            axios.get(`${API_URL}/opcoes/${tipo}`)
                .then(res => {
                    setOpcoesDropdown(prev => ({
                        ...prev,
                        [filtroRapidoColuna]: res.data
                    }))
                })
                .catch(() => console.warn("Erro ao buscar opções para", filtroRapidoColuna))
        }
    }, [filtroRapidoColuna])

    const atualizarSituacaoPedido = async (novaSituacao) => {
        if (!pedidoSelecionado) return;

        try {
            // USO DA VARIÁVEL DE AMBIENTE AQUI
            const res = await axios.get(`${API_URL}/pedidos/paginado`, {
                params: {
                    filtro_rapido_coluna: "id",
                    filtro_rapido_texto: pedidoSelecionado.id,
                    page: 1,
                    limit: 1
                }
            });

            const pedidoCompleto = res.data.resultados?.[0];

            if (!pedidoCompleto) {
                toast.error("Pedido não encontrado.");
                return;
            }

            const payload = {
                situacao_pedido: novaSituacao,
                data_emissao: pedidoCompleto.data_emissao,
                data_validade: pedidoCompleto.data_validade,
                cliente: pedidoCompleto.cliente_id,
                cliente_nome: pedidoCompleto.cliente_nome,
                vendedor: pedidoCompleto.vendedor_id,
                vendedor_nome: pedidoCompleto.vendedor_nome,
                origem_venda: pedidoCompleto.origem_venda,
                tipo_frete: pedidoCompleto.tipo_frete,
                transportadora: pedidoCompleto.transportadora_id,
                transportadora_nome: pedidoCompleto.transportadora_nome,
                valor_frete: pedidoCompleto.valor_frete,
                total: pedidoCompleto.total,
                desconto_total: pedidoCompleto.desconto_total,
                total_com_desconto: pedidoCompleto.total_com_desconto,
                lista_itens: JSON.parse(pedidoCompleto.lista_itens || "[]"),
                formas_pagamento: JSON.parse(pedidoCompleto.formas_pagamento || "[]"),
                observacao: pedidoCompleto.observacao || ""
            };

            // USO DA VARIÁVEL DE AMBIENTE AQUI
            await axios.put(`${API_URL}/pedidos/${pedidoSelecionado.id}`, payload);

            toast.success(`Pedido ${novaSituacao.toLowerCase()} com sucesso!`);
            setpedidoSelecionado(null);
            buscarpedidos();
        } catch (error) {
            console.error("Erro ao atualizar situação:", error);
            toast.error("Erro ao atualizar a situação do pedido.");
        }
    };

    const formatarCampo = (valor, coluna) => {
        if (coluna === "formas_pagamento") {
            let formas = valor;
            if (typeof formas === "string") {
                try { formas = JSON.parse(formas); } catch (e) { return valor; }
            }

            if (Array.isArray(formas)) {
                return formas.map(fp => {
                    const tipo = fp.tipo || "N/D";
                    if (tipo === "Parcelamento") {
                        const parcelas = fp.parcelas || 1;
                        const valorParcela = Number(fp.valor_parcela || 0).toFixed(2);
                        return `${tipo} ${parcelas}x de R$ ${valorParcela}`;
                    }
                    const chaveValor = `valor_${tipo?.toLowerCase()}`;
                    const valorTipo = Number(fp[chaveValor] || 0).toFixed(2);
                    return `${tipo} R$ ${valorTipo}`;
                }).join(" + ");
            }
        }

        if (coluna === "lista_itens") {
            let itens = valor;
            if (typeof itens === "string") {
                try { itens = JSON.parse(itens); } catch (e) { return valor; }
            }

            if (Array.isArray(itens)) {
                return itens.map(item => {
                    const nome = item.produto || "Sem nome";
                    const qtd = item.quantidade_itens || 0;
                    const variacao = item.variacao ? ` - ${item.variacao}` : "";
                    return `${nome}${variacao} - ${qtd}`;
                }).join(" | ");
            }
        }

        if (coluna === "endereco_expedicao") {
            let endereco = valor;
            if (typeof endereco === "string") {
                try { endereco = JSON.parse(endereco); } catch (e) { return valor; }
            }

            if (typeof endereco === 'object' && endereco !== null) {
                const {
                    rua = '', numero = '', nivel = '', cor = ''
                } = endereco;

                return `Rua ${rua}, nº ${numero}, Nível ${nivel}, Cor ${cor}`;
            }
        }

        if (typeof valor === 'object' && valor !== null) {
            return JSON.stringify(valor);
        }

        return valor;
    };


    return (
        <div className="p-6">
            <div className="w-auto overflow-auto">
                {/* Barra de ações e filtros */}
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <div className="flex gap-2 flex-wrap">
                        {/* Botão de exportar CSV */}
                        <ButtonComPermissao type="button" onClick={exportarCSV} permissoes={["admin"]} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaFileCsv />Exportar CSV</ButtonComPermissao>
                    </div>

                    {/* Filtros de coluna + texto + botões de ação */}
                    <div className="flex gap-2">
                        {/* Filtro rápido simples */}
                        <div className="flex gap-2 items-center">
                            <select
                                value={filtroRapidoColuna}
                                onChange={(e) => {
                                    setFiltroRapidoColuna(e.target.value)
                                    setFiltroRapidoTexto("")
                                    setPaginaAtual(1)
                                }}
                                className="border p-2 rounded text-sm w-48"
                            >
                                {colunasVisiveis.map((col) => (
                                    <option key={col} value={col}>
                                        {col.replace(/_/g, ' ').toUpperCase()}
                                    </option>
                                ))}
                            </select>

                            <div className="w-64">
                                {colunasDropdownEditavel[filtroRapidoColuna] ? (
                                    <select
                                        value={filtroRapidoTexto}
                                        onChange={(e) => {
                                            setFiltroRapidoTexto(e.target.value)
                                            setPaginaAtual(1)
                                        }}
                                        className="w-full border p-2 rounded text-sm"
                                    >
                                        <option value="">Selecione</option>
                                        {(opcoesDropdown[filtroRapidoColuna] || []).map((op) => (
                                            <option key={op.id} value={op.valor}>{op.valor}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="Pesquisar..."
                                        value={filtroRapidoTexto}
                                        onChange={(e) => {
                                            setFiltroRapidoTexto(e.target.value)
                                            setPaginaAtual(1)
                                        }}
                                        className="w-full border p-2 rounded text-sm"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Botão de Filtro Rápido */}
                        <button
                            onClick={() => setMostrarFiltroColunas(true)}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded flex items-center gap-2"
                        >
                            <FaFilter />
                            Filtro Avançado
                        </button>

                        {/* Botão de Customizar Tabela */}
                        <button
                            onClick={() => setMostrarEditarTabela(true)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded flex items-center gap-2"
                        >
                            <FaTable />
                            Editar Tabela
                        </button>

                        {/* Botão Visualizar */}
                        <button
                            onClick={() => {
                                if (!pedidoSelecionado) return exibirAviso("Você deve selecionar um pedido primeiro!")
                                setMostrarModalVisualizar(true)
                            }}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2"
                        >
                            <FaEye />
                            Visualizar
                        </button>


                        {/* Botão Finalizar */}
                        <button
                            onClick={async () => {
                                if (!pedidoSelecionado) return exibirAviso("Selecione um pedido primeiro!")
                                await atualizarSituacaoPedido("Embalagem")
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
                        >
                            <FaCheckCircle />
                            Enviar para Embalagem
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
                                                        {formatarCampo(pedido[coluna], coluna)}
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

                {/* Paginação (somente se não estiver carregando) */}
                {!loading && (
                    <div className="flex justify-start items-start gap-4 mt-4">
                        <button
                            onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
                            disabled={paginaAtual === 1}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <span>
                            Página {paginaAtual} de {totalPaginas}
                        </span>
                        <button
                            onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))}
                            disabled={paginaAtual >= totalPaginas}
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
                        >
                            Próxima
                        </button>
                    </div>

                )}


            </div>


            <ModalErro
                mensagem={mensagemErro}
                onClose={() => setMensagemErro(null)}
            />

            {mostrarFiltroColunas && (
                <ModalFiltroColunas
                    colunas={todasColunas}
                    colunasDropdown={colunasDropdownEditavel}
                    onClose={() => setMostrarFiltroColunas(false)}
                    onAplicar={handleAplicarFiltros}
                    onChangeColuna={(index, novaColuna) => {
                        setFiltrosSelecionados((prev) => {
                            const atual = [...prev]
                            atual[index] = { ...atual[index], coluna: novaColuna, texto: '' } // limpa texto ao trocar coluna
                            return atual
                        })
                    }}
                    API_URL={API_URL} // Passa API_URL para o ModalFiltroColunas
                />
            )}

            {mostrarEditarTabela && (
                <ModalEditarTabela
                    colunas={todasColunas}
                    selecionadas={colunasVisiveis}
                    exemplos={[...pedidos].slice(-10).reverse()}
                    onClose={() => setMostrarEditarTabela(false)}
                    onSalvar={({ colunas, ordenacao }) => {
                        setColunasVisiveis(colunas);
                        if (ordenacao?.coluna) {
                            setOrdenacaoColuna(ordenacao.coluna);
                            setOrdenacaoAscendente(ordenacao.ascendente);
                        }
                        setMostrarEditarTabela(false);
                    }}
                />
            )}

            {mostrarModalVisualizar && (
                <ModalVisualizarPedido
                    pedido={pedidoSelecionado}
                    onClose={() => setMostrarModalVisualizar(false)}
                />
            )}
        </div>
    )
}