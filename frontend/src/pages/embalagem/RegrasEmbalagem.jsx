// src/pages/embalagens/CadastroLogicaEmbalagem.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';

import CampoTextsimples from '@/components/campos/CampoTextsimples';
import ConstrutorFormula from '@/components/campos/ConstrutorFormula';
import CampoDropdown from '@/components/campos/CampoDropdown';

const API_URL = import.meta.env.VITE_API_BASE_URL;

// Lógica para criar uma nova regra com fórmulas padrão ATUALIZADAS para a nova lógica
const criarNovaRegra = () => ({
    id_regra: uuidv4(),
    condicao_gatilho: 'SEMPRE',
    valor_gatilho: '',
    prioridade: 0,
    // Fórmula padrão: Altura da Embalagem + 2cm 
    formula_altura: [
        { tipo: 'variavel', valor: 'ALTURA_EMBALAGEM' },
    ],
    // Fórmula padrão: Largura da Embalagem + 2cm
    formula_largura: [
        { tipo: 'variavel', valor: 'LARGURA_EMBALAGEM' },
    ],
    // Fórmula padrão: Comprimento da Embalagem + 2cm
    formula_comprimento: [
        { tipo: 'variavel', valor: 'COMPRIMENTO_EMBALAGEM' },
    ],
    // Fórmula padrão: Usa o Peso Proporcional calculado + o peso da própria embalagem
    formula_peso: [
        { tipo: 'variavel', valor: 'PESO_PROPORCIONAL' },
    ],
});

const OPCOES_GATILHO = [
    { valor: 'SEMPRE', texto: 'Sempre Aplicar' },
    // ... (resto das opções sem alteração)
    { valor: 'IGUAL_A', texto: 'Qtd. Restante IGUAL A' },
    { valor: 'MAIOR_QUE', texto: 'Qtd. Restante MAIOR QUE' },
    { valor: 'MAIOR_IGUAL_A', texto: 'Qtd. Restante MAIOR OU IGUAL A' },
    { valor: 'MENOR_QUE', texto: 'Qtd. Restante MENOR QUE' },
    { valor: 'MENOR_IGUAL_A', texto: 'Qtd. Restante MENOR OU IGUAL A' },
    { valor: 'ENTRE', texto: 'Qtd. Restante ESTÁ ENTRE (ex: 5,13)' },
];

