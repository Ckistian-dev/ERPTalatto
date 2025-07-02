import axios from 'axios';

// A URL da API do seu backend, que já deve estar configurada no seu componente principal.
const API_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Consulta o status resumido de uma NF-e através do nosso próprio backend (BFF).
 * Esta abordagem é mais segura pois a chave da API da PlugNotas fica apenas no servidor.
 * @param {string} nfeId - O ID da NF-e retornado pela PlugNotas (tecnospeed_id).
 * @returns {Promise<object>} Uma promessa que resolve com os dados da resposta da API (passados pelo nosso backend).
 * @throws {Error} Lança um erro se a chamada à API do backend falhar.
 */
export const checkNfeStatus = async (nfeId) => {
    if (!nfeId) {
        console.error("Erro de programação: ID da NF-e não fornecido para consulta.");
        throw new Error("ID da NF-e é obrigatório.");
    }

    // Chama o novo endpoint no nosso backend, que por sua vez chamará a PlugNotas.
    const endpoint = `${API_URL}/v2/nfe/resumo/${nfeId}`;

    try {
        const response = await axios.get(endpoint);
        // O backend já deve retornar o objeto JSON diretamente.
        return response.data;
    } catch (error) {
        console.error(`Erro ao chamar o backend para consultar status da NF-e ${nfeId}:`, error.response?.data || error.message);
        
        // Propaga um erro mais informativo para ser tratado pelo hook.
        const errorMessage = error.response?.data?.detail || 'Não foi possível conectar ao servidor para verificar o status da NF-e.';
        throw new Error(errorMessage);
    }
};
