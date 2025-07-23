import { useState } from 'react';
import { X, WalletCards, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ModalAprovarPedido({
    onClose,
    onAprovacaoCompleta, // Prop para notificar a conclusão
    pedido
}) {
    const [status, setStatus] = useState('INICIAL'); // INICIAL, PROCESSANDO, SUCESSO, ERRO
    const [mensagem, setMensagem] = useState('Confirme para gerar a conta a receber e aprovar o pedido.');

    const handleConfirmarAprovacao = async () => {
        if (!pedido?.id) {
            setStatus('ERRO');
            setMensagem("ID do Pedido não encontrado. Não é possível continuar.");
            return;
        }

        setStatus('PROCESSANDO');
        setMensagem('Iniciando o processo de aprovação...');

        try {
            // Etapa 1: Buscar dados completos do pedido (garante dados atualizados)
            setMensagem('1/3: Verificando dados do pedido...');
            const resPedido = await axios.get(`${API_URL}/pedidos/paginado`, {
                params: { filtro_rapido_coluna: "id", filtro_rapido_texto: pedido.id, page: 1, limit: 1 }
            });
            const pedidoCompleto = resPedido.data.resultados?.[0];

            if (!pedidoCompleto) {
                throw new Error("Pedido não foi encontrado no servidor.");
            }

            // Etapa 2: Montar e enviar o payload para a API de contas
            setMensagem('2/3: Gerando a conta no financeiro...');
            const formasPagamentoParsed = JSON.parse(pedidoCompleto.formas_pagamento || "[]");
            const payloadConta = {
                tipo_conta: "a receber", // Ajustado para minúsculas para consistência
                situacao_conta: "Pendente",
                descricao_conta: `Recebimento referente ao pedido ${pedidoCompleto.id}`,
                num_conta: pedidoCompleto.id,
                id_cliente_fornecedor: pedidoCompleto.cliente_id,
                nome_cliente_fornecedor: pedidoCompleto.cliente_nome,
                data_emissao: pedidoCompleto.data_emissao,
                data_vencimento: pedidoCompleto.data_emissao, // Backend ajusta as parcelas
                plano_contas: "Receita de Vendas",
                caixa_destino_origem: "Caixa Principal",
                observacoes_conta: `Pedido de Venda #${pedidoCompleto.id}`,
                formas_pagamento: formasPagamentoParsed,
            };

            await axios.post(`${API_URL}/contas`, payloadConta);
            toast.info("Conta financeira gerada com sucesso!");

            // Etapa 3: Atualizar o status do pedido
            setMensagem('3/3: Atualizando o status do pedido...');
            const payloadPedido = {
                situacao_pedido: "Programação",
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
                formas_pagamento: formasPagamentoParsed,
                observacao: pedidoCompleto.observacao || ""
            };

            await axios.put(`${API_URL}/pedidos/${pedido.id}`, payloadPedido);

            // Sucesso!
            setStatus('SUCESSO');
            setMensagem(`Pedido #${pedido.id} aprovado com sucesso!`);
            toast.success(`Pedido #${pedido.id} movido para Programação.`);
            
            setTimeout(() => {
                onAprovacaoCompleta(); // Notifica o componente pai para fechar e atualizar
            }, 2000); // Fecha o modal após 2 segundos de sucesso

        } catch (error) {
            console.error("Erro no processo de aprovação:", error);
            const errorMsg = error.response?.data?.detail || error.message || "Ocorreu um erro desconhecido.";
            setStatus('ERRO');
            setMensagem(errorMsg);
            toast.error(errorMsg);
        }
    };

    const getStatusIcon = () => {
        if (status === 'PROCESSANDO') return <Loader2 size={20} className="animate-spin mr-2" />;
        if (status === 'SUCESSO') return <CheckCircle size={18} className="mr-2 flex-shrink-0" />;
        if (status === 'ERRO') return <AlertCircle size={18} className="mr-2 flex-shrink-0" />;
        return <WalletCards size={18} className="mr-2 flex-shrink-0" />;
    };

    const getStatusColor = () => {
        if (status === 'SUCESSO') return 'bg-green-50 border-green-200 text-green-700';
        if (status === 'ERRO') return 'bg-red-50 border-red-200 text-red-700';
        if (status === 'PROCESSANDO') return 'bg-blue-50 border-blue-200 text-blue-700';
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }

    const isProcessing = status === 'PROCESSANDO' || status === 'SUCESSO';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md relative transform transition-all duration-300 ease-out">
                <button 
                    onClick={onClose} 
                    disabled={isProcessing}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed" 
                    aria-label="Fechar modal">
                    <X size={24} />
                </button>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <WalletCards size={22} className="mr-2 text-indigo-600" />
                    Aprovar Pedido e Gerar Financeiro
                </h2>

                <div className="mb-4 bg-gray-50 p-3 rounded-lg border">
                    <p className="text-sm text-gray-600">Pedido: <strong className="font-medium text-gray-900">#{pedido?.id}</strong></p>
                    <p className="text-sm text-gray-600">Cliente: <strong className="font-medium text-gray-900">{pedido?.cliente_nome}</strong></p>
                    <p className="text-sm text-gray-600">Valor Total: <strong className="font-medium text-gray-900">R$ {Number(pedido?.total_com_desconto || 0).toFixed(2)}</strong></p>
                </div>
                
                {mensagem && (
                    <div className={`my-4 p-3 border rounded-md text-sm flex items-start ${getStatusColor()}`}>
                        {getStatusIcon()}
                        <span className="flex-1">{mensagem}</span>
                    </div>
                )}

                <div className="mt-6 flex flex-col gap-3">
                    <button
                        onClick={handleConfirmarAprovacao}
                        disabled={isProcessing || status === 'ERRO'}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed"
                    >
                        <CheckCircle size={18} />
                        Confirmar e Aprovar
                    </button>
                    {status === 'ERRO' && (
                         <button
                         onClick={handleConfirmarAprovacao}
                         className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
                     >
                         Tentar Novamente
                     </button>
                    )}
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}