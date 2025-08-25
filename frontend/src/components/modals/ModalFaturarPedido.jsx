// /components/modals/ModalFaturarPedido.jsx

import { useState, useEffect } from 'react';
import { X, FileText, Download, ExternalLink, Save } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

import CampoTextsimples from '@/components/campos/CampoTextsimples';
import CampoNumsimples from '@/components/campos/CampoNumSimples';

export default function ModalFaturarPedido({
    onClose,
    onPedidoFaturado, // Callback para atualizar a lista principal
    pedidoSelecionado,
    API_URL
}) {
    const [dadosManuais, setDadosManuais] = useState({
        numero_nf: '',
        nfe_chave: '',
        data_nf: new Date().toISOString().split('T')[0] // Data de hoje por padrão
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setDadosManuais(prev => ({ ...prev, [name]: value }));
    };

    const handleGerarXml = async () => {
        try {
            const response = await axios.get(`${API_URL}/nfe/gerar-xml-sebrae/${pedidoSelecionado.id}`, {
                responseType: 'blob', // Importante para o download do arquivo
            });
            
            // Cria um link temporário para iniciar o download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `nfe_pedido_${pedidoSelecionado.id}_para_importar.xml`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success("XML gerado! Importe no portal do Sebrae.");
        } catch (error) {
            toast.error("Erro ao gerar o XML.");
            console.error(error);
        }
    };

    const handleSalvarDadosManuais = async () => {
        if (!dadosManuais.numero_nf || !dadosManuais.nfe_chave) {
            toast.warn("Por favor, preencha o Número da NF-e e a Chave de Acesso.");
            return;
        }
        setIsSaving(true);
        try {
            await axios.put(`${API_URL}/nfe/atualizar-dados-manuais/${pedidoSelecionado.id}`, {
                ...dadosManuais,
                data_nf: new Date(dadosManuais.data_nf).toISOString()
            });
            toast.success("Dados da NF-e salvos e pedido movido para expedição!");
            onPedidoFaturado?.(pedidoSelecionado.id); // Notifica a página pai para remover o pedido da lista
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao salvar os dados.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>
                <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
                    <FileText size={22} className="mr-2" />
                    Faturar Pedido #{pedidoSelecionado?.id || ''} (Via Sebrae)
                </h2>
                <p className="text-sm text-gray-500 mb-6">Siga os passos para emitir a nota manualmente.</p>

                {/* Passo 1: Gerar XML */}
                <div className="p-4 border rounded-lg mb-4">
                    <h3 className="font-semibold text-gray-700 mb-2">Passo 1: Gerar e Baixar o XML</h3>
                    <p className="text-sm text-gray-600 mb-3">Clique no botão para baixar o arquivo XML com os dados do pedido. Você irá importar este arquivo no portal do Sebrae.</p>
                    <div className="flex gap-3">
                        <button onClick={handleGerarXml} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700">
                            <Download size={18} />
                            Gerar XML para Sebrae
                        </button>
                        <a href="https://emissornfe.sebrae.com.br" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2.5 rounded-lg hover:bg-gray-700">
                            <ExternalLink size={18} />
                            Abrir Portal Sebrae
                        </a>
                    </div>
                </div>

                {/* Passo 2: Inserir Dados */}
                <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">Passo 2: Salvar Dados da Nota Emitida</h3>
                    <p className="text-sm text-gray-600 mb-4">Após emitir a nota no portal do Sebrae, preencha os campos abaixo e salve para mover o pedido para a expedição.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CampoNumsimples label="Número da NF-e" name="numero_nf" value={dadosManuais.numero_nf} onChange={handleInputChange} obrigatorio />
                        <CampoTextsimples label="Data de Emissão" name="data_nf" type="date" value={dadosManuais.data_nf} onChange={handleInputChange} obrigatorio />
                        <CampoNumsimples label="Chave de Acesso (44 dígitos)" name="nfe_chave" value={dadosManuais.nfe_chave} onChange={handleInputChange} colSpan obrigatorio />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                        Fechar
                    </button>
                    <button onClick={handleSalvarDadosManuais} disabled={isSaving} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-300">
                        {isSaving && <Loader2 size={18} className="animate-spin" />}
                        <Save size={18} />
                        Salvar e Mover para Expedição
                    </button>
                </div>
            </div>
        </div>
    );
}
