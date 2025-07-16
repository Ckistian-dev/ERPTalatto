import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

import CampoDropdownDb from '@/components/campos/CampoDropdownDb';
import PosicaoEstoqueSelector from '@/components/estoque/PosicaoEstoqueSelector';
import ModalErro from '@/components/modals/ModalErro';
import ButtonComPermissao from '@/components/buttons/ButtonComPermissao';
// [ALTERAÇÃO] Trocamos o CampoNumsimples pelo CampoNumSetas para consistência
import CampoNumSetas from '@/components/campos/CampoNumSetas';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function SaidaEstoque() {
    const navigate = useNavigate();
    const [erro, setErro] = useState('');
    const [idProdutoSelecionado, setIdProdutoSelecionado] = useState(null);
    const [selectedPosicao, setSelectedPosicao] = useState(null);
    const [quantidadeSaida, setQuantidadeSaida] = useState(1); // Inicia com 1
    const [abaAtual, setAbaAtual] = useState('produto');

    const handleChangeProduto = (e) => {
        setIdProdutoSelecionado(e.target.value);
        setSelectedPosicao(null);
        setQuantidadeSaida(1);
        if (e.target.value) {
            setAbaAtual('posicao');
        }
    };

    const handleQuantidadeChange = (e) => {
        // O CampoNumSetas pode não ter um 'name' no evento, então pegamos o valor diretamente
        const { value } = e.target;
        setQuantidadeSaida(Number(value));
    }
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Lógica de validação (pode ser aprimorada conforme necessidade)
        if (!idProdutoSelecionado || !selectedPosicao || !quantidadeSaida || quantidadeSaida <= 0) {
            toast.error("Por favor, preencha todos os campos corretamente.");
            return;
        }
        if (quantidadeSaida > selectedPosicao.quantidade) {
            toast.error(`Quantidade de saída excede o saldo disponível (${selectedPosicao.quantidade}).`);
            return;
        }

        // Monta o payload para a API
        const payload = { 
            ...selectedPosicao, 
            id_produto: idProdutoSelecionado, 
            quantidade: quantidadeSaida 
        };

        try {
            await axios.post(`${API_URL}/api/estoque/saida`, payload);
            toast.success('Saída de estoque registrada com sucesso!');
            navigate('/estoque');
        } catch (err) {
            const errorMsg = err?.response?.data?.detail || 'Erro ao registrar a saída.';
            setErro(errorMsg); 
            toast.error(errorMsg);
        }
    };

    const abas = [
        { id: 'produto', label: '1. Seleção do Produto' },
        { id: 'posicao', label: '2. Posição e Quantidade', disabled: !idProdutoSelecionado },
    ];

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-28">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Registrar Saída do Estoque</h1>
            <div className="flex flex-wrap gap-1 border-b border-gray-300 mb-6">
                {abas.map((aba) => (
                    <button key={aba.id} onClick={() => !aba.disabled && setAbaAtual(aba.id)} disabled={aba.disabled} className={`px-4 py-2.5 text-sm font-medium rounded-t-md transition-all ${abaAtual === aba.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                        {aba.label}
                    </button>
                ))}
            </div>
            <form id="form-saida-estoque" onSubmit={handleSubmit} className="space-y-6">
                {abaAtual === 'produto' && (
                    <CampoDropdownDb
                        label="Produto"
                        name="id_produto"
                        value={idProdutoSelecionado || ""}
                        onChange={handleChangeProduto}
                        url={`${API_URL}/produtos_dropdown`}
                        campoValor="id"
                        campoLabel="descricao"
                        obrigatorio
                    />
                )}

                {/* [ALTERAÇÃO] Layout da aba de posição e quantidade refeito para uma única coluna */}
                {abaAtual === 'posicao' && idProdutoSelecionado && (
                    <div className="space-y-4">
                        <PosicaoEstoqueSelector 
                            produtoId={idProdutoSelecionado} 
                            onPosicaoSelect={setSelectedPosicao} 
                        />
                        
                        {/* O campo de quantidade agora só aparece após selecionar uma posição */}
                        {selectedPosicao && (
                             <div className='max-w-xs'>
                                <CampoNumSetas
                                    label="Quantidade a Retirar"
                                    name="quantidade" // O nome aqui é para referência
                                    value={quantidadeSaida}
                                    onChange={handleQuantidadeChange}
                                />
                                <p className="text-sm text-gray-500 mt-1 pl-1">
                                    Disponível nesta posição: <strong>{selectedPosicao.quantidade}</strong>
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </form>
            
            <div className="flex justify-end gap-3 mt-8 mb-12">
                <button type="button" onClick={() => navigate(-1)} className="w-full sm:w-auto px-5 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium">Voltar</button>
                <ButtonComPermissao 
                    permissoes={["admin", "editor"]} 
                    type="submit" 
                    form="form-saida-estoque" 
                    className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold" 
                    disabled={!selectedPosicao || !quantidadeSaida}
                >
                    Registrar Saída
                </ButtonComPermissao>
            </div>
            <ModalErro mensagem={erro} onClose={() => setErro('')} />
        </div>
    );
}
