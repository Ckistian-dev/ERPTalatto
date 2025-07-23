// /components/campos/CampoDropdownEditavel.jsx

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Pencil, Trash2, ChevronDown, PlusIcon } from "lucide-react";
import { verificarPermissao } from "@/utils/verificarPermissao";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CampoDropdownEditavel({
    label,
    name,
    value,
    onChange,
    tipo,
    colSpan,
    usuario,
    permissoes = ["admin"],
    obrigatorio = false,
    placeholder = "Selecione",
    opcoes: propOpcoes
}) {
    const [lista, setLista] = useState([]);
    const [aberto, setAberto] = useState(false);
    const [novaOpcao, setNovaOpcao] = useState("");
    const [editandoIndex, setEditandoIndex] = useState(null);
    const [valorEditando, setValorEditando] = useState("");
    const [displayedText, setDisplayedText] = useState(placeholder);
    const dropdownRef = useRef(null);

    const podeEditar = verificarPermissao(usuario, permissoes);
    const tiposNaoEditaveis = ['indicador_ie', 'crt'];
    const ehEditavelPeloUsuario = !tiposNaoEditaveis.includes(tipo);

    const indicadorIeLabelMap = { '1': "1 - Contribuinte ICMS", '2': "2 - Contribuinte Isento de IE", '9': "9 - Não Contribuinte" };
    const crtLabelMap = { '1': "1 - Simples Nacional", '3': "3 - Regime Normal" };

    useEffect(() => {
        const tiposComIdNumerico = ['indicador_ie', 'crt'];

        const processarOpcoes = (opcoes) => {
            if (!Array.isArray(opcoes)) return [];
            return opcoes.map(opt => {
                if (typeof opt === 'object' && opt.hasOwnProperty('id') && opt.hasOwnProperty('valor')) {
                    return opt;
                }
                const match = String(opt).match(/^(\d+)\s*-\s*(.*)$/);
                if (match && tiposComIdNumerico.includes(tipo)) {
                    return { id: match[1].trim(), valor: opt };
                }
                return { id: opt, valor: opt };
            });
        };

        if (propOpcoes) {
            setLista(processarOpcoes(propOpcoes));
        } else if (ehEditavelPeloUsuario) {
            if (!API_URL || !tipo) return;
            axios.get(`${API_URL}/opcoes/${tipo}`)
                .then(res => setLista(Array.isArray(res.data) ? res.data : []))
                .catch(() => setLista([]));
        } else if (tipo === 'indicador_ie') {
            setLista(Object.entries(indicadorIeLabelMap).map(([id, valor]) => ({ id, valor })));
        } else if (tipo === 'crt') {
            setLista(Object.entries(crtLabelMap).map(([id, valor]) => ({ id, valor })));
        }
    }, [tipo, propOpcoes, ehEditavelPeloUsuario]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setAberto(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // CORREÇÃO: useEffect simplificado para definir o texto de exibição
    useEffect(() => {
        if (!value) {
            setDisplayedText(placeholder);
            return;
        }
        
        const tiposComIdNumerico = ['indicador_ie', 'crt'];
        if (tiposComIdNumerico.includes(tipo)) {
            const selectedOption = lista.find(op => String(op.id) === String(value));
            setDisplayedText(selectedOption ? selectedOption.valor : placeholder);
        } else {
            // Para outros tipos, o valor do formulário JÁ É o texto a ser exibido.
            setDisplayedText(value);
        }
    }, [value, lista, placeholder, tipo]);

    // CORREÇÃO: Lógica para enviar o valor correto (ID ou Texto)
    const handleSelecionar = (opcaoSelecionada) => {
        const tiposComIdNumerico = ['indicador_ie', 'crt'];
        
        // Se o tipo precisar do ID numérico para funcionar, envie o ID.
        // Caso contrário, envie o texto (valor), que é o comportamento esperado pela maioria dos campos.
        const valorParaEnviar = tiposComIdNumerico.includes(tipo)
            ? opcaoSelecionada.id
            : opcaoSelecionada.valor;

        onChange({ target: { name, value: valorParaEnviar } });
        setAberto(false);
    };

    const handleAdicionar = async () => {
        if (!ehEditavelPeloUsuario) return;
        const novaOpcaoTexto = novaOpcao.trim();
        if (!novaOpcaoTexto) return toast.error("A nova opção não pode ser vazia.");
        if (lista.some(l => l.valor === novaOpcaoTexto)) return toast.error("Opção já existe.");

        try {
            const res = await axios.post(`${API_URL}/opcoes`, { tipo, valor: novaOpcaoTexto });
            const novaInserida = res.data;
            setLista(prev => [...prev, novaInserida]);
            handleSelecionar(novaInserida);
            setNovaOpcao("");
            toast.success("Opção adicionada e selecionada!");
        } catch (err) {
            toast.error("Erro ao adicionar opção.");
        }
    };

    const handleEditar = async (index) => {
        if (!ehEditavelPeloUsuario) return;
        const opcaoOriginal = lista[index];
        const novoValorTexto = valorEditando.trim();

        if (!novoValorTexto || novoValorTexto === opcaoOriginal.valor) {
            setEditandoIndex(null);
            return;
        }
        if (lista.some((l, i) => i !== index && l.valor === novoValorTexto)) {
            setEditandoIndex(null);
            return toast.error("Opção duplicada.");
        }

        try {
            await axios.put(`${API_URL}/opcoes/${opcaoOriginal.id}`, { valor: novoValorTexto });
            const novaLista = [...lista];
            novaLista[index].valor = novoValorTexto;
            setLista(novaLista);
            if (String(value) === String(opcaoOriginal.id) || value === opcaoOriginal.valor) {
                handleSelecionar(novaLista[index]);
            }
            toast.success("Opção editada!");
        } catch (err) {
            toast.error("Erro ao editar opção.");
        }
        setEditandoIndex(null);
    };

    const handleExcluir = async (index) => {
        if (!ehEditavelPeloUsuario) return;
        const opcaoExcluir = lista[index];
        try {
            await axios.delete(`${API_URL}/opcoes/${opcaoExcluir.id}`);
            setLista(prev => prev.filter((_, i) => i !== index));
            if (String(value) === String(opcaoExcluir.id) || value === opcaoExcluir.valor) {
                onChange({ target: { name, value: "" } });
            }
            toast.success("Opção removida!");
        } catch (err) {
            toast.error("Erro ao remover opção.");
        }
    };

    return (
        <div className={`${colSpan ? "md:col-span-2" : ""} relative w-full`} ref={dropdownRef}>
            <label className="block mb-1 font-medium text-gray-700">
                {label}
                {obrigatorio && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative w-full">
                <div
                    onClick={() => setAberto(!aberto)}
                    className="relative w-full h-10 border border-gray-300 rounded bg-white flex justify-between items-center cursor-pointer px-3 py-2 min-h-10"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setAberto(!aberto); }}
                    aria-haspopup="listbox"
                    aria-expanded={aberto}
                >
                    <span className={`truncate ${displayedText === placeholder || !value ? "text-gray-400" : "text-gray-800"}`}>
                        {displayedText}
                    </span>
                    <div
                        className="absolute top-0 right-0 h-full w-4 flex items-center justify-center border-l border-gray-300 hover:bg-gray-100"
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
                            {lista.length > 0 ? (
                                lista.map((opcao, index) => (
                                    <li
                                        key={opcao.id || index}
                                        onClick={() => editandoIndex !== index && handleSelecionar(opcao)}
                                        className={`flex items-center justify-between px-3 py-2 hover:bg-gray-100 text-sm cursor-pointer ${value === opcao.valor || String(value) === String(opcao.id) ? 'bg-blue-50 text-blue-800 font-semibold' : ''} ${editandoIndex === index ? 'bg-gray-50' : ''}`}
                                        role="option"
                                        aria-selected={value === opcao.valor || String(value) === String(opcao.id)}
                                    >
                                        {editandoIndex === index ? (
                                            <input
                                                value={valorEditando}
                                                onChange={(e) => setValorEditando(e.target.value)}
                                                onBlur={() => handleEditar(index)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") { e.preventDefault(); handleEditar(index); }
                                                    if (e.key === "Escape") { e.preventDefault(); setEditandoIndex(null); }
                                                }}
                                                className="flex-1 border border-gray-300 px-2 py-1 text-sm w-full mr-2"
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <span className="flex-1 truncate">{opcao.valor || placeholder}</span>
                                        )}
                                        {podeEditar && ehEditavelPeloUsuario && editandoIndex !== index && (
                                            <div className="flex gap-1 ml-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setEditandoIndex(index); setValorEditando(opcao.valor); }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded"
                                                    title="Editar"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleExcluir(index); }}
                                                    className="bg-red-600 hover:bg-red-700 text-white p-1 rounded"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                ))
                            ) : (
                                <li className="px-3 py-2 text-gray-500 text-center">Nenhuma opção disponível.</li>
                            )}

                            {podeEditar && ehEditavelPeloUsuario && (
                                <li className="px-3 py-3 border-t border-gray-200">
                                    <div className="flex gap-2 items-center">
                                        <input
                                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdicionar(); } }}
                                            type="text"
                                            placeholder="Nova opção"
                                            value={novaOpcao}
                                            onChange={(e) => setNovaOpcao(e.target.value)}
                                            className="flex-1 border border-gray-300 px-2 py-1.5 rounded text-sm focus:ring-teal-500 focus:border-teal-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAdicionar}
                                            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                                            title="Adicionar"
                                        >
                                            <PlusIcon size={20} />
                                        </button>
                                    </div>
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}