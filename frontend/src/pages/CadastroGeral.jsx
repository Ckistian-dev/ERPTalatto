import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import CampoTextsimples from '@/components/campos/CampoTextsimples';
import CampoTelefone from '@/components/campos/CampoTelefone';
import CampoNumsimples from '@/components/campos/CampoNumSimples';
import ModalErro from '@/components/modals/ModalErro';
import ButtonComPermissao from '@/components/buttons/ButtonComPermissao';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CadastroGeral({ modo = 'novo' }) {
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const location = useLocation();
    const cadastroEdicao = location.state?.cadastro || null;

    const [form, setForm] = useState({
        tipo_cadastro: 'Cliente',
        tipo_pessoa: 'Pessoa Física',
        nome_razao: '',
        fantasia: '',
        cpf_cnpj: '',
        ie: '', // ATUALIZADO: de 'ie' para 'ie'
        email: '',
        ddi_celular: '+55',
        celular: '',
        ddi_telefone: '+55',
        telefone: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        codigo_ibge_cidade: '',
        pais: 'Brasil',
        codigo_pais: '1058',
        indicador_ie: '9',
        regiao: '',
        situacao: 'Ativo'
    });

    const [erro, setErro] = useState('');
    const [abaAtual, setAbaAtual] = useState('geral');
    const [isCepLoading, setIsCepLoading] = useState(false);
    const [isCnpjLoading, setIsCnpjLoading] = useState(false);

    useEffect(() => {
        const initialState = {
            tipo_cadastro: 'Cliente', tipo_pessoa: 'Pessoa Física', nome_razao: '',
            fantasia: '', cpf_cnpj: '', ie: '', email: '', ddi_celular: '+55',
            celular: '', ddi_telefone: '+55', telefone: '', cep: '', logradouro: '',
            numero: '', complemento: '', bairro: '', cidade: '', estado: '',
            codigo_ibge_cidade: '', pais: 'Brasil', codigo_pais: '1058',
            indicador_ie: '9', regiao: '', situacao: 'Ativo'
        };

        if (modo === 'editar' && cadastroEdicao) {
            const dadosEdicaoFormatado = {
                ...initialState,
                ...cadastroEdicao,
                ie: cadastroEdicao.ie || '', // Garante que 'ie' substitua 'ie'
                cep: (cadastroEdicao.cep || '').replace(/\D/g, ''),
                indicador_ie: cadastroEdicao.indicador_ie || '9',
            };
            setForm(dadosEdicaoFormatado);
        } else {
            setForm(initialState);
        }
    }, [cadastroEdicao, modo]);

    const obterRegiaoPorUF = (uf) => {
        if (!uf) return '';
        const regioes = {
            Norte: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
            Nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
            'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
            Sudeste: ['ES', 'MG', 'RJ', 'SP'],
            Sul: ['PR', 'RS', 'SC']
        };
        return Object.entries(regioes).find(([, estados]) => estados.includes(uf.toUpperCase()))?.[0] || '';
    };

    const buscarEnderecoViaCep = async (cep) => {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8 || isCepLoading) return;

        setIsCepLoading(true);
        try {
            const res = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            if (!res.data.erro) {
                const uf = res.data.uf;
                setForm((prev) => ({
                    ...prev,
                    logradouro: res.data.logradouro || prev.logradouro,
                    bairro: res.data.bairro || prev.bairro,
                    cidade: res.data.localidade || prev.cidade,
                    estado: uf || prev.estado,
                    codigo_ibge_cidade: res.data.ibge || prev.codigo_ibge_cidade,
                    regiao: obterRegiaoPorUF(uf) || prev.regiao,
                }));
            } else {
                toast.warn("CEP não encontrado ou inválido.");
            }
        } catch (err) {
            toast.error('Falha ao buscar CEP.');
        } finally {
            setIsCepLoading(false);
        }
    };

    const preencherDadosPorCNPJ = async (cnpj) => {
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        if (cnpjLimpo.length !== 14 || isCnpjLoading) return;
        setIsCnpjLoading(true);
        try {
            const res = await axios.get(`${API_URL}/consulta/cnpj/${cnpjLimpo}`);
            if (res.data) {
                const data = res.data;
                setForm((prev) => ({
                    ...prev,
                    nome_razao: data.razao_social || data.nome || prev.nome_razao,
                    fantasia: data.nome_fantasia || data.fantasia || prev.fantasia,
                    email: data.email || prev.email,
                    cep: data.cep?.replace(/\D/g, '') || prev.cep,
                    logradouro: data.logradouro || prev.logradouro,
                    numero: data.numero?.split(/[\\/]/)[0]?.trim() || prev.numero,
                    complemento: data.complemento || prev.complemento,
                    bairro: data.bairro || prev.bairro,
                    cidade: data.municipio || data.cidade || prev.cidade,
                    estado: data.uf || data.estado || prev.estado,
                    ie: data.inscricao_estadual || prev.ie || '', // ATUALIZADO
                    indicador_ie: data.indicador_ie || prev.indicador_ie || '9',
                    celular: ('55' + (data.telefone?.split('/')[0] || '').replace(/\D/g, '')) || prev.celular,
                    telefone: ('55' + (data.telefone?.split('/')[1] || '').replace(/\D/g, '')) || prev.telefone,
                    tipo_pessoa: 'Pessoa Jurídica',
                }));
            } else {
                toast.info("Nenhum dado encontrado para o CNPJ informado.");
            }
        } catch (err) {
            toast.error(`Falha ao buscar dados do CNPJ: ${err.response?.data?.detail || err.message}`);
        } finally {
            setIsCnpjLoading(false);
        }
    };
    
    useEffect(() => {
        const cepLimpo = form.cep?.replace(/\D/g, '') || '';
        if (cepLimpo.length === 8) {
            buscarEnderecoViaCep(cepLimpo);
        }
    }, [form.cep]);

    useEffect(() => {
        const cnpjLimpo = form.cpf_cnpj?.replace(/\D/g, '') || '';
        if (form.tipo_pessoa === 'Pessoa Jurídica' && cnpjLimpo.length === 14) {
            if (modo === 'editar' && cadastroEdicao?.cpf_cnpj === cnpjLimpo) {
                return;
            }
            preencherDadosPorCNPJ(cnpjLimpo);
        }
    }, [form.cpf_cnpj, form.tipo_pessoa]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validarCampos = () => {
        if (!form.nome_razao.trim()) return 'Nome/Razão Social é obrigatório.';
        if (form.tipo_pessoa === 'Pessoa Física') {
            const cpf = (form.cpf_cnpj || '').replace(/\D/g, '');
            if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return 'CPF inválido.';
        } else {
            const cnpj = (form.cpf_cnpj || '').replace(/\D/g, '');
            if (cnpj.length !== 14) return 'CNPJ inválido.';
        }
        if (!form.indicador_ie || !['1', '2', '9'].includes(form.indicador_ie)) {
            return 'Indicador de Inscrição Estadual é obrigatório.';
        }
        if (form.indicador_ie === '1' && !form.ie.trim()) {
            return 'Inscrição Estadual é obrigatória para Contribuinte de ICMS.';
        }
        return '';
    };

    const prepararDadosParaEnvio = () => {
        const dados = { ...form };
        if (form.tipo_pessoa !== 'Pessoa Jurídica') {
            dados.fantasia = '';
        }
        if (dados.indicador_ie !== '1') {
            dados.ie = '';
        }
        dados.cpf_cnpj = (dados.cpf_cnpj || '').replace(/\D/g, '');
        dados.cep = (dados.cep || '').replace(/\D/g, '');
        return dados;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const erroValidacao = validarCampos();
        if (erroValidacao) {
            setErro(erroValidacao);
            toast.error(erroValidacao);
            return;
        }
        setErro('');
        const dados = prepararDadosParaEnvio();
        try {
            if (modo === 'editar') {
                await axios.put(`${API_URL}/cadastros/${cadastroEdicao.id}`, dados);
                toast.success('Cadastro atualizado com sucesso!');
            } else {
                await axios.post(`${API_URL}/cadastros`, dados);
                toast.success('Cadastro criado com sucesso!');
            }
            navigate('/cadastros');
        } catch (err) {
            const errorMsg = err?.response?.data?.detail || 'Erro ao salvar o cadastro.';
            setErro(errorMsg);
            toast.error(errorMsg);
        }
    };

    const abas = [
        { id: 'geral', label: 'Dados Gerais' },
        { id: 'endereco', label: 'Endereço' },
        { id: 'contato', label: 'Contato' },
    ];

    const renderCampos = () => {
        switch (abaAtual) {
            case 'geral':
                return (
                    <>
                        <CampoDropdownEditavel label="Tipo de Cadastro" name="tipo_cadastro" value={form.tipo_cadastro} onChange={handleChange} tipo="tipo_cadastro" usuario={usuario} obrigatorio />
                        <CampoDropdownEditavel
                            label="Tipo de Pessoa"
                            name="tipo_pessoa"
                            value={form.tipo_pessoa}
                            onChange={(e) => {
                                setForm(prev => ({
                                    ...prev,
                                    tipo_pessoa: e.target.value,
                                    fantasia: e.target.value === 'Pessoa Física' ? '' : prev.fantasia,
                                    cpf_cnpj: '',
                                    ie: '',
                                    indicador_ie: '9',
                                }));
                            }}
                            tipo="tipo_pessoa"
                            usuario={usuario}
                            obrigatorio
                        />
                        <CampoNumsimples
                            label={form.tipo_pessoa === 'Pessoa Física' ? 'CPF' : 'CNPJ'}
                            name="cpf_cnpj"
                            value={form.cpf_cnpj}
                            onChange={handleChange}
                            obrigatorio
                            placeholder={form.tipo_pessoa === 'Pessoa Física' ? '000.000.000-00' : '00.000.000/0000-00'}
                            formatos={[
                                form.tipo_pessoa === 'Pessoa Física'
                                    ? { tam: 11, regex: /(\d{3})(\d{3})(\d{3})(\d{2})/, mascara: '$1.$2.$3-$4' }
                                    : { tam: 14, regex: /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, mascara: '$1.$2.$3/$4-$5' }
                            ]}
                            key={`cpf_cnpj_${form.tipo_pessoa}`}
                        />
                        <CampoTextsimples label={form.tipo_pessoa === 'Pessoa Física' ? 'Nome Completo' : 'Razão Social'} name="nome_razao" value={form.nome_razao} onChange={handleChange} obrigatorio placeholder="Nome completo ou Razão Social" />
                        {form.tipo_pessoa === 'Pessoa Jurídica' && (
                            <CampoTextsimples label="Nome Fantasia" name="fantasia" value={form.fantasia} onChange={handleChange} placeholder="Nome fantasia da empresa" />
                        )}
                        
                        {/* LÓGICA UNIFICADA PARA IE */}
                        <CampoDropdownEditavel
                            label="Indicador de Inscrição Estadual"
                            name="indicador_ie"
                            value={form.indicador_ie}
                            onChange={handleChange}
                            tipo="indicador_ie"
                            usuario={usuario}
                            obrigatorio
                        />
                        {form.indicador_ie === '1' && (
                            <CampoTextsimples
                                label="Inscrição Estadual (IE)"
                                name="ie" // Nome do campo atualizado
                                value={form.ie}
                                onChange={handleChange}
                                placeholder="Número da Inscrição Estadual"
                                obrigatorio={form.indicador_ie === '1'}
                            />
                        )}

                        <CampoDropdownEditavel label="Situação Cadastral" name="situacao" value={form.situacao} onChange={handleChange} tipo="situacao" usuario={usuario} />
                    </>
                );
            case 'endereco':
                return (
                    <>
                        <CampoNumsimples label="CEP" name="cep" value={form.cep} onChange={handleChange} formatos={[{ tam: 8, regex: /(\d{5})(\d{3})/, mascara: '$1-$2' }]} />
                        <CampoTextsimples label="Logradouro" name="logradouro" value={form.logradouro} onChange={handleChange} disabled={isCepLoading} />
                        <CampoTextsimples label="Número" name="numero" value={form.numero} onChange={handleChange} />
                        <CampoTextsimples label="Complemento" name="complemento" value={form.complemento} onChange={handleChange} />
                        <CampoTextsimples label="Bairro" name="bairro" value={form.bairro} onChange={handleChange} disabled={isCepLoading} />
                        <CampoTextsimples label="Cidade" name="cidade" value={form.cidade} onChange={handleChange} disabled />
                        <CampoTextsimples label="UF" name="estado" value={form.estado} onChange={handleChange} disabled />
                        <CampoTextsimples label="Cód. IBGE Cidade" name="codigo_ibge_cidade" value={form.codigo_ibge_cidade} onChange={() => { }} disabled />
                        <CampoTextsimples label="País" name="pais" value={form.pais} onChange={() => { }} disabled />
                    </>
                );
            case 'contato':
                return (
                    <>
                        <CampoTextsimples label="Email Principal" name="email" value={form.email} onChange={handleChange} obrigatorio placeholder="exemplo@dominio.com" />
                        <CampoTelefone label="Celular" name="celular" ddiName="ddi_celular" ddiValue={form.ddi_celular} value={form.celular} onChange={handleChange} placeholder="(00) 00000-0000" />
                        <CampoTelefone label="Telefone Fixo" name="telefone" ddiName="ddi_telefone" ddiValue={form.ddi_telefone} value={form.telefone} onChange={handleChange} placeholder="(00) 0000-0000" />
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-28">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
                {modo === 'editar' ? `Editar Cadastro: ${form.nome_razao || ''}` : 'Novo Cadastro'}
            </h1>

            <div className="flex flex-wrap gap-1 border-b border-gray-300 mb-6">
                {abas.map((aba) => (
                    <button
                        key={aba.id}
                        onClick={() => setAbaAtual(aba.id)}
                        className={`px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium rounded-t-md transition-all duration-200 ease-in-out focus:outline-none
                          ${abaAtual === aba.id
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                            }`}
                    >
                        {aba.label}
                    </button>
                ))}
            </div>

            <form id="form-principal" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {renderCampos()}
            </form>

            <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row justify-end gap-3 mt-8 mb-12">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium transition-colors"
                >
                    Voltar
                </button>
                <ButtonComPermissao
                    permissoes={["admin", "editor"]}
                    type="submit"
                    form="form-principal"
                    className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold transition-colors"
                >
                    {modo === 'editar' ? 'Salvar Alterações' : 'Criar Cadastro'}
                </ButtonComPermissao>
            </div>

            <ModalErro mensagem={erro} onClose={() => setErro('')} />
        </div>
    );
}
