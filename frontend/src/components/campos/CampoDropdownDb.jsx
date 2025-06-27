import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { ChevronDown } from "lucide-react";

export default function CampoDropdownDB({
    label,
    name,
    value,
    onChange,
    url,
    filtro = {},
    campoValor = "id",
    campoLabel = "",
    campoImagem,
    obrigatorio = false,
    colSpan
}) {
    const [lista, setLista] = useState([]);
    const [aberto, setAberto] = useState(false);
    const [pesquisa, setPesquisa] = useState("");
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setAberto(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const buildQueryParams = (filtroObj) => {
        const params = new URLSearchParams();
        for (const key in filtroObj) {
            if (Object.prototype.hasOwnProperty.call(filtroObj, key)) {
                const value = filtroObj[key];
                if (Array.isArray(value)) {
                    value.forEach(item => params.append(key, item));
                } else if (value !== undefined && value !== null) {
                    params.append(key, String(value));
                }
            }
        }
        return params.toString();
    };

    // Primeiro useEffect: Carrega a lista inicial de opções
    useEffect(() => {
        const fetchLista = async () => {
            if (!url) {
                setLista([]);
                return;
            }
            setLoading(true);
            try {
                const paramsString = buildQueryParams(filtro);
                const fullUrl = `${url}${paramsString ? `?${paramsString}` : ''}`;
                
                const res = await axios.get(fullUrl);
                
                const dados = Array.isArray(res.data) ? res.data : (res.data && res.data.resultados) ? res.data.resultados : [];
                setLista(dados);
            } catch (error) {
                toast.error("Erro ao carregar opções.");
                setLista([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLista();
    }, [url, JSON.stringify(filtro), label]); // Adicionei 'label' para os logs

    // Segundo useEffect: Carrega o item atualmente selecionado se ele não estiver na lista
    useEffect(() => {
        if (value && !loading && !lista.some(item => String(item[campoValor]) === String(value))) {
            const fetchItemSelecionado = async () => {
                try {
                    const paramsForSingleItem = { ...filtro, [campoValor]: value };
                    const paramsString = buildQueryParams(paramsForSingleItem);
                    const fullUrl = `${url}${paramsString ? `?${paramsString}` : ''}`;

                    const res = await axios.get(fullUrl);
                    
                    const novoItem = Array.isArray(res.data) ? res.data[0] : res.data; 
                    
                    if (novoItem && novoItem[campoValor] !== undefined) {
                        setLista(prev => {
                            if (!prev.some(item => String(item[campoValor]) === String(novoItem[campoValor]))) {
                                const updatedList = [novoItem, ...prev];
                                return updatedList;
                            }
                            return prev;
                        });
                    }
                } catch (error) {
                }
            };
            fetchItemSelecionado();
        } else if (value && lista.length === 0 && !loading) {
             // Se a lista está vazia mas não está carregando, tenta buscar o item.
             const fetchItemSelecionado = async () => {
                try {
                    const paramsForSingleItem = { ...filtro, [campoValor]: value };
                    const paramsString = buildQueryParams(paramsForSingleItem);
                    const fullUrl = `${url}${paramsString ? `?${paramsString}` : ''}`;
                    const res = await axios.get(fullUrl);
                    const novoItem = Array.isArray(res.data) ? res.data[0] : res.data;
                    if (novoItem && novoItem[campoValor] !== undefined) {
                         setLista(prev => {
                            if (!prev.some(item => String(item[campoValor]) === String(novoItem[campoValor]))) {
                                return [novoItem, ...prev];
                            }
                            return prev;
                        });
                    }
                } catch (error) {
                }
            };
            fetchItemSelecionado();
        }
    }, [value, lista, url, campoValor, JSON.stringify(filtro), loading, label]);

    const handleSelecionar = (val) => {
        const selecionado = lista.find(item => String(item[campoValor]) === String(val));
        if (selecionado) {
            onChange({
                target: {
                    name,
                    value: selecionado[campoValor],
                    label: selecionado[campoLabel]
                }
            });
            setPesquisa(selecionado[campoLabel] || "");
        }
        setAberto(false);
    };

    const handlePesquisaChange = (e) => {
        setPesquisa(e.target.value);
        setAberto(true);
    };

    useEffect(() => {
        if (value === "" || value === null || value === 0) {
            setPesquisa("");
        } else {
            const selecionado = lista.find(item => String(item[campoValor]) === String(value));
            if (selecionado) {
                setPesquisa(selecionado[campoLabel] || "");
            } else {
                setPesquisa(loading ? `Carregando... (${value})` : `ID: ${value} (Não encontrado)`);
            }
        }
    }, [value, lista, campoValor, campoLabel, loading, label]);

    const listaFiltrada = lista.filter(item => {
        const labelText = String(item[campoLabel] || ""); 
        return labelText.toLowerCase().includes(pesquisa.toLowerCase());
    });


    return (
        <div className={`${colSpan ? "col-span-2" : ""} relative`} ref={dropdownRef}>
            <label className="block mb-1 font-medium text-gray-700">
                {label}
                {obrigatorio && <span className="text-red-600">*</span>}
            </label>
            <div className="relative w-full">
                <div className="flex w-full h-10 border border-gray-300 rounded bg-white overflow-hidden">
                    <input
                        type="text"
                        value={pesquisa}
                        onChange={handlePesquisaChange}
                        onFocus={() => setAberto(true)}
                        placeholder={loading ? "Carregando opções..." : "Pesquise ou Selecione"}
                        className="flex-1 px-3 text-sm text-gray-800 outline-none"
                        disabled={loading}
                    />
                    <div
                        onClick={() => setAberto(!aberto)}
                        className="w-4 flex items-center justify-center border-l border-gray-300 hover:bg-gray-100 cursor-pointer"
                    >
                        <ChevronDown size={16} className="text-gray-500" />
                    </div>
                </div>

                {aberto && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-72 overflow-y-auto">
                        <ul className="divide-y divide-gray-200">
                            {loading ? (
                                <li className="px-3 py-2 text-gray-400 text-sm text-center">Carregando...</li>
                            ) : listaFiltrada.length > 0 ? (
                                listaFiltrada.map((item) => (
                                    <li
                                        key={item[campoValor]}
                                        onClick={() => handleSelecionar(item[campoValor])}
                                        className="px-3 py-2 hover:bg-gray-100 text-sm cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            {campoImagem && item[campoImagem] && (
                                                <img src={item[campoImagem]} alt="Imagem" className="w-8 h-8 object-cover rounded" />
                                            )}
                                            <span>
                                                {item[campoLabel]}
                                            </span>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="px-3 py-2 text-gray-400 text-sm text-center">
                                    Nenhum resultado encontrado
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}