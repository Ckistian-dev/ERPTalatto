// /pages/InfoEmpresaPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { FaBuilding, FaMapMarkerAlt, FaFileInvoiceDollar, FaCalculator } from 'react-icons/fa';

import CampoTextsimples from '@/components/campos/CampoTextsimples';
import CampoNumsimples from '@/components/campos/CampoNumSimples';
import CampoDropdownSimNao from '@/components/campos/CampoDropdownSimNao';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import CampoDropdown from '@/components/campos/CampoDropdown'; 

const API_URL = import.meta.env.VITE_API_BASE_URL;

// --- Componentes de Abas ---
const AbaGeral = ({ form, onChange }) => (
    <div className="p-6 bg-white border rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-6 text-gray-800">Dados Principais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <CampoTextsimples label="Razão Social" name="razao_social" value={form.razao_social || ''} onChange={onChange} colSpan obrigatorio />
            <CampoTextsimples label="Nome Fantasia" name="nome_fantasia" value={form.nome_fantasia || ''} onChange={onChange} colSpan obrigatorio />
            <CampoNumsimples label="CNPJ" name="cnpj" value={form.cnpj || ''} onChange={onChange} obrigatorio formatos={[{ tam: 14, regex: /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, mascara: '$1.$2.$3/$4-$5' }]} />
            <CampoNumsimples label="Inscrição Estadual (IE)" name="ie" value={form.ie || ''} onChange={onChange} />
            <CampoDropdown
                label="Regime Tributário (CRT)"
                name="crt"
                value={String(form.crt || '')}
                onChange={onChange}
                colSpan
                obrigatorio
                opcoes={[
                    { valor: '1', texto: '1 - Simples Nacional' },
                    { valor: '3', texto: '3 - Regime Normal (Lucro Presumido/Real)' }
                ]}
            />
        </div>
    </div>
);

const AbaEndereco = ({ form, onChange, onBlurCep }) => (
    <div className="p-6 bg-white border rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-6 text-gray-800">Endereço Fiscal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <CampoNumsimples label="CEP" name="cep" value={form.cep || ''} onChange={onChange} formatos={[{ tam: 8, regex: /(\d{5})(\d{3})/, mascara: '$1-$2' }]} onBlur={(e) => onBlurCep(e.target.value)} />
            <CampoTextsimples label="Logradouro" name="logradouro" value={form.logradouro || ''} onChange={onChange} />
            <CampoTextsimples label="Número" name="numero" value={form.numero || ''} onChange={onChange} />
            <CampoTextsimples label="Bairro" name="bairro" value={form.bairro || ''} onChange={onChange} />
            <CampoTextsimples label="Cidade" name="cidade" value={form.cidade || ''} onChange={onChange} />
            <CampoTextsimples label="UF" name="uf" value={form.uf || ''} onChange={onChange} />
        </div>
    </div>
);

const AbaFiscal = ({ form, onChange }) => (
    <div className="p-6 bg-white border rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-6 text-gray-800">Configuração de Emissão Fiscal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <CampoDropdownSimNao label="Ambiente de Emissão" name="emissao_em_producao" value={form.emissao_em_producao || false} onChange={onChange} colSpan textoSim="Produção (Notas Válidas)" textoNao="Homologação (Testes)" />
            <p className="md:col-span-2 text-sm text-gray-500 mt-2 p-3 bg-gray-50 rounded-md">
                {form.emissao_em_producao ? "⚠️ CUIDADO: Emissão em PRODUÇÃO. As notas fiscais emitidas terão validade jurídica e fiscal." : "ℹ️ Emissão em HOMOLOGAÇÃO. As notas são apenas para teste e não possuem valor fiscal."}
            </p>
        </div>
    </div>
);

