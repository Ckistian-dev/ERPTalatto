import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { FaFileImport, FaFileExport } from "react-icons/fa";
import { useAuth } from '@/context/AuthContext'

import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import CampoDropdownEditavelMulti from "@/components/campos/CampoDropdownEditavelMulti";

export default function CampoPrecosDinamico({ label = "Preços", name, value = {}, onChange }) {
    const [precos, setPrecos] = useState(value || {});
    const [editandoNome, setEditandoNome] = useState(null);
    const [tempNome, setTempNome] = useState("");
    const [tempValor, setTempValor] = useState("");
    const { usuario } = useAuth()

    const atualizar = (obj) => {
        setPrecos(obj);
        onChange({ target: { name, value: obj } });
    };

    const remover = (nome) => {
        const novo = { ...precos };
        delete novo[nome];
        atualizar(novo);
    };

    const importarJSON = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (typeof data === "object") {
                    atualizar(data);
                } else {
                    alert("Arquivo inválido");
                }
            } catch {
                alert("Erro ao ler o JSON");
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
            <label className="block font-medium text-gray-700">{label}</label>

            <div className="flex flex-wrap gap-2 items-center w-full mb-3">
                <div className="flex-1 min-w-[240px]">
                    <CampoDropdownEditavelMulti
                        label=""
                        name="tipos_precos"
                        tipo="tipos_precos"
                        value={Object.keys(precos)}
                        onChange={({ target }) => {
                            const novasChaves = target.value;
                            const novoObj = {};
                            novasChaves.forEach((chave) => {
                                novoObj[chave] = precos[chave] ?? "";
                            });
                            atualizar(novoObj);
                        }}
                        obrigatorio={false}
                        colSpan={false}
                        usuario={usuario}
                    />
                </div>

                <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded flex items-center gap-2 cursor-pointer mb-[-4px]">
                    <FaFileImport />
                    <input type="file" accept=".json" onChange={importarJSON} className="hidden" />
                </label>

                <ButtonComPermissao
                    type="button"
                    onClick={exportarJSON}
                    permissoes={["admin"]}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded flex items-center gap-2 mb-[-4px]"
                >
                    <FaFileExport />
                </ButtonComPermissao>
            </div>


            <div className="flex flex-col gap-3 w-full">
                {Object.entries(precos).map(([nome, valor]) => {
                    const isEditando = editandoNome === nome;

                    const iniciarEdicao = () => {
                        setEditandoNome(nome);
                        setTempNome(nome);
                        setTempValor(valor);
                    };

                    const salvarEdicao = () => {
                        if (!tempNome || (tempNome !== nome && precos[tempNome])) return;
                        const novo = { ...precos };
                        delete novo[nome];
                        novo[tempNome] = tempValor;
                        atualizar(novo);
                        setEditandoNome(null);
                    };

                    const cancelarEdicao = () => {
                        setEditandoNome(null);
                        setTempNome("");
                        setTempValor("");
                    };

                    const handleValorChange = (e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        const val = Number(raw) / 100;
                        setTempValor(val);
                    };

                    return (
                        <div
                            key={nome}
                            className="w-full flex flex-col md:flex-row md:items-center justify-between gap-2 border border-gray-300 rounded px-4 py-2 bg-white shadow-sm"
                        >
                            {isEditando ? (
                                <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1">
                                    <input
                                        value={tempNome}
                                        onChange={(e) => setTempNome(e.target.value)}
                                        onKeyDown={(e) => {
                                            e.stopPropagation();
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                salvarEdicao();
                                            }
                                            if (e.key === "Escape") {
                                                e.preventDefault();
                                                cancelarEdicao();
                                            }
                                        }}
                                        className="border border-gray-300 px-2 py-1 rounded text-sm w-[200px]"
                                    />
                                    <input
                                        value={new Intl.NumberFormat("pt-BR", {
                                            style: "currency",
                                            currency: "BRL"
                                        }).format(Number(tempValor))}
                                        onChange={handleValorChange}
                                        onKeyDown={(e) => {
                                            e.stopPropagation();
                                            const allowed = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"];
                                            if (!/^\d$/.test(e.key) && !allowed.includes(e.key)) {
                                                e.preventDefault();
                                            }
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                salvarEdicao();
                                            }
                                            if (e.key === "Escape") {
                                                e.preventDefault();
                                                cancelarEdicao();
                                            }
                                        }}
                                        className="text-right border border-gray-300 px-2 py-1 rounded text-sm w-[150px] bg-gray-50"
                                    />
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
                                    <input
                                        type="text"
                                        value={nome}
                                        disabled
                                        className="border border-gray-200 px-2 py-1 rounded text-sm w-[200px] bg-gray-100 text-gray-600"
                                    />
                                    <input
                                        type="text"
                                        value={
                                            valor !== ""
                                                ? new Intl.NumberFormat("pt-BR", {
                                                    style: "currency",
                                                    currency: "BRL"
                                                }).format(Number(valor))
                                                : ""
                                        }
                                        disabled
                                        className="text-right border border-gray-200 px-2 py-1 rounded text-sm w-[150px] bg-gray-100 text-gray-600"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => (isEditando ? salvarEdicao() : iniciarEdicao())}
                                    className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded"
                                    title={isEditando ? "Salvar" : "Editar"}
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => remover(nome)}
                                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded"
                                    title="Remover"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}