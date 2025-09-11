import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Ícones
import { X, ClipboardList, Loader2, Package, Factory } from 'lucide-react';

// Componentes de campo personalizados
import CampoData from '@/components/campos/CampoData';
import CampoDecimalSetas from '@/components/campos/CampoDecimalSetas';
import CampoNumSetas from '@/components/campos/CampoNumSetas';

// URL da sua API
const API_URL = import.meta.env.VITE_API_BASE_URL;

//================================================================================
// Sub-componente do Card (Layout Aprimorado)
//================================================================================
const ProdutoProgramacaoCard = ({ produto, onUpdate }) => {
    const {
        produto_id,
        produto_nome,
        quantidade_necessaria,
        permite_producao,
        estoque_disponivel, // A lista completa que vem da API
        estoque_total,
    } = produto;

    const [alocacoes, setAlocacoes] = useState({});
    const [quantidadeProduzir, setQuantidadeProduzir] = useState(0);

    const totalAlocado = Object.values(alocacoes).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const restante = quantidade_necessaria - totalAlocado - quantidadeProduzir;

    useEffect(() => {
        onUpdate(produto_id, {
            produto_nome,
            variacao: produto.variacao,
            alocacoes,
            quantidadeProduzir,
            totalAlocado,
            restante: quantidade_necessaria - totalAlocado - quantidadeProduzir,
        });
    }, [alocacoes, quantidadeProduzir, onUpdate, produto_id, quantidade_necessaria, produto_nome, produto.variacao]);

    const handleAlocacaoChange = (posicaoKey, value) => {
        const numValue = Number(value) || 0;
        const posicao = estoque_disponivel.find(p => getPosicaoKey(p) === posicaoKey);
        if (numValue > posicao.quantidade) return;
        setAlocacoes(prev => ({ ...prev, [posicaoKey]: numValue }));
    };

    const handleProducaoChange = (e) => {
        const numValue = Number(e.target.value) || 0;
        setQuantidadeProduzir(numValue);
    };

    const getPosicaoKey = (p) => `${p.lote}-${p.deposito}-${p.rua}-${p.numero}-${p.nivel}-${p.cor}`;

    const estoquesParaRetirada = estoque_disponivel.filter(
        (posicao) => posicao.situacao_estoque === 'Disponível'
    );

    return (
        <div className="border rounded-lg bg-gray-50/70 p-4 space-y-4">
            <div>
                <h3 className="font-bold text-lg text-gray-800">{produto_nome}</h3>
                <div className="flex justify-between items-center text-sm mt-1 flex-wrap gap-2">
                    <span className="text-gray-600">Necessário: <strong className="text-black">{quantidade_necessaria}</strong></span>
                    <span className="text-gray-600">Em Estoque: <strong className={estoque_total < quantidade_necessaria ? 'text-red-600' : 'text-green-600'}>{estoque_total}</strong></span>
                    <span className={`font-semibold text-base ${restante === 0 ? 'text-teal-600' : restante < 0 ? 'text-red-500' : 'text-orange-500'}`}>
                        Pendente: <strong>{restante}</strong>
                    </span>
                </div>
            </div>
            <hr />
            <div className="space-y-4">
                <div>
                    <CampoNumSetas
                        label="Quantidade a Produzir"
                        name={`producao_${produto_id}`}
                        value={quantidadeProduzir}
                        onChange={handleProducaoChange}
                        disabled={!permite_producao}
                        placeholder="0"
                    />
                    {!permite_producao &&
                        <p className="text-xs text-gray-500 mt-1">Este produto não está configurado para produção sob demanda.</p>
                    }
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Retirar do Estoque</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 rounded-md border bg-white p-2">
                        {estoquesParaRetirada.length > 0 ? (
                            estoquesParaRetirada.map(posicao => (
                                <div key={getPosicaoKey(posicao)} className="grid grid-cols-5 gap-x-4 items-center">
                                    <div className='col-span-2 text-xs text-gray-600'>
                                        <span><strong>Lote: {posicao.lote}</strong></span><br />
                                        <span><strong>Dep: {posicao.deposito} | {posicao.rua} | {posicao.numero} | {posicao.nivel}</strong></span>
                                    </div>
                                    <div className="text-xs text-center text-gray-500">
                                        Disp:<br /><strong>{posicao.quantidade}</strong>
                                    </div>
                                    <div className='text-right col-span-2'>
                                        <CampoNumSetas
                                            name={`alocacao_${getPosicaoKey(posicao)}`}
                                            value={alocacoes[getPosicaoKey(posicao)] || ""}
                                            onChange={(e) => handleAlocacaoChange(getPosicaoKey(posicao), e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-sm text-gray-500 py-4">Nenhum estoque disponível.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


//================================================================================
// Componente Principal do Modal
//================================================================================
export default function ModalProgramacaoPedido({ pedido, onClose, onConfirmar }) {
    if (!pedido) {
        return null;
    }

    const [dataFinalizacao, setDataFinalizacao] = useState('');
    const [ordemFinalizacao, setOrdemFinalizacao] = useState(1);
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [programacoes, setProgramacoes] = useState({});

    const listaItensDoPedido = useMemo(() => {
        if (typeof pedido.lista_itens === 'string') {
            try {
                return JSON.parse(pedido.lista_itens);
            } catch (e) {
                return [];
            }
        }
        return pedido.lista_itens || [];
    }, [pedido.lista_itens]);

    useEffect(() => {
        if (!pedido?.id) return;

        const fetchAnaliseEstoque = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await axios.get(`${API_URL}/pedidos/${pedido.id}/analise_estoque`);
                setProdutos(response.data);
            } catch (err) {
                const errorMsg = err?.response?.data?.detail || "Erro ao buscar dados de estoque do pedido.";
                setError(errorMsg);
                toast.error(errorMsg);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnaliseEstoque();
    }, [pedido]);

    const handleUpdateProdutoProgramacao = useCallback((produtoId, data) => {
        setProgramacoes(prev => ({
            ...prev,
            [produtoId]: data,
        }));
    }, []);

    const confirmar = () => {
        if (!dataFinalizacao || ordemFinalizacao === '') {
            toast.error("Preencha a Data e a Ordem de Finalização.");
            return;
        }

        for (const produtoId in programacoes) {
            if (programacoes[produtoId].restante > 0) {
                toast.warn(`Existem produtos com quantidades pendentes.`);
                return;
            }
            if (programacoes[produtoId].restante < 0) {
                toast.error(`Programação excede a quantidade necessária para um produto. Verifique os valores.`);
                return;
            }
        }

        const retiradas_estoque = [];
        const ordens_producao = [];

        for (const produtoId in programacoes) {
            const prog = programacoes[produtoId];

            if (prog.quantidadeProduzir > 0) {
                ordens_producao.push({
                    produto_id: parseInt(produtoId),
                    produto_nome: prog.produto_nome,
                    variacao: prog.variacao || null,
                    quantidade: prog.quantidadeProduzir,
                });
            }

            if (prog.alocacoes) {
                for (const posKey in prog.alocacoes) {
                    const quantidade = prog.alocacoes[posKey];
                    if (quantidade > 0) {
                        const [lote, deposito, rua, numero, nivel, cor] = posKey.split('-');
                        retiradas_estoque.push({
                            produto_id: parseInt(produtoId),
                            produto_nome: prog.produto_nome,
                            quantidade: quantidade,
                            origem: { lote, deposito, rua, numero, nivel, cor }
                        });
                    }
                }
            }
        }
        
        // =======================================================================
        // AQUI ESTÁ A NOVA LÓGICA
        // =======================================================================
        // Determina a situação do pedido dinamicamente com base nas ordens de produção.
        const situacaoPedidoFinal = ordens_producao.length === 0 ? "Embalagem" : "Produção";

        const payload = {
            data_finalizacao: dataFinalizacao,
            ordem_finalizacao: ordemFinalizacao,
            // Utiliza a variável para definir a situação correta do pedido
            situacao_pedido: situacaoPedidoFinal,
            programacao: { 
                data_programacao: new Date().toISOString(),
                retiradas_estoque,
                ordens_producao
            }
        };

        onConfirmar(payload);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-3xl relative max-h-[90vh] flex flex-col">
                <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-red-500 transition-colors">
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <ClipboardList size={22} /> Programar Pedido #{pedido.id}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 mb-4 border-b pb-4">
                    <CampoData
                        label="Data de Finalização"
                        name="data_finalizacao"
                        value={dataFinalizacao}
                        onChange={(e) => setDataFinalizacao(e.target.value)}
                        obrigatorio
                        hojeMaisDias={1}
                    />
                    <CampoDecimalSetas
                        label="Ordem de Finalização"
                        name="ordem_finalizacao"
                        value={ordemFinalizacao}
                        onChange={(e) => setOrdemFinalizacao(e.target.value)}
                    />
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-40 text-gray-500">
                            <Loader2 className="animate-spin text-teal-600" size={32} />
                            <p className="ml-2 mt-2">Analisando estoque e produção...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col justify-center items-center h-40 text-red-600 bg-red-50 rounded-lg">
                            <p className="font-semibold">Ocorreu um erro</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : (
                        produtos.map(produtoAnalise => {
                            const itemOriginalDoPedido = listaItensDoPedido.find(
                                item => item.produto_id === produtoAnalise.produto_id
                            );

                            return (
                                <ProdutoProgramacaoCard
                                    key={produtoAnalise.produto_id}
                                    produto={{ ...produtoAnalise, ...itemOriginalDoPedido }}
                                    onUpdate={handleUpdateProdutoProgramacao}
                                />
                            )
                        })
                    )}
                </div>

                <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 px-5 py-2.5 rounded-md font-medium hover:bg-gray-300 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={confirmar}
                        className="bg-teal-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={loading || !!error || produtos.length === 0}
                    >
                        Confirmar Programação
                    </button>
                </div>
            </div>
        </div>
    );
}