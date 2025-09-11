import React, { useMemo } from 'react';
import { X, Factory, Package } from 'lucide-react';

export default function ModalVisualizarItensProgramados({ pedido, onClose }) {
    if (!pedido) {
        return null;
    }

    // Usamos useMemo para parsear a programação apenas quando o pedido mudar.
    // Isso evita processamento desnecessário a cada renderização.
    const programacao = useMemo(() => {
        if (!pedido.programacao || typeof pedido.programacao !== 'string') {
            return { ordens_producao: [], retiradas_estoque: [] };
        }
        try {
            // Tenta parsear o JSON. Se falhar, retorna um objeto vazio para não quebrar o componente.
            const parsedData = JSON.parse(pedido.programacao);
            return {
                ordens_producao: parsedData.ordens_producao || [],
                retiradas_estoque: parsedData.retiradas_estoque || []
            };
        } catch (error) {
            console.error("Erro ao parsear a programação do pedido:", error);
            return { ordens_producao: [], retiradas_estoque: [] };
        }
    }, [pedido]);

    const hasOrdensProducao = programacao.ordens_producao.length > 0;
    const hasRetiradasEstoque = programacao.retiradas_estoque.length > 0;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[90vh] flex flex-col">
                <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-red-500 transition-colors">
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    Itens Programados - Pedido #{pedido.id}
                </h2>

                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                    {/* Seção de Ordens de Produção */}
                    {hasOrdensProducao && (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 border-b pb-2">
                                <Factory size={20} className="text-blue-600" />
                                Ordens de Produção
                            </h3>
                            <ul className="space-y-2">
                                {programacao.ordens_producao.map((item, index) => (
                                    <li key={`prod-${index}`} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-gray-800">{item.produto_nome}</p>
                                            {item.variacao && <p className="text-sm text-gray-500">Variação: {item.variacao}</p>}
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-lg text-blue-600">{item.quantidade}</span>
                                            <p className="text-xs text-gray-500">Unidades</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Seção de Retiradas do Estoque */}
                    {hasRetiradasEstoque && (
                        <div className="space-y-3">
                            <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 border-b pb-2">
                                <Package size={20} className="text-green-600" />
                                Retiradas do Estoque
                            </h3>
                            <ul className="space-y-2">
                                {programacao.retiradas_estoque.map((item, index) => (
                                    <li key={`ret-${index}`} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-gray-800">{item.produto_nome}</p>
                                            <p className="text-sm text-gray-500">
                                                Lote: <strong>{item.origem.lote}</strong> | Dep: {item.origem.deposito} | {item.origem.rua}-{item.origem.numero}-{item.origem.nivel}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-lg text-green-600">{item.quantidade}</span>
                                            <p className="text-xs text-gray-500">Unidades</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {!hasOrdensProducao && !hasRetiradasEstoque && (
                         <div className="flex flex-col justify-center items-center h-40 text-gray-500">
                            <p>Nenhuma programação encontrada para este pedido.</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 px-5 py-2.5 rounded-md font-medium hover:bg-gray-300 transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
