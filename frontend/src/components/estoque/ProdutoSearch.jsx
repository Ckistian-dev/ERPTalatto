import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, X } from 'lucide-react';

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ProdutoSearch({ onProdutoSelect, produtoInicial = null }) {
    const [searchTerm, setSearchTerm] = useState(produtoInicial?.descricao || '');
    const [results, setResults] = useState([]);
    const [selectedProduto, setSelectedProduto] = useState(produtoInicial);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const buscarProdutos = useCallback(async () => {
        if (debouncedSearchTerm.length < 2) { setResults([]); return; }
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/estoque/produtos/search`, { params: { q: debouncedSearchTerm } });
            setResults(response.data);
        } catch (error) { console.error("Erro ao buscar produtos:", error); setResults([]); }
        finally { setIsLoading(false); }
    }, [debouncedSearchTerm]);

    useEffect(() => { buscarProdutos(); }, [buscarProdutos]);
    useEffect(() => { setSelectedProduto(produtoInicial); setSearchTerm(produtoInicial?.descricao || ''); }, [produtoInicial]);

    const handleSelect = (produto) => {
        setSearchTerm(produto.descricao);
        setSelectedProduto(produto);
        onProdutoSelect(produto);
        setShowResults(false);
    };

    const handleClear = () => {
        setSearchTerm('');
        setSelectedProduto(null);
        setResults([]);
        onProdutoSelect(null);
    };

    return (
        <div className="relative">
            <label className="block mb-1 text-sm font-medium text-gray-700">Buscar Produto</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setShowResults(true)} onBlur={() => setTimeout(() => setShowResults(false), 200)} placeholder="Digite a descrição do produto" disabled={!!selectedProduto} className="w-full border p-2 pl-10 rounded border-gray-300 disabled:bg-gray-100" />
                {selectedProduto && (<button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"><X size={20} /></button>)}
            </div>
            {showResults && searchTerm && !selectedProduto && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {isLoading ? <div className="p-3 text-center text-gray-500">Buscando...</div> :
                        results.length > 0 ? <ul>{results.map((produto) => (<li key={produto.id} onMouseDown={() => handleSelect(produto)} className="px-4 py-2 hover:bg-teal-100 cursor-pointer">{produto.descricao}</li>))}</ul> :
                        <div className="p-3 text-center text-gray-500">Nenhum produto encontrado.</div>
                    }
                </div>
            )}
        </div>
    );
}
