// components/campos/CampoPrecosDinamico.jsx

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { FaFileImport, FaFileExport } from "react-icons/fa";
import { useAuth } from '@/context/AuthContext';

import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import CampoDropdownEditavelMulti from "@/components/campos/CampoDropdownEditavelMulti";
import CampoValorMonetario from "./CampoValorMonetario";

const faixasDesconto = [2, 3, 4, 5, 6, 7, 8, 10, 12, 18, 20, 24, 25, 30, 36, 40, 48, 50, 60, 120];

export default function CampoPrecosDinamico({ label = "Preços", name, value = {}, onChange }) {
    const [precos, setPrecos] = useState(value || {});
    const { usuario } = useAuth();

    useEffect(() => {
        setPrecos(value || {});
    }, [value]);

    const atualizar = (novoObj) => {
        setPrecos(novoObj);
        if (onChange) {
            onChange({ target: { name, value: novoObj } });
        }
    };

    const handleTabelasChange = ({ target }) => {
        const novasChaves = target.value;
        const novoObj = {};
        novasChaves.forEach((chave) => {
            novoObj[chave] = precos[chave] || { valor: 0, descontos: {} };
        });
        atualizar(novoObj);
    };
    
    const removerTabela = (nomeTabela) => {
        const novo = { ...precos };
        delete novo[nomeTabela];
        atualizar(novo);
    };

    const handleConfigChange = (nomeTabela, field, fieldValue) => {
        const novosPrecos = { ...precos };
        const configAtual = typeof novosPrecos[nomeTabela] === 'object' && novosPrecos[nomeTabela] !== null
            ? novosPrecos[nomeTabela]
            : { valor: 0, descontos: {} };

        const valorNumerico = Number(fieldValue) || 0;

        let configNova;
        if (field === 'valor') {
            configNova = { ...configAtual, valor: valorNumerico };
        } else {
            const novosDescontos = { ...configAtual.descontos };
            if (valorNumerico > 0) {
                novosDescontos[field] = valorNumerico;
            } else {
                delete novosDescontos[field];
            }
            configNova = { ...configAtual, descontos: novosDescontos };
        }
        
        novosPrecos[nomeTabela] = configNova;
        atualizar(novosPrecos);
    };

    const importarJSON = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (typeof data === "object" && !Array.isArray(data)) {
                    atualizar(data);
                } else {
                    alert("Arquivo JSON inválido. O arquivo deve ser um objeto.");
                }
            } catch {
                alert("Erro ao ler o arquivo JSON.");
            }
        };
        reader.readAsText(file);
    };

    const exportarJSON = () => {
        const blob = new Blob([JSON.stringify(precos, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "tabela_precos.json";
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="col-span-2">
            <label className="block font-medium text-gray-700 mb-2">{label}</label>

            {/* Controles para adicionar/remover tabelas, importar e exportar */}
            <div className="flex flex-wrap gap-2 items-center w-full mb-4 p-3 bg-gray-50 rounded-lg border">
                <div className="flex-1 min-w-[300px]">
                    <CampoDropdownEditavelMulti
                        name="tipos_precos"
                        tipo="tipos_precos"
                        value={Object.keys(precos)}
                        onChange={handleTabelasChange}
                        obrigatorio={false}
                        colSpan={false}
                        usuario={usuario}
                    />
                </div>
                <label title="Importar JSON" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md flex items-center gap-2 cursor-pointer">
                    <FaFileImport />
                    <input type="file" accept=".json" onChange={importarJSON} className="hidden" />
                </label>
                <ButtonComPermissao
                    type="button"
                    onClick={exportarJSON}
                    permissoes={["admin"]}
                    title="Exportar JSON"
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-md flex items-center gap-2"
                >
                    <FaFileExport />
                </ButtonComPermissao>
            </div>

            {/* Container para as tabelas de preço */}
            <div className="flex flex-col gap-4 w-full">
                {Object.keys(precos).length === 0 && (
                     <p className="text-center text-gray-500 py-4">Nenhuma tabela de preço selecionada.</p>
                )}
                
                {Object.entries(precos).map(([nome, config]) => {
                    const configObj = typeof config === 'object' && config !== null 
                        ? config 
                        : { valor: config || 0, descontos: {} };

                    return (
                        <div key={nome} className="w-full flex flex-col gap-3 border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
                            
                            {/* VVVVVVVV LAYOUT SIMPLIFICADO DA LINHA 1 ABAIXO VVVVVVVV */}
                            <div className="flex w-full items-end gap-2">
                                <div className="flex-grow">
                                    <CampoValorMonetario
                                        label={`${nome} - Valor Unitário Base`} // Label simples e direta com o nome da tabela
                                        value={configObj.valor}
                                        onChange={(e) => handleConfigChange(nome, 'valor', e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removerTabela(nome)}
                                    className="flex-shrink-0 bg-red-100 text-red-700 hover:bg-red-200 p-2 rounded-full transition-colors mb-1"
                                    title={`Remover tabela "${nome}"`}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            {/* ^^^^^^^^ LAYOUT SIMPLIFICADO DA LINHA 1 ACIMA ^^^^^^^^ */}


                            {/* LINHA 2: Descontos Gradativos com Scroll Horizontal (sem alterações) */}
                            <div className="pt-3 border-t">
                                <label className="block text-sm font-medium text-gray-600 mb-2">Descontos Gradativos por Unidade</label>
                                <div className="w-full overflow-x-auto pb-2">
                                    <div className="flex flex-nowrap items-end gap-3">
                                        {faixasDesconto.map(faixa => (
                                            <div key={faixa} className="flex-shrink-0 w-20">
                                                <CampoValorMonetario
                                                    label={`${faixa} Unid`}
                                                    value={configObj.descontos?.[faixa] || ''}
                                                    onChange={(e) => handleConfigChange(nome, faixa, e.target.value)}
                                                    placeholder="R$ 0,00"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}