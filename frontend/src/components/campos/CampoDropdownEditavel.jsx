// Nome do arquivo: CampoDropdownEditavel.jsx

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Pencil, Trash2, ChevronDown, PlusIcon } from "lucide-react";
import { verificarPermissao } from "@/utils/verificarPermissao";

// Define a URL da API a partir das variáveis de ambiente do Vite
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
    opcoes: propOpcoes // Nova prop para opções estáticas (ex: ["Sim", "Não"])
}) {
    const [lista, setLista] = useState([]);
    const [aberto, setAberto] = useState(false);
    const [novaOpcao, setNovaOpcao] = useState("");
    const [editandoIndex, setEditandoIndex] = useState(null);
    const [valorEditando, setValorEditando] = useState("");
    const [displayedText, setDisplayedText] = useState(placeholder);
    const dropdownRef = useRef();

    const podeEditar = verificarPermissao(usuario, permissoes);

    // Tipos de dropdown que NÃO podem ser editados/adicionados/excluídos via interface
    const tiposNaoEditaveis = ['indicador_ie', 'boolean_estoque'];
    const ehEditavelPeloUsuario = !tiposNaoEditaveis.includes(tipo);

    // Mapa para converter códigos de indicador_ie para texto
    const indicadorIeLabelMap = {
        '1': "Contribuinte ICMS",
        '2': "Contribuinte Isento de IE",
        '9': "Não Contribuinte"
    };
    // Mapa para converter texto de indicador_ie para código (usado ao selecionar)
    const indicadorIeValueMap = {
        "Contribuinte ICMS": '1',
        "Contribuinte Isento de IE": '2',
        "Não Contribuinte": '9'
    };

    // Mapeamento para boolean_estoque
    const booleanEstoqueLabelMap = {
        '1': "Sim",
        '0': "Não",
        'Sim': "Sim", // Para casos onde o valor inicial pode ser string 'Sim'/'Não'
        'Não': "Não"
    };
    const booleanEstoqueValueMap = {
        "Sim": '1',
        "Não": '0'
    };

    useEffect(() => {
        if (propOpcoes && Array.isArray(propOpcoes)) {
            // Se propOpcoes é fornecido, use-o para popular a lista
            setLista(propOpcoes.map(opt => ({ valor: opt, id: opt }))); // Cria objetos {valor, id}
        } else if (ehEditavelPeloUsuario) { // Só carrega do backend se for um tipo editável
            if (!API_URL || !tipo) {
                console.warn("API_URL ou tipo não definidos para CampoDropdownEditavel.");
                return;
            }
            axios.get(`${API_URL}/opcoes/${tipo}`)
                .then(res => {
                    const opcoes = Array.isArray(res.data) ? res.data : [];
                    setLista(opcoes);
                })
                .catch((error) => {
                    console.error(`Erro ao carregar opções para o tipo ${tipo}:`, error);
                    toast.error(`Erro ao carregar opções para ${tipo}`);
                    setLista([]);
                });
        } else if (tipo === 'indicador_ie') {
            // Popula lista para indicador_ie a partir do mapa
            setLista(Object.keys(indicadorIeLabelMap).map(key => ({
                id: key,
                valor: indicadorIeLabelMap[key]
            })));
        } else if (tipo === 'boolean_estoque') {
            // Popula lista para boolean_estoque a partir do mapa
            setLista(Object.keys(booleanEstoqueValueMap).map(key => ({
                id: booleanEstoqueValueMap[key], // Usa 0 ou 1 como id
                valor: key // 'Sim' ou 'Não'
            })));
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

    useEffect(() => {
        let textToShow = placeholder;
        if (value !== undefined && value !== null && value !== "") {
            if (tipo === 'indicador_ie') {
                textToShow = indicadorIeLabelMap[String(value)] || String(value);
            } else if (tipo === 'boolean_estoque') {
                textToShow = booleanEstoqueLabelMap[String(value)] || String(value);
            } else {
                const selectedOption = lista.find(op => op.valor === value);
                textToShow = selectedOption ? selectedOption.valor : String(value);
            }
        }
        setDisplayedText(textToShow || placeholder);
    }, [value, lista, tipo, placeholder, indicadorIeLabelMap, booleanEstoqueLabelMap]);

    const handleSelecionar = (opcaoSelecionada) => {
        let valorParaOnChange = opcaoSelecionada.valor;

        if (tipo === 'indicador_ie') {
            valorParaOnChange = indicadorIeValueMap[opcaoSelecionada.valor] || opcaoSelecionada.valor;
        } else if (tipo === 'boolean_estoque') {
            valorParaOnChange = booleanEstoqueValueMap[opcaoSelecionada.valor] || opcaoSelecionada.valor;
        }

        onChange({ target: { name, value: valorParaOnChange } });
        setAberto(false);
    };

    const handleAdicionar = async () => {
        if (!ehEditavelPeloUsuario) return; // Impede adição para tipos não editáveis

        const novaOpcaoTexto = novaOpcao.trim();
        if (!novaOpcaoTexto) {
            toast.error("A nova opção não pode ser vazia.");
            return;
        }
        if (lista.some(l => l.valor === novaOpcaoTexto)) {
            toast.error("Opção já existe.");
            return;
        }

        try {
            const res = await axios.post(`${API_URL}/opcoes`, {
                tipo,
                valor: novaOpcaoTexto
            });
            const novaInserida = res.data;
            const novaListaAtualizada = [...lista, novaInserida];
            setLista(novaListaAtualizada);
            
            handleSelecionar(novaInserida);
            
            setNovaOpcao("");
            toast.success("Opção adicionada e selecionada!");
        } catch (err) {
            console.error("Erro ao adicionar opção:", err);
            toast.error("Erro ao adicionar opção.");
        }
    };

    const handleEditar = async (index) => {
        if (!ehEditavelPeloUsuario) return; // Impede edição para tipos não editáveis

        const opcaoOriginal = lista[index];
        const id = opcaoOriginal.id;
        const novoValorTexto = valorEditando.trim();

        if (!novoValorTexto) {
            toast.error("O valor não pode ser vazio.");
            setEditandoIndex(null);
            return;
        }
        if (lista.some((l, i) => i !== index && l.valor === novoValorTexto)) {
            toast.error("Opção duplicada.");
            setEditandoIndex(null);
            return;
        }
        if (novoValorTexto === opcaoOriginal.valor) {
            setEditandoIndex(null);
            return;
        }

        try {
            await axios.put(`${API_URL}/opcoes/${id}`, { valor: novoValorTexto }); // Corrigido payload para PUT
            
            setLista(prev => {
                const novaLista = [...prev];
                novaLista[index].valor = novoValorTexto;
                return novaLista;
            });
            
            let valorAtualSelecionadoNoForm = value;
            if (tipo === 'indicador_ie') {
                valorAtualSelecionadoNoForm = indicadorIeLabelMap[String(value)] || String(value);
            } else if (tipo === 'boolean_estoque') { // Adicionado para boolean_estoque
                valorAtualSelecionadoNoForm = booleanEstoqueLabelMap[String(value)] || String(value);
            }

            if (valorAtualSelecionadoNoForm === opcaoOriginal.valor) {
                handleSelecionar(lista[index]);
            }
            toast.success("Opção editada!");
        } catch (err) {
            console.error("Erro ao editar opção:", err);
            toast.error("Erro ao editar opção.");
        }
        setEditandoIndex(null);
    };

    const handleExcluir = async (index) => {
        if (!ehEditavelPeloUsuario) return; // Impede exclusão para tipos não editáveis

        const opcaoExcluir = lista[index];
        const id = opcaoExcluir.id;
        try {
            await axios.delete(`${API_URL}/opcoes/${id}`);
            
            setLista(prev => prev.filter((_, i) => i !== index));
            
            let valorAtualSelecionadoNoForm = value;
            if (tipo === 'indicador_ie') {
                valorAtualSelecionadoNoForm = indicadorIeLabelMap[String(value)] || String(value);
            } else if (tipo === 'boolean_estoque') { // Adicionado para boolean_estoque
                valorAtualSelecionadoNoForm = booleanEstoqueLabelMap[String(value)] || String(value);
            }

            if (valorAtualSelecionadoNoForm === opcaoExcluir.valor) {
                onChange({ target: { name, value: "" } });
            }
            toast.success("Opção removida!");
        } catch (err) {
            console.error("Erro ao remover opção:", err);
            toast.error("Erro ao remover opção.");
        }
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
                    <span className={`truncate ${displayedText === placeholder || !value ? "text-gray-400" : "text-gray-800"}`}>
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
                            {lista.length > 0 ? (
                                lista.map((opcao, index) => (
                                    <li
                                        key={opcao.id || index}
                                        onClick={(e) => {
                                            if (editandoIndex === index) {
                                                e.stopPropagation();
                                            } else {
                                                handleSelecionar(opcao);
                                            }
                                        }}
                                        className={`flex items-center justify-between px-3 py-2 hover:bg-gray-100 text-sm cursor-pointer ${
                                            (tipo === 'indicador_ie' ? (indicadorIeValueMap[opcao.valor] === value) :
                                            (tipo === 'boolean_estoque' ? (booleanEstoqueValueMap[opcao.valor] === value) :
                                            (opcao.valor === value)))
                                            ? 'bg-blue-50 text-blue-800 font-semibold' : ''
                                        } ${editandoIndex === index ? 'bg-gray-50' : ''}`}
                                        role="option"
                                        aria-selected={
                                            tipo === 'indicador_ie' ? (indicadorIeValueMap[opcao.valor] === value) :
                                            (tipo === 'boolean_estoque' ? (booleanEstoqueValueMap[opcao.valor] === value) :
                                            (opcao.valor === value))
                                        }
                                    >
                                        {editandoIndex === index ? (
                                            <input
                                                value={valorEditando}
                                                onChange={(e) => setValorEditando(e.target.value)}
                                                onBlur={() => handleEditar(index)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") { e.preventDefault(); handleEditar(index); }
                                                    if (e.key === "Escape") { 
                                                        e.preventDefault();
                                                        setEditandoIndex(null); 
                                                        setValorEditando(opcao.valor);
                                                    }
                                                }}
                                                className="flex-1 border border-gray-300 px-2 py-1 text-sm w-full mr-2"
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <span className="flex-1 truncate">{opcao.valor || placeholder}</span>
                                        )}
                                        {podeEditar && ehEditavelPeloUsuario && editandoIndex !== index && ( // Só mostra botões se for editável pelo usuário e não estiver editando este item
                                            <div className="flex gap-1 ml-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditandoIndex(index);
                                                        setValorEditando(opcao.valor);
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded"
                                                    title="Editar"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleExcluir(index);
                                                    }}
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

                            {podeEditar && ehEditavelPeloUsuario && ( // Só mostra o campo de adicionar se for editável pelo usuário
                                <li className="px-3 py-3 border-t border-gray-200">
                                    <div className="flex gap-2 items-center">
                                        <input
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleAdicionar();
                                                }
                                            }}
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