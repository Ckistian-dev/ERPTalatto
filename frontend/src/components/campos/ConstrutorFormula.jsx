import { useState, useRef, useEffect } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';

// Constantes com a NOVA estrutura de variáveis que você definiu
const VARIAVEIS_DISPONIVEIS = [
    // --- Variáveis de Quantidade ---
    { valor: 'QTD_RESTANTE', nome: 'Qtd. Restante' },
    { valor: 'QTD_EMBALAGEM', nome: 'Qtd. por Embalagem' },
    
    // --- Variáveis da Embalagem (Dados de Origem) ---
    { valor: 'PESO_EMBALAGEM', nome: 'Peso Embalagem' },
    { valor: 'ALTURA_EMBALAGEM', nome: 'Altura Embalagem' },
    { valor: 'LARGURA_EMBALAGEM', nome: 'Largura Embalagem' },
    { valor: 'COMPRIMENTO_EMBALAGEM', nome: 'Comprimento Embalagem' },

    // --- Variáveis Calculadas (Proporcionais) ---
    { valor: 'PESO_PROPORCIONAL', nome: 'Peso Proporcional' },
    { valor: 'ALTURA_PROPORCIONAL', nome: 'Altura Proporcional' },
    { valor: 'LARGURA_PROPORCIONAL', nome: 'Largura Proporcional' },
    { valor: 'COMPRIMENTO_PROPORCIONAL', nome: 'Comprimento Proporcional' },

    // --- Variáveis da Embalagem ---
    { valor: 'ACRESCIMO_EMBALAGEM', nome: 'Acréscimo Fixo (Embalagem)' },
];

const OPERADORES_DISPONIVEIS = ['+', '-', '*', '/'];

// Hook customizado para detectar cliques fora de um elemento
function useOnClickOutside(ref, handler) {
    useEffect(() => {
        const listener = (event) => {
            // Não faz nada se o clique for dentro do ref do elemento ou seus descendentes
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
export default function ConstrutorFormula({ label, formula, onChange }) {
    const [mostraSeletor, setMostraSeletor] = useState(false);
    const seletorRef = useRef(null); // Ref para o menu flutuante

    // Usa o hook customizado para fechar o menu ao clicar fora
    useOnClickOutside(seletorRef, () => setMostraSeletor(false));

    const adicionarComponente = (tipo, valor) => {
        if (!valor) return;
        const novoComponente = { tipo, valor: tipo === 'numero' ? parseFloat(valor) : valor };
        onChange([...formula, novoComponente]);
        setMostraSeletor(false); // Fecha o menu após adicionar
    };

    const removerComponente = (index) => {
        const novaFormula = [...formula];
        novaFormula.splice(index, 1);
        onChange(novaFormula);
    };

    return (
        <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            
            {/* O container principal agora é 'relative' para posicionar o menu flutuante */}
            <div className="relative flex flex-wrap items-center gap-2 p-2 border rounded-md min-h-[42px] bg-white">
                {formula.map((comp, index) => (
                    <div key={index} className="flex items-center gap-1 px-2 py-1 rounded bg-gray-200 text-sm">
                        <span>
                            {comp.tipo === 'variavel'
                                ? VARIAVEIS_DISPONIVEIS.find(v => v.valor === comp.valor)?.nome || comp.valor
                                : comp.valor}
                        </span>
                        <button type="button" onClick={() => removerComponente(index)} className="text-red-500 hover:text-red-700">
                            <FaTimes size={12} />
                        </button>
                    </div>
                ))}
                
                {/* Botão que abre o menu flutuante */}
                <button type="button" onClick={() => setMostraSeletor(s => !s)} className="text-teal-600 hover:text-teal-800">
                    <FaPlus />
                </button>

                {/* --- O NOVO MENU FLUTUANTE --- */}
                {mostraSeletor && (
                    <div 
                        ref={seletorRef}
                        className="absolute top-full left-0 mt-2 z-10 w-full sm:w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-md font-semibold text-gray-800">Adicionar Componente</h3>
                            <button onClick={() => setMostraSeletor(false)} className="text-gray-400 hover:text-gray-600">
                                <FaTimes />
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-600">Variável</label>
                                <select onChange={(e) => adicionarComponente('variavel', e.target.value)} className="w-full p-1.5 border rounded mt-1 text-sm">
                                    <option value="">Selecione...</option>
                                    {VARIAVEIS_DISPONIVEIS.map(v => <option key={v.valor} value={v.valor}>{v.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600">Operador</label>
                                <select onChange={(e) => adicionarComponente('operador', e.target.value)} className="w-full p-1.5 border rounded mt-1 text-sm">
                                        <option value="">Selecione...</option>
                                    {OPERADORES_DISPONIVEIS.map(op => <option key={op} value={op}>{op}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600">Número</label>
                                <input type="number" step="0.01" onBlur={(e) => adicionarComponente('numero', e.target.value)}
                                   onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarComponente('numero', e.target.value); }}}
                                   className="w-full p-1.5 border rounded mt-1 text-sm" placeholder="Ex: 2.5"/>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}