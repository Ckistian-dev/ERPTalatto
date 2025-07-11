import React, { useState, useEffect } from 'react'
// Ícone para o botão de reset (pode ser trocado se preferir)
import { X, Filter, Plus, Trash2, RotateCcw } from 'lucide-react' 
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ModalFiltroColunas({ colunas, colunasDropdown = {}, onClose, onAplicar }) {
    const estadoInicialFiltros = [{ coluna: colunas[0] || '', texto: '' }];
    const estadoInicialDataInicio = '';
    // Design antigo não definia data fim, mas manter a de hoje é uma boa prática.
    // Se quiser que comece vazio, troque por: const estadoInicialDataFim = '';
    const estadoInicialDataFim = new Date().toISOString().split('T')[0];

    const [filtros, setFiltros] = useState(estadoInicialFiltros);
    const [opcoesDropdown, setOpcoesDropdown] = useState({});
    const [dataInicio, setDataInicio] = useState(estadoInicialDataInicio);
    const [dataFim, setDataFim] = useState(estadoInicialDataFim);

    useEffect(() => {
        const tiposParaBuscar = new Set();
        filtros.forEach(filtro => {
            const tipo = colunasDropdown[filtro.coluna];
            if (tipo && !opcoesDropdown[tipo]) {
                tiposParaBuscar.add(tipo);
            }
        });

        tiposParaBuscar.forEach(async (tipo) => {
            try {
                const res = await axios.get(`${API_URL}/opcoes/${tipo}`);
                setOpcoesDropdown(prev => ({ ...prev, [tipo]: res.data }));
            } catch (error) {
                console.error('Erro ao carregar opções de', tipo, error);
            }
        });
    }, [filtros, colunasDropdown]);

    const adicionarFiltro = () => {
        setFiltros([...filtros, { coluna: colunas[0] || '', texto: '' }]);
    };

    const removerFiltro = (index) => {
        setFiltros(filtros.filter((_, i) => i !== index));
    };

    const atualizarFiltro = (index, campo, valor) => {
        setFiltros(prev => {
            const novaLista = [...prev];
            if (campo === 'coluna') {
                novaLista[index] = { coluna: valor, texto: '' };
            } else {
                novaLista[index][campo] = valor;
            }
            return novaLista;
        });
    };

    const aplicarFiltros = () => {
        const filtrosAtivos = filtros.filter(f => f.texto && f.texto.trim() !== '');
        onAplicar({ filtros: filtrosAtivos, data_inicio: dataInicio, data_fim: dataFim });
        onClose();
    };

    // Função de reset mantida
    const handleResetarFiltros = () => {
        setFiltros(estadoInicialFiltros);
        setDataInicio(estadoInicialDataInicio);
        setDataFim(estadoInicialDataFim);
        onAplicar({
            filtros: [],
            data_inicio: '',
            data_fim: ''
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            {/* DESIGN RESTAURADO: Classes do modal e título voltaram ao original */}
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl relative">
                <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-red-500">
                    <X size={22} />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Filter size={22} /> Filtros da Tabela
                </h2>

                {/* Período Fixo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="text-sm">De:</label>
                        {/* DESIGN RESTAURADO: input com classes originais */}
                        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="text-sm">Até:</label>
                        {/* DESIGN RESTAURADO: input com classes originais */}
                        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full border p-2 rounded" />
                    </div>
                </div>

                {/* Filtros Dinâmicos */}
                <div className="space-y-4">
                    {filtros.map((filtro, index) => {
                        const tipoDropdown = colunasDropdown[filtro.coluna];
                        const opcoes = tipoDropdown ? opcoesDropdown[tipoDropdown] || [] : [];

                        return (
                            // DESIGN RESTAURADO: div do filtro com classes originais
                            <div key={index} className="border p-4 rounded relative">
                                {index > 0 && (
                                    <button onClick={() => removerFiltro(index)} className="absolute top-2 right-2 text-red-500">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm">Coluna:</label>
                                        {/* DESIGN RESTAURADO: select com classes originais */}
                                        <select
                                            value={filtro.coluna}
                                            onChange={(e) => atualizarFiltro(index, 'coluna', e.target.value)}
                                            className="w-full border p-2 rounded"
                                        >
                                            {colunas.map((col) => (
                                                <option key={col} value={col}>
                                                    {col.replace(/_/g, ' ').toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm">Filtro:</label>
                                        {tipoDropdown ? (
                                            <select
                                                value={filtro.texto}
                                                onChange={(e) => atualizarFiltro(index, 'texto', e.target.value)}
                                                className="w-full border p-2 rounded"
                                            >
                                                <option value="">Selecione</option>
                                                {opcoes.map((op, idx) => (
                                                    <option key={op.id || op.valor || idx} value={op.valor}>{op.valor}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={filtro.texto}
                                                onChange={(e) => atualizarFiltro(index, 'texto', e.target.value)}
                                                className="w-full border p-2 rounded"
                                                placeholder="Digite o valor"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {/* DESIGN RESTAURADO: Botão de adicionar com classes originais */}
                    <button onClick={adicionarFiltro} className="text-teal-700 hover:text-teal-900 font-medium flex items-center gap-2 mt-2">
                        <Plus size={16} /> Adicionar outro filtro
                    </button>
                </div>

                {/* DESIGN RESTAURADO: Layout dos botões de ação e estilos originais */}
                <div className="flex justify-end gap-4 mt-8">
                    {/* Botão de reset com estilo similar ao de "Cancelar" */}
                    <button
                        onClick={handleResetarFiltros}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                    >
                        Limpar
                    </button>
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">
                        Cancelar
                    </button>
                    <button onClick={aplicarFiltros} className="bg-teal-600 text-white px-5 py-2 rounded hover:bg-teal-700">
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    )
}