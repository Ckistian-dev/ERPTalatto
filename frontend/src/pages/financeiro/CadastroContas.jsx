// ContaGeral.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import CampoDropdownDb from '@/components/campos/CampoDropdownDb';
import CampoData from '@/components/campos/CampoData';
import CampoTextarea from '@/components/campos/CampoTextarea';
import CampoTextsimples from '@/components/campos/CampoTextsimples';
import CampoNumsimples from '@/components/campos/CampoNumSimples';
import CampoPagamentoContas from '@/components/campos/CampoPagamentoContas';
import ModalErro from '@/components/modals/ModalErro';
import ButtonComPermissao from '@/components/buttons/ButtonComPermissao';

// Define a URL da API a partir das variáveis de ambiente
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ContaGeral({ modo = 'novo' }) {
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const location = useLocation();
    const contaEdicao = location.state?.conta || null;

    const [form, setForm] = useState({
        tipo_conta: '',
        situacao_conta: 'Em Aberto',
        descricao_conta: '',
        num_conta: 0,
        id_cliente_fornecedor: 0,
        nome_cliente_fornecedor: '',
        data_emissao: '',
        data_vencimento: '',
        data_baixa: '',
        plano_contas: '',
        caixa_destino_origem: '',
        observacoes_conta: '',
        formas_pagamento: [],
        criado_em: '',
        atualizado_em: '',
    });

    const [erro, setErro] = useState('');
    const [abaAtual, setAbaAtual] = useState('dadosConta');

    useEffect(() => {
        if (modo === 'editar' && contaEdicao) {
            console.log("Dados de edição recebidos:", contaEdicao);
            const dadosEdicaoFormatado = {
                tipo_conta: contaEdicao.tipo_conta || '',
                situacao_conta: contaEdicao.situacao_conta || 'Em Aberto',
                id_cliente_fornecedor: contaEdicao.id_cliente_fornecedor || 0,
                nome_cliente_fornecedor: contaEdicao.nome_cliente_fornecedor || '',
                descricao_conta: contaEdicao.descricao_conta || '', // Corrigido aqui
                num_conta: contaEdicao.num_conta || 0, // Corrigido aqui
                data_emissao: contaEdicao.data_emissao || '',
                data_vencimento: contaEdicao.data_vencimento || '',
                data_baixa: contaEdicao.data_baixa || '',
                plano_contas: contaEdicao.plano_contas || '',
                caixa_destino_origem: contaEdicao.caixa_destino_origem || '',
                observacoes_conta: contaEdicao.observacoes_conta || '', // Corrigido aqui
                formas_pagamento: contaEdicao.formas_pagamento || [],
                criado_em: contaEdicao.criado_em || '',
                atualizado_em: contaEdicao.atualizado_em || '',
            };
            setForm(dadosEdicaoFormatado);
        } else if (modo === 'novo') { // Garante reset para modo novo
            setForm({
                tipo_conta: '',
                situacao_conta: 'Em Aberto',
                descricao_conta: '',
                num_conta: 0,
                id_cliente_fornecedor: 0,
                nome_cliente_fornecedor: '',
                data_emissao: '',
                data_vencimento: '',
                data_baixa: '',
                plano_contas: '',
                caixa_destino_origem: '',
                observacoes_conta: '',
                formas_pagamento: [],
                criado_em: '',
                atualizado_em: '',
            });
        }
    }, [contaEdicao, modo]);

    const handleChange = (e) => {
        const target = e.target; // Objeto target do evento

        // Extrai o nome do campo
        const name = target.name;

        // Determina o valor a ser atualizado no estado
        let valorParaAtualizar;
        if (target.type === 'checkbox') {
            // Caso específico para checkboxes HTML padrão
            valorParaAtualizar = target.checked;
        } else {
            // Para outros inputs HTML padrão (text, number, etc.) E
            // para o seu CampoDropdownDB (que envia 'value' em target)
            valorParaAtualizar = target.value;
        }

        // Atualiza o estado do formulário
        setForm(prevForm => {
            // Cria a base do novo estado
            const novoEstado = {
                ...prevForm,
                [name]: valorParaAtualizar
            };

            // Lógica específica para quando o campo 'id_cliente_fornecedor' é alterado,
            // utilizando a 'label' fornecida pelo CampoDropdownDB.
            // target.label existirá e terá valor se o evento vier do seu CampoDropdownDB
            // e o campo alterado for o 'id_cliente_fornecedor'.
            if (name === "id_cliente_fornecedor" && target.label !== undefined) {
                novoEstado.nome_cliente_fornecedor = target.label;
            }

            return novoEstado; // Retorna o objeto de estado completo e atualizado
        });
    };

    const validarCampos = () => {
        if (!form.tipo_conta.trim()) return 'Tipo de Conta é obrigatório.';
        if (!form.situacao_conta.trim()) return 'Situação da Conta é obrigatório.';
        if (!form.id_cliente_fornecedor || form.id_cliente_fornecedor === 0) { return 'Cliente/Fornecedor é obrigatório.'; }
        if (!form.data_emissao.trim()) return 'Data de Emissão é obrigatória.';
        if (!form.data_vencimento.trim()) return 'Data de Vencimento é obrigatória.';
        if (!form.plano_contas.trim()) return 'Plano de Contas é obrigatório.';
        if (!form.caixa_destino_origem.trim()) return 'Caixa Destino/Origem é obrigatório.';
        if (form.formas_pagamento.length === 0) { return 'Dados do Pagamento é obrigatório.'; }

        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const erroValidacao = validarCampos();
        if (erroValidacao) {
            setErro(erroValidacao);
            toast.error(erroValidacao);
            return;
        }
        setErro('');

        console.log("Dados para envio:", form);

        try {
            if (modo === 'editar') {
                await axios.put(`${API_URL}/contas/${contaEdicao.id}`, form);
                toast.success('Conta atualizada com sucesso!');
            } else {
                await axios.post(`${API_URL}/contas`, form);
                toast.success('Conta criada com sucesso!');
            }
            const tipoPath = form.tipo_conta === 'A Receber' ? 'receber' : 'pagar';
            navigate(`/financeiro/${tipoPath}`);
        } catch (err) {
            const errorMsg = err?.response?.data?.detail || 'Erro ao salvar a conta.';
            setErro(errorMsg);
            toast.error(errorMsg);
        }
    };

    const abas = [
        { id: 'dadosConta', label: 'Dados da Conta' },
        { id: 'dadosPagamento', label: 'Dados do Pagamento' },
    ];

    const renderCampos = () => {
        switch (abaAtual) {
            case 'dadosConta':
                return (
                    <>
                        <CampoDropdownEditavel
                            label="Tipo de Conta"
                            name="tipo_conta"
                            value={form.tipo_conta}
                            onChange={handleChange}
                            tipo="tipo_conta_options"
                            usuario={usuario}
                            obrigatorio
                            placeholder="Selecione o tipo"
                        />
                        <CampoDropdownEditavel
                            label="Situação"
                            name="situacao_conta"
                            value={form.situacao_conta}
                            onChange={handleChange}
                            tipo="situacao_contas_options"
                            usuario={usuario}
                            obrigatorio
                        />
                        <CampoTextsimples
                            label="Descrição da Conta"
                            name="descricao_conta"
                            value={form.descricao_conta}
                            onChange={handleChange}
                            placeholder="Ex: Pagamento da conta de energia"
                        />
                        <CampoNumsimples
                            label="Número do documento"
                            name="num_conta"
                            value={form.num_conta}
                            onChange={handleChange}
                            obrigatorio
                            placeholder="00000000"
                        />
                        <CampoDropdownDb
                            label="Cliente/Fornecedor"
                            name="id_cliente_fornecedor"
                            value={form.id_cliente_fornecedor}
                            onChange={handleChange}
                            url={`${API_URL}/cadastros_dropdown`}
                            filtro={{ tipo_cadastro: ["Cliente", "Fornecedor"] }}
                            campoValor="id"
                            campoLabel="nome_razao"
                            obrigatorio
                            placeholder="Selecione o Cliente/Fornecedor"
                        />
                        <CampoData
                            label="Data de Emissão"
                            name="data_emissao"
                            value={form.data_emissao}
                            onChange={handleChange}
                            obrigatorio
                            hoje={true}
                        />
                        <CampoData
                            label="Data de Vencimento"
                            name="data_vencimento"
                            value={form.data_vencimento}
                            onChange={handleChange}
                            obrigatorio
                            hojeMaisDias={7}
                        />
                        <CampoData
                            label="Data de Baixa"
                            name="data_baixa"
                            value={form.data_baixa}
                            onChange={handleChange}
                        />
                        <CampoDropdownEditavel
                            label="Plano de Contas"
                            name="plano_contas"
                            value={form.plano_contas}
                            onChange={handleChange}
                            tipo="plano_contas_options"
                            usuario={usuario}
                            obrigatorio
                            placeholder="Selecione o plano"
                        />
                        <CampoDropdownEditavel
                            label="Caixa Destino/Origem"
                            name="caixa_destino_origem"
                            value={form.caixa_destino_origem}
                            onChange={handleChange}
                            tipo="caixa_options"
                            usuario={usuario}
                            obrigatorio
                            placeholder="Selecione o caixa"
                        />
                        <CampoTextarea
                            label="Observações"
                            name="observacoes_conta"
                            value={form.observacoes_conta}
                            onChange={handleChange}
                            colSpan
                            placeholder="Detalhes adicionais sobre a conta"
                        />
                    </>
                );
            case 'dadosPagamento':
                return (
                    <CampoPagamentoContas
                        form={form}
                        setForm={setForm}
                        handleChange={handleChange}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-28">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
                {modo === 'editar' ? `Editar Conta: ${contaEdicao?.nome_razao || ''}` : 'Nova Conta'}
            </h1>

            <div className="flex flex-wrap gap-1 border-b border-gray-300 mb-6">
                {abas.map((aba) => (
                    <button
                        key={aba.id}
                        onClick={() => setAbaAtual(aba.id)}
                        className={`px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium rounded-t-md transition-all duration-200 ease-in-out focus:outline-none
                    ${abaAtual === aba.id
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                            }`}
                    >
                        {aba.label}
                    </button>
                ))}
            </div>

            <form id="form-principal" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {renderCampos()}
            </form>

            <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row justify-end gap-3 mt-8 mb-12">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium transition-colors"
                >
                    Voltar
                </button>
                <ButtonComPermissao
                    permissoes={["admin", "editor"]}
                    type="submit"
                    form="form-principal"
                    className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold transition-colors"
                >
                    {modo === 'editar' ? 'Salvar Alterações' : 'Criar Conta'}
                </ButtonComPermissao>
            </div>

            <ModalErro mensagem={erro} onClose={() => setErro('')} />
        </div>
    );
}