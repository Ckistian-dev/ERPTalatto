// /pages/RegrasTributariasPage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

// Importe seus componentes de campo
import CampoTextsimples from '@/components/campos/CampoTextsimples';
import CampoNumsimples from '@/components/campos/CampoNumSimples';
import CampoPorcentagem from '@/components/campos/CampoPorcentagem';
import CampoDropdownSimNao from '@/components/campos/CampoDropdownSimNao';
import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import ButtonComPermissao from '@/components/buttons/ButtonComPermissao';

const API_URL = import.meta.env.VITE_API_BASE_URL;

// --- Componente do Modal para Adicionar/Editar Regra (TOTALMENTE REFEITO) ---
const ModalRegra = ({ regra, onClose, onSave, usuario }) => {
    const estadoInicial = {
        descricao: '', natureza_operacao: 'VENDA', cfop: '', uf_origem: 'PR', uf_destino: '**',
        ncm: '', tipo_cliente: '',
        icms_cst: '', icms_csosn: '', icms_aliquota: 0, icms_base_calculo: 100,
        pis_cst: '', pis_aliquota: 0, cofins_cst: '', cofins_aliquota: 0,
        ipi_cst: '', ipi_aliquota: 0, ativo: true, icms_mva_st: '', icms_aliquota_st: '', icms_reducao_bc_st: '', icms_fcp_st: ''
    };

    const [form, setForm] = useState(regra ? { ...estadoInicial, ...regra } : estadoInicial);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : (value === 'true' ? true : value === 'false' ? false : value);
        setForm(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-6">{regra ? 'Editar Regra' : 'Nova Regra'} de Tributação</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Seção de Identificação */}
                    <fieldset className="border p-4 rounded-md">
                        <legend className="text-lg font-semibold px-2 text-gray-700">Identificação da Regra</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2  gap-4 mt-2">
                            <CampoTextsimples label="Descrição da Regra" name="descricao" value={form.descricao} onChange={handleChange} colSpan placeholder="Ex: Venda para Consumidor Final - PR" />
                            <CampoTextsimples label="Natureza da Operação" name="natureza_operacao" value={form.natureza_operacao} onChange={handleChange} placeholder="VENDA DE MERCADORIA" />
                            <CampoNumsimples label="CFOP" name="cfop" value={form.cfop} onChange={handleChange} placeholder="5102" />
                        </div>
                    </fieldset>

                    {/* Seção de Condições */}
                    <fieldset className="border p-4 rounded-md">
                        <legend className="text-lg font-semibold px-2 text-gray-700">Condições de Aplicação</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2  gap-4 mt-2">
                            <CampoDropdownEditavel label="UF Origem" name="uf_origem" value={form.uf_origem} onChange={handleChange} tipo="uf" usuario={usuario} placeholder="PR" />
                            <CampoDropdownEditavel label="UF Destino" name="uf_destino" value={form.uf_destino} onChange={handleChange} tipo="uf_destino" usuario={usuario} placeholder="SP, PR ou ** (todos)" />
                            <CampoNumsimples label="NCM (Opcional)" name="ncm" value={form.ncm} onChange={handleChange} placeholder="Deixe em branco para todos" />
                            <CampoDropdownEditavel label="Tipo de Cliente (Opcional)" name="tipo_cliente" value={form.tipo_cliente} onChange={handleChange} tipo="tipo_cliente" usuario={usuario} placeholder="Todos" propOpcoes={["F - Pessoa Física", "J - Pessoa Jurídica"]} />
                        </div>
                    </fieldset>

                    {/* Seção de Impostos */}
                    <fieldset className="border p-4 rounded-md">
                        <legend className="text-lg font-semibold px-2 text-gray-700">Impostos</legend>
                        <div className="space-y-4 mt-2">
                            {/* ICMS */}
                            <div className="p-2 rounded-md bg-gray-50">
                                <h4 className="font-medium text-gray-800 mb-2">ICMS</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <CampoDropdownEditavel label="CSOSN (Simples)" name="icms_csosn" value={form.icms_csosn} onChange={handleChange} tipo="icms_csosn" usuario={usuario} placeholder="102" />
                                    <CampoDropdownEditavel label="CST (Regime Normal)" name="icms_cst" value={form.icms_cst} onChange={handleChange} tipo="icms_cst" usuario={usuario} placeholder="00" />
                                    <CampoPorcentagem label="Alíquota ICMS (%)" name="icms_aliquota" value={form.icms_aliquota} onChange={handleChange} />
                                    <CampoPorcentagem label="Base Cálculo ICMS (%)" name="icms_base_calculo" value={form.icms_base_calculo} onChange={handleChange} />
                                </div>
                            </div>
                            {/* --- NOVA SEÇÃO PARA ICMS-ST --- */}
                            <div className="p-2 rounded-md bg-gray-50">
                                <h4 className="font-medium text-gray-800 mb-2">ICMS-ST (Substituição Tributária)</h4>
                                <p className="text-xs text-gray-500 mb-3">Preencha apenas se esta regra for para produtos com ST. Requer CSOSN/CST específico de ST.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <CampoPorcentagem label="MVA (%)" name="icms_mva_st" value={form.icms_mva_st} onChange={handleChange} placeholder="Ex: 40.00" />
                                    <CampoPorcentagem label="Alíquota Interna Destino (%)" name="icms_aliquota_st" value={form.icms_aliquota_st} onChange={handleChange} placeholder="Alíquota do ICMS no estado de destino" />
                                    <CampoPorcentagem label="Redução Base ST (%)" name="icms_reducao_bc_st" value={form.icms_reducao_bc_st} onChange={handleChange} />
                                    <CampoPorcentagem label="Alíquota FCP (%)" name="icms_fcp_st" value={form.icms_fcp_st} onChange={handleChange} />
                                </div>
                            </div>
                            {/* PIS, COFINS, IPI */}
                            <div className="grid grid-cols-1  gap-4">
                                <div className="p-2 rounded-md bg-gray-50">
                                    <h4 className="font-medium text-gray-800 mb-2">PIS</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <CampoDropdownEditavel label="CST PIS" name="pis_cst" value={form.pis_cst} onChange={handleChange} tipo="pis_cofins_cst" usuario={usuario} placeholder="07" />
                                        <CampoPorcentagem label="Alíquota PIS (%)" name="pis_aliquota" value={form.pis_aliquota} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="p-2 rounded-md bg-gray-50">
                                    <h4 className="font-medium text-gray-800 mb-2">COFINS</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <CampoDropdownEditavel label="CST COFINS" name="cofins_cst" value={form.cofins_cst} onChange={handleChange} tipo="pis_cofins_cst" usuario={usuario} placeholder="07" />
                                        <CampoPorcentagem label="Alíquota COFINS (%)" name="cofins_aliquota" value={form.cofins_aliquota} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="p-2 rounded-md bg-gray-50">
                                    <h4 className="font-medium text-gray-800 mb-2">IPI</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <CampoDropdownEditavel label="CST IPI" name="ipi_cst" value={form.ipi_cst} onChange={handleChange} tipo="ipi_cst" usuario={usuario} placeholder="53" />
                                        <CampoPorcentagem label="Alíquota IPI (%)" name="ipi_aliquota" value={form.ipi_aliquota} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <CampoDropdownSimNao label="Regra Ativa" name="ativo" value={form.ativo} onChange={handleChange} />

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium">Cancelar</button>
                        <button type="submit" className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold">Salvar Regra</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Componente da Página Principal ---
export default function RegrasTributariasPage() {
    const { usuario } = useAuth();
    const [regras, setRegras] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [regraSelecionada, setRegraSelecionada] = useState(null);

    const fetchRegras = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/regras-tributarias`);
            setRegras(response.data);
        } catch (error) {
            toast.error("Falha ao carregar regras de tributação.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRegras();
    }, []);

    const handleSave = async (regra) => {
        const { id, ...dadosRegra } = regra;
        try {
            if (id) {
                await axios.put(`${API_URL}/api/regras-tributarias/${id}`, dadosRegra);
                toast.success("Regra atualizada com sucesso!");
            } else {
                await axios.post(`${API_URL}/api/regras-tributarias`, dadosRegra);
                toast.success("Regra criada com sucesso!");
            }
            fetchRegras();
            setIsModalOpen(false);
            setRegraSelecionada(null);
        } catch (error) {
            toast.error(error.response?.data?.detail || "Erro ao salvar a regra.");
        }
    };

    const handleEdit = (regra) => {
        setRegraSelecionada(regra);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setRegraSelecionada(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (regraId) => {
        if (window.confirm("Tem certeza que deseja excluir esta regra?")) {
            try {
                await axios.delete(`${API_URL}/api/regras-tributarias/${regraId}`);
                toast.success("Regra excluída com sucesso!");
                fetchRegras();
            } catch (error) {
                toast.error("Erro ao excluir a regra.");
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-28">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Regras de Tributação</h1>
                <ButtonComPermissao permissoes={["admin"]} onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md font-semibold hover:bg-teal-700">
                    <PlusCircle size={20} />
                    Adicionar Regra
                </ButtonComPermissao>
            </div>

            {isModalOpen && <ModalRegra regra={regraSelecionada} onClose={() => setIsModalOpen(false)} onSave={handleSave} usuario={usuario} />}

            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                {isLoading ? (
                    <p className="text-center py-10">Carregando regras...</p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CFOP</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origem/Destino</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NCM</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {regras.map(regra => (
                                <tr key={regra.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{regra.descricao}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{regra.cfop}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{regra.uf_origem} → {regra.uf_destino}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{regra.ncm || 'Todos'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{regra.tipo_cliente === 'F' ? 'P. Física' : regra.tipo_cliente === 'J' ? 'P. Jurídica' : 'Todos'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${regra.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {regra.ativo ? 'Ativa' : 'Inativa'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleEdit(regra)} className="text-teal-600 hover:text-teal-900 mr-4"><Edit size={18} /></button>
                                        <button onClick={() => handleDelete(regra.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

