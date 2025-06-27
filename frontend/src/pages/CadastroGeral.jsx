// CadastroGeral.jsx
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

// Define a URL da API a partir das variáveis de ambiente do Vite
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
    rg_ie: '', 
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
    if (modo === 'editar' && cadastroEdicao) {
      console.log("Dados de edição recebidos:", cadastroEdicao);
      const dadosEdicaoFormatado = {
        tipo_cadastro: cadastroEdicao.tipo_cadastro || 'Cliente',
        tipo_pessoa: cadastroEdicao.tipo_pessoa || 'Pessoa Física',
        nome_razao: cadastroEdicao.nome_razao || '',
        fantasia: cadastroEdicao.fantasia || '',
        cpf_cnpj: cadastroEdicao.cpf_cnpj || '',
        rg_ie: cadastroEdicao.rg_ie || '', 
        email: cadastroEdicao.email || '',
        ddi_celular: cadastroEdicao.ddi_celular || '+55',
        celular: cadastroEdicao.celular || '',
        ddi_telefone: cadastroEdicao.ddi_telefone || '+55',
        telefone: cadastroEdicao.telefone || '',
        cep: (cadastroEdicao.cep || '').replace(/\D/g, ''), // Garante que CEP venha limpo
        logradouro: cadastroEdicao.logradouro || '',
        numero: cadastroEdicao.numero || '',
        complemento: cadastroEdicao.complemento || '',
        bairro: cadastroEdicao.bairro || '',
        cidade: cadastroEdicao.cidade || '',
        estado: cadastroEdicao.estado || '',
        codigo_ibge_cidade: cadastroEdicao.codigo_ibge_cidade || '',
        pais: cadastroEdicao.pais || 'Brasil',
        codigo_pais: cadastroEdicao.codigo_pais || '1058',
        indicador_ie: cadastroEdicao.indicador_ie || (cadastroEdicao.tipo_pessoa === 'Pessoa Jurídica' ? '9' : ''),
        regiao: cadastroEdicao.regiao || '',
        situacao: cadastroEdicao.situacao || 'Ativo'
      };
      if (dadosEdicaoFormatado.tipo_pessoa === 'Pessoa Jurídica' && cadastroEdicao.indicador_ie) {
        dadosEdicaoFormatado.indicador_ie = cadastroEdicao.indicador_ie;
      } else if (dadosEdicaoFormatado.tipo_pessoa === 'Pessoa Jurídica' && !cadastroEdicao.indicador_ie) {
        dadosEdicaoFormatado.indicador_ie = '9';
      }
      setForm(dadosEdicaoFormatado);
    } else if (modo === 'novo') { // Garante reset para modo novo
        setForm({
            tipo_cadastro: 'Cliente',
            tipo_pessoa: 'Pessoa Física',
            nome_razao: '',
            fantasia: '',
            cpf_cnpj: '',
            rg_ie: '',
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
            indicador_ie: '9', // Default para PJ, PF não usa diretamente
            regiao: '',
            situacao: 'Ativo'
        });
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
    return Object.entries(regioes).find(([_, estados]) => estados.includes(uf.toUpperCase()))?.[0] || '';
  };

  const buscarEnderecoViaCep = async (cep) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8 || isCepLoading) return;

    setIsCepLoading(true);
    console.log(`Buscando CEP: ${cepLimpo}`);
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
        toast.success("Endereço preenchido pelo CEP.");
      } else {
        toast.warn("CEP não encontrado ou inválido.");
        setForm(prev => ({
            ...prev,
            logradouro: '', bairro: '', cidade: '', estado: '', codigo_ibge_cidade: '', regiao: ''
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
      toast.error('Falha ao buscar CEP. Verifique sua conexão.');
    } finally {
      setIsCepLoading(false);
    }
  };

  const preencherDadosPorCNPJ = async (cnpj) => {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14 || isCnpjLoading) return;

    setIsCnpjLoading(true);
    console.log(`Buscando CNPJ: ${cnpjLimpo}`); 

    try {
      // USO DA VARIÁVEL DE AMBIENTE AQUI
      const res = await axios.get(`${API_URL}/consulta/cnpj/${cnpjLimpo}`);
      console.log("Resposta da API CNPJ:", res.data); 

      if (res.data) {
        const data = res.data;
        const cepNumerico = data.cep?.replace(/\D/g, '') || '';
        const numeroLimpo = data.numero?.split(/[\\/]/)[0]?.trim() || '';
        
        const dadosApiCnpj = {
          nome_razao: data.razao_social || data.nome || '',
          fantasia: data.nome_fantasia || data.fantasia || '',
          email: data.email || form.email, // Prioriza email da API, senão mantém o do form
          cep: cepNumerico,
          logradouro: data.logradouro || '',
          numero: numeroLimpo,
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.municipio || data.cidade || '',
          estado: data.uf || data.estado || '',
          rg_ie: data.inscricao_estadual || '', 
        };

        setForm((prev) => {
          const telefonesApi = data.telefone?.split('/').map(t => ('55' + t.replace(/\D/g, ''))) || [];
          const [celApi, telApi] = telefonesApi;
          // Tenta obter o indicador_ie da API do CNPJ, se não vier, usa o valor do formulário (se PJ) ou '9'
          let indicadorIeFinal = '9'; // Default
          if (data.indicador_ie) { // Se a API de CNPJ retornar o indicador
            indicadorIeFinal = data.indicador_ie;
          } else if (prev.tipo_pessoa === 'Pessoa Jurídica' && prev.indicador_ie) { // Senão, se já tinha um valor no form para PJ
            indicadorIeFinal = prev.indicador_ie;
          }

          return {
            ...prev, 
            ...dadosApiCnpj, 
            celular: celApi || prev.celular, 
            telefone: telApi || prev.telefone, 
            tipo_pessoa: 'Pessoa Jurídica', 
            indicador_ie: indicadorIeFinal,
          };
        });
        toast.success("Dados preenchidos pelo CNPJ.");

        if (cepNumerico.length === 8) {
          await buscarEnderecoViaCep(cepNumerico); 
        }
      } else {
        toast.info("Nenhum dado encontrado para o CNPJ informado.");
      }
    } catch (err) {
      console.error('Erro ao buscar CNPJ:', err);
      if (err.response) {
        console.error("Detalhes do erro da API CNPJ:", err.response.data);
        toast.error(`Falha ao buscar dados do CNPJ: ${err.response.data?.detail || err.message}`);
      } else {
        toast.error('Falha ao buscar dados do CNPJ. Verifique o console e o serviço de consulta.');
      }
    } finally {
      setIsCnpjLoading(false);
    }
  };

  // useEffect para buscar CEP automaticamente
  useEffect(() => {
    const cepLimpo = form.cep.replace(/\D/g, '');
    if (cepLimpo.length === 8 && !isCepLoading) { 
      buscarEnderecoViaCep(cepLimpo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [form.cep]); 

  // useEffect para buscar CNPJ automaticamente
  useEffect(() => {
    const cnpjLimpo = form.cpf_cnpj.replace(/\D/g, '');
    if (form.tipo_pessoa === 'Pessoa Jurídica' && cnpjLimpo.length === 14 && !isCnpjLoading) { 
      console.log("useEffect (CNPJ) disparando preencherDadosPorCNPJ...");
      preencherDadosPorCNPJ(cnpjLimpo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cpf_cnpj, form.tipo_pessoa]); 


  const handleChange = (e) => {
    const { name, value } = e.target;
    let valorFinal = value;

    if (name === 'cpf_cnpj' || name === 'cep') {
      valorFinal = value.replace(/\D/g, '');
    }
    
    setForm((prev) => ({ ...prev, [name]: valorFinal }));
  };

  const validarCampos = () => {
    const emailValido = /\S+@\S+\.\S+/.test(form.email);
    const cepValido = form.cep.replace(/\D/g, '').length === 8;

    if (!form.nome_razao.trim()) return 'Nome/Razão Social é obrigatório.';
    if (form.tipo_pessoa === 'Pessoa Física') {
      const cpf = form.cpf_cnpj.replace(/\D/g, '');
      if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return 'CPF inválido.';
    } else { 
      const cnpj = form.cpf_cnpj.replace(/\D/g, '');
      if (cnpj.length !== 14) return 'CNPJ inválido.';
    }
    if (!form.email.trim() || !emailValido) return 'Email inválido ou não preenchido.';
    
    if (form.tipo_pessoa === 'Pessoa Jurídica') {
        if (!form.indicador_ie || !['1', '2', '9'].includes(form.indicador_ie)) { // Valida se é um dos códigos esperados
            return 'Indicador de Inscrição Estadual é obrigatório e deve ser válido para Pessoa Jurídica.';
        }
        if (form.indicador_ie === '1' && !form.rg_ie.trim()) {
            return 'Inscrição Estadual é obrigatória para Contribuinte de ICMS (PJ).';
        }
    }
    if (!cepValido && form.cep.trim() !== '') return 'CEP inválido. Deve conter 8 dígitos.';
    if (cepValido && !form.codigo_ibge_cidade?.trim()) {
          return 'Código IBGE da cidade não preenchido. Aguarde a busca pelo CEP ou verifique o CEP informado.';
    }
    if (cepValido) { 
        if (!form.logradouro.trim()) return 'Logradouro é obrigatório.';
        if (!form.numero.trim()) return 'Número do endereço é obrigatório.';
        if (!form.bairro.trim()) return 'Bairro é obrigatório.';
        if (!form.cidade.trim()) return 'Cidade é obrigatória.';
        if (!form.estado.trim()) return 'Estado (UF) é obrigatório.';
    }
    return '';
  };

  const prepararDadosParaEnvio = () => {
    const dados = { ...form };
    if (form.tipo_pessoa !== 'Pessoa Jurídica') {
      dados.fantasia = '';
      dados.indicador_ie = ''; 
    } else { 
        if (dados.indicador_ie !== '1') { 
            dados.rg_ie = ''; 
        }
    }
    dados.cpf_cnpj = dados.cpf_cnpj.replace(/\D/g, '');
    dados.cep = dados.cep.replace(/\D/g, '');
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
    console.log("Dados para envio:", dados);

    try {
      if (modo === 'editar') {
        // USO DA VARIÁVEL DE AMBIENTE AQUI
        await axios.put(`${API_URL}/cadastros/${cadastroEdicao.id}`, dados);
        toast.success('Cadastro atualizado com sucesso!');
      } else {
        // USO DA VARIÁVEL DE AMBIENTE AQUI
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
                    const novoTipoPessoa = e.target.value;
                    setForm(prev => ({
                        ...prev,
                        tipo_pessoa: novoTipoPessoa,
                        fantasia: novoTipoPessoa === 'Pessoa Física' ? '' : prev.fantasia,
                        indicador_ie: novoTipoPessoa === 'Pessoa Jurídica' ? (cadastroEdicao?.tipo_pessoa === 'Pessoa Jurídica' && cadastroEdicao?.indicador_ie ? cadastroEdicao.indicador_ie : '9') : '',
                        rg_ie: '', 
                        cpf_cnpj: '' 
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
              <CampoTextsimples
                label="Nome Fantasia"
                name="fantasia"
                value={form.fantasia}
                onChange={handleChange}
                placeholder="Nome fantasia da empresa"
              />
            )}
            {form.tipo_pessoa === 'Pessoa Jurídica' && (
                <>
                    <CampoDropdownEditavel
                        label="Indicador de Inscrição Estadual (Destinatário)"
                        name="indicador_ie"
                        value={form.indicador_ie} // Deve refletir '1', '2' ou '9'
                        onChange={handleChange}    // handleChange agora faz a conversão se necessário
                        tipo="indicador_ie" 
                        usuario={usuario} 
                        obrigatorio
                        placeholder="Selecione..."
                    />
                    {form.indicador_ie === '1' && (
                        <CampoTextsimples 
                            label="Inscrição Estadual (IE)" 
                            name="rg_ie"
                            value={form.rg_ie} 
                            onChange={handleChange} 
                            placeholder="Número da Inscrição Estadual" 
                            obrigatorio={form.indicador_ie === '1'}
                        />
                    )}
                </>
            )}
            {form.tipo_pessoa === 'Pessoa Física' && (
                <CampoTextsimples 
                    label="RG" 
                    name="rg_ie" 
                    value={form.rg_ie} 
                    onChange={handleChange} 
                    placeholder="Número do RG (Opcional)" 
                />
            )}
            <CampoDropdownEditavel label="Situação Cadastral" name="situacao" value={form.situacao} onChange={handleChange} tipo="situacao" usuario={usuario} />
          </>
        );
      case 'endereco':
        return (
          <>
            <CampoNumsimples
              label="CEP"
              name="cep"
              value={form.cep} 
              onChange={handleChange}
              obrigatorio
              placeholder="00000-000"
              formatos={[
                { tam: 8, regex: /(\d{5})(\d{3})/, mascara: '$1-$2' }
              ]}
            />
            <CampoTextsimples label="Logradouro (Rua/Avenida)" name="logradouro" value={form.logradouro} onChange={handleChange} obrigatorio placeholder="Ex: Rua Principal" disabled={isCepLoading || (!!form.cep && !!form.logradouro && form.logradouro !== '')}/>
            <CampoTextsimples label="Número" name="numero" value={form.numero} onChange={handleChange} obrigatorio placeholder="Ex: 123 ou S/N" />
            <CampoTextsimples label="Complemento" name="complemento" value={form.complemento} onChange={handleChange} placeholder="Ex: Apto 101, Bloco B, Fundos" />
            <CampoTextsimples label="Bairro" name="bairro" value={form.bairro} onChange={handleChange} obrigatorio placeholder="Nome do bairro" disabled={isCepLoading || (!!form.cep && !!form.bairro && form.bairro !== '')} />
            <CampoTextsimples label="Cidade" name="cidade" value={form.cidade} onChange={handleChange} obrigatorio placeholder="Nome da cidade" disabled />
            <CampoTextsimples label="UF (Estado)" name="estado" value={form.estado} onChange={handleChange} obrigatorio placeholder="Sigla do estado, ex: PR" disabled />
            <CampoTextsimples label="Código IBGE da Cidade" name="codigo_ibge_cidade" value={form.codigo_ibge_cidade} onChange={() => {}} disabled placeholder="Preenchido automaticamente" />
            <CampoTextsimples label="País" name="pais" value={form.pais} onChange={() => {}} disabled />
          </>
        );
      case 'contato':
        return (
          <>
            <CampoTextsimples label="Email Principal" name="email" value={form.email} onChange={handleChange} obrigatorio placeholder="exemplo@dominio.com" />
            <CampoTelefone
              label="Celular"
              name="celular"
              ddiName="ddi_celular"
              ddiValue={form.ddi_celular}
              value={form.celular}
              onChange={handleChange}
              min={10} 
              max={11} 
              placeholder="(00) 00000-0000"
              formatos={[
                { tam: 10, regex: /(\d{2})(\d{4})(\d{4})/, mascara: '($1) $2-$3' },
                { tam: 11, regex: /(\d{2})(\d{5})(\d{4})/, mascara: '($1) $2-$3' }
              ]}
            />
            <CampoTelefone
              label="Telefone Fixo"
              name="telefone"
              ddiName="ddi_telefone"
              ddiValue={form.ddi_telefone}
              value={form.telefone}
              onChange={handleChange}
              min={10}
              max={11} 
              placeholder="(00) 0000-0000"
              formatos={[
                { tam: 10, regex: /(\d{2})(\d{4})(\d{4})/, mascara: '($1) $2-$3' },
              ]}
            />
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