import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import ModalErro from '@/components/modals/ModalErro';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import CampoTextarea from '@/components/campos/CampoTextarea';
import CampoTextsimples from '@/components/campos/CampoTextsimples';
import CampoNumSimples from '@/components/campos/CampoNumSimples';
import CampoNumSetas from "@/components/campos/CampoNumSetas";
import CampoCodigoBarras from '@/components/campos/CampoCodigoBarras';
import CampoURLs from '@/components/campos/CampoURLs';
import CampoPrecosDinamico from "@/components/campos/CampoPrecosDinamico";
import CampoMedidas from "@/components/campos/CampoMedidas";
import CampoValorMonetario from "@/components/campos/CampoValorMonetario";
import CampoDropdownDb from "@/components/campos/CampoDropdownDb";
import CampoDropdownSimNao from "@/components/campos/CampoDropdownSimNao";

const API_URL = import.meta.env.VITE_API_BASE_URL;

function safeParse(valor, padrao = []) {
  if (!valor) return padrao;
  if (typeof valor === "object") return valor;
  try {
    const parsed = JSON.parse(valor);
    return parsed;
  } catch {
    return padrao;
  }
}

export default function CadastroProduto({ modo = "novo" }) {
  const navigate = useNavigate();
  const [abaAtual, setAbaAtual] = useState("produto");
  const [erro, setErro] = useState("");
  const { usuario } = useAuth();
  const location = useLocation();
  const produtoEdicao = location.state?.produto || null;

  const [form, setForm] = useState({
    codigo_barras: '', descricao: '', sku: '', unidade: '', situacao: 'Aguardando Validação', tipo_produto: '',
    grupo: '', subgrupo1: '', subgrupo2: '', subgrupo3: '', subgrupo4: '', subgrupo5: '',
    permite_estoque_negativo: 0, peso_produto: '', peso_embalagem: '', unidade_caixa: '',
    largura_embalagem: '', altura_embalagem: '', comprimento_embalagem: '',
    classificacao_fiscal: '', origem: '', gtin: '', gtin_tributavel: '', tabela_precos: {},
    custo_produto: '', id_fornecedor: '', url_imagem: [],
    id_logica_embalagem: null, // Campo para o ID da lógica de embalagem
  });

  useEffect(() => {
    if (produtoEdicao) {
      setForm((prev) => ({
        ...prev,
        ...produtoEdicao,
        id_logica_embalagem: produtoEdicao.id_logica_embalagem || null,
        codigo_barras: produtoEdicao.codigo_barras || "",
        permite_estoque_negativo: produtoEdicao.permite_estoque_negativo ?? 0,
        tabela_precos: safeParse(produtoEdicao.tabela_precos, {}),
        url_imagem: safeParse(produtoEdicao.url_imagem, [])
      }));
    }
  }, [produtoEdicao, modo]);

  const abas = [
    { id: "produto", label: "Produto" }, { id: "fiscal", label: "Fiscal" },
    { id: "preco", label: "Preço" }, { id: "estoque", label: "Estoque" },
    { id: "embalagem", label: "Embalagem" }, { id: "custo", label: "Custo" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const toNumberOrNull = (value) => {
      if (value === '' || value === null || value === undefined) return null;
      const num = parseFloat(String(value).replace(",", "."));
      return isNaN(num) ? null : num;
    };

    const toIntOrNull = (value) => {
      if (value === '' || value === null || value === undefined) return null;
      const num = parseInt(value, 10);
      return isNaN(num) ? null : num;
    };

    const dadosParaEnvio = {
      ...form,
      id_logica_embalagem: toIntOrNull(form.id_logica_embalagem),
      sku: String(form.sku || ''),
      peso_produto: toNumberOrNull(form.peso_produto),
      peso_embalagem: toNumberOrNull(form.peso_embalagem),
      largura_embalagem: toNumberOrNull(form.largura_embalagem),
      altura_embalagem: toNumberOrNull(form.altura_embalagem),
      comprimento_embalagem: toNumberOrNull(form.comprimento_embalagem),
      custo_produto: toNumberOrNull(form.custo_produto),
      unidade_caixa: toIntOrNull(form.unidade_caixa),
      id_fornecedor: toIntOrNull(form.id_fornecedor),
      permite_estoque_negativo: toIntOrNull(form.permite_estoque_negativo),
      url_imagem: JSON.stringify(form.url_imagem || []),
      tabela_precos: JSON.stringify(form.tabela_precos || {}),
    };

    try {
      if (produtoEdicao) {
        await axios.put(`${API_URL}/produtos/${produtoEdicao.id}`, dadosParaEnvio);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/produtos`, dadosParaEnvio);
        toast.success('Produto criado com sucesso!');
      }
      navigate('/produtos');
    } catch (err) {
      console.error("Erro ao salvar:", err);
      const errorDetails = err?.response?.data?.detail;
      if (Array.isArray(errorDetails)) {
        const formattedError = errorDetails.map(d => `Campo '${d.loc[1]}': ${d.msg}`).join('\n');
        setErro(formattedError);
        toast.error("Por favor, corrija os erros indicados.");
      } else {
        setErro('Ocorreu um erro desconhecido ao salvar.');
        toast.error("Erro ao salvar o produto.");
      }
    }
  };

  const renderCampos = () => {
    switch (abaAtual) {
      case "produto":
        return (
          <>
            <CampoTextsimples label="Código (SKU)" name="sku" value={form.sku || ""} onChange={handleChange} obrigatorio placeholder="300" />
            <CampoCodigoBarras label="Código de Barras (EAN-13)" name="codigo_barras" value={form.codigo_barras || ""} onChange={handleChange} obrigatorio />
            <CampoTextarea label="Descrição" name="descricao" value={form.descricao || ""} onChange={handleChange} colSpan obrigatorio placeholder="PAINEL RIPADO VERSATIL" />
            <CampoDropdownEditavel label="Unidade" name="unidade" value={form.unidade || ""} onChange={handleChange} tipo="unidade" usuario={usuario} />
            <CampoDropdownEditavel label="Situação" name="situacao" value={form.situacao || "Ativo"} onChange={handleChange} tipo="situacao" usuario={usuario} obrigatorio />
            <CampoNumSetas label="Peso Produto (g)" name="peso_produto" value={form.peso_produto || ""} onChange={handleChange} placeholder="3000" />
            <CampoDropdownEditavel label="Tipo do Produto" name="tipo_produto" value={form.tipo_produto || ""} onChange={handleChange} tipo="tipo_produto" usuario={usuario} />
            <CampoDropdownEditavel label="Grupo" name="grupo" value={form.grupo || ""} onChange={handleChange} tipo="grupo" usuario={usuario} />
            <CampoDropdownEditavel label={form.subgrupo1 ? "Subgrupo 1" : "Subgrupo"} name="subgrupo1" value={form.subgrupo1 || ""} onChange={handleChange} tipo="subgrupo1" usuario={usuario} />
            {form.subgrupo1 && (<CampoDropdownEditavel label="Subgrupo 2" name="subgrupo2" value={form.subgrupo2 || ""} onChange={handleChange} tipo="subgrupo2" usuario={usuario} />)}
            {form.subgrupo2 && (<CampoDropdownEditavel label="Subgrupo 3" name="subgrupo3" value={form.subgrupo3 || ""} onChange={handleChange} tipo="subgrupo3" usuario={usuario} />)}
            {form.subgrupo3 && (<CampoDropdownEditavel label="Subgrupo 4" name="subgrupo4" value={form.subgrupo4 || ""} onChange={handleChange} tipo="subgrupo4" usuario={usuario} />)}
            {form.subgrupo4 && (<CampoDropdownEditavel label="Subgrupo 5" name="subgrupo5" value={form.subgrupo5 || ""} onChange={handleChange} tipo="subgrupo5" usuario={usuario} />)}
            <CampoURLs label="Url Imagem" name="url_imagem" value={form.url_imagem || []} onChange={handleChange} colSpan />
          </>
        );

      case "fiscal":
        return (
          <>
            <CampoNumSimples label="Classificação Fiscal (NCM)" name="classificacao_fiscal" value={form.classificacao_fiscal || ""} onChange={handleChange} min={8} max={8} placeholder="0000.00.00"
              formatos={[{ tam: 8, regex: /(\d{4})(\d{2})(\d{2})/, mascara: '$1.$2.$3' }]}
            />
            <CampoDropdownEditavel label="Origem" name="origem" value={form.origem || ""} onChange={handleChange} tipo="origem" usuario={usuario} />
            <CampoCodigoBarras label="GTIN/EAN" name="gtin" value={form.gtin || ""} onChange={handleChange} />
            <CampoCodigoBarras label="GTIN/EAN Tributável" name="gtin_tributavel" value={form.gtin_tributavel || ""} onChange={handleChange} />
          </>
        );
      case "preco":
        return (
          <>
            <CampoPrecosDinamico
              label="Tabela de Preços"
              name="tabela_precos"
              value={form.tabela_precos || {}}
              onChange={handleChange}
              API_URL={API_URL}
            />
          </>
        );
      case "estoque":
        return (
          <>
            <CampoDropdownSimNao
              label="Permite Estoque Negativo?"
              name="permite_estoque_negativo"
              value={form.permite_estoque_negativo}
              onChange={handleChange}
              colSpan
            />
          </>
        );
      case "embalagem":
        return (
          <>

            <CampoDropdownDb
              label="Lógica de Embalagem (Para cálculo de volumes)"
              name="id_logica_embalagem"
              value={form.id_logica_embalagem}
              onChange={handleChange}
              url={`${API_URL}/embalagem`}
              campoValor="id"
              campoLabel="nome"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <CampoNumSetas label="Unidades por Embalagem" name="unidade_caixa" value={form.unidade_caixa || ""} onChange={handleChange} />
              <CampoNumSetas label="Peso da Embalagem (g)" name="peso_embalagem" value={form.peso_embalagem || ""} onChange={handleChange} placeholder="Ex: 3150" />
            </div>

            <CampoMedidas
              label="Dimensões da Embalagem (cm)"
              nomeLargura="largura_embalagem"
              nomeAltura="altura_embalagem"
              nomeComprimento="comprimento_embalagem"
              largura={form.largura_embalagem || ""}
              altura={form.altura_embalagem || ""}
              comprimento={form.comprimento_embalagem || ""}
              onChange={handleChange}
              placeholderLargura="Largura"
              placeholderAltura="Altura"
              placeholderComprimento="Comp."
            />
          </>
        );
      case "custo":
        return (
          <>
            <CampoValorMonetario label="Custo Produto" name="custo_produto" value={form.custo_produto} onChange={handleChange} />
            <CampoDropdownDb
              label="Fornecedor"
              name="id_fornecedor"
              value={form.id_fornecedor}
              onChange={handleChange}
              url={`${API_URL}/cadastros_dropdown`}
              filtro={{ tipo_cadastro: ["Fornecedor"] }}
              campoValor="id"
              campoLabel="nome_razao"
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pb-28">
      <h1 className="text-3xl font-bold mb-6">
        {produtoEdicao ? `Editar Produto: ${form.descricao || ''}` : 'Novo Produto'}
      </h1>

      <div className="flex gap-1 border-b mb-6 overflow-x-auto whitespace-nowrap">
        {abas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtual(aba.id)}
            className={`px-4 py-2 font-medium rounded-t-md transition-all duration-200 ${abaAtual === aba.id ? "bg-teal-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      <form id="form-principal" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {renderCampos()}
      </form>

      <div className="col-span-2 flex justify-end gap-4 mt-8 mb-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium"
        >
          Voltar
        </button>
        <ButtonComPermissao
          permissoes={["admin", "editor"]}
          type="submit"
          form="form-principal"
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold"
        >
          {modo === 'editar' ? 'Salvar Alterações' : 'Criar Produto'}
        </ButtonComPermissao>
      </div>
      <ModalErro mensagem={erro} onClose={() => setErro("")} />
    </div>
  );
}