export default function CadastroLogicaEmbalagem({ modo = 'novo' }) {
    // ... (todo o resto do componente permanece igual)
    const navigate = useNavigate();
    const location = useLocation();
    const logicaEdicao = location.state?.logica || null;

    const [form, setForm] = useState({
        nome: '',
        descricao: '',
        regras: [criarNovaRegra()],
    });

    useEffect(() => {
        if (modo === 'editar' && logicaEdicao) {
            setForm({
                nome: logicaEdicao.nome || '',
                descricao: logicaEdicao.descricao || '',
                regras: logicaEdicao.regras?.length > 0 ? logicaEdicao.regras.map(r => ({...r, valor_gatilho: r.valor_gatilho ?? ''})) : [criarNovaRegra()],
            });
        }
    }, [logicaEdicao, modo]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleRegraChange = (index, campo, valor) => {
        const novasRegras = [...form.regras];
        let valorFinal = valor;
        
        if (campo === 'prioridade') {
            valorFinal = valor === '' ? 0 : parseInt(valor, 10);
        }
        
        if (campo === 'condicao_gatilho' && valor === 'SEMPRE') {
            novasRegras[index]['valor_gatilho'] = '';
        }

        novasRegras[index][campo] = valorFinal;
        setForm(prev => ({ ...prev, regras: novasRegras }));
    };

    const handleFormulaChange = (indexRegra, nomeFormula, novaFormula) => {
        const novasRegras = [...form.regras];
        novasRegras[indexRegra][nomeFormula] = novaFormula;
        setForm(prev => ({ ...prev, regras: novasRegras }));
    };

    const adicionarRegra = () => {
        setForm(prev => ({
            ...prev,
            regras: [...prev.regras, criarNovaRegra()],
        }));
    };

    const removerRegra = (index) => {
        if (form.regras.length <= 1) {
            toast.warn('É necessário ter pelo menos uma regra.');
            return;
        }
        const novasRegras = [...form.regras];
        novasRegras.splice(index, 1);
        setForm(prev => ({ ...prev, regras: novasRegras }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nome.trim()) {
            toast.error('O Nome da Lógica é obrigatório.');
            return;
        }

        const payload = {
            ...form,
            regras: form.regras.map(regra => {
                const { valor_gatilho, ...resto } = regra;
                return {
                    ...resto,
                    valor_gatilho: regra.condicao_gatilho !== 'SEMPRE' && valor_gatilho !== '' ? valor_gatilho : null
                };
            })
        };
        
        try {
            if (modo === 'editar') {
                await axios.put(`${API_URL}/embalagem/${logicaEdicao.id}`, payload);
                toast.success('Lógica atualizada com sucesso!');
            } else {
                await axios.post(`${API_URL}/embalagem`, payload);
                toast.success('Lógica criada com sucesso!');
            }
            navigate('/embalagem');
        } catch (err) {
            toast.error(err?.response?.data?.detail || 'Erro ao salvar a lógica.');
        }
    };
    
    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-28">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
                {modo === 'editar' ? `Editar Lógica: ${form.nome}` : 'Nova Lógica de Embalagem'}
            </h1>

            <form id="form-logica-embalagem" onSubmit={handleSubmit} className="space-y-6">
                <div className="p-4 border rounded-lg bg-white shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Dados Gerais</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CampoTextsimples label="Nome da Lógica" name="nome" value={form.nome} onChange={handleFormChange} obrigatorio />
                        <CampoTextsimples label="Descrição" name="descricao" value={form.descricao} onChange={handleFormChange} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-700">Regras de Cálculo para Volume Parcial</h2>
                    {form.regras.map((regra, index) => (
                        <div key={regra.id_regra} className="p-4 border rounded-lg bg-white shadow-sm relative">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-teal-700">Regra #{index + 1}</h3>
                                {form.regras.length > 1 && (
                                    <button type="button" onClick={() => removerRegra(index)} className="text-red-500 hover:text-red-700">
                                        <FaTrash />
                                    </button>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-3 bg-gray-50 rounded-md border">
                                <CampoDropdown
                                    label="Condição do Gatilho"
                                    name="condicao_gatilho"
                                    opcoes={OPCOES_GATILHO}
                                    value={regra.condicao_gatilho}
                                    onChange={(e) => handleRegraChange(index, 'condicao_gatilho', e.target.value)}
                                />
                                {regra.condicao_gatilho !== 'SEMPRE' && (
                                    <CampoTextsimples 
                                        label="Valor do Gatilho"
                                        name="valor_gatilho"
                                        value={regra.valor_gatilho}
                                        onChange={(e) => handleRegraChange(index, 'valor_gatilho', e.target.value)}
                                        placeholder={regra.condicao_gatilho === 'ENTRE' ? 'Ex: 5,13' : 'Ex: 10'}
                                    />
                                )}
                                <CampoTextsimples
                                    label="Prioridade (maior executa primeiro)"
                                    name="prioridade"
                                    type="number"
                                    value={regra.prioridade}
                                    onChange={(e) => handleRegraChange(index, 'prioridade', e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <ConstrutorFormula label="Fórmula da Altura (cm)" formula={regra.formula_altura} onChange={(f) => handleFormulaChange(index, 'formula_altura', f)} />
                                <ConstrutorFormula label="Fórmula da Largura (cm)" formula={regra.formula_largura} onChange={(f) => handleFormulaChange(index, 'formula_largura', f)} />
                                <ConstrutorFormula label="Fórmula do Comprimento (cm)" formula={regra.formula_comprimento} onChange={(f) => handleFormulaChange(index, 'formula_comprimento', f)} />
                                <ConstrutorFormula label="Fórmula do Peso (kg)" formula={regra.formula_peso} onChange={(f) => handleFormulaChange(index, 'formula_peso', f)} />
                            </div>
                        </div>
                    ))}
                </div>
                
                <button type="button" onClick={adicionarRegra} className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-800 rounded-md hover:bg-teal-100 border border-teal-200 font-semibold">
                    <FaPlus /> Adicionar Nova Regra
                </button>

                <div className="flex justify-end gap-3 mt-8">
                    <button type="button" onClick={() => navigate(-1)} className="px-5 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium">Voltar</button>
                    <button type="submit" className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold">{modo === 'editar' ? 'Salvar Alterações' : 'Criar Lógica'}</button>
                </div>
            </form>
        </div>
    );
}