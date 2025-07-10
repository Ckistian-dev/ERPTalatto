// Nome do arquivo: src/components/campos/CampoImportarOrcamento.jsx

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { ChevronDown } from "lucide-react";
import { toast } from "react-toastify";

export default function CampoImportarOrcamento({ label, value, onChange, colSpan, API_URL }) {
    const [orcamentos, setOrcamentos] = useState([]);
    const [aberto, setAberto] = useState(false);
    const dropdownRef = useRef(null);

    // Usa a API_URL que veio como prop
    const baseUrl = API_URL;

    useEffect(() => {
        if (!baseUrl) {
            console.error("API_URL não foi fornecida para o componente CampoImportarOrcamento.");
            toast.error("Configuração da API está ausente.");
            return;
        }

        axios.get(`${baseUrl}/orcamentos/paginado`, {
            params: { page: 1, limit: 100, situacao: "Aprovado" } // Ex: Busca apenas orçamentos aprovados
        })
            .then(res => {
                setOrcamentos(Array.isArray(res.data.resultados) ? res.data.resultados : []);
            })
            .catch((error) => {
                console.error("Erro ao carregar orçamentos:", error);
                toast.error("Erro ao carregar orçamentos para importação.");
                setOrcamentos([]);
            });
    }, [baseUrl]);

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
                name: "importar_orcamento",
                value: orcamento.id,
                orcamento: orcamento // Passa o objeto de orçamento inteiro
            }
        });
        setAberto(false);
    };

    const selecionado = orcamentos.find(o => o.id === value);

    return (
        <div className={`${colSpan ? "md:col-span-2" : ""} relative`} ref={dropdownRef}>
            {label && <label className="block mb-1 font-medium text-gray-700">{label}</label>}
            <div
                onClick={() => setAberto(!aberto)}
                className="w-full h-10 border border-gray-300 rounded-md bg-white flex items-center justify-between px-3 cursor-pointer"
            >
                <span className={`text-sm ${selecionado ? "text-gray-800" : "text-gray-400"}`}>
                    {selecionado
                        ? `#${selecionado.id} - ${selecionado.cliente_nome}`
                        : "Selecione um orçamento para importar"}
                </span>
                <ChevronDown size={16} className="text-gray-500" />
            </div>

            {aberto && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <ul className="divide-y divide-gray-200 text-sm">
                        {orcamentos.length > 0 ? (
                            orcamentos.map((orc) => (
                                <li
                                    key={orc.id}
                                    onClick={() => handleSelecionar(orc)}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                    #{orc.id} - {orc.cliente_nome} ({new Date(orc.data_emissao).toLocaleDateString()})
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