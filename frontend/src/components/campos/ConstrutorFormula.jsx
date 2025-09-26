import { useState, useRef, useEffect } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';

// --- LISTA COMPLETA E ATUALIZADA DE VARIÁVEIS ---
// Esta constante define os nomes amigáveis para TODAS as variáveis possíveis.
const TODAS_AS_VARIAVEIS = [
    // --- Variáveis de Quantidade (Dinâmicas) ---
    { valor: 'QTD_A_PROCESSAR', nome: 'Qtd. a Processar' },
    { valor: 'QTD_TOTAL_PEDIDO', nome: 'Qtd. Total do Pedido' },
    { valor: 'QTD_NESTE_VOLUME', nome: 'Qtd. Itens Neste Volume' },

    // --- Variáveis do Produto Individual (Fonte da Verdade) ---
    { valor: 'PESO_ITEM_UNICO', nome: 'Peso (kg) do Item' },
    { valor: 'ALTURA_ITEM_UNICO', nome: 'Altura (cm) do Item' },
    { valor: 'LARGURA_ITEM_UNICO', nome: 'Largura (cm) do Item' },
    { valor: 'COMPRIMENTO_ITEM_UNICO', nome: 'Comprimento (cm) do Item' },

    // --- Variáveis Auxiliares ---
    { valor: 'ACRESCIMO_EMBALAGEM', nome: 'Acréscimo Fixo (padrão: 2)' },
];

const OPERADORES_DISPONIVEIS = ['+', '-', '*', '/', '(', ')'];

// Hook customizado para detectar cliques fora de um elemento (sem alterações)
function useOnClickOutside(ref, handler) {
    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            handler(event);
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}

// Componente para construir uma única fórmula
export default function ConstrutorFormula({ label, formula, onChange, variaveisDisponiveis }) {
    const [mostraSeletor, setMostraSeletor] = useState(false);
    const [numeroInput, setNumeroInput] = useState(''); // Estado para o campo de número
    const seletorRef = useRef(null);

    useOnClickOutside(seletorRef, () => setMostraSeletor(false));

    // Filtra as variáveis a serem exibidas com base na prop `variaveisDisponiveis`
    const variaveisFiltradas = variaveisDisponiveis
        ? TODAS_AS_VARIAVEIS.filter(v => variaveisDisponiveis.includes(v.valor))
        : TODAS_AS_VARIAVEIS;

    const adicionarComponente = (tipo, valor, fecharSeletor = true) => {
        if (valor === '' || valor === null || valor === undefined) return;
        const novoComponente = { tipo, valor: tipo === 'numero' ? parseFloat(valor) : valor };
        onChange([...formula, novoComponente]);

        if (tipo === 'numero') {
            setNumeroInput(''); // Limpa o input de número após adicionar
        }

        if (fecharSeletor) {
            setMostraSeletor(false);
        }
    };

    const removerComponente = (index) => {
        const novaFormula = formula.filter((_, i) => i !== index);
        onChange(novaFormula);
    };

    return (
        <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>

            <div className="relative flex flex-wrap items-center gap-2 p-2 border rounded-md min-h-[42px] bg-gray-50">
                {formula.map((comp, index) => (
                    <div key={index} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-200 text-gray-800 text-sm font-medium">
                        <span>
                            {comp.tipo === 'variavel'
                                ? TODAS_AS_VARIAVEIS.find(v => v.valor === comp.valor)?.nome || comp.valor
                                : comp.valor}
                        </span>
                        <button type="button" onClick={() => removerComponente(index)} className="text-gray-500 hover:text-red-600 transition-colors">
                            <FaTimes size={12} />
                        </button>
                    </div>
                ))}

                <button type="button" onClick={() => setMostraSeletor(s => !s)} className="text-teal-600 hover:text-teal-800 transition-colors ml-1 p-1 rounded-full hover:bg-teal-100">
                    <FaPlus />
                </button>

                {mostraSeletor && (
                    <div
                        ref={seletorRef}
                        className="absolute top-full left-0 mt-2 z-20 w-full sm:w-80 bg-white border border-gray-300 rounded-lg shadow-xl p-4"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-md font-semibold text-gray-800">Adicionar à Fórmula</h3>
                            <button onClick={() => setMostraSeletor(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase">Variável</label>
                                <select
                                    onChange={(e) => adicionarComponente('variavel', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded mt-1 text-sm focus:ring-teal-500 focus:border-teal-500"
                                    value="" // Sempre reseta para o placeholder
                                >
                                    <option value="" disabled>Selecione uma variável...</option>
                                    {variaveisFiltradas.map(v => <option key={v.valor} value={v.valor}>{v.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase">Operador</label>
                                <div className="grid grid-cols-4 gap-2 mt-1">
                                    {OPERADORES_DISPONIVEIS.map(op => (
                                        <button
                                            key={op}
                                            type="button"
                                            // Para os parênteses, o 'tipo' também é 'operador', o backend vai saber diferenciar
                                            onClick={() => adicionarComponente('operador', op)}
                                            className="py-2 text-center border rounded bg-gray-100 hover:bg-teal-500 hover:text-white font-mono text-lg transition-colors"
                                        >
                                            {op}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase">Número</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="number"
                                        step="any"
                                        value={numeroInput}
                                        onChange={(e) => setNumeroInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarComponente('numero', numeroInput, false); } }}
                                        className="flex-grow p-2 border border-gray-300 rounded text-sm focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Ex: 2.5"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => adicionarComponente('numero', numeroInput, false)}
                                        className="px-3 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm font-semibold"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}