const AbaPadroesFiscais = ({ form, onChange }) => (
    <div className="p-6 bg-white border rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-6 text-gray-800">Valores Padrão para Emissão de NF-e</h3>
        <p className="text-sm text-gray-600 mb-6">Estes CFOPs serão usados como padrão ao gerar o XML para o Sebrae.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <CampoTextsimples label="CFOP Interno Padrão" name="cfop_interno" value={form.cfop_interno || ''} onChange={onChange} placeholder="Ex: 5102" />
            <CampoTextsimples label="CFOP Interestadual Padrão" name="cfop_interestadual" value={form.cfop_interestadual || ''} onChange={onChange} placeholder="Ex: 6108" />
        </div>
    </div>
);


// --- Componente Principal da Página ---
export default function InfoEmpresaPage() {
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const [abaAtual, setAbaAtual] = useState('geral');
    const [form, setForm] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const abas = [
        { id: 'geral', label: 'Dados da Empresa', icon: FaBuilding },
        { id: 'endereco', label: 'Endereço', icon: FaMapMarkerAlt },
        { id: 'fiscal', label: 'Emissão Fiscal', icon: FaFileInvoiceDollar },
        { id: 'padroes', label: 'Padrões Fiscais', icon: FaCalculator },
    ];

    const buscarEnderecoViaCep = useCallback(async (cep) => {
        const cepLimpo = (cep || '').replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;
        try {
            const res = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            if (!res.data.erro) {
                setForm(prev => ({ ...prev, logradouro: res.data.logradouro || '', bairro: res.data.bairro || '', cidade: res.data.localidade || '', uf: res.data.uf || '' }));
                toast.success("Endereço preenchido automaticamente!");
            } else {
                toast.warn("CEP não encontrado.");
            }
        } catch (err) {
            toast.error('Falha ao buscar CEP.');
        }
    }, []);

    useEffect(() => {
        const fetchInfoEmpresa = async () => {
            setIsLoading(true);
            try {
                const { data } = await axios.get(`${API_URL}/api/empresa`);
                setForm(data);
            } catch (error) {
                toast.error("Não foi possível carregar as configurações da empresa.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchInfoEmpresa();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? (value === 'S' || checked) : value;
        setForm(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const dadosParaSalvar = { ...form };
        ['cnpj', 'cep', 'ie'].forEach(key => {
            if (dadosParaSalvar[key]) {
                dadosParaSalvar[key] = String(dadosParaSalvar[key]).replace(/\D/g, '');
            }
        });

        try {
            await axios.put(`${API_URL}/api/empresa`, dadosParaSalvar);
            toast.success("Informações salvas com sucesso!");
        } catch (error) {
            toast.error(error.response?.data?.detail || "Falha ao salvar as informações.");
        }
    };

    const renderAbaAtual = () => {
        if (isLoading) {
            return <p className="text-center py-10">Carregando configurações...</p>;
        }
        switch (abaAtual) {
            case 'geral':    return <AbaGeral form={form} onChange={handleChange} />;
            case 'endereco': return <AbaEndereco form={form} onChange={handleChange} onBlurCep={buscarEnderecoViaCep} />;
            case 'fiscal':   return <AbaFiscal form={form} onChange={handleChange} />;
            case 'padroes':  return <AbaPadroesFiscais form={form} onChange={handleChange} />;
            default: return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-28">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
                Gestão e Configurações da Empresa
            </h1>

            <div className="flex flex-wrap gap-1 border-b border-gray-300 mb-6">
                {abas.map((aba) => (
                    <button key={aba.id} onClick={() => setAbaAtual(aba.id)} className={`px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium rounded-t-md transition-all duration-200 ease-in-out focus:outline-none flex items-center gap-2 ${abaAtual === aba.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'}`}>
                        <aba.icon /> {aba.label}
                    </button>
                ))}
            </div>

            <form id="form-principal" onSubmit={handleSubmit}>
                <div className="mt-6">
                    {renderAbaAtual()}
                </div>

                <div className="flex justify-end gap-3 mt-8 mb-12">
                    <button type="button" onClick={() => navigate(-1)} className="w-full sm:w-auto px-5 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium transition-colors">
                        Voltar
                    </button>
                    <ButtonComPermissao permissoes={["admin"]} type="submit" form="form-principal" className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold transition-colors">
                        Salvar Alterações
                    </ButtonComPermissao>
                </div>
            </form>
        </div>
    );
}
