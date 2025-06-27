import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { ChevronDown } from "lucide-react";
import { toast } from "react-toastify";

// Define a URL da API a partir das variáveis de ambiente do Vite
// Esta linha pode ser removida se API_URL for sempre passada como prop
// const API_URL = import.meta.env.VITE_API_BASE_URL; 

export default function CampoImportarOrcamento({ label = "Importar Orçamento", value, onChange, colSpan, API_URL }) { // Adicione API_URL como prop
    const [orcamentos, setOrcamentos] = useState([]);
    const [aberto, setAberto] = useState(false);
    const dropdownRef = useRef();

    // Use a API_URL que veio como prop, ou o valor direto do .env como fallback
    const baseUrl = API_URL || import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        if (!baseUrl) {
            console.warn("API_URL não definida para CampoImportarOrcamento.");
            toast.error("Configuração de API inválida.");
            return;
        }

        axios.get(`${baseUrl}/orcamentos/paginado`, { // USO DA VARIÁVEL DE AMBIENTE AQUI
            params: { page: 1, limit: 100 } // Limite 100 orçamentos, pode ajustar
        })
            .then(res => {
                // Seu backend retorna { total: ..., resultados: [...] }
                // Então, acesse a propriedade 'resultados'
                setOrcamentos(Array.isArray(res.data.resultados) ? res.data.resultados : []);
            })
            .catch((error) => {
                console.error("Erro ao carregar orçamentos:", error);
                toast.error("Erro ao carregar orçamentos.");
                setOrcamentos([]); // Garante que a lista seja um array vazio em caso de erro
            });
    }, [baseUrl]); // Dependência: baseUrl

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setAberto(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelecionar = (orcamento) => {
        onChange({
            target: {
                name: "importar_orcamento", // Nome do campo que será atualizado no formulário pai
                value: orcamento.id, // O ID do orçamento selecionado
                orcamento: orcamento // O objeto de orçamento inteiro
            }
        });
        setAberto(false);
    };

    // Encontra o orçamento selecionado para exibição
    const selecionado = orcamentos.find(o => o.id === value);

    return (
        <div className={`${colSpan ? "col-span-2" : ""} relative`}>
            <label className="block mb-1 font-medium text-gray-700">{label}</label>
            <div
                onClick={() => setAberto(!aberto)}
                className="w-full h-10 border border-gray-300 rounded bg-white flex items-center overflow-hidden cursor-pointer"
                ref={dropdownRef} // Aplica a ref aqui para o clique fora
            >
                <div className={`flex-1 px-3 text-left text-sm ${selecionado ? "text-gray-800" : "text-gray-400"}`}>
                    {selecionado
                        ? `#${selecionado.id} - ${selecionado.cliente_nome} - ${selecionado.data_emissao}`
                        : "Selecione um orçamento existente"}
                </div>
                <div className="w-4 h-full flex items-center justify-center hover:bg-gray-200 transition-colors border-l border-gray-300">
                    <ChevronDown size={16} className="text-gray-500" />
                </div>
            </div>

            {aberto && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-72 overflow-y-auto">
                    <ul className="divide-y divide-gray-200 text-sm">
                        {orcamentos.length > 0 ? (
                            orcamentos.map((orc) => (
                                <li
                                    key={orc.id}
                                    onClick={() => handleSelecionar(orc)}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                    #{orc.id} - {orc.cliente_nome} - {orc.data_emissao}
                                </li>
                            ))
                        ) : (
                            <li className="px-3 py-2 text-gray-500 text-center">Nenhum orçamento disponível.</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}