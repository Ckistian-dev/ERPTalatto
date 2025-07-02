import { useRef, useCallback } from 'react';
import { checkNfeStatus } from '@/services/plugNotasService';

// Constantes para configuração do polling
const POLLING_INTERVAL_MS = 8000; // Intervalo de 8 segundos entre as verificações
const POLLING_TIMEOUT_MS = 180000; // Parar de tentar após 3 minutos

/**
 * Hook customizado para gerenciar o polling do status de uma NF-e de forma robusta,
 * lidando com múltiplas verificações simultâneas.
 * @param {object} options - Callbacks para lidar com os resultados.
 * @param {function(data, pedidoId): void} options.onSuccess - Chamado quando a NF-e atinge o estado 'CONCLUÍDO'.
 * @param {function(errorMsg, data, pedidoId): void} options.onError - Chamado quando a NF-e é 'REJEITADO' ou ocorre um erro.
 * @param {function(data, pedidoId): void} options.onUpdate - Chamado a cada atualização de status transitório.
 * @returns {{ isPollingFor: function(pedidoId): boolean, startPolling: function(nfeId, pedidoId): void }}
 */
export const useNfeStatusPoller = ({ onSuccess, onError, onUpdate }) => {
    // Usamos um Map para gerenciar múltiplos timers de polling, um para cada pedido.
    const pollingQueue = useRef(new Map());
    const timeoutTimers = useRef(new Map());

    const stopPolling = useCallback((pedidoId) => {
        if (pollingQueue.current.has(pedidoId)) {
            clearInterval(pollingQueue.current.get(pedidoId));
            pollingQueue.current.delete(pedidoId);
        }
        if (timeoutTimers.current.has(pedidoId)) {
            clearTimeout(timeoutTimers.current.get(pedidoId));
            timeoutTimers.current.delete(pedidoId);
        }
    }, []);

    const startPolling = useCallback((nfeId, pedidoId) => {
        // Se já existe um polling para este pedido, não faz nada.
        if (pollingQueue.current.has(pedidoId)) return;

        const performCheck = async () => {
            try {
                const data = await checkNfeStatus(nfeId);
                // A API de resumo usa o campo 'situacao'.
                const status = data.situacao;

                switch (status) {
                    case 'CONCLUÍDO':
                        onSuccess(data, pedidoId);
                        stopPolling(pedidoId);
                        break;
                    case 'REJEITADO':
                    case 'CANCELADO':
                        const motivo = data.motivo || data.error?.message || `Status: ${status}`;
                        onError(motivo, data, pedidoId);
                        stopPolling(pedidoId);
                        break;
                    case 'PROCESSANDO':
                    case 'AGENDADO':
                        if (onUpdate) onUpdate(data, pedidoId);
                        // O polling continua...
                        break;
                    default:
                        console.warn(`Status desconhecido recebido da API: ${status}`);
                        onError(`Status desconhecido: ${status}`, data, pedidoId);
                        stopPolling(pedidoId);
                        break;
                }
            } catch (error) {
                onError(error.message, { id: nfeId }, pedidoId);
                stopPolling(pedidoId);
            }
        };

        // Executa a primeira verificação imediatamente ao iniciar
        performCheck();

        // Configura o intervalo para as próximas verificações
        const intervalId = setInterval(performCheck, POLLING_INTERVAL_MS);
        pollingQueue.current.set(pedidoId, intervalId);

        // Configura um timeout de segurança para evitar polling infinito
        const timeoutId = setTimeout(() => {
            if (pollingQueue.current.has(pedidoId)) {
                console.warn(`Polling para pedido ${pedidoId} (NF-e ${nfeId}) atingiu o timeout.`);
                onError("A verificação demorou muito. Tente novamente mais tarde.", { id: nfeId }, pedidoId);
                stopPolling(pedidoId);
            }
        }, POLLING_TIMEOUT_MS);
        timeoutTimers.current.set(pedidoId, timeoutId);

    }, [onSuccess, onError, onUpdate, stopPolling]);
    
    // Função auxiliar para a UI saber se um pedido específico está sendo verificado
    const isPollingFor = useCallback((pedidoId) => {
        return pollingQueue.current.has(pedidoId);
    }, []);

    return { isPollingFor, startPolling };
};
