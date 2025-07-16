// /components/modals/ModalFaturarPedido.jsx

import { useState, useEffect, useCallback } from 'react';
import { X, FileText, FilePlus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

// O componente CampoTextsimples pode ser mantido como está.
import CampoTextsimples from '@/components/campos/CampoTextsimples';

export default function ModalFaturarPedido({
    onClose,
    onConfirmarFaturamento,
    onErro,
    onNfeGeradaSucesso, // Callback para atualizar a lista na página pai
    pedidoSelecionado,
    API_URL
}) {
    // Estados para gerenciar o fluxo assíncrono
    const [statusNfe, setStatusNfe] = useState('INICIAL'); // INICIAL, ENVIANDO, CONSULTANDO, AUTORIZADO, REJEITADO, ERRO
    const [mensagem, setMensagem] = useState('');
    const [numeroNfExibicao, setNumeroNfExibicao] = useState('');
    
    // Função para tratar erros de forma centralizada
    const handleError = useCallback((errorMsg) => {
        setStatusNfe('ERRO');
        setMensagem(errorMsg);
        onErro?.(errorMsg);
    }, [onErro]);

    // Função para ENVIAR a NF-e para o backend
    const enviarNfe = async () => {
        if (!pedidoSelecionado?.id) {
            handleError("ID do Pedido não encontrado para gerar NF-e.");
            return;
        }
        setStatusNfe('ENVIANDO');
        setMensagem('Enviando NF-e para a SEFAZ...');
        try {
            const response = await axios.post(`${API_URL}/nfe/emitir`, { pedido_id: pedidoSelecionado.id });
            const data = response.data;
            if (data.status === 'AGUARDANDO_CONSULTA') {
                // Notifica o pai para atualizar o pedido com o status inicial e o recibo
                onNfeGeradaSucesso?.({ pedido_id: pedidoSelecionado.id, nfe_status: 'AGUARDANDO_CONSULTA', nfe_recibo: data.recibo });
                setStatusNfe('CONSULTANDO');
                setMensagem(`NF-e em processamento. Consultando automaticamente...`);
            } else {
                handleError(data.message || "Resposta inesperada do servidor.");
            }
        } catch (error) {
            handleError(error.response?.data?.detail || "Erro de comunicação ao enviar NF-e.");
        }
    };

    // Função para CONSULTAR o status do pedido
    const consultarStatus = useCallback(async () => {
        if (!pedidoSelecionado?.id) return 'finalizado';

        try {
            const response = await axios.post(`${API_URL}/nfe/consultar/${pedidoSelecionado.id}`);
            const data = response.data;

            if (data.status === 'AUTORIZADO') {
                setStatusNfe('AUTORIZADO');
                setMensagem(`NF-e AUTORIZADA! Número: ${data.numero_nf}.`);
                setNumeroNfExibicao(`NF-e: ${data.numero_nf}`);
                onNfeGeradaSucesso?.({ pedido_id: pedidoSelecionado.id, nfe_status: 'AUTORIZADO', numero_nf: data.numero_nf, data_nf: new Date().toISOString(), nfe_chave: data.chave_nfe });
                return 'finalizado';
            } else if (data.status === 'REJEITADO') {
                handleError(`NF-e Rejeitada: ${data.message}`);
                onNfeGeradaSucesso?.({ pedido_id: pedidoSelecionado.id, nfe_status: 'REJEITADO', nfe_rejeicao_motivo: data.message });
                return 'finalizado';
            } else if (data.status === 'ERRO_CONSULTA') {
                handleError(`Erro na consulta: ${data.message}`);
                return 'finalizado';
            }
            else { // EM_PROCESSAMENTO
                setMensagem("Aguardando resposta da SEFAZ... Nova consulta em 10 segundos.");
                return 'continuar';
            }
        } catch (error) {
            handleError(error.response?.data?.detail || "Erro de comunicação ao consultar NF-e.");
            return 'finalizado';
        }
    }, [pedidoSelecionado?.id, API_URL, onNfeGeradaSucesso, handleError]);

    // Efeito para configurar o estado inicial do Modal
    useEffect(() => {
        if (pedidoSelecionado?.nfe_status === 'AUTORIZADO') {
            setStatusNfe('AUTORIZADO');
            setNumeroNfExibicao(`NF-e: ${pedidoSelecionado.numero_nf}`);
            setMensagem('Este pedido já possui uma NF-e autorizada.');
        } else if (pedidoSelecionado?.nfe_status === 'AGUARDANDO_CONSULTA') {
            setStatusNfe('CONSULTANDO');
            setMensagem('Este pedido já foi enviado. Verificando status...');
        } else if (pedidoSelecionado?.nfe_status === 'REJEITADO' || pedidoSelecionado?.nfe_status === 'ERRO_ENVIO' || pedidoSelecionado?.nfe_status === 'ERRO_CONSULTA') {
            setStatusNfe('ERRO');
            setMensagem(`Falha anterior: ${pedidoSelecionado.nfe_rejeicao_motivo || 'Tente enviar novamente.'}`);
        } else {
            setStatusNfe('INICIAL');
            setMensagem('Pronto para iniciar a emissão da NF-e.');
        }
    }, [pedidoSelecionado]);

    // Efeito para controlar o polling (a consulta periódica)
    useEffect(() => {
        let timer;
        if (statusNfe === 'CONSULTANDO') {
            timer = setTimeout(async () => {
                const resultado = await consultarStatus();
                if (resultado === 'continuar') {
                    // Se a consulta deve continuar, forçamos um re-render para manter o loop
                    // de forma segura, alterando o estado para ele mesmo.
                    setStatusNfe('CONSULTANDO');
                }
            }, 10000); // Consulta a cada 10 segundos
        }
        // Limpa o timeout se o componente for desmontado ou o status mudar
        return () => clearTimeout(timer);
    }, [statusNfe, consultarStatus]);

    const getStatusIcon = () => {
        if (statusNfe === 'ENVIANDO' || statusNfe === 'CONSULTANDO') return <Loader2 size={20} className="animate-spin mr-2" />;
        if (statusNfe === 'AUTORIZADO') return <CheckCircle size={18} className="mr-2 flex-shrink-0" />;
        if (statusNfe === 'ERRO' || statusNfe === 'REJEITADO') return <AlertCircle size={18} className="mr-2 flex-shrink-0" />;
        return null;
    };
    const getStatusColor = () => {
        if (statusNfe === 'AUTORIZADO') return 'bg-green-50 border-green-200 text-green-700';
        if (statusNfe === 'ERRO' || statusNfe === 'REJEITADO') return 'bg-red-50 border-red-200 text-red-700';
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }

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
                        disabled={statusNfe !== 'INICIAL' && statusNfe !== 'ERRO'}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed"
                    >
                        <FilePlus size={18} />
                        {statusNfe === 'ERRO' ? 'Tentar Enviar Novamente' : 'Gerar e Enviar NF-e'}
                    </button>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirmarFaturamento}
                            disabled={statusNfe !== 'AUTORIZADO'}
                            className="w-full sm:flex-1 bg-teal-600 text-white px-5 py-2.5 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors disabled:bg-teal-300 disabled:cursor-not-allowed"
                        >
                            Confirmar Faturamento
                        </button>
                    </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                    <p><strong>Nota:</strong> Após o envio, o sistema consultará o status na SEFAZ automaticamente a cada 10 segundos.</p>
                </div>
            </div>
        </div>
    );
}
