import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ModalSelecionarProdutoERP({ onClose, onSelect }) {
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroTexto, setFiltroTexto] = useState("");

    useEffect(() => {
        const buscarProdutos = async () => {
            setLoading(true);
            try {
                // Usamos a rota de dropdown que você já tem, mas poderia ser uma rota paginada
                const { data } = await axios.get(`${API_URL}/produtos_dropdown`);
                setProdutos(data);
            } catch (error) {
                toast.error("Erro ao buscar produtos do ERP.");
            } finally {
                setLoading(false);
            }
        };
        buscarProdutos();
    }, []);

    const produtosFiltrados = produtos.filter(p => 
        p.descricao.toLowerCase().includes(filtroTexto.toLowerCase()) || 
        p.sku.toLowerCase().includes(filtroTexto.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[70vh] flex flex-col">
                <h3 className="text-xl font-bold mb-4">Selecione um Produto do ERP</h3>
                <input 
                    type="text"
                    placeholder="Buscar por SKU ou descrição..."
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    className="w-full p-2 border rounded text-sm mb-4"
                />
                <div className="overflow-y-auto flex-grow">
                    {loading ? <p>A carregar produtos...</p> : (
                        <ul className="space-y-2">
                            {produtosFiltrados.map(produto => (
                                <li key={produto.id} 
                                    onClick={() => onSelect(produto)}
                                    className="p-3 border rounded-md hover:bg-gray-100 cursor-pointer transition-all"
                                >
                                    <p className="font-semibold">{produto.descricao}</p>
                                    <p className="text-sm text-gray-500 font-mono">SKU: {produto.sku}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                 <button onClick={onClose} className="mt-4 px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium self-end">
                    Fechar
                </button>
            </div>
        </div>
    );
}
