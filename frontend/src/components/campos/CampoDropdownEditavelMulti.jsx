import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Pencil, Trash2, ChevronDown, X } from "lucide-react";
import { verificarPermissao } from "@/utils/verificarPermissao";

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CampoDropdownEditavelMulti({
    label,
    name,
    value = [],
    onChange,
    tipo,
    colSpan,
    usuario,
    permissoes = ["admin"],
    obrigatorio = false
}) {
    const [lista, setLista] = useState([]);
    const [aberto, setAberto] = useState(false);
    const [novaOpcao, setNovaOpcao] = useState("");
    const [editandoIndex, setEditandoIndex] = useState(null);
    const [valorEditando, setValorEditando] = useState("");
    const dropdownRef = useRef();

    const podeEditar = verificarPermissao(usuario, permissoes);

    // Carrega opções do backend
    useEffect(() => {
        if (!API_URL || !tipo) {
            console.warn("API_URL ou tipo não definidos para CampoDropdownEditavelMulti.");
            return;
        }
        axios.get(`${API_URL}/opcoes/${tipo}`) // USO DA VARIÁVEL DE AMBIENTE AQUI
            .then(res => {
                const opcoes = Array.isArray(res.data) ? res.data : []; // Garante que é um array
                setLista(opcoes);
            })
            .catch((error) => {
                console.error(`Erro ao carregar opções para o tipo ${tipo}:`, error);
                toast.error("Erro ao carregar opções.");
                setLista([]); // Garante que a lista seja um array vazio em caso de erro
            });
    }, [tipo]); // Dependência: tipo

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

    // Manipula a seleção/desseleção de uma opção
    const handleSelecionar = (valor) => {
        if (value.includes(valor)) {
            const novaLista = value.filter(v => v !== valor);
            onChange({ target: { name, value: novaLista } });
        } else {
            onChange({ target: { name, value: [...value, valor] } });
        }
    };

    // Remove uma opção selecionada (clicando no X)
    const handleRemoverSelecionado = (valor) => {
        const novaLista = value.filter(v => v !== valor);
        onChange({ target: { name, value: novaLista } });
    };

    // Adiciona uma nova opção ao backend
    const handleAdicionar = async () => {
        const nova = novaOpcao.trim();
        if (!nova) {
            toast.error("A nova opção não pode ser vazia.");
            return;
        }
        if (lista.some(l => l.valor === nova)) {
            toast.error("Opção já existe.");
            return;
        }

        try {
            const res = await axios.post(`${API_URL}/opcoes`, { // USO DA VARIÁVEL DE AMBIENTE AQUI
                tipo,
                valor: nova
            });
            const novaInserida = res.data;
            const novaLista = [...lista, novaInserida];
            setLista(novaLista);
            setNovaOpcao("");
            toast.success("Opção adicionada!");
        } catch (err) {
            console.error("Erro ao adicionar opção:", err);
            toast.error("Erro ao adicionar opção.");
        }
    };

    // Edita uma opção existente no backend
    const handleEditar = async (index) => {
        const id = lista[index].id;
        const valorAtualizado = valorEditando.trim();

        if (!valorAtualizado) {
            toast.error("O valor não pode ser vazio.");
            return;
        }
        if (lista.some((l, i) => i !== index && l.valor === valorAtualizado)) {
            toast.error("Opção duplicada.");
            return;
        }

        try {
            await axios.put(`${API_URL}/opcoes/${id}`, null, { // USO DA VARIÁVEL DE AMBIENTE AQUI
                params: { novo_valor: valorAtualizado }
            });
            setLista(prev => {
                const novaLista = [...prev];
                novaLista[index].valor = valorAtualizado;
                return novaLista;
            });
            // Se o valor editado estava selecionado, atualiza na lista de valores do form
            if (value.includes(lista[index].valor)) {
                onChange({ target: { name, value: value.map(v => v === lista[index].valor ? valorAtualizado : v) } });
            }
            toast.success("Opção editada!");
        } catch (err) {
            console.error("Erro ao editar opção:", err);
            toast.error("Erro ao editar opção.");
        }
        setEditandoIndex(null);
    };

    // Exclui uma opção do backend
    const handleExcluir = async (index) => {
        const id = lista[index].id;
        const valorExcluido = lista[index].valor;
        try {
            await axios.delete(`${API_URL}/opcoes/${id}`); // USO DA VARIÁVEL DE AMBIENTE AQUI
            setLista(prev => prev.filter((_, i) => i !== index));
            // Remove da lista de valores selecionados do form se estiver presente
            onChange({ target: { name, value: value.filter(v => v !== valorExcluido) } });
            toast.success("Opção removida!");
        } catch (err) {
            console.error("Erro ao remover opção:", err);
            toast.error("Erro ao remover opção.");
        }
    };

    return (
        <div className={`${colSpan ? "col-span-2" : ""} relative`} ref={dropdownRef}>
            <label className="block mb-1 font-medium text-gray-700">
                {label}
                {obrigatorio && <span className="text-red-600">*</span>}
            </label>
            <div className="relative w-full">
                <div
                    onClick={() => setAberto(!aberto)}
                    className="relative w-full border border-gray-300 rounded bg-white flex flex-wrap gap-1 items-start cursor-pointer px-2 py-1 min-h-10 pr-6 max-w-full overflow-hidden focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                    style={{ minWidth: 0 }}
                >
                    {value.length === 0 && (
                        <div className="w-full flex items-center text-gray-400 text-sm h-8 ml-1">
                            Selecione
                        </div>
                    )}

                    {value.map((val) => (
                        <div
                            key={val}
                            className="flex items-center h-8 bg-gray-100 rounded px-2 text-sm text-gray-800 max-w-full overflow-hidden whitespace-nowrap text-ellipsis"
                        >
                            <span className="truncate max-w-[calc(100%-20px)]">{val}</span>
                            <button
                                type="button"
                                className="ml-1 hover:text-red-600 shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoverSelecionado(val);
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}

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


            </div>

            {aberto && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-72 overflow-y-auto">
                    <ul className="divide-y divide-gray-200">
                        {lista.map((opcao, index) => (
                            <li
                                key={opcao.id}
                                // O onClick aqui só alterna a seleção, não faz a edição ou exclusão
                                onClick={() => editandoIndex !== index && handleSelecionar(opcao.valor)} 
                                className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 text-sm cursor-pointer"
                            >
                                <div className="flex items-center gap-2 flex-grow">
                                    <input
                                        type="checkbox"
                                        checked={value.includes(opcao.valor)}
                                        readOnly
                                        className="pointer-events-none" // Impede que o clique no checkbox por si só mude o estado
                                    />
                                    {editandoIndex === index ? (
                                        <input
                                            value={valorEditando}
                                            onChange={(e) => setValorEditando(e.target.value)}
                                            onBlur={() => handleEditar(index)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault(); // Impede o envio do formulário pai
                                                    handleEditar(index);
                                                }
                                                if (e.key === "Escape") setEditandoIndex(null);
                                            }}
                                            className="border border-gray-300 rounded px-2 py-1 text-sm flex-grow"
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()} // Impede o clique de propagar e fechar o dropdown
                                        />
                                    ) : (
                                        <span className="flex-grow">{opcao.valor}</span>
                                    )}
                                </div>

                                {podeEditar && editandoIndex !== index && ( // Só mostra botões de edição/exclusão se não estiver editando e tiver permissão
                                    <div className="flex gap-1 ml-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Impede que o clique feche o dropdown
                                                setEditandoIndex(index);
                                                setValorEditando(opcao.valor);
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-md"
                                            title="Editar"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Impede que o clique feche o dropdown
                                                handleExcluir(index);
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white p-1 rounded-md"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}

                        {podeEditar && (
                            <li className="px-3 py-3 bg-gray-50 border-t">
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
                                        className="flex-1 border border-gray-300 px-2 py-1 rounded text-sm focus:ring-teal-500 focus:border-teal-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAdicionar}
                                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                        title="Adicionar"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}