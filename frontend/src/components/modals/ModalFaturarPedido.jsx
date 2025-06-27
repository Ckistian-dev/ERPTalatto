// components/modals/ModalFaturarPedido.jsx
import { useState, useEffect } from 'react';
import { X, FileText, FilePlus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

import CampoTextsimples from '@/components/campos/CampoTextsimples';

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ModalFaturarPedido({ onClose, onConfirmarFaturamento, onErro, onNfeGeradaSucesso, pedidoSelecionado }) {
    const [numeroNfExibicao, setNumeroNfExibicao] = useState(''); // Para exibir protocolo, ID ou mensagem
    const [idNfeTecnospeed, setIdNfeTecnospeed] = useState(null);
    const [idIntegracao, setIdIntegracao] = useState(null);
    const [statusEnvio, setStatusEnvio] = useState(''); // 'inicial', 'carregando', 'sucesso_envio', 'erro_envio', 'autorizado', 'em_processamento_nfe'
    const [mensagemErro, setMensagemErro] = useState('');
    const [mensagemSucesso, setMensagemSucesso] = useState('');

    // Função auxiliar para consultar o status da NF-e
    const consultarStatusNfe = async (idTecnospeed, idIntegracao) => {
        if (!idTecnospeed && !idIntegracao) {
            console.warn("Sem ID Tecnospeed ou de Integração para consultar status.");
            setMensagemErro("Não foi possível consultar o status: IDs de NF-e ausentes.");
            setStatusEnvio('erro_envio');
            return;
        }

        setMensagemSucesso('Consultando status da NF-e...');
        setStatusEnvio('carregando'); // Indica que estamos carregando o status

        try {
            const consultaId = idTecnospeed || idIntegracao;
            // USO DA VARIÁVEL DE AMBIENTE AQUI
            const statusResponse = await fetch(`${API_URL}/v2/nfe/status/${consultaId}`);
            const statusData = await statusResponse.json();

            if (!statusResponse.ok) {
                const errorMsgStatus = statusData.detail || "Erro desconhecido ao consultar status.";
                console.error("Erro ao consultar status:", statusData);
                setMensagemErro(`Falha ao consultar status da NF-e: ${errorMsgStatus}`);
                setStatusEnvio('erro_envio');
                onErro?.(errorMsgStatus);
                return;
            }

            const novoStatusTecnospeed = statusData.resposta_tecnospeed_consulta?.status || statusData.resposta_tecnospeed_consulta?.situacao || 'DESCONHECIDO';
            let numeroFinalNf = null;
            let dataFinalNf = null;
            const tecnoDoc = statusData.resposta_tecnospeed_consulta?.document || statusData.resposta_tecnospeed_consulta;

            if (novoStatusTecnospeed === "AUTORIZADO") {
                numeroFinalNf = tecnoDoc?.informacoesNfe?.numero || tecnoDoc?.numero;
                dataFinalNf = tecnoDoc?.informacoesNfe?.dataEmissao || tecnoDoc?.dataEmissao;

                setNumeroNfExibicao(`NF-e: ${numeroFinalNf || 'AUTORIZADA'}`);
                setMensagemSucesso(`NF-e AUTORIZADA! Número: ${numeroFinalNf || 'N/D'}`);
                setStatusEnvio('autorizado');

                onNfeGeradaSucesso?.({
                    pedido_id: pedidoSelecionado.id, // Garante que o ID do pedido está sendo passado
                    id_tecnospeed: idTecnospeed,
                    id_integracao: idIntegracao,
                    status_tecnospeed: 'AUTORIZADO',
                    numero_nf: numeroFinalNf,
                    data_nf: dataFinalNf,
                });
            } else {
                setNumeroNfExibicao(`Processando (Status: ${novoStatusTecnospeed})`);
                setMensagemSucesso(`NF-e em processamento: ${novoStatusTecnospeed}.`);
                setStatusEnvio('em_processamento_nfe'); // Novo status para indicar que está em processamento
                onNfeGeradaSucesso?.({
                    pedido_id: pedidoSelecionado.id,
                    id_tecnospeed: idTecnospeed,
                    id_integracao: idIntegracao,
                    status_tecnospeed: novoStatusTecnospeed,
                });
            }

        } catch (consultaErr) {
            console.error("Erro ao consultar status da NF-e (consultarStatusNfe):", consultaErr);
            setMensagemErro("Erro ao consultar status da NF-e. Tente novamente mais tarde.");
            setStatusEnvio('erro_envio');
            onErro?.(consultaErr.message || "Erro de rede ao consultar status.");
        }
    };


    // Limpa mensagens e carrega dados existentes do pedido selecionado
    useEffect(() => {
        setMensagemErro('');
        setMensagemSucesso('');

        // Se o pedido selecionado já tem dados da Tecnospeed, preenche o modal com eles
        if (pedidoSelecionado?.tecnospeed_id) {
            setIdNfeTecnospeed(pedidoSelecionado.tecnospeed_id);
            setIdIntegracao(pedidoSelecionado.tecnospeed_id_integracao);

            if (pedidoSelecionado.numero_nf) {
                setNumeroNfExibicao(`NF-e: ${pedidoSelecionado.numero_nf}`);
                setStatusEnvio('autorizado');
                setMensagemSucesso('NF-e já AUTORIZADA!');
            } else if (pedidoSelecionado.tecnospeed_status === 'AUTORIZADO') {
                setNumeroNfExibicao(`NF-e: AUTORIZADA (aguardando número)`);
                setStatusEnvio('autorizado');
                setMensagemSucesso('NF-e AUTORIZADA! Buscando número...');
                // Se já está autorizado mas sem número, consulta novamente
                consultarStatusNfe(pedidoSelecionado.tecnospeed_id, pedidoSelecionado.tecnospeed_id_integracao);
            } else if (pedidoSelecionado.tecnospeed_status === 'EM_PROCESSAMENTO' || pedidoSelecionado.tecnospeed_status === 'PENDENTE') {
                // *** NOVA LÓGICA AQUI: Consulta o status da NFe se o modal abrir e o pedido já estiver em processamento ***
                setNumeroNfExibicao(`Processando (ID: ${pedidoSelecionado.tecnospeed_id.substring(0, 15)}...)`);
                setStatusEnvio('em_processamento_nfe'); // Novo status para indicar que estamos esperando o retorno da NFe
                setMensagemSucesso(`NF-e ${pedidoSelecionado.tecnospeed_status} na Tecnospeed. Consultando status...`);
                consultarStatusNfe(pedidoSelecionado.tecnospeed_id, pedidoSelecionado.tecnospeed_id_integracao);
            }
            else {
                setNumeroNfExibicao(`Processando (ID: ${pedidoSelecionado.tecnospeed_id.substring(0, 15)}...)`);
                setStatusEnvio('sucesso_envio');
                setMensagemSucesso(`NF-e ${pedidoSelecionado.tecnospeed_status || 'enviada'}!`);
            }
        } else {
            // Resetar para estado inicial se não houver pedido selecionado ou dados da Tecnospeed
            setIdNfeTecnospeed(null);
            setIdIntegracao(null);
            setNumeroNfExibicao('');
            setStatusEnvio('inicial');
        }
    }, [pedidoSelecionado, onClose]); // Dependências do useEffect

    const handleConfirmarFaturamentoFinal = () => {
        // Assume que numeroNfExibicao já foi preenchido corretamente após a autorização
        const numeroNfLimpo = numeroNfExibicao.replace(/[^0-9]/g, '');

        if (statusEnvio !== 'autorizado' || !numeroNfLimpo) {
            onErro?.("A NF-e deve estar AUTORIZADA com um número válido antes de confirmar o faturamento.");
            return;
        }

        onConfirmarFaturamento?.({
            numero_nf: numeroNfLimpo,
            id_nfe_tecnospeed: idNfeTecnospeed,
            id_integracao_nfe: idIntegracao,
            // A situação do pedido será atualizada no componente pai (Listapedidos)
            // se o onConfirmarFaturamento no pai chamar o `atualizarPedido` com a nova situação.
            // Se não, o pai deve ser o responsável por essa atualização após o sucesso aqui.
        });
    };

    const gerarNfe = async () => {
        if (!pedidoSelecionado?.id) {
            setMensagemErro("ID do Pedido não encontrado para gerar NF-e.");
            setStatusEnvio('erro_envio');
            onErro?.("Pedido não encontrado.");
            return;
        }

        setMensagemSucesso('');
        setMensagemErro('');
        setNumeroNfExibicao('Enviando NF-e para Tecnospeed...');
        setStatusEnvio('carregando');


        try {
            const pedidoId = pedidoSelecionado.id;
            // USO DA VARIÁVEL DE AMBIENTE AQUI
            const response = await fetch(`${API_URL}/v2/nfe/emitir`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pedido_id: pedidoId }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.detail || "Erro desconhecido ao emitir NF-e.";
                console.error("Erro da API ao emitir NF-e:", data);
                setMensagemErro(`Falha ao enviar NF-e: ${errorMsg}`);
                setStatusEnvio('erro_envio');
                onErro?.(errorMsg);
                return;
            }

            const idTecnospeedRetornado = data.id_tecnospeed;
            const idIntegracaoRetornado = data.id_integracao_retornado;
            const statusInicialTecnospeed = data.status_tecnospeed; // Ex: EM_PROCESSAMENTO

            setIdNfeTecnospeed(idTecnospeedRetornado);
            setIdIntegracao(idIntegracaoRetornado);
            setNumeroNfExibicao(`Processando (ID: ${idTecnospeedRetornado ? idTecnospeedRetornado.substring(0, 15) + '...' : 'N/D'})`);
            setMensagemSucesso(data.message || "NF-e enviada com sucesso para processamento!");
            setStatusEnvio('sucesso_envio'); // Ou 'em_processamento_nfe' se preferir um estado mais direto

            onNfeGeradaSucesso?.({
                pedido_id: pedidoId,
                id_tecnospeed: idTecnospeedRetornado,
                id_integracao: idIntegracaoRetornado,
                status_tecnospeed: statusInicialTecnospeed,
            });

            // Inicia a consulta de status da NFe logo após o envio
            setTimeout(() => {
                consultarStatusNfe(idTecnospeedRetornado, idIntegracaoRetornado);
            }, 5000); // 5 segundos de atraso inicial

        } catch (err) {
            console.error("Erro geral na função gerarNfe:", err);
            const networkErrorMsg = "Erro de comunicação ao tentar emitir NF-e. Verifique sua conexão ou o servidor.";
            setMensagemErro(err.message && !err.message.includes("Failed to fetch") ? err.message : networkErrorMsg);
            setStatusEnvio('erro_envio');
            onErro?.(err.message || networkErrorMsg);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md relative transform transition-all duration-300 ease-out">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Fechar modal"
                >
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

                {(statusEnvio === 'carregando' || statusEnvio === 'em_processamento_nfe') && (
                    <div className="flex items-center justify-center text-sm text-indigo-600 my-3">
                        <Loader2 size={20} className="animate-spin mr-2" />
                        {statusEnvio === 'carregando' ? 'Enviando NF-e para Tecnospeed...' : 'Consultando status da NF-e...'}
                    </div>
                )}

                {mensagemErro && (
                    <div className="my-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-start">
                        <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                        <span>{mensagemErro}</span>
                    </div>
                )}

                {mensagemSucesso && (
                    <div className="my-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm flex items-start">
                        <CheckCircle size={18} className="mr-2 flex-shrink-0" />
                        <span>{mensagemSucesso}</span>
                    </div>
                )}

                <div className="mt-6 space-y-3">
                    <button
                        onClick={gerarNfe}
                        disabled={statusEnvio === 'carregando' || statusEnvio === 'sucesso_envio' || statusEnvio === 'autorizado' || statusEnvio === 'em_processamento_nfe'}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:bg-indigo-300"
                    >
                        <FilePlus size={18} />
                        {statusEnvio === 'carregando' || statusEnvio === 'em_processamento_nfe' ? 'Aguardando NFe...' : (statusEnvio === 'sucesso_envio' ? 'NF-e Enviada!' : (statusEnvio === 'autorizado' ? 'NF-e AUTORIZADA!' : 'Gerar e Enviar NF-e'))}
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
                            className="w-full sm:flex-1 bg-teal-600 text-white px-5 py-2.5 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors disabled:bg-teal-300"
                        >
                            Confirmar Faturamento
                        </button>
                    </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                    <p><strong>Nota:</strong> A NF-e será enviada para processamento. O número final e o DANFE estarão disponíveis após a autorização pela SEFAZ. Você será notificado ou poderá consultar o status posteriormente.</p>
                    {idNfeTecnospeed && <p className="mt-1">ID Tecnospeed para consulta: <span className="font-mono">{idNfeTecnospeed}</span></p>}
                    {idIntegracao && <p className="mt-1">ID Integração: <span className="font-mono">{idIntegracao}</span></p>}
                </div>

            </div>
        </div>
    );
}