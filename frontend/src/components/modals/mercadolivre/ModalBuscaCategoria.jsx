import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ModalBuscaCategoria({ initialSearchTerm, onSelect, onClose }) {
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm || "");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchTerm.length < 3) {
            toast.warn("Digite pelo menos 3 caracteres para buscar.");
            return;
        }
        setLoading(true);
        try {
            const { data } = await axios.get(`${API_URL}/mercadolivre/categorias/buscar?q=${searchTerm}`);
            setResults(data);
            if(data.length === 0) {
                toast.info("Nenhuma categoria encontrada para este termo.");
            }
        } catch (error) {
            toast.error("Erro ao buscar categorias.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[70vh] flex flex-col">
                <h3 className="text-xl font-bold mb-4">Buscar Categoria no Mercado Livre</h3>
                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow border p-2 rounded text-sm"
                        placeholder="Ex: Camiseta de algodão masculina"
                    />
                    <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold">
                        Buscar
                    </button>
                </form>
                <div className="overflow-y-auto flex-grow">
                    {loading ? <p>Buscando...</p> : (
                        <ul className="space-y-2">
                            {results.map(cat => (
                                <li key={cat.category_id} 
                                    onClick={() => onSelect(cat)}
                                    className="p-3 border rounded-md hover:bg-gray-100 cursor-pointer transition-all"
                                >
                                    <span className="font-semibold">{cat.category_name}</span>
                                    <span className="text-sm text-gray-500 ml-2">(ID: {cat.category_id})</span>
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
