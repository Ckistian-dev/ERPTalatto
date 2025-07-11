// src/components/campos/CampoDropdownSimNao.jsx

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

export default function CampoDropdownSimNao({
    label,
    name,
    value, // O valor esperado será 0 ou 1 (boolean)
    onChange,
    colSpan,
    obrigatorio = false,
    placeholder = "Selecione"
}) {
    const [aberto, setAberto] = useState(false);
    const dropdownRef = useRef();

    // Opções fixas para Sim/Não
    const opcoesFixas = [
        { valor: "Sim", id: 1 },
        { valor: "Não", id: 0 }
    ];

    // Mapa para converter valor (0 ou 1) para texto exibido ("Sim" ou "Não")
    const valorParaTextoMap = {
        '1': "Sim",
        '0': "Não",
        true: "Sim", // Para garantir compatibilidade se o backend mandar booleano direto
        false: "Não"
    };

    const [displayedText, setDisplayedText] = useState(placeholder);

    // Detecta clique fora do componente para fechar o dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setAberto(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Atualiza o texto exibido quando 'value' muda
    useEffect(() => {
        let textToShow = placeholder;
        if (value !== undefined && value !== null && value !== "") {
            // Converte o valor para string para usar como chave no mapa
            textToShow = valorParaTextoMap[String(value)] || placeholder;
        }
        setDisplayedText(textToShow);
    }, [value, placeholder]);

    // Manipula a seleção de uma opção
    const handleSelecionar = (opcaoSelecionada) => {
        // Retorna 1 para "Sim" e 0 para "Não"
        const valorParaOnChange = opcaoSelecionada.valor === "Sim" ? 1 : 0;
        onChange({ target: { name, value: valorParaOnChange } });
        setAberto(false);
    };

    return (
        <div className={`${colSpan ? colSpan : ""} relative w-full`} ref={dropdownRef}>
            <label className="block mb-1 font-medium text-gray-700">
                {label}
                {obrigatorio && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative w-full">
                <div
                    onClick={() => setAberto(!aberto)}
                    className="relative w-full h-10 border border-gray-300 rounded bg-white flex justify-between items-center cursor-pointer px-3 py-2 min-h-10 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setAberto(!aberto); }}
                    aria-haspopup="listbox"
                    aria-expanded={aberto}
                >
                    <span className={`truncate ${displayedText === placeholder ? "text-gray-400" : "text-gray-800"}`}>
                        {displayedText}
                    </span>
                    <div
                        className="absolute top-0 right-0 h-full w-4 flex items-center justify-center border-l border-gray-300 hover:bg-gray-100 rounded-tr rounded-br transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setAberto(!aberto);
                        }}
                    >
                        <ChevronDown size={16} className="text-gray-500" />
                    </div>
                </div>
            
                {aberto && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                        <ul className="divide-y divide-gray-100" role="listbox">
                            {opcoesFixas.map((opcao) => (
                                <li
                                    key={opcao.id}
                                    onClick={() => handleSelecionar(opcao)}
                                    className={`flex items-center justify-between px-3 py-2 hover:bg-gray-100 text-sm cursor-pointer ${
                                        (opcao.id === value || String(opcao.id) === String(value)) // Compara 0/1 com o valor
                                        ? 'bg-blue-50 text-blue-800 font-semibold' : ''
                                    }`}
                                    role="option"
                                    aria-selected={opcao.id === value || String(opcao.id) === String(value)}
                                >
                                    <span className="flex-1 truncate">{opcao.valor}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}