import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import ModalBuscaCategoria from './ModalBuscaCategoria';

const API_URL = import.meta.env.VITE_API_BASE_URL;

// Componente auxiliar para renderizar os campos da ficha técnica (atributos)
const AtributoItem = ({ atributo, formData, setFormData }) => {
    
    // Encontra o valor atual deste atributo no estado do formulário
    const currentValueObject = formData.attributes.find(a => a.id === atributo.id);
    const currentValue = currentValueObject?.value_id || currentValueObject?.value_name || '';

    const handleChange = (e) => {
        const { value } = e.target;
        
        // Se for um select, precisamos encontrar o objeto da opção selecionada para ter acesso ao ID e ao nome
        const selectedOption = atributo.values?.find(v => v.id === value);

        setFormData(prev => ({
            ...prev,
            attributes: prev.attributes.map(attr => 
                attr.id === atributo.id 
                ? { 
                    ...attr, 
                    // Salva o ID se for uma opção de lista, senão salva o nome (valor digitado)
                    value_id: selectedOption ? selectedOption.id : null,
                    value_name: selectedOption ? selectedOption.name : value 
                  } 
                : attr
            )
        }));
    };

    // Não renderiza atributos que são somente leitura ou ocultos
    if (atributo.tags.read_only || atributo.tags.hidden) { return null; }
    
    // Verifica se o atributo é obrigatório
    const isRequired = atributo.tags.required;

    return (
        <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {atributo.name} {isRequired && <span className="text-red-500">*</span>}
            </label>
            {atributo.value_type === 'boolean' ? (
                <select value={currentValue} name={atributo.id} onChange={handleChange} className="w-full border p-2 rounded text-sm">
                    <option value="">Selecione</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                </select>
            ) : atributo.values && atributo.values.length > 0 ? (
                 <select value={currentValueObject?.value_id || ''} name={atributo.id} onChange={handleChange} className="w-full border p-2 rounded text-sm">
                    <option value="">Selecione</option>
                    {atributo.values.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
            ) : (
                <input
                    type="text"
                    value={currentValue}
                    name={atributo.id}
                    onChange={handleChange}
                    className="w-full border p-2 rounded text-sm"
                    placeholder={atributo.name}
                />
            )}
        </div>
    );
};


// Componente principal do Modal
export default function ModalConfigAnuncio({ product, onClose, onSave, isSaving }) {
    const [loading, setLoading] = useState(true);
    const [configData, setConfigData] = useState(null);
    const [attributes, setAttributes] = useState([]);
    const [showCategorySearch, setShowCategorySearch] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        category_id: '',
        category_name: '',
        listing_type_id: '',
        price: 0,
        available_quantity: 0,
        pictures: [],
        attributes: []
    });

    // Efeito para buscar os dados iniciais ao abrir o modal
    useEffect(() => {
        const fetchInitialConfig = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/mercadolivre/anuncios/configuracoes-iniciais?erp_product_id=${product.erp_product.id}`);
                setConfigData(data);
                
                const precos = data.erp_product.tabela_precos ? JSON.parse(data.erp_product.tabela_precos) : {};
                const precoPrincipal = precos['PADRAO'] || 0;

                const suggestedCategory = data.suggested_categories && data.suggested_categories[0];

                setFormData(prev => ({
                    ...prev,
                    title: data.erp_product.descricao,
                    category_id: suggestedCategory ? suggestedCategory.category_id : '',
                    category_name: suggestedCategory ? suggestedCategory.category_name : 'Nenhuma sugestão encontrada',
                    price: precoPrincipal,
                    pictures: data.erp_product.url_imagem ? JSON.parse(data.erp_product.url_imagem) : [],
                }));
            } catch (error) {
                toast.error(error.response?.data?.detail || "Erro ao carregar configurações do anúncio.");
                onClose();
            }
        };
        fetchInitialConfig();
    }, [product, onClose]);

    // Efeito para buscar os atributos da categoria sempre que a categoria mudar
    useEffect(() => {
        if (!formData.category_id) return;
        
        const fetchAttributes = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`${API_URL}/mercadolivre/categorias/${formData.category_id}/atributos`);
                setAttributes(data);
                
                // Inicializa o state com a estrutura completa para cada atributo
                setFormData(prev => ({
                    ...prev,
                    attributes: data.map(attr => ({ 
                        id: attr.id, 
                        value_id: null, 
                        value_name: '' 
                    }))
                }));
            } catch (error) {
                toast.error("Erro ao carregar ficha técnica da categoria.");
            } finally {
                setLoading(false);
            }
        };
        fetchAttributes();
    }, [formData.category_id]);

    // Função que valida e chama a prop onSave
    const handleSaveClick = () => {
        if (isSaving) return;

        // Validação dos campos antes de enviar
        if (!formData.title.trim()) {
            toast.warn("O campo 'Título do Anúncio' é obrigatório.");
            return;
        }
        if (!formData.listing_type_id) {
            toast.warn("O campo 'Tipo de Anúncio' é obrigatório.");
            return;
        }
        if (Number(formData.price) <= 0) {
            toast.warn("O campo 'Preço' deve ser maior que zero.");
            return;
        }
        if (Number(formData.available_quantity) <= 0) {
            toast.warn("O campo 'Estoque Disponível' deve ser maior que zero.");
            return;
        }

        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-4">Configurar Anúncio no Mercado Livre</h2>
                <p className="mb-4 text-sm text-gray-600">Produto ERP: <span className="font-semibold">{product.erp_product.sku} - {product.erp_product.descricao}</span></p>
                
                {loading && !configData ? <p className="text-center py-10">Carregando dados iniciais...</p> :
                <div className="overflow-y-auto flex-grow pr-4">
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Campos Principais */}
                        <div className="col-span-2">
                            <label>Título do Anúncio</label>
                            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border p-2 rounded text-sm" />
                        </div>
                        <div className="col-span-1">
                            <label>Categoria</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    value={`${formData.category_name || ''} (${formData.category_id || ''})`} 
                                    disabled 
                                    className="flex-grow border p-2 rounded text-sm bg-gray-100" 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowCategorySearch(true)}
                                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-semibold"
                                >
                                    Trocar
                                </button>
                            </div>
                        </div>
                        <div>
                            <label>Tipo de Anúncio</label>
                            <select value={formData.listing_type_id} onChange={e => setFormData({...formData, listing_type_id: e.target.value})} className="w-full border p-2 rounded text-sm">
                                <option value="">Selecione...</option>
                                {configData?.listing_types.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label>Preço (R$)</label>
                            <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border p-2 rounded text-sm" />
                        </div>
                        <div>
                            <label>Estoque Disponível</label>
                            <input type="number" value={formData.available_quantity} onChange={e => setFormData({...formData, available_quantity: e.target.value})} className="w-full border p-2 rounded text-sm" />
                        </div>

                        {/* Ficha Técnica (Atributos) */}
                        <div className="col-span-2 mt-4 pt-4 border-t">
                             <h3 className="text-lg font-semibold mb-2">Ficha Técnica</h3>
                             {loading ? <p className="text-center py-5">Carregando ficha técnica...</p> : 
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                   {attributes.map(attr => <AtributoItem key={attr.id} atributo={attr} formData={formData} setFormData={setFormData} />)}
                                </div>
                             }
                        </div>
                    </form>
                </div>
                }

                <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
                    <button onClick={onClose} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium" disabled={isSaving}>Cancelar</button>
                    <button 
                        onClick={handleSaveClick} 
                        className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold disabled:bg-gray-400"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Salvando...' : (product.ml_listing ? 'Salvar Alterações' : 'Publicar Anúncio')}
                    </button>
                </div>
            </div>

            {/* Renderização do modal de busca de categoria */}
            {showCategorySearch && (
                <ModalBuscaCategoria
                    initialSearchTerm={formData.title}
                    onClose={() => setShowCategorySearch(false)}
                    onSelect={(categoriaSelecionada) => {
                        setFormData(prev => ({
                            ...prev,
                            category_id: categoriaSelecionada.category_id,
                            category_name: categoriaSelecionada.category_name
                        }));
                        setShowCategorySearch(false);
                        toast.success(`Categoria alterada para: ${categoriaSelecionada.category_name}`);
                    }}
                />
            )}
        </div>
    );
}
