import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';

// Supondo que seus componentes de formulário estejam localizados aqui
import CampoTextsimples from '@/components/campos/CampoTextsimples';
import CampoNumSetas from '@/components/campos/CampoNumSetas';
import ConstrutorFormula from '@/components/campos/ConstrutorFormula';
import CampoDropdown from '@/components/campos/CampoDropdown';

const API_URL = import.meta.env.VITE_API_BASE_URL;

// Definição centralizada das novas variáveis de contexto para as fórmulas
const VARIAVEIS_CONTEXTO = [
    'QTD_A_PROCESSAR',      // Quantidade total de itens que ainda faltam ser embalados no loop.
    'QTD_TOTAL_PEDIDO',     // Quantidade original solicitada pelo cliente.
    'QTD_NESTE_VOLUME',     // Quantidade de itens que a regra atual decidiu colocar neste volume específico.
    'PESO_ITEM_UNICO',      // Peso em KG de um único item do produto.
    'ALTURA_ITEM_UNICO',    // Altura em CM de um único item do produto.
    'LARGURA_ITEM_UNICO',   // Largura em CM de um único item do produto.
    'COMPRIMENTO_ITEM_UNICO', // Comprimento em CM de um único item do produto.
    'ACRESCIMO_EMBALAGEM'   // Um valor numérico fixo (ex: 2) para folgas, se necessário na fórmula.
];

// Função para criar uma nova regra com valores padrão atualizados
const criarNovaRegra = () => ({
    id_regra: uuidv4(),
    condicao_gatilho: 'SEMPRE',
    valor_gatilho: '',
    prioridade: 0,
    formula_itens: [{ tipo: 'variavel', valor: 'QTD_A_PROCESSAR' }],
    formula_altura: [{ tipo: 'variavel', valor: 'ALTURA_ITEM_UNICO' }],
    formula_largura: [{ tipo: 'variavel', valor: 'LARGURA_ITEM_UNICO' }],
    formula_comprimento: [{ tipo: 'variavel', valor: 'COMPRIMENTO_ITEM_UNICO' }],
    formula_peso: [
        { tipo: 'variavel', valor: 'PESO_ITEM_UNICO' },
        { tipo: 'operador', valor: '*' },
        { tipo: 'variavel', valor: 'QTD_NESTE_VOLUME' }
    ],
    _tipo_regra_ui: 'PADRAO' // Campo auxiliar apenas para controle da interface
});

// --- OPÇÕES DE GATILHO RESTAURADAS ---
const OPCOES_GATILHO = [
    { valor: 'VOLUME_COMPLETO', texto: 'Volume Completo (definir quantidade)' },
    { valor: 'SEMPRE', texto: 'Sempre Aplicar (para o que sobrar)' },
    { valor: 'MAIOR_IGUAL_A', texto: 'Qtd. a Embalar >= (Maior ou Igual a)' },
    { valor: 'IGUAL_A', texto: 'Qtd. a Embalar = (Igual a)' },
    { valor: 'MENOR_QUE', texto: 'Qtd. a Embalar < (Menor que)' },
    { valor: 'ENTRE', texto: 'Qtd. a Embalar ENTRE (ex: 5,10)' },
];


