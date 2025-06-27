// Nome do arquivo sugerido: CampoDropdownEditavel.jsx (para refletir a funcionalidade)
// Se mantiver CampoDropdownEditavelMulti.jsx, saiba que ele agora é de seleção única.

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Pencil, Trash2, ChevronDown, PlusIcon } from "lucide-react"; // X não é mais necessário
import { verificarPermissao } from "@/utils/verificarPermissao";

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CampoDropdownEditavel({ // Nome da função alterado para refletir seleção única
    label,
    name,
    value, // Este 'value' é o valor real/código (ex: '1', '2', '9' para indicador_ie) ou o texto da opção
    onChange,
    tipo,
    colSpan,
    usuario,
    permissoes = ["admin"],
    obrigatorio = false,
    placeholder = "Selecione" // Adicionado placeholder como prop
}) {
    const [lista, setLista] = useState([]);
    const [aberto, setAberto] = useState(false);
    const [novaOpcao, setNovaOpcao] = useState("");
    const [editandoIndex, setEditandoIndex] = useState(null);
    const [valorEditando, setValorEditando] = useState("");
    const [displayedText, setDisplayedText] = useState(placeholder); // Estado para o texto exibido
    const dropdownRef = useRef();

    const podeEditar = verificarPermissao(usuario, permissoes);

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

    // Carrega opções do backend
    useEffect(() => {
        if (!API_URL || !tipo) {
            console.warn("API_URL ou tipo não definidos para CampoDropdownEditavel.");
            return;
        }
        axios.get(`${API_URL}/opcoes/${tipo}`) // USO DA VARIÁVEL DE AMBIENTE AQUI
            .then(res => {
                const opcoes = Array.isArray(res.data) ? res.data : []; // Garante que a resposta é um array
                setLista(opcoes);
            })
            .catch((error) => {
                console.error(`Erro ao carregar opções para o tipo ${tipo}:`, error);
                toast.error(`Erro ao carregar opções para ${tipo}`);
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

    // Atualiza o texto exibido quando 'value' ou 'lista' mudam
    useEffect(() => {
        let textToShow = placeholder;
        if (value !== undefined && value !== null && value !== "") { // Verifica se há um valor válido
            if (tipo === 'indicador_ie') {
                textToShow = indicadorIeLabelMap[String(value)] || String(value); // Converte para string para garantir chave do map
            } else {
                const selectedOption = lista.find(op => op.valor === value);
                textToShow = selectedOption ? selectedOption.valor : String(value); // fallback para o próprio valor se não encontrado
            }
        }
        setDisplayedText(textToShow || placeholder);
    }, [value, lista, tipo, placeholder, indicadorIeLabelMap]); // Dependências

    // Manipula a seleção de uma opção
    const handleSelecionar = (opcaoSelecionada) => {
        // opcaoSelecionada é um objeto da lista, ex: {id: ..., valor: "Contribuinte ICMS"}
        let valorParaOnChange = opcaoSelecionada.valor;

        // Se o tipo é indicador_ie, converte o texto para o código numérico
        if (tipo === 'indicador_ie') {
            valorParaOnChange = indicadorIeValueMap[opcaoSelecionada.valor] || opcaoSelecionada.valor;
        }
        
        onChange({ target: { name, value: valorParaOnChange } });
        setAberto(false);
    };

    // Adiciona uma nova opção ao backend
    const handleAdicionar = async () => {
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
            const res = await axios.post(`${API_URL}/opcoes`, { // USO DA VARIÁVEL DE AMBIENTE AQUI
                tipo,
                valor: novaOpcaoTexto
            });
            const novaInserida = res.data; // Espera-se { id, valor (texto) }
            const novaListaAtualizada = [...lista, novaInserida];
            setLista(novaListaAtualizada);
            
            handleSelecionar(novaInserida); // Seleciona a nova opção
            
            setNovaOpcao("");
            toast.success("Opção adicionada e selecionada!");
        } catch (err) {
            console.error("Erro ao adicionar opção:", err);
            toast.error("Erro ao adicionar opção.");
        }
    };

    // Edita uma opção existente no backend
    const handleEditar = async (index) => {
        const opcaoOriginal = lista[index];
        const id = opcaoOriginal.id;
        const novoValorTexto = valorEditando.trim();

        if (!novoValorTexto) {
            toast.error("O valor não pode ser vazio.");
            setEditandoIndex(null); // Sai do modo de edição
            return;
        }
        // Verifica se o novo valor já existe na lista (excluindo o próprio item que está sendo editado)
        if (lista.some((l, i) => i !== index && l.valor === novoValorTexto)) {
            toast.error("Opção duplicada.");
            setEditandoIndex(null);
            return;
        }
        // Se o valor não mudou, apenas sai do modo de edição
        if (novoValorTexto === opcaoOriginal.valor) {
            setEditandoIndex(null);
            return;
        }

        try {
            await axios.put(`${API_URL}/opcoes/${id}`, { tipo, valor: novoValorTexto }); // Corrigido payload para PUT
            
            setLista(prev => {
                const novaLista = [...prev];
                novaLista[index].valor = novoValorTexto;
                return novaLista;
            });
            
            // Verifica se a opção editada era a atualmente selecionada no formulário pai
            // e a atualiza no formulário pai se for o caso
            let valorAtualSelecionadoNoForm = value;
            if (tipo === 'indicador_ie') { // Se for indicador_ie, o valor no form é o código ('1'), precisamos do texto ('Contribuinte ICMS') para comparar
                valorAtualSelecionadoNoForm = indicadorIeLabelMap[String(value)] || String(value);
            }

            if (valorAtualSelecionadoNoForm === opcaoOriginal.valor) {
                // Seleciona a opção editada para atualizar o formulário pai
                handleSelecionar(lista[index]); // Passa o objeto atualizado
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
        const opcaoExcluir = lista[index];
        const id = opcaoExcluir.id;
        try {
            await axios.delete(`${API_URL}/opcoes/${id}`); // USO DA VARIÁVEL DE AMBIENTE AQUI
            
            setLista(prev => prev.filter((_, i) => i !== index));
            
            // Se a opção excluída era a atualmente selecionada no formulário pai, limpa o valor
            let valorAtualSelecionadoNoForm = value;
            if (tipo === 'indicador_ie') {
                valorAtualSelecionadoNoForm = indicadorIeLabelMap[String(value)] || String(value);
            }

            if (valorAtualSelecionadoNoForm === opcaoExcluir.valor) {
                onChange({ target: { name, value: "" } }); // Limpa o valor no formulário pai
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
            <div className="relative w-full"> {/* Contêiner para o input e o dropdown */}
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
                                        key={opcao.id || index} // Chave mais robusta
                                        onClick={(e) => {
                                            // Se estiver editando este item, não selecione, apenas propaga o clique para o input
                                            if (editandoIndex === index) {
                                                e.stopPropagation();
                                            } else {
                                                handleSelecionar(opcao);
                                            }
                                        }}
                                        className={`flex items-center justify-between px-3 py-2 hover:bg-gray-100 text-sm cursor-pointer ${
                                            // Destaca a opção selecionada
                                            (tipo === 'indicador_ie' ? (indicadorIeValueMap[opcao.valor] === value) : (opcao.valor === value)) 
                                            ? 'bg-blue-50 text-blue-800 font-semibold' : ''
                                        } ${editandoIndex === index ? 'bg-gray-50' : ''}`}
                                        role="option"
                                        aria-selected={tipo === 'indicador_ie' ? (indicadorIeValueMap[opcao.valor] === value) : (opcao.valor === value)}
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
                                                        setValorEditando(opcao.valor); // Restaura o valor
                                                    }
                                                }}
                                                className="flex-1 border border-gray-300 px-2 py-1 text-sm w-full mr-2"
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()} // Evita que o li onClick feche o dropdown
                                            />
                                        ) : (
                                            <span className="flex-1 truncate">{opcao.valor || placeholder}</span>
                                        )}
                                        {podeEditar && editandoIndex !== index && ( // Só mostra botões se não estiver editando e tiver permissão
                                            <div className="flex gap-1 ml-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Impede que o clique feche o dropdown
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
                                                        e.stopPropagation(); // Impede que o clique feche o dropdown
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

                            {podeEditar && (
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
            </div> {/* Fim do contêiner relativo w-full */}
        </div>
    );
}