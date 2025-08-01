// /pages/InfoEmpresaPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

// Importe seus componentes de campo
import CampoTextsimples from '@/components/campos/CampoTextsimples';
import CampoNumsimples from '@/components/campos/CampoNumSimples';
import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import CampoDropdownSimNao from '@/components/campos/CampoDropdownSimNao';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function InfoEmpresaPage() {
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const [abaAtual, setAbaAtual] = useState('geral');
    const [form, setForm] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const abas = [
        { id: 'geral', label: 'Dados da Empresa' },
        { id: 'endereco', label: 'Endereço' },
        { id: 'fiscal', label: 'Fiscal & Emissão' },
        { id: 'responsavel', label: 'Responsável Técnico' }
    ];

    const buscarEnderecoViaCep = useCallback(async (cep) => {
        const cepLimpo = (cep || '').replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;
        try {
            const res = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            if (!res.data.erro) {
                setForm(prev => ({
                    ...prev,
                    logradouro: res.data.logradouro || '',
                    bairro: res.data.bairro || '',
                    cidade: res.data.localidade || '',
                    uf: res.data.uf || '',
                    pynfe_uf: res.data.uf || prev.pynfe_uf,
                    codigo_municipio_ibge: res.data.ibge || ''
                }));
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
                toast.error("Não foi possível carregar as configurações.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchInfoEmpresa();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const dadosParaSalvar = { ...form };
        ['cnpj', 'cep', 'resp_tec_cnpj', 'resp_tec_fone', 'ie', 'im', 'cnae', 'codigo_municipio_ibge'].forEach(key => {
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

    const renderCampos = () => {
        if (isLoading) {
            return <p className="md:col-span-2 text-center py-10">Carregando...</p>;
        }
        switch (abaAtual) {
            case 'geral':
                return (
                    <>
                        <CampoTextsimples label="Razão Social" name="razao_social" value={form.razao_social} onChange={handleChange} colSpan obrigatorio placeholder="Razão Social completa da empresa" />
                        <CampoTextsimples label="Nome Fantasia" name="nome_fantasia" value={form.nome_fantasia} onChange={handleChange} colSpan obrigatorio placeholder="Nome popular da empresa" />
                        <CampoNumsimples label="CNPJ" name="cnpj" value={form.cnpj} onChange={handleChange} obrigatorio formatos={[{ tam: 14, regex: /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, mascara: '$1.$2.$3/$4-$5' }]} placeholder="00.000.000/0000-00"/>
                        <CampoNumsimples label="Inscrição Estadual (IE)" name="ie" value={form.ie} onChange={handleChange} placeholder="Apenas números ou 'ISENTO'" />
                        <CampoNumsimples label="Inscrição Municipal (IM)" name="im" value={form.im} onChange={handleChange} placeholder="Apenas números" />
                    </>
                );
            case 'endereco':
                return (
                    <>
                        <div className="md:col-span-2">
                            <CampoNumsimples label="CEP" name="cep" value={form.cep} onChange={handleChange} formatos={[{ tam: 8, regex: /(\d{5})(\d{3})/, mascara: '$1-$2' }]} onBlur={(e) => buscarEnderecoViaCep(e.target.value)} placeholder="00000-000"/>
                        </div>
                        <CampoTextsimples label="Logradouro" name="logradouro" value={form.logradouro} onChange={handleChange} colSpan placeholder="Ex: Rua das Flores"/>
                        <CampoTextsimples label="Número" name="numero" value={form.numero} onChange={handleChange} placeholder="Ex: 123" />
                        <CampoTextsimples label="Bairro" name="bairro" value={form.bairro} onChange={handleChange} placeholder="Ex: Centro" />
                        <CampoTextsimples label="Complemento" name="complemento" value={form.complemento} onChange={handleChange} placeholder="Ex: Sala 101, Bloco B" />
                        <CampoTextsimples label="Cidade" name="cidade" value={form.cidade} onChange={handleChange} placeholder="Preenchido pelo CEP"/>
                        <CampoTextsimples label="UF" name="uf" value={form.uf} onChange={handleChange} placeholder="Preenchido pelo CEP"/>
                        <CampoTextsimples label="Cód. IBGE Cidade" name="codigo_municipio_ibge" value={form.codigo_municipio_ibge} onChange={handleChange} placeholder="Preenchido pelo CEP"/>
                    </>
                );
            case 'fiscal':
                return (
                    <>
                        <CampoNumsimples label="CNAE Fiscal" name="cnae" value={form.cnae} onChange={handleChange} placeholder="Apenas números"/>
                        <CampoDropdownEditavel label="Regime Tributário (CRT)" name="crt" value={form.crt} onChange={handleChange} tipo="crt" usuario={usuario} placeholder="Selecione o regime" />
                        <CampoDropdownSimNao label="Ambiente de Emissão" name="emissao_em_producao" value={form.emissao_em_producao} onChange={handleChange} colSpan />
                        <CampoTextsimples label="UF para Emissão (PyNFe)" name="pynfe_uf" value={form.pynfe_uf} onChange={handleChange} placeholder="Ex: PR" />
                        <p className="md:col-span-2 text-sm text-gray-500">{form.emissao_em_producao ? "⚠️ CUIDADO: Emissão em PRODUÇÃO. As notas terão valor fiscal." : "ℹ️ Emissão em HOMOLOGAÇÃO. As notas são apenas para teste."}</p>
                    </>
                );
            case 'responsavel':
                 return (
                    <>
                        <CampoTextsimples label="Nome de Contato" name="resp_tec_contato" value={form.resp_tec_contato} onChange={handleChange} placeholder="Nome do desenvolvedor" />
                        <CampoNumsimples label="CNPJ" name="resp_tec_cnpj" value={form.resp_tec_cnpj} onChange={handleChange} formatos={[{ tam: 14, regex: /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, mascara: '$1.$2.$3/$4-$5' }]} placeholder="CNPJ da empresa de software"/>
                        <CampoTextsimples label="Email" name="resp_tec_email" value={form.resp_tec_email} onChange={handleChange} type="email" placeholder="contato@desenvolvedor.com" />
                        <CampoNumsimples label="Telefone" name="resp_tec_fone" value={form.resp_tec_fone} onChange={handleChange} formatos={[{ tam: 11, regex: /(\d{2})(\d{5})(\d{4})/, mascara: '($1) $2-$3' }, { tam: 10, regex: /(\d{2})(\d{4})(\d{4})/, mascara: '($1) $2-$3' }]} placeholder="(45) 91234-5678"/>
                    </>
                );
            default: return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-28">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
                Configurações da Empresa
            </h1>
            <div className="flex flex-wrap gap-1 border-b border-gray-300 mb-6">
                {abas.map((aba) => (
                    <button
                        key={aba.id}
                        onClick={() => setAbaAtual(aba.id)}
                        className={`px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium rounded-t-md transition-all duration-200 ease-in-out focus:outline-none
                          ${abaAtual === aba.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'}`}
                    >
                        {aba.label}
                    </button>
                ))}
            </div>
            
            <form id="form-principal" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-6">
                {renderCampos()}
            </form>

            <div className="flex justify-end gap-3 mt-8 mb-12">
                <button type="button" onClick={() => navigate(-1)} className="w-full sm:w-auto px-5 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium transition-colors">
                    Voltar
                </button>
                <ButtonComPermissao
                    permissoes={["admin"]}
                    type="submit"
                    form="form-principal"
                    className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold transition-colors"
                >
                    Salvar Alterações
                </ButtonComPermissao>
            </div>
        </div>
    );
}