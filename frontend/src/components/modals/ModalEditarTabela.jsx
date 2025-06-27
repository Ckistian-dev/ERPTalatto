import React, { useState, useEffect } from 'react'
import { FaTable } from 'react-icons/fa'
import { X, Plus, Trash2 } from 'lucide-react'

export default function ModalEditarTabela({ colunas = [], selecionadas = [], exemplos = [], onClose, onSalvar }) {
    const [colunasSelecionadas, setColunasSelecionadas] = useState(selecionadas)
    const [colunasArrastando, setColunasArrastando] = useState(null)
    const [colunaHover, setColunaHover] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [colunaOrdenada, setColunaOrdenada] = useState(null);
    const [ordemAscendente, setOrdemAscendente] = useState(true);


    useEffect(() => {
        setColunasSelecionadas(selecionadas)
    }, [selecionadas])

    useEffect(() => {
        const container = document.getElementById("scroll-tabela-colunas");
        if (!container || !isDragging) return;

        let animationFrame = null;

        const scrollSpeed = 10;
        const scrollThreshold = 5000;

        const step = (dx) => {
            container.scrollLeft += dx;
            animationFrame = requestAnimationFrame(() => step(dx));
        };

        const stopScroll = () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
        };

        const handleMouseMove = (e) => {
            const { left, right } = container.getBoundingClientRect();
            const distToLeft = e.clientX - left;
            const distToRight = right - e.clientX;

            if (distToLeft < scrollThreshold) {
                const speed = Math.max(1, (scrollThreshold - distToLeft) / 10);
                stopScroll();
                step(-speed);
            } else if (distToRight < scrollThreshold) {
                const speed = Math.max(1, (scrollThreshold - distToRight) / 10);
                stopScroll();
                step(speed);
            } else {
                stopScroll();
            }
        };


        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", stopScroll);

        return () => {
            stopScroll();
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", stopScroll);
        };
    }, [isDragging]);

    const toggleColuna = (coluna) => {
        setColunasSelecionadas((prev) =>
            prev.includes(coluna)
                ? prev.filter((c) => c !== coluna)
                : [...prev, coluna]
        )
    }

    const handleDragStart = (index) => {
        setColunasArrastando(index)
        setIsDragging(true)
    }

    const handleDragEnter = (index) => {
        if (colunasArrastando === null || index === colunasArrastando) return
        setColunaHover(index)
    }

    const handleDrop = () => {
        if (colunasArrastando !== null && colunaHover !== null && colunasArrastando !== colunaHover) {
            const nova = [...colunasSelecionadas]
            const [movida] = nova.splice(colunasArrastando, 1)
            nova.splice(colunaHover, 0, movida)
            setColunasSelecionadas(nova)
        }
        setColunasArrastando(null)
        setColunaHover(null)
        setIsDragging(false)
    }

    const exemplosOrdenados = [...exemplos]
        .sort((a, b) => {
            if (!colunaOrdenada) return 0;

            const valA = a[colunaOrdenada] ?? '';
            const valB = b[colunaOrdenada] ?? '';

            if (typeof valA === 'number' && typeof valB === 'number') {
                return ordemAscendente ? valA - valB : valB - valA;
            }

            return ordemAscendente
                ? String(valA).localeCompare(String(valB))
                : String(valB).localeCompare(String(valA));
        })
        .slice(0, 10); // pega os 10 primeiros


    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-7xl relative border border-gray-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-red-500">
                    <X size={22} />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <FaTable /> Editar Colunas da Tabela
                </h2>

                <div
                    id="scroll-tabela-colunas"
                    className="overflow-x-auto border rounded max-w-full scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-transparent"
                >


                    <table className="w-full min-w-[800px] table-auto">
                        <thead className="bg-gray-50">
                            <tr>
                                {colunasSelecionadas.map((coluna, index) => (
                                    <th
                                        key={coluna}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragEnter={() => handleDragEnter(index)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={handleDrop}
                                        className={`relative p-2 border text-sm font-medium bg-white whitespace-nowrap min-w-[180px] max-w-[240px] transition-all ${colunaHover === index ? 'bg-teal-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-1 w-full">
                                            {/* Botão de ordenação */}
                                            <button
                                                onClick={() => {
                                                    if (colunaOrdenada === coluna) {
                                                        setOrdemAscendente(!ordemAscendente);
                                                    } else {
                                                        setColunaOrdenada(coluna);
                                                        setOrdemAscendente(true);
                                                    }
                                                }}
                                                className="flex items-center gap-1 font-medium text-gray-800 hover:underline truncate w-full text-left"
                                                title="Ordenar"
                                            >
                                                <span className="truncate">{coluna.replace(/_/g, ' ').toUpperCase()}</span>

                                                {/* Setinha de ordenação */}
                                                {colunaOrdenada === coluna && (
                                                    <span className="text-xs text-gray-500">{ordemAscendente ? '↑' : '↓'}</span>
                                                )}
                                            </button>

                                            {/* Botão de remover coluna */}
                                            <button
                                                onClick={() => toggleColuna(coluna)}
                                                className="ml-1 text-red-500 hover:text-red-700 shrink-0"
                                                title="Remover"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </th>
                                ))}

                                {/* Adicionar no final */}
                                <th className="p-2 border bg-white text-sm font-medium text-gray-700 relative">
                                    <details className="relative group">
                                        <summary className="flex items-center gap-2 cursor-pointer text-green-600 hover:text-green-800 select-none">
                                            <Plus size={16} />
                                        </summary>
                                        <div className="absolute right-0 mt-1 z-10 bg-white border rounded shadow-md w-48 max-h-60 overflow-y-auto">
                                            {colunas
                                                .filter((col) => !colunasSelecionadas.includes(col))
                                                .map((coluna) => (
                                                    <button
                                                        key={coluna}
                                                        onClick={() => {
                                                            setColunasSelecionadas((prev) => [...prev, coluna]);
                                                            setTimeout(() => {
                                                                document.getElementById("scroll-tabela-colunas")?.scrollTo({
                                                                    left: 9999,
                                                                    behavior: "smooth"
                                                                });
                                                            }, 50);
                                                        }}

                                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    >
                                                        {coluna.replace(/_/g, ' ')}
                                                    </button>
                                                ))}
                                        </div>
                                    </details>
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {exemplosOrdenados.map((exemplo, i) => (
                                <tr key={i} className="text-center">
                                    {colunasSelecionadas.map((coluna) => (
                                        <td
                                            key={coluna}
                                            className="border px-2 py-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px]"
                                        >
                                            {exemplo[coluna] || ''}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>

                    </table>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded text-gray-800 hover:bg-gray-300">
                        Cancelar
                    </button>
                    <button
                        onClick={() =>
                            onSalvar({
                                colunas: colunasSelecionadas,
                                ordenacao: { coluna: colunaOrdenada, ascendente: ordemAscendente }
                            })
                        }
                        className="bg-teal-600 text-white px-5 py-2 rounded hover:bg-teal-700"
                    >
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div >
    )
}
