// /hooks/useNfeStatusPoller.js

import { useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const POLLING_INTERVAL_MS = 10000; // Consulta a cada 10 segundos
const POLLING_TIMEOUT_MS = 180000;  // Para de tentar após 3 minutos

export const useNfeStatusPoller = ({ onSuccess, onError, API_URL }) => {
    const pollingTimers = useRef(new Map());
    const timeoutTimers = useRef(new Map());

    const stopPolling = useCallback((pedidoId) => {
        if (pollingTimers.current.has(pedidoId)) {
            clearInterval(pollingTimers.current.get(pedidoId));
            pollingTimers.current.delete(pedidoId);
        }
        if (timeoutTimers.current.has(pedidoId)) {
            clearTimeout(timeoutTimers.current.get(pedidoId));
            timeoutTimers.current.delete(pedidoId);
        }
    }, []);

    const startPolling = useCallback((pedidoId) => {
        if (pollingTimers.current.has(pedidoId)) return;

        const performCheck = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/nfe/consultar/${pedidoId}`);
                const status = data.status;

                if (status === 'autorizado') {
                    toast.success(`NF-e do Pedido #${pedidoId} foi autorizada!`);
                    onSuccess(pedidoId, data);
                    stopPolling(pedidoId);
                } else if (status === 'erro_autorizacao' || status === 'denegado') {
                    const motivo = data.mensagem_sefaz || 'Erro desconhecido';
                    toast.error(`NF-e do Pedido #${pedidoId} foi rejeitada: ${motivo}`);
                    onError(pedidoId, { nfe_status: status, nfe_rejeicao_motivo: motivo });
                    stopPolling(pedidoId);
                }
                // Se for 'processando_autorizacao', continua o polling silenciosamente.

            } catch (error) {
                const errorMsg = error.response?.data?.detail || "Erro ao consultar status da NF-e.";
                toast.error(`Erro na consulta do Pedido #${pedidoId}: ${errorMsg}`);
                onError(pedidoId, { nfe_status: 'erro_consulta', nfe_rejeicao_motivo: errorMsg });
                stopPolling(pedidoId);
            }
        };

        performCheck(); // Primeira verificação imediata
        const intervalId = setInterval(performCheck, POLLING_INTERVAL_MS);
        pollingTimers.current.set(pedidoId, intervalId);

        const timeoutId = setTimeout(() => {
            if (pollingTimers.current.has(pedidoId)) {
                toast.warn(`A verificação do Pedido #${pedidoId} excedeu o tempo limite.`);
                onError(pedidoId, { nfe_status: 'erro_consulta', nfe_rejeicao_motivo: 'Timeout' });
                stopPolling(pedidoId);
            }
        }, POLLING_TIMEOUT_MS);
        timeoutTimers.current.set(pedidoId, timeoutId);

    }, [onSuccess, onError, stopPolling, API_URL]);

    const isPollingFor = useCallback((pedidoId) => {
        return pollingTimers.current.has(pedidoId);
    }, []);

    return { startPolling, isPollingFor };
};
