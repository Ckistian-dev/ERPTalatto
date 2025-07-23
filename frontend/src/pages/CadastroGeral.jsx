import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { Search } from 'lucide-react';

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
        ie: '',
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
    const [isIeLoading, setIsIeLoading] = useState(false);

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
                ie: cadastroEdicao.ie || '',
                cep: (cadastroEdicao.cep || '').replace(/\D/g, ''),
                indicador_ie: String(cadastroEdicao.indicador_ie || '9'),
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

    const buscarEnderecoViaCep = useCallback(async (cep) => {
        const cepLimpo = (cep || '').replace(/\D/g, '');
        if (cepLimpo.length !== 8 || isCepLoading) return;

        setIsCepLoading(true);
        try {
            const res = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            if (!res.data.erro) {
                const uf = res.data.uf;
                setForm((prev) => ({
                    ...prev,
                    logradouro: res.data.logradouro || '',
                    bairro: res.data.bairro || '',
                    cidade: res.data.localidade || '',
                    estado: uf || '',
                    codigo_ibge_cidade: res.data.ibge || '',
                    regiao: obterRegiaoPorUF(uf) || '',
                }));
            } else {
                toast.warn("CEP não encontrado ou inválido.");
            }
        } catch (err) {
            toast.error('Falha ao buscar CEP.');
        } finally {
            setIsCepLoading(false);
        }
    }, [isCepLoading]);

    const preencherDadosPorCNPJ = useCallback(async (cnpj) => {
        const cnpjLimpo = (cnpj || '').replace(/\D/g, '');
        if (cnpjLimpo.length !== 14 || isCnpjLoading) return;

        if (modo === 'editar' && cadastroEdicao?.cpf_cnpj === cnpjLimpo) {
            return;
        }

        setIsCnpjLoading(true);
        try {
            const res = await axios.get(`${API_URL}/api/consulta/cnpj/${cnpjLimpo}`);
            if (res.data && res.data.status !== "ERROR") {
                const data = res.data;

                const telefonesAPI = data.telefone || '';
                const todosOsDigitos = telefonesAPI.replace(/\D/g, '');
                const numerosEncontrados = todosOsDigitos.match(/\d{10,11}/g) || [];

                setForm((prev) => {
                    // CORREÇÃO: Adicionado o '55' na frente dos números encontrados
                    const celularFinal = numerosEncontrados.length > 0 ? `55${numerosEncontrados[0]}` : prev.celular;
                    const telefoneFinal = numerosEncontrados.length > 1 ? `55${numerosEncontrados[1]}` : prev.telefone;

                    return {
                        ...prev,
                        nome_razao: data.razao_social || data.nome || '',
                        fantasia: data.nome_fantasia || data.fantasia || '',
                        email: data.email || '',
                        cep: data.cep?.replace(/\D/g, '') || '',
                        logradouro: data.logradouro || '',
                        numero: data.numero || '',
                        complemento: data.complemento || '',
                        bairro: data.bairro || '',
                        cidade: data.municipio || '',
                        estado: data.uf || '',
                        tipo_pessoa: 'Pessoa Jurídica',
                        // Atribui os telefones com o DDI do Brasil
                        celular: celularFinal,
                        telefone: telefoneFinal
                    };
                });
            } else {
                toast.info("Nenhum dado encontrado para o CNPJ informado.");
            }
        } catch (err) {
            toast.error(`Falha ao buscar dados do CNPJ: ${err.response?.data?.detail || err.message}`);
        } finally {
            setIsCnpjLoading(false);
        }
    }, [isCnpjLoading, modo, cadastroEdicao, API_URL]);

    useEffect(() => {
        const cepLimpo = form.cep?.replace(/\D/g, '') || '';
        if (cepLimpo.length === 8) {
            buscarEnderecoViaCep(form.cep);
        }
    }, [form.cep, buscarEnderecoViaCep]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        if (name === 'cpf_cnpj' && form.tipo_pessoa === 'Pessoa Jurídica') {
            const cnpjLimpo = value.replace(/\D/g, '');
            if (cnpjLimpo.length === 14) {
                preencherDadosPorCNPJ(cnpjLimpo);
            }
        }
    };

    const handleVerificarIE = async () => {
        const documento = form.cpf_cnpj?.replace(/\D/g, '');
        const uf = form.estado;
        const tipoPessoa = form.tipo_pessoa;

        if (!documento || (tipoPessoa === 'Pessoa Física' && documento.length !== 11) || (tipoPessoa === 'Pessoa Jurídica' && documento.length !== 14)) {
            toast.info(`Por favor, preencha um ${tipoPessoa === 'Pessoa Física' ? 'CPF' : 'CNPJ'} válido.`);
            return;
        }
        if (!uf) {
            toast.info('O campo "UF" (Estado) é necessário para a consulta de IE. Preencha o CEP primeiro.');
            return;
        }

        setIsIeLoading(true);
        toast.info(`Verificando IE para o documento no estado ${uf}...`);

        try {
            const res = await axios.get(`${API_URL}/api/consulta/ie?documento=${documento}&uf=${uf}`);
            const { situacao_cadastral, inscricao_estadual } = res.data;

            if (situacao_cadastral === 'Habilitado') {
                toast.success('Inscrição Estadual encontrada e habilitada!');
                setForm(prev => ({ ...prev, indicador_ie: '1', ie: inscricao_estadual }));
            } else {
                toast.warn('A consulta automática não retornou uma IE ativa. Se souber que existe, preencha os dados manualmente.');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.detail || 'Falha na consulta automática.';
            toast.error(errorMsg);
            toast.info("Por favor, verifique e preencha a Inscrição Estadual manualmente, se aplicável.");
        } finally {
            setIsIeLoading(false);
        }
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
        if (!form.indicador_ie || !['1', '2', '9'].includes(String(form.indicador_ie))) {
            return 'Indicador de Inscrição Estadual é obrigatório.';
        }
        if (String(form.indicador_ie) === '1' && !form.ie.trim()) {
            return 'Inscrição Estadual é obrigatória para Contribuinte de ICMS.';
        }
        return '';
    };

    const prepararDadosParaEnvio = () => {
        const dados = { ...form };
        if (form.tipo_pessoa !== 'Pessoa Jurídica') {
            dados.fantasia = '';
        }
        if (String(dados.indicador_ie) !== '1') {
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
                            label="Tipo de Pessoa" name="tipo_pessoa" value={form.tipo_pessoa}
                            onChange={(e) => {
                                setForm(prev => ({
                                    ...prev, tipo_pessoa: e.target.value, fantasia: e.target.value === 'Pessoa Física' ? '' : prev.fantasia,
                                    cpf_cnpj: '', ie: '', indicador_ie: '9',
                                }));
                            }}
                            tipo="tipo_pessoa" usuario={usuario} obrigatorio
                        />
                        <CampoNumsimples
                            label={form.tipo_pessoa === 'Pessoa Física' ? 'CPF' : 'CNPJ'} name="cpf_cnpj" value={form.cpf_cnpj} onChange={handleChange} obrigatorio
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
                        <CampoDropdownEditavel
                            label="Indicador de Inscrição Estadual" name="indicador_ie" value={String(form.indicador_ie)} onChange={handleChange}
                            tipo="indicador_ie" usuario={usuario} obrigatorio
                        />
                        {String(form.indicador_ie) === '1' ? (
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700">Inscrição Estadual (IE)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        name="ie" value={form.ie} onChange={handleChange} placeholder="Preencha ou verifique"
                                        disabled={String(form.indicador_ie) !== '1'}
                                        className="w-full border p-2 rounded flex-grow border-gray-300 disabled:bg-gray-100"
                                    />
                                    <button
                                        type="button" onClick={handleVerificarIE}
                                        disabled={isIeLoading || !form.cpf_cnpj || !form.estado}
                                        title="Verificar Inscrição Estadual na SEFAZ"
                                        className="h-10 px-3 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                    >
                                        {isIeLoading ? (<span className="animate-spin h-5 w-5 border-2 border-b-transparent border-gray-700 rounded-full"></span>) : (<Search size={18} />)}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <CampoTextsimples label="Inscrição Estadual (IE)" name="ie" value="Não aplicável" disabled={true} onChange={() => {}} />
                        )}
                        <CampoDropdownEditavel label="Situação Cadastral" name="situacao" value={form.situacao} onChange={handleChange} tipo="situacao" usuario={usuario} />
                    </>
                );
            case 'endereco':
                return (
                    <>
                        <CampoNumsimples label="CEP" name="cep" value={form.cep} onChange={handleChange} formatos={[{ tam: 8, regex: /(\d{5})(\d{3})/, mascara: '$1-$2' }]} placeholder="00000-000" />
                        <CampoTextsimples label="Logradouro" name="logradouro" value={form.logradouro} onChange={handleChange} disabled={isCepLoading} placeholder="Ex: Rua das Flores" />
                        <CampoTextsimples label="Número" name="numero" value={form.numero} onChange={handleChange} placeholder="Ex: 123" />
                        <CampoTextsimples label="Complemento" name="complemento" value={form.complemento} onChange={handleChange} placeholder="Ex: Apto 101, Bloco B" />
                        <CampoTextsimples label="Bairro" name="bairro" value={form.bairro} onChange={handleChange} disabled={isCepLoading} placeholder="Ex: Centro" />
                        <CampoTextsimples label="Cidade" name="cidade" value={form.cidade} onChange={handleChange} disabled placeholder="Preenchido pelo CEP" />
                        <CampoTextsimples label="UF" name="estado" value={form.estado} onChange={handleChange} disabled placeholder="Preenchido pelo CEP" />
                        <CampoTextsimples label="Cód. IBGE Cidade" name="codigo_ibge_cidade" value={form.codigo_ibge_cidade} onChange={() => { }} disabled placeholder="Preenchido pelo CEP" />
                        <CampoTextsimples label="País" name="pais" value={form.pais} onChange={() => { }} disabled placeholder="Preenchido pelo CEP" />
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
                          ${abaAtual === aba.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'}`}
                    >
                        {aba.label}
                    </button>
                ))}
            </div>
            <form id="form-principal" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {renderCampos()}
            </form>
            <div className="flex justify-end gap-3 mt-8 mb-12">
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