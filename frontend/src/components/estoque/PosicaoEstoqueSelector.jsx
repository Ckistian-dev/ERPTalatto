import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function PosicaoEstoqueSelector({ produtoId, onPosicaoSelect }) {
    const [posicoes, setPosicoes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPosicao, setSelectedPosicao] = useState(null);

    useEffect(() => {
        if (!produtoId) { setPosicoes([]); return; }
        const fetchPosicoes = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API_URL}/api/estoque/posicao/${produtoId}`);
                setPosicoes(res.data);
            } catch (error) {
                toast.warn("Nenhuma posição de estoque encontrada para este produto.");
                setPosicoes([]);
            } finally { setLoading(false); }
        };
        fetchPosicoes();
    }, [produtoId]);

    const handleSelect = (posicao) => {
        setSelectedPosicao(posicao);
        onPosicaoSelect(posicao);
    };

    if (!produtoId) return <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">Selecione um produto para ver as posições de estoque.</div>;
    if (loading) return <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">Carregando posições...</div>;
    if (posicoes.length === 0) return <div className="p-4 text-center text-red-500 bg-red-50 rounded-md">Este produto não possui saldo em estoque.</div>;

    return (
        <div className="w-full mt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Selecione a Posição de Saída</h3>
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-2">Lote</th>
                            <th scope="col" className="px-4 py-2">Localização</th>
                            <th scope="col" className="px-4 py-2">Situação</th>
                            <th scope="col" className="px-4 py-2 text-right">Qtd. Disp.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posicoes.map((p, index) => (
                            <tr key={index} className={`border-b hover:bg-teal-50 cursor-pointer ${selectedPosicao === p ? 'bg-teal-100' : 'bg-white'}`} onClick={() => handleSelect(p)}>
                                <td className="px-4 py-2 font-medium">{p.lote}</td>
                                <td className="px-4 py-2">{`${p.deposito} / Rua: ${p.rua} / N°: ${p.numero} / Nível: ${p.nivel} / Cor: ${p.cor}`}</td>
                                <td className="px-4 py-2">{p.situacao_estoque}</td>
                                <td className="px-4 py-2 font-bold text-right">{p.quantidade}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
