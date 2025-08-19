// /components/campos/CampoDropdown.jsx

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from "lucide-react";

export default function CampoDropdown({
    label,
    name,
    value,
    onChange,
    opcoes = [],
    colSpan,
    obrigatorio = false
}) {
    const [aberto, setAberto] = useState(false);
    const dropdownRef = useRef(null);

    const textoSelecionado = opcoes.find(opt => String(opt.valor) === String(value))?.texto || "Selecione";

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

    const handleSelecionar = (valorOpcao) => {
        onChange({ target: { name, value: valorOpcao } });
        setAberto(false);
    };

    return (
        <div className={`${colSpan ? "md:col-span-2" : ""} relative`} ref={dropdownRef}>
            <label className="block mb-1 font-medium text-gray-700">
                {label}
                {obrigatorio && <span className="text-red-600">*</span>}
            </label>
            <div className="relative w-full">
                <div
                    onClick={() => setAberto(!aberto)}
                    className="relative w-full border border-gray-300 rounded bg-white flex items-center cursor-pointer px-3 py-2 min-h-10 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                >
                    <span className={`text-sm ${value ? 'text-gray-800' : 'text-gray-400'}`}>
                        {textoSelecionado}
                    </span>
                    <div className="absolute top-0 right-0 h-full w-4 flex items-center justify-center border-l border-gray-300 hover:bg-gray-100 rounded-r-md transition-colors">
                        <ChevronDown size={16} className="text-gray-500" />
                    </div>
                </div>

                {aberto && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                        <ul className="divide-y divide-gray-200">
                            {opcoes.map((opcao) => (
                                <li
                                    key={opcao.valor}
                                    onClick={() => handleSelecionar(opcao.valor)}
                                    className="px-3 py-2 hover:bg-gray-100 text-sm cursor-pointer"
                                >
                                    {opcao.texto}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
