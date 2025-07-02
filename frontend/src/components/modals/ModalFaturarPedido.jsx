// components/modals/ModalFaturarPedido.jsx
import { useState, useEffect } from 'react';
// Ícones Lucide
import { X, FileText, FilePlus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
// Ícone Font Awesome
import { FaSync } from 'react-icons/fa';

import CampoTextsimples from '@/components/campos/CampoTextsimples';

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ModalFaturarPedido({ onClose, onConfirmarFaturamento, onErro, onNfeGeradaSucesso, pedidoSelecionado }) {
    // ATUALIZADO: Variáveis de estado renomeadas para clareza e padrão
    const [numeroNfExibicao, setNumeroNfExibicao] = useState('');
    const [tecnospeedId, setTecnospeedId] = useState(null);
    const [tecnospeedIdIntegracao, setTecnospeedIdIntegracao] = useState(null);
    const [statusEnvio, setStatusEnvio] = useState('');
    const [mensagemErro, setMensagemErro] = useState('');
    const [mensagemSucesso, setMensagemSucesso] = useState('');

    // ATUALIZADO: Função agora usa as variáveis de estado com nomes padronizados
    const consultarStatusNfe = async (id, idIntegracao) => {
        if (!id && !idIntegracao) {
            setMensagemErro("Não foi possível consultar o status: IDs de NF-e ausentes.");
            setStatusEnvio('erro_envio');
            return;
        }

        setMensagemSucesso('Consultando status da NF-e...');
        setMensagemErro('');
        setStatusEnvio('carregando');

        try {
            const consultaId = id || idIntegracao;
            const statusResponse = await fetch(`${API_URL}/v2/nfe/resumo/${consultaId}`);
            const statusData = await statusResponse.json();

            if (!statusResponse.ok) {
                const errorMsgStatus = statusData.detail || "Erro desconhecido ao consultar status.";
                setMensagemErro(`Falha ao consultar status da NF-e: ${errorMsgStatus}`);
                setStatusEnvio('erro_envio');
                onErro?.(errorMsgStatus);
                return;
            }

            const novoStatusTecnospeed = statusData.status || 'DESCONHECIDO';
            
            if (novoStatusTecnospeed === "CONCLUIDO") {
                setNumeroNfExibicao(`NF-e: ${statusData.numero || 'AUTORIZADA'}`);
                setMensagemSucesso(`NF-e AUTORIZADA! Número: ${statusData.numero || 'N/D'}. Agora você pode confirmar o faturamento.`);
                setStatusEnvio('autorizado');

                // ATUALIZADO: Enviando objeto para o pai com os nomes de chave padronizados
                onNfeGeradaSucesso?.({
                    pedido_id: pedidoSelecionado.id,
                    tecnospeed_id: id,
                    tecnospeed_id_integracao: idIntegracao,
                    tecnospeed_status: 'AUTORIZADO',
                    numero_nf: statusData.numero,
                    data_nf: statusData.dataAutorizacao,
                });
            } else if (novoStatusTecnospeed === "REJEITADO" || novoStatusTecnospeed === "CANCELADO") {
                const motivoErro = statusData.motivo || statusData.mensagem || 'Motivo não informado.';
                setMensagemErro(`NF-e ${novoStatusTecnospeed}: ${motivoErro}`);
                setStatusEnvio('erro_envio');
                onErro?.(`NF-e ${novoStatusTecnospeed}: ${motivoErro}`);
            } else { // PROCESSANDO, AGENDADO, etc.
                setNumeroNfExibicao(`Processando (Status: ${novoStatusTecnospeed})`);
                setMensagemSucesso(`NF-e em processamento: ${novoStatusTecnospeed}. Tente novamente em alguns segundos.`);
                setStatusEnvio('em_processamento_nfe');
                
                // ATUALIZADO: Enviando objeto para o pai com os nomes de chave padronizados
                onNfeGeradaSucesso?.({
                    pedido_id: pedidoSelecionado.id,
                    tecnospeed_id: id,
                    tecnospeed_id_integracao: idIntegracao,
                    tecnospeed_status: novoStatusTecnospeed,
                });
            }
        } catch (consultaErr) {
            console.error("Erro ao consultar status da NF-e:", consultaErr);
            setMensagemErro("Erro ao consultar status da NF-e. Tente novamente mais tarde.");
            setStatusEnvio('erro_envio');
            onErro?.(consultaErr.message || "Erro de rede ao consultar status.");
        }
    };
    
    // ATUALIZADO: Carrega dados do pedido usando os nomes de coluna do banco e seta os estados renomeados
    useEffect(() => {
        setMensagemErro('');
        setMensagemSucesso('');

        if (pedidoSelecionado?.tecnospeed_id) {
            setTecnospeedId(pedidoSelecionado.tecnospeed_id);
            setTecnospeedIdIntegracao(pedidoSelecionado.tecnospeed_id_integracao);

            if (pedidoSelecionado.numero_nf) {
                setNumeroNfExibicao(`NF-e: ${pedidoSelecionado.numero_nf}`);
                setStatusEnvio('autorizado');
                setMensagemSucesso('Este pedido já foi faturado e a NF-e está autorizada.');
            } else {
                setNumeroNfExibicao(`ID: ${pedidoSelecionado.tecnospeed_id.substring(0, 15)}...`);
                setStatusEnvio('em_processamento_nfe');
                setMensagemSucesso(`NF-e enviada (${pedidoSelecionado.tecnospeed_status || 'Status desconhecido'}). Clique em 'Verificar Status' para atualizar.`);
            }
        } else {
            setTecnospeedId(null);
            setTecnospeedIdIntegracao(null);
            setNumeroNfExibicao('');
            setStatusEnvio('inicial');
        }
    }, [pedidoSelecionado]);

    // ATUALIZADO: Função que APENAS gera a NF-e
    const gerarNfe = async () => {
        if (!pedidoSelecionado?.id) {
            setMensagemErro("ID do Pedido não encontrado para gerar NF-e.");
            onErro?.("Pedido não encontrado.");
            return;
        }

        setMensagemSucesso('');
        setMensagemErro('');
        setNumeroNfExibicao('Enviando NF-e para a API...');
        setStatusEnvio('carregando');

        try {
            const pedidoId = pedidoSelecionado.id;
            const response = await fetch(`${API_URL}/v2/nfe/emitir`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pedido_id: pedidoId }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.detail || "Erro desconhecido ao emitir NF-e.";
                setMensagemErro(`Falha ao enviar NF-e: ${errorMsg}`);
                setStatusEnvio('erro_envio');
                onErro?.(errorMsg);
                return;
            }

            // Os nomes aqui vêm da API externa, então os mantemos como estão...
            const idTecnospeedRetornado = data.id_tecnospeed;
            const idIntegracaoRetornado = data.id_integracao_retornado;
            const statusInicialTecnospeed = data.status_tecnospeed;

            // ...e setamos nos nossos estados internos.
            setTecnospeedId(idTecnospeedRetornado);
            setTecnospeedIdIntegracao(idIntegracaoRetornado);
            setNumeroNfExibicao(`ID: ${idTecnospeedRetornado ? idTecnospeedRetornado.substring(0, 15) + '...' : 'N/D'}`);
            setMensagemSucesso("NF-e enviada para processamento. Clique em 'Verificar Status' para atualizar.");
            setStatusEnvio('em_processamento_nfe');

            // ATUALIZADO: ...mas na hora de notificar o pai, usamos os NOMES PADRONIZADOS.
            onNfeGeradaSucesso?.({
                pedido_id: pedidoId,
                tecnospeed_id: idTecnospeedRetornado,
                tecnospeed_id_integracao: idIntegracaoRetornado,
                tecnospeed_status: statusInicialTecnospeed,
            });

        } catch (err) {
            const networkErrorMsg = "Erro de comunicação ao tentar emitir NF-e.";
            setMensagemErro(err.message && !err.message.includes("Failed to fetch") ? err.message : networkErrorMsg);
            setStatusEnvio('erro_envio');
            onErro?.(err.message || networkErrorMsg);
        }
    };
    
    const handleConfirmarFaturamentoFinal = () => {
        const numeroNfLimpo = numeroNfExibicao.replace(/[^0-9]/g, '');
        if (statusEnvio !== 'autorizado' || !numeroNfLimpo) {
            onErro?.("A NF-e deve estar AUTORIZADA com um número válido antes de confirmar o faturamento.");
            return;
        }
        onConfirmarFaturamento?.();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md relative transform transition-all duration-300 ease-out">
                {/* ... (código do cabeçalho e título do modal sem alterações) ... */}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Fechar modal">
                    <X size={24} />
                </button>
                <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <FileText size={22} className="mr-2" />
                    Faturar Pedido #{pedidoSelecionado?.id || ''}
                </h2>

                <CampoTextsimples
                    label="Status/Protocolo NF-e"
                    name="status_nfe"
                    value={numeroNfExibicao}
                    onChange={() => { }}
                    placeholder="Aguardando geração da NF-e..."
                    disabled={true}
                />
                
                {/* ... (código de mensagens de erro/sucesso/carregando sem alterações) ... */}
                {statusEnvio === 'carregando' && ( <div className="flex items-center justify-center text-sm text-indigo-600 my-3"> <Loader2 size={20} className="animate-spin mr-2" /> Aguarde... </div> )}
                {mensagemErro && ( <div className="my-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-start"> <AlertCircle size={18} className="mr-2 flex-shrink-0" /> <span>{mensagemErro}</span> </div> )}
                {mensagemSucesso && !mensagemErro && ( <div className="my-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm flex items-start"> <CheckCircle size={18} className="mr-2 flex-shrink-0" /> <span>{mensagemSucesso}</span> </div> )}


                <div className="mt-6 space-y-3">
                    <button
                        onClick={gerarNfe}
                        disabled={statusEnvio !== 'inicial'}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed"
                    >
                        <FilePlus size={18} />
                        Gerar e Enviar NF-e
                    </button>
                    
                    {/* ATUALIZADO: Passa as variáveis de estado renomeadas para a função */}
                    <button
                        onClick={() => consultarStatusNfe(tecnospeedId, tecnospeedIdIntegracao)}
                        disabled={!tecnospeedId || statusEnvio === 'carregando' || statusEnvio === 'autorizado'}
                        className="w-full flex items-center justify-center gap-2 bg-gray-500 text-white px-4 py-2.5 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        <FaSync size={16} className={statusEnvio === 'carregando' ? 'animate-spin' : ''} />
                        Verificar Status
                    </button>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirmarFaturamentoFinal}
                            disabled={statusEnvio !== 'autorizado'}
                            className="w-full sm:flex-1 bg-teal-600 text-white px-5 py-2.5 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors disabled:bg-teal-300 disabled:cursor-not-allowed"
                        >
                            Confirmar Faturamento
                        </button>
                    </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                    <p><strong>Nota:</strong> A NF-e será enviada para processamento. O número final e o DANFE estarão disponíveis após a autorização pela SEFAZ.</p>
                    {/* ATUALIZADO: Usa a variável de estado renomeada */}
                    {tecnospeedId && <p className="mt-1">ID Tecnospeed: <span className="font-mono">{tecnospeedId}</span></p>}
                </div>

            </div>
        </div>
    );
}