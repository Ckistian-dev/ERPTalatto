import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaTruck, FaSave, FaTimes } from 'react-icons/fa';

import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ModalCotacaoIntelipost({ isOpen, onClose, onSelectFrete, itens, clienteId }) {
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [freteSelecionado, setFreteSelecionado] = useState(null);
    const [salvando, setSalvando] = useState(false);

    const handleCotar = async () => {
        if (!clienteId) {
            toast.warn("Um cliente deve ser selecionado no orçamento.");
            onClose(); // Fecha o modal se não houver cliente
            return;
        }
        if (!itens || itens.length === 0) {
            toast.warn("Adicione pelo menos um item ao orçamento para cotar o frete.");
            onClose(); // Fecha o modal se não houver itens
            return;
        }

        setLoading(true);
        setResultado(null);
        setFreteSelecionado(null);

        try {
            const cepRes = await axios.get(`${API_URL}/intelipost/cliente_cep/${clienteId}`);
            const destination_zip_code = cepRes.data?.cep?.replace(/\D/g, '');

            if (!destination_zip_code) {
                throw new Error("CEP do cliente não foi retornado pela API. Verifique o cadastro.");
            }

            const payload = {
                destination_zip_code,
                items: itens.map(item => ({
                    produto_id: item.produto_id,
                    quantidade_itens: item.quantidade_itens
                }))
            };

            const response = await axios.post(`${API_URL}/intelipost/cotacao_avulsa`, payload);

            if (response.data && response.data.cotacao && response.data.volumes) {
                setResultado(response.data);
            } else {
                setResultado(null);
                toast.warn("A resposta da cotação não teve o formato esperado.");
            }

        } catch (err) {
            console.error("Erro ao realizar cotação no modal:", err);
            const errorMsg = err?.response?.data?.detail || err.message || "Ocorreu um erro desconhecido.";
            toast.error(errorMsg);
            onClose(); // Fecha o modal em caso de erro
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmarSelecao = async () => {
        if (!freteSelecionado) return;
        setSalvando(true);
        try {
            const res = await axios.get(`${API_URL}/intelipost/buscar_transportadora`, {
                params: { nome: freteSelecionado.delivery_method_name }
            });
            const transportadoraEncontrada = res.data;
            onSelectFrete({
                transportadora_id: transportadoraEncontrada.id,
                transportadora_nome: transportadoraEncontrada.nome_razao,
                valor_frete: freteSelecionado.final_shipping_cost,
                prazo_entrega_dias: freteSelecionado.delivery_estimate_business_days
            });
            onClose();
        } catch (error) {
            toast.warn(`Transportadora "${freteSelecionado.delivery_method_name}" não encontrada no cadastro. Salvando apenas o nome.`);
            onSelectFrete({
                transportadora_id: null,
                transportadora_nome: freteSelecionado.delivery_method_name,
                valor_frete: freteSelecionado.final_shipping_cost,
                prazo_entrega_dias: freteSelecionado.delivery_estimate_business_days
            });
            onClose();
        } finally {
            setSalvando(false);
        }
    };

    // --- ALTERAÇÃO AQUI ---
    // Executa a cotação automaticamente quando o modal abre
    useEffect(() => {
        if (isOpen) {
            handleCotar();
        } else {
            // Reseta o estado quando o modal é fechado
            setResultado(null);
            setLoading(false);
            setFreteSelecionado(null);
            setSalvando(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            {/* --- ALTERAÇÃO AQUI: Altura mínima aumentada --- */}
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-6xl min-h-[600px] flex flex-col border border-gray-200 animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Calcular Frete via Intelipost</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    {/* --- ALTERAÇÃO AQUI: Lógica de exibição --- */}
                    {loading ? (
                        <div className="flex items-center justify-center min-h-[300px] w-full">
                            <div className="flex flex-col items-center justify-center text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                                <p className="mt-4 text-gray-600 text-lg">Calculando frete, por favor aguarde...</p>
                            </div>
                        </div>
                    ) : resultado && (
                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Coluna da Esquerda: Volumes */}
                            <div className="p-4 border rounded-lg bg-gray-50">
                                <h3 className="text-lg font-bold mb-4 text-gray-700">Volumes Calculados ({resultado.volumes.length})</h3>
                                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                                    {resultado.volumes.map((volume, index) => (
                                        <div key={index} className="p-3 border rounded-md bg-white">
                                            <div className="flex justify-between items-center font-bold text-gray-800 mb-2">
                                                <span>Volume {index + 1}</span>
                                                <span className="text-teal-600">{volume.weight.toFixed(2)} kg</span>
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <p>Dimensões: {volume.height} x {volume.width} x {volume.length} cm</p>
                                                <p>Itens: {volume.products_quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Coluna da Direita: Fretes */}
                            <div className="p-4 border rounded-lg bg-gray-50">
                                <h3 className="text-lg font-bold mb-4 text-gray-700">Opções de Frete</h3>
                                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                                    {resultado.cotacao.content.delivery_options?.length > 0 ? (
                                        resultado.cotacao.content.delivery_options.map((opcao) => (
                                            <div
                                                key={opcao.delivery_method_id}
                                                onClick={() => setFreteSelecionado(opcao)}
                                                className={`p-4 border rounded-md flex flex-wrap items-center justify-between gap-x-4 gap-y-2 cursor-pointer transition-all ${freteSelecionado?.delivery_method_id === opcao.delivery_method_id ? 'bg-teal-50 border-2 border-teal-500' : 'bg-white hover:bg-gray-100'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FaTruck className="text-xl text-gray-500" />
                                                    <div>
                                                        <p className="font-bold text-md text-gray-800">{opcao.delivery_method_name}</p>
                                                        <p className="text-xs text-gray-600">Provedor: {opcao.provider_name}</p>
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500">Prazo</p>
                                                    <p className="font-medium">{opcao.delivery_estimate_business_days} dias</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500">Custo</p>
                                                    <p className="font-bold text-lg text-teal-600">
                                                        {opcao.final_shipping_cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-gray-500 py-4">Nenhuma opção de frete foi encontrada.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
                    <button onClick={onClose} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium">
                        Cancelar
                    </button>
                    <ButtonComPermissao
                        onClick={handleConfirmarSelecao}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold flex items-center gap-2 transition-colors disabled:bg-gray-400"
                        disabled={!freteSelecionado || salvando}
                        permissoes={["admin"]}
                    >
                        <FaSave />
                        {salvando ? 'Confirmando...' : 'Confirmar Seleção'}
                    </ButtonComPermissao>
                </div>
            </div>
        </div>
    );
}
