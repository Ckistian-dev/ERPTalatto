import { useState } from "react";
import { X } from "lucide-react";

export default function CampoURLs({
    label = "URLs",
    name = "urls",
    value = [],
    onChange,
    colSpan = false,
    obrigatorio = false,
}) {
    const [novaUrl, setNovaUrl] = useState("");

    const adicionarUrl = () => {
        const url = novaUrl.trim();
        if (!url) return;
        if (!/^https?:\/\/.+\..+/.test(url)) return alert("URL inválida");

        const atualizadas = [...value, url];
        onChange({ target: { name, value: atualizadas } });
        setNovaUrl("");
    };

    const removerUrl = (urlRemover) => {
        const atualizadas = value.filter((u) => u !== urlRemover);
        onChange({ target: { name, value: atualizadas } });
    };

    return (
        <div className={colSpan ? "col-span-2" : ""}>
            <div>
                <label className="block mb-1 font-medium text-gray-700">
                    {label}
                    {obrigatorio && <span className="text-red-600">*</span>}
                </label>

                <div className="flex gap-2 mb-2 min-h-10">
                    <input
                        type="text"
                        value={novaUrl}
                        onChange={(e) => setNovaUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                adicionarUrl();
                            }
                        }}
                        placeholder="https://exemplo.com"
                        className="flex-1 border border-gray-300 px-2 py-1 rounded text-sm"
                    />
                    <button
                        type="button"
                        onClick={adicionarUrl}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-sm"
                    >
                        Adicionar
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {value.map((url) => (
                        <div
                            key={url}
                            className="flex items-center bg-gray-100 text-sm text-gray-800 rounded px-2 py-1"
                        >
                            <span className="truncate max-w-[200px]">{url}</span>
                            <button
                                type="button"
                                className="ml-2 hover:text-red-600"
                                onClick={() => removerUrl(url)}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
}
