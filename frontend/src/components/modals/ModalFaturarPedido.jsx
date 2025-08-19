// /components/modals/ModalFaturarPedido.jsx

import { useState, useEffect, useCallback } from 'react';
import { X, FileText, AlertCircle, CheckCircle, Loader2, Send } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

import CampoTextsimples from '@/components/campos/CampoTextsimples';

export default function ModalFaturarPedido({
    onClose,
    onConfirmarFaturamento,
    onNfeProcessando, // Callback para indicar que a NF-e foi enviada
    pedidoSelecionado,
    API_URL
}) {
    // Estados para gerenciar o fluxo da UI
    const [statusEnvio, setStatusEnvio] = useState('INICIAL'); // INICIAL, ENVIANDO, SUCESSO, ERRO
    const [mensagem, setMensagem] = useState('');
    const [numeroNfExibicao, setNumeroNfExibicao] = useState('');

    // Função para tratar erros de forma centralizada
    const handleError = useCallback((errorMsg) => {
        setStatusEnvio('ERRO');
        setMensagem(errorMsg);
        toast.error(errorMsg);
    }, []);

    // Função para ENVIAR a NF-e para o backend
    const enviarNfe = async () => {
        if (!pedidoSelecionado?.id) {
            handleError("ID do Pedido não encontrado.");
            return;
        }
        setStatusEnvio('ENVIANDO');
        setMensagem('Enviando NF-e para processamento...');
        try {
            // [ALTERAÇÃO 1] Aponta para o novo endpoint da Focus NF-e.
            const response = await axios.post(`${API_URL}/nfe-focus/emitir`, { pedido_id: pedidoSelecionado.id });
            const data = response.data;

            if (data.status === 'PROCESSANDO') {
                setStatusEnvio('SUCESSO');
                setMensagem('NF-e enviada com sucesso! O status será atualizado em breve.');
                toast.success('NF-e enviada para processamento!');
                
                // [ALTERAÇÃO 2] Usa 'data.ref' em vez de 'data.uuid' para atualizar a UI.
                // O backend da Focus NF-e retorna uma 'ref', que salvamos no campo 'nfe_uuid' do pedido.
                onNfeProcessando?.({ 
                    pedido_id: pedidoSelecionado.id, 
                    nfe_status: 'PROCESSANDO', 
                    nfe_uuid: data.ref 
                });
                
                // Fecha o modal após um curto período
                setTimeout(() => onClose(), 2000);

            } else {
                handleError(data.message || "Resposta inesperada do servidor.");
            }
        } catch (error) {
            handleError(error.response?.data?.detail || "Erro de comunicação ao enviar NF-e.");
        }
    };

    // Efeito para configurar o estado inicial do Modal (nenhuma alteração aqui)
    useEffect(() => {
        if (pedidoSelecionado?.nfe_status === 'AUTORIZADO') {
            setStatusEnvio('SUCESSO');
            setNumeroNfExibicao(`NF-e: ${pedidoSelecionado.numero_nf}`);
            setMensagem('Este pedido já possui uma NF-e autorizada.');
        } else if (pedidoSelecionado?.nfe_status === 'PROCESSANDO') {
            setStatusEnvio('INICIAL');
            setNumeroNfExibicao('Processando...');
            setMensagem('A NF-e deste pedido já está em processamento.');
        } else if (pedidoSelecionado?.nfe_status === 'REJEITADO') {
            setStatusEnvio('ERRO');
            setMensagem(`Falha anterior: ${pedidoSelecionado.nfe_rejeicao_motivo || 'Tente enviar novamente.'}`);
        } else {
            setStatusEnvio('INICIAL');
            setMensagem('Pronto para iniciar a emissão da NF-e.');
        }
    }, [pedidoSelecionado]);

    const getStatusIcon = () => {
        if (statusEnvio === 'ENVIANDO') return <Loader2 size={20} className="animate-spin mr-2" />;
        if (statusEnvio === 'SUCESSO') return <CheckCircle size={18} className="mr-2 flex-shrink-0" />;
        if (statusEnvio === 'ERRO') return <AlertCircle size={18} className="mr-2 flex-shrink-0" />;
        return null;
    };
    const getStatusColor = () => {
        if (statusEnvio === 'SUCESSO') return 'bg-green-50 border-green-200 text-green-700';
        if (statusEnvio === 'ERRO') return 'bg-red-50 border-red-200 text-red-700';
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }

    const podeConfirmarFaturamento = pedidoSelecionado?.nfe_status === 'AUTORIZADO';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md relative transform transition-all duration-300 ease-out">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Fechar modal">
                    <X size={24} />
                </button>
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <FileText size={22} className="mr-2" />
                    Faturar Pedido #{pedidoSelecionado?.id || ''}
                </h2>

                <CampoTextsimples
                    label="Status/Número NF-e"
                    name="status_nfe"
                    value={numeroNfExibicao}
                    onChange={() => {}}
                    placeholder="Aguardando emissão..."
                    disabled={true}
                />
                
                {mensagem && (
                    <div className={`my-3 p-3 border rounded-md text-sm flex items-start ${getStatusColor()}`}>
                        {getStatusIcon()}
                        <span>{mensagem}</span>
                    </div>
                )}

                <div className="mt-6 space-y-3">
                    <button
                        onClick={enviarNfe}
                        disabled={statusEnvio === 'ENVIANDO' || statusEnvio === 'SUCESSO' || pedidoSelecionado?.nfe_status === 'AUTORIZADO' || pedidoSelecionado?.nfe_status === 'PROCESSANDO'}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                        {statusEnvio === 'ERRO' ? 'Tentar Enviar Novamente' : 'Enviar NF-e para Processamento'}
                    </button>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300"
                        >
                            {podeConfirmarFaturamento ? 'Fechar' : 'Cancelar'}
                        </button>
                        <button
                            onClick={onConfirmarFaturamento}
                            disabled={!podeConfirmarFaturamento}
                            className="w-full sm:flex-1 bg-teal-600 text-white px-5 py-2.5 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors disabled:bg-teal-300 disabled:cursor-not-allowed"
                        >
                            Confirmar Faturamento e Mover
                        </button>
                    </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                    <p><strong>Nota:</strong> Após o envio, o status será atualizado automaticamente quando a SEFAZ autorizar a nota.</p>
                </div>
            </div>
        </div>
    );
}
