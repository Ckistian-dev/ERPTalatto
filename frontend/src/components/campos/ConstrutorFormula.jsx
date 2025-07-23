// src/components/embalagens/ConstrutorFormula.jsx
import { useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';

// Constantes para manter o código limpo
const VARIAVEIS_DISPONIVEIS = [
    { valor: 'QTD_RESTANTE', nome: 'Qtd. Restante' },
    { valor: 'QTD_POR_EMBALAGEM', nome: 'Qtd. por Embalagem' },
    { valor: 'PESO_PROPORCIONAL', nome: 'Peso Proporcional' },
    { valor: 'ALTURA_BASE', nome: 'Altura Base' },
    { valor: 'LARGURA_BASE', nome: 'Largura Base' },
    { valor: 'COMPRIMENTO_BASE', nome: 'Comprimento Base' },
];

const OPERADORES_DISPONIVEIS = ['+', '-', '*', '/'];

// Componente para construir uma única fórmula
export default function ConstrutorFormula({ label, formula, onChange }) {
    const [mostraSeletor, setMostraSeletor] = useState(false);

    const adicionarComponente = (tipo, valor) => {
        if (!valor) return;
        const novoComponente = { tipo, valor: tipo === 'numero' ? parseFloat(valor) : valor };
        onChange([...formula, novoComponente]);
        setMostraSeletor(false);
    };

    const removerComponente = (index) => {
        const novaFormula = [...formula];
        novaFormula.splice(index, 1);
        onChange(novaFormula);
    };

    return (
        <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md min-h-[42px] bg-white">
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
                <button type="button" onClick={() => setMostraSeletor(true)} className="text-teal-600 hover:text-teal-800">
                    <FaPlus />
                </button>
            </div>

            {mostraSeletor && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 p-2 border rounded-md bg-gray-50">
                    <div>
                        <label className="text-xs font-bold">Variável</label>
                        <select onChange={(e) => adicionarComponente('variavel', e.target.value)} className="w-full p-1 border rounded mt-1">
                            <option value="">Selecione...</option>
                            {VARIAVEIS_DISPONIVEIS.map(v => <option key={v.valor} value={v.valor}>{v.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold">Operador</label>
                        <select onChange={(e) => adicionarComponente('operador', e.target.value)} className="w-full p-1 border rounded mt-1">
                             <option value="">Selecione...</option>
                            {OPERADORES_DISPONIVEIS.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold">Número</label>
                        <input type="number" step="0.01" onBlur={(e) => adicionarComponente('numero', e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && adicionarComponente('numero', e.target.value)}
                         className="w-full p-1 border rounded mt-1" placeholder="Ex: 2.5"/>
                    </div>
                     <button type="button" onClick={() => setMostraSeletor(false)} className="text-sm text-red-600 sm:col-span-3 text-right">Fechar</button>
                </div>
            )}
        </div>
    );
}