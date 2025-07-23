// src/pages/embalagens/CadastroLogicaEmbalagem.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid'; // Para gerar IDs únicos

// Seus componentes de campo
import CampoTextsimples from '@/components/campos/CampoTextsimples';
// Componente que acabamos de criar
import ConstrutorFormula from '@/components/campos/ConstrutorFormula';

const API_URL = import.meta.env.VITE_API_BASE_URL;

// Função para gerar uma nova regra vazia
const criarNovaRegra = () => ({
    id_regra: uuidv4(),
    condicao_gatilho: 'SEMPRE',
    valor_gatilho: null,
    prioridade: 0,
    formula_altura: [],
    formula_largura: [],
    formula_comprimento: [],
    formula_peso: [],
});

export default function CadastroLogicaEmbalagem({ modo = 'novo' }) {
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
                regras: logicaEdicao.regras?.length > 0 ? logicaEdicao.regras : [criarNovaRegra()],
            });
        }
    }, [logicaEdicao, modo]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleRegraChange = (index, campo, valor) => {
        const novasRegras = [...form.regras];
        novasRegras[index][campo] = valor;
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
        
        try {
            if (modo === 'editar') {
                await axios.put(`${API_URL}/embalagem/${logicaEdicao.id}`, form);
                toast.success('Lógica atualizada com sucesso!');
            } else {
                await axios.post(`${API_URL}/embalagem`, form);
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
                <div className="p-4 border rounded-lg bg-white">
                    <h2 className="text-xl font-semibold mb-4">Dados Gerais</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CampoTextsimples label="Nome da Lógica" name="nome" value={form.nome} onChange={handleFormChange} obrigatorio />
                        <CampoTextsimples label="Descrição" name="descricao" value={form.descricao} onChange={handleFormChange} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Regras de Cálculo para Volume Parcial</h2>
                    {form.regras.map((regra, index) => (
                        <div key={regra.id_regra} className="p-4 border rounded-lg bg-white relative">
                            <h3 className="font-bold text-lg mb-2">Regra #{index + 1}</h3>
                             {form.regras.length > 1 && (
                                <button type="button" onClick={() => removerRegra(index)} className="absolute top-4 right-4 text-red-500 hover:text-red-700">
                                    <FaTrash />
                                </button>
                            )}

                            {/* Aqui viriam os campos de condição (gatilho, valor, etc.) */}
                            {/* Por simplicidade, começamos com a regra "SEMPRE" */}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-4">
                               <ConstrutorFormula label="Fórmula da Altura" formula={regra.formula_altura} onChange={(f) => handleFormulaChange(index, 'formula_altura', f)} />
                               <ConstrutorFormula label="Fórmula da Largura" formula={regra.formula_largura} onChange={(f) => handleFormulaChange(index, 'formula_largura', f)} />
                               <ConstrutorFormula label="Fórmula do Comprimento" formula={regra.formula_comprimento} onChange={(f) => handleFormulaChange(index, 'formula_comprimento', f)} />
                               <ConstrutorFormula label="Fórmula do Peso (kg)" formula={regra.formula_peso} onChange={(f) => handleFormulaChange(index, 'formula_peso', f)} />
                            </div>
                        </div>
                    ))}
                </div>
                
                 <button type="button" onClick={adicionarRegra} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
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