export default function CadastroLogicaEmbalagem({ modo = 'novo' }) {
    const navigate = useNavigate();
    const location = useLocation();
    const logicaEdicao = location.state?.logica || null;

    const [form, setForm] = useState({
        nome: '',
        descricao: '',
        regras: [criarNovaRegra()],
    });
    const [abaAtual, setAbaAtual] = useState('gerais');

    useEffect(() => {
        if (modo === 'editar' && logicaEdicao) {
            setForm({
                nome: logicaEdicao.nome || '',
                descricao: logicaEdicao.descricao || '',
                regras: logicaEdicao.regras?.length > 0 ? logicaEdicao.regras.map(r => {
                    // Lógica para carregar uma regra existente e identificar se é um "Volume Completo"
                    const isVolumeCompleto = r.condicao_gatilho === 'MAIOR_IGUAL_A' &&
                        r.formula_itens.length === 1 &&
                        r.formula_itens[0].tipo === 'numero' &&
                        String(r.formula_itens[0].valor) === String(r.valor_gatilho);

                    return {
                        ...criarNovaRegra(), // Garante que todos os campos existam
                        ...r,
                        valor_gatilho: r.valor_gatilho ?? '',
                        _tipo_regra_ui: isVolumeCompleto ? 'VOLUME_COMPLETO' : 'PADRAO'
                    };
                }) : [criarNovaRegra()],
            });
        }
    }, [logicaEdicao, modo]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleRegraChange = (index, campo, valor) => {
        const novasRegras = [...form.regras];
        const regraAtual = { ...novasRegras[index] };

        if (campo === 'condicao_gatilho') {
            if (valor === 'VOLUME_COMPLETO') {
                regraAtual._tipo_regra_ui = 'VOLUME_COMPLETO';
                regraAtual.condicao_gatilho = 'MAIOR_IGUAL_A';
                if (regraAtual.valor_gatilho && !isNaN(parseInt(regraAtual.valor_gatilho))) {
                    regraAtual.formula_itens = [{ tipo: 'numero', valor: String(regraAtual.valor_gatilho) }];
                }
            } else {
                regraAtual._tipo_regra_ui = 'PADRAO';
                regraAtual.condicao_gatilho = valor;
                if (valor === 'SEMPRE') {
                    regraAtual.valor_gatilho = ''; // Limpa o valor do gatilho para 'SEMPRE'
                    regraAtual.formula_itens = [{ tipo: 'variavel', valor: 'QTD_A_PROCESSAR' }];
                }
            }
        } else if (campo === 'valor_gatilho' && regraAtual._tipo_regra_ui === 'VOLUME_COMPLETO') {
            regraAtual.valor_gatilho = valor;
            if (valor && !isNaN(parseInt(valor))) {
                regraAtual.formula_itens = [{ tipo: 'numero', valor: String(valor) }];
            } else {
                 regraAtual.formula_itens = []; // Limpa se o valor for inválido
            }
        } else {
             regraAtual[campo] = valor;
        }

        novasRegras[index] = regraAtual;
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
        const novasRegras = form.regras.filter((_, i) => i !== index);
        setForm(prev => ({ ...prev, regras: novasRegras }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nome.trim()) {
            toast.error('O Nome da Lógica é obrigatório.');
            return;
        }

        const regrasParaApi = form.regras.map(regra => {
            const { _tipo_regra_ui, ...restoDaRegra } = regra;
            
            if (restoDaRegra.condicao_gatilho === 'SEMPRE' || restoDaRegra.valor_gatilho === '') {
                restoDaRegra.valor_gatilho = null;
            }
            return restoDaRegra;
        });

        const payload = { ...form, regras: regrasParaApi };

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

    const abas = [
        { id: 'gerais', label: 'Dados Gerais' },
        { id: 'regras', label: 'Regras de Cálculo' },
    ];

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-28">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
                {modo === 'editar' ? `Editar Lógica: ${form.nome}` : 'Nova Lógica de Embalagem'}
            </h1>

            <div className="flex flex-wrap gap-1 border-b border-gray-300 mb-6">
                {abas.map((aba) => (
                    <button
                        key={aba.id}
                        onClick={() => setAbaAtual(aba.id)}
                        className={`px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium rounded-t-md transition-all duration-200 ease-in-out focus:outline-none
                          ${abaAtual === aba.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'}`}
                    >
                        {aba.label}
                    </button>
                ))}
            </div>

            <form id="form-logica-embalagem" onSubmit={handleSubmit} className="space-y-4">
                {abaAtual === 'gerais' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <CampoTextsimples label="Nome da Lógica" name="nome" value={form.nome} onChange={handleFormChange} obrigatorio placeholder="Ex: Lógica para Ripados" />
                        <CampoTextsimples label="Descrição" name="descricao" value={form.descricao} onChange={handleFormChange} placeholder="Ex: Caixas de 100un + Parciais" />
                    </div>
                )}

                {abaAtual === 'regras' && (
                    <div className="space-y-8">
                        {form.regras.map((regra, index) => (
                            <div key={regra.id_regra} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-lg text-teal-700">Regra #{index + 1}</h3>
                                    {form.regras.length > 1 && (
                                        <button type="button" onClick={() => removerRegra(index)} className="text-red-500 hover:text-red-700 p-1">
                                            <FaTrash />
                                        </button>
                                    )}
                                </div>
                                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                                    <CampoDropdown
                                        label="Condição do Gatilho"
                                        opcoes={OPCOES_GATILHO}
                                        value={regra._tipo_regra_ui === 'VOLUME_COMPLETO' ? 'VOLUME_COMPLETO' : regra.condicao_gatilho}
                                        onChange={(e) => handleRegraChange(index, 'condicao_gatilho', e.target.value)}
                                    />

                                    {regra._tipo_regra_ui === 'VOLUME_COMPLETO' ? (
                                        <CampoTextsimples
                                            label="Itens no Volume Completo"
                                            name="valor_gatilho"
                                            value={regra.valor_gatilho}
                                            onChange={(e) => handleRegraChange(index, 'valor_gatilho', e.target.value)}
                                            placeholder="Ex: 100"
                                            obrigatorio type="number"
                                        />
                                    ) : regra.condicao_gatilho !== 'SEMPRE' && (
                                        <CampoTextsimples
                                            label="Valor do Gatilho"
                                            name="valor_gatilho"
                                            value={regra.valor_gatilho}
                                            onChange={(e) => handleRegraChange(index, 'valor_gatilho', e.target.value)}
                                            placeholder={regra.condicao_gatilho === 'ENTRE' ? 'Ex: 5,10' : 'Ex: 10'}
                                        />
                                    )}

                                    <CampoNumSetas
                                        label="Prioridade (maior executa primeiro)"
                                        name="prioridade"
                                        type="number"
                                        value={regra.prioridade}
                                        onChange={(e) => handleRegraChange(index, 'prioridade', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t">
                                    {regra._tipo_regra_ui !== 'VOLUME_COMPLETO' && (
                                        <div className="md:col-span-2">
                                            <ConstrutorFormula label="Fórmula de Itens no Volume" formula={regra.formula_itens} onChange={(f) => handleFormulaChange(index, 'formula_itens', f)} variaveisDisponiveis={VARIAVEIS_CONTEXTO} />
                                        </div>
                                    )}
                                    <ConstrutorFormula label="Fórmula da Altura (cm)" formula={regra.formula_altura} onChange={(f) => handleFormulaChange(index, 'formula_altura', f)} variaveisDisponiveis={VARIAVEIS_CONTEXTO} />
                                    <ConstrutorFormula label="Fórmula da Largura (cm)" formula={regra.formula_largura} onChange={(f) => handleFormulaChange(index, 'formula_largura', f)} variaveisDisponiveis={VARIAVEIS_CONTEXTO} />
                                    <ConstrutorFormula label="Fórmula do Comprimento (cm)" formula={regra.formula_comprimento} onChange={(f) => handleFormulaChange(index, 'formula_comprimento', f)} variaveisDisponiveis={VARIAVEIS_CONTEXTO} />
                                    <ConstrutorFormula label="Fórmula do Peso (kg)" formula={regra.formula_peso} onChange={(f) => handleFormulaChange(index, 'formula_peso', f)} variaveisDisponiveis={VARIAVEIS_CONTEXTO} />
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={adicionarRegra} className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-800 rounded-md hover:bg-teal-100 border border-teal-200 font-semibold mt-4">
                            <FaPlus /> Adicionar Nova Regra
                        </button>
                    </div>
                )}
            </form>

            <div className="flex justify-end gap-3 mt-8 mb-12">
                <button type="button" onClick={() => navigate(-1)} className="w-full sm:w-auto px-5 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium transition-colors">
                    Voltar
                </button>
                <button type="submit" form="form-logica-embalagem" className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold transition-colors">
                    {modo === 'editar' ? 'Salvar Alterações' : 'Criar Lógica'}
                </button>
            </div>
        </div>
    );
}
