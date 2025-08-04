// components/modals/tray/ModalConfigAnuncioTray.jsx

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ModalBuscaCategoriaTray from './ModalBuscaCategoriaTray';

export default function ModalConfigAnuncioTray({ product, onClose, onSave, isSaving }) {
    const [showCategorySearch, setShowCategorySearch] = useState(false);
    const [formData, setFormData] = useState({
        // Campos principais do produto na Tray
        name: '',
        reference: '', // SKU
        price: 0,
        cost_price: 0,
        stock: 0,
        category_id: '',
        brand: '',
        model: '',
        weight: 0,
        length: 0,
        width: 0,
        height: 0,
        description: '',
        images: [], // Array de objetos { "Picture": { "https_image_path": "url" } }
        available: '1' // 1 para Sim, 0 para Não
    });
    const [categoryName, setCategoryName] = useState('Nenhuma selecionada');

    // Efeito para carregar os dados iniciais do produto do ERP
    useEffect(() => {
        if (product) {
            const erpData = product.erp_product;
            const trayData = product.tray_listing;

            // Preenche o formulário com dados da Tray (se for uma edição) ou do ERP (se for uma nova publicação)
            const precos = erpData.tabela_precos ? JSON.parse(erpData.tabela_precos) : {};
            const precoPrincipal = precos['PADRAO'] || 0;

            setFormData({
                name: trayData?.name || erpData.descricao,
                reference: erpData.sku,
                price: trayData?.price || precoPrincipal,
                cost_price: erpData.custo_produto || 0,
                stock: trayData?.stock || 0,
                category_id: trayData?.category_id || '',
                brand: trayData?.brand || '',
                model: trayData?.model || '',
                weight: trayData?.weight || 0,
                length: trayData?.length || 0,
                width: trayData?.width || 0,
                height: trayData?.height || 0,
                description: trayData?.description || '',
                images: trayData?.images || [],
                available: trayData?.available ? '1' : '0',
            });
        }
    }, [product]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleCategorySelect = (categoria) => {
        setFormData(prev => ({ ...prev, category_id: categoria.id }));
        setCategoryName(categoria.path);
        setShowCategorySearch(false);
        toast.success(`Categoria alterada para: ${categoria.path}`);
    };

    const handleSaveClick = () => {
        if (isSaving) return;

        // Validações básicas
        if (!formData.name.trim()) return toast.warn("O campo 'Nome do Produto' é obrigatório.");
        if (!formData.category_id) return toast.warn("É obrigatório selecionar uma categoria.");
        if (Number(formData.price) <= 0) return toast.warn("O campo 'Preço' deve ser maior que zero.");

        // Chama a função de salvar passada por prop, enviando o payload formatado
        onSave(formData);
    };

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    <h2 className="text-2xl font-bold mb-4">Configurar Anúncio na Tray</h2>
                    <p className="mb-4 text-sm text-gray-600">Produto ERP: <span className="font-semibold">{product.erp_product.sku} - {product.erp_product.descricao}</span></p>

                    <div className="overflow-y-auto flex-grow pr-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Coluna 1 */}
                            <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                <label>Nome do Produto (Título)</label>
                                <input name="name" value={formData.name} onChange={handleInputChange} className="w-full border p-2 rounded text-sm" />
                            </div>
                            <div>
                                <label>Preço de Venda (R$)</label>
                                <input name="price" type="number" step="0.01" value={formData.price} onChange={handleInputChange} className="w-full border p-2 rounded text-sm" />
                            </div>
                            <div>
                                <label>Estoque</label>
                                <input name="stock" type="number" value={formData.stock} onChange={handleInputChange} className="w-full border p-2 rounded text-sm" />
                            </div>
                             <div>
                                <label>Ativo na Loja?</label>
                                <select name="available" value={formData.available} onChange={handleInputChange} className="w-full border p-2 rounded text-sm">
                                    <option value="1">Sim</option>
                                    <option value="0">Não</option>
                                </select>
                            </div>
                            <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                <label>Categoria</label>
                                <div className="flex items-center gap-2">
                                    <input value={`${categoryName} (ID: ${formData.category_id || 'N/A'})`} disabled className="flex-grow border p-2 rounded text-sm bg-gray-100" />
                                    <button type="button" onClick={() => setShowCategorySearch(true)} className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-semibold">Trocar</button>
                                </div>
                            </div>
                            <div>
                                <label>Marca</label>
                                <input name="brand" value={formData.brand} onChange={handleInputChange} className="w-full border p-2 rounded text-sm" />
                            </div>
                            <div>
                                <label>Modelo</label>
                                <input name="model" value={formData.model} onChange={handleInputChange} className="w-full border p-2 rounded text-sm" />
                            </div>
                            <div className="col-span-1 md:col-span-2 lg:col-span-3 pt-4 border-t mt-4">
                                <h3 className="text-lg font-semibold mb-2">Dimensões para Frete</h3>
                            </div>
                             <div>
                                <label>Peso (kg)</label>
                                <input name="weight" type="number" step="0.001" value={formData.weight} onChange={handleInputChange} className="w-full border p-2 rounded text-sm" />
                            </div>
                             <div>
                                <label>Comprimento (cm)</label>
                                <input name="length" type="number" value={formData.length} onChange={handleInputChange} className="w-full border p-2 rounded text-sm" />
                            </div>
                             <div>
                                <label>Largura (cm)</label>
                                <input name="width" type="number" value={formData.width} onChange={handleInputChange} className="w-full border p-2 rounded text-sm" />
                            </div>
                             <div>
                                <label>Altura (cm)</label>
                                <input name="height" type="number" value={formData.height} onChange={handleInputChange} className="w-full border p-2 rounded text-sm" />
                            </div>
                             <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                <label>Descrição Completa</label>
                                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="6" className="w-full border p-2 rounded text-sm" placeholder="Use tags HTML para formatação, se desejar."></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
                        <button onClick={onClose} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium" disabled={isSaving}>Cancelar</button>
                        <button onClick={handleSaveClick} className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold disabled:bg-gray-400" disabled={isSaving}>
                            {isSaving ? 'Salvando...' : (product.tray_listing ? 'Salvar Alterações' : 'Publicar Anúncio')}
                        </button>
                    </div>
                </div>
            </div>

            {showCategorySearch && (
                <ModalBuscaCategoriaTray
                    initialSearchTerm={formData.name}
                    onClose={() => setShowCategorySearch(false)}
                    onSelect={handleCategorySelect}
                />
            )}
        </>
    );
}
