import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import CampoDropdownEditavelMulti from '@/components/campos/CampoDropdownEditavelMulti';
import ModalErro from '@/components/modals/ModalErro';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import CampoTextsimples from '../components/campos/CampoTextsimples';
import CampoTextlong from '../components/campos/CampoTextlong';
import CampoTextarea from '../components/campos/CampoTextarea';
import CampoNumSimples from '../components/campos/CampoNumSimples';
import CampoNumSetas from "@/components/campos/CampoNumSetas";
import CampoCodigoBarras from '../components/campos/CampoCodigoBarras';
import CampoURLs from '../components/campos/CampoURLs';
import CampoPorcentagem from '../components/campos/CampoPorcentagem';
import CampoPrecosDinamico from "../components/campos/CampoPrecosDinamico";
import CampoMedidas from "../components/campos/CampoMedidas";
import CampoValorMonetario from "../components/campos/CampoValorMonetario";
import CampoDropdownDb from "../components/campos/CampoDropdownDb";

// Define a URL da API a partir das variáveis de ambiente do Vite
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
  const { usuario } = useAuth()
  const location = useLocation();
  const produtoEdicao = location.state?.produto || null;

  const [form, setForm] = useState({
    codigo_barras: '',
    descricao: '',
    sku: '',
    unidade: '',
    situacao: 'Ativo',
    tipo_produto: '',
    grupo: '',
    subgrupo1: '',
    subgrupo2: '',
    subgrupo3: '',
    subgrupo4: '',
    subgrupo5: '',
    estoque: '',
    localizacao: '',
    peso_produto: '',
    peso_embalagem: '',
    unidade_caixa: '',
    largura_embalagem: '',
    altura_embalagem: '',
    comprimento_embalagem: '',
    diametro_embalagem: '',
    largura_produto: '',
    altura_produto: '',
    comprimento_produto: '',
    diametro_produto: '',
    material_produto: '',
    marca: '',
    garantia: '',
    slug: '',
    descricao_plataforma: '',
    classificacao_fiscal: '',
    origem: '',
    valor_ipi: '',
    gtin: '',
    gtin_tributavel: '',
    tabela_precos: {}, // Alterado para objeto vazio por padrão para CampoPrecosDinamico
    custo_produto: '',
    dias_preparacao: '',
    id_fornecedor: '',
    url_imagem: [], // Alterado para array vazio por padrão
    imagens_plataforma: [],
    imagens_variacoes: [],
    variacoes: [],
    quantidades: [1]
  });

  useEffect(() => {
    if (produtoEdicao) {
      console.log("Dados vindos do backend (produtoEdicao):", produtoEdicao);
      setForm((prev) => ({
        ...prev,
        ...produtoEdicao,
        codigo_barras: produtoEdicao.codigo_barras || "",
        // Garantindo que todos os campos que deveriam ser arrays/objetos sejam parseados corretamente
        imagens_plataforma: safeParse(produtoEdicao.imagens_plataforma, []),
        imagens_variacoes: safeParse(produtoEdicao.imagens_variacoes, []),
        variacoes: safeParse(produtoEdicao.variacoes, []),
        quantidades: safeParse(produtoEdicao.quantidades, [1]), // Padrão [1]
        tabela_precos: safeParse(produtoEdicao.tabela_precos, {}), // Padrão {}
        material_produto: safeParse(produtoEdicao.material_produto, []),
        url_imagem: safeParse(produtoEdicao.url_imagem, []) // Padrão []
      }));
    } else {
      // Resetar formulário para o modo "novo"
      setForm({
        codigo_barras: '',
        descricao: '',
        sku: '',
        unidade: '',
        situacao: 'Ativo',
        tipo_produto: '',
        grupo: '',
        subgrupo1: '',
        subgrupo2: '',
        subgrupo3: '',
        subgrupo4: '',
        subgrupo5: '',
        estoque: '',
        localizacao: '',
        peso_produto: '',
        peso_embalagem: '',
        unidade_caixa: '',
        largura_embalagem: '',
        altura_embalagem: '',
        comprimento_embalagem: '',
        diametro_embalagem: '',
        largura_produto: '',
        altura_produto: '',
        comprimento_produto: '',
        diametro_produto: '',
        material_produto: [],
        marca: '',
        garantia: '',
        slug: '',
        descricao_plataforma: '',
        classificacao_fiscal: '',
        origem: '',
        valor_ipi: '',
        gtin: '',
        gtin_tributavel: '',
        tabela_precos: {},
        custo_produto: '',
        dias_preparacao: '',
        id_fornecedor: '',
        url_imagem: [],
        imagens_plataforma: [],
        imagens_variacoes: [],
        variacoes: [],
        quantidades: [1]
      });
    }
  }, [produtoEdicao, modo]);


  const abas = [
    { id: "produto", label: "Produto" },
    { id: "fiscal", label: "Fiscal" },
    { id: "preco", label: "Preço" },
    { id: "estoque", label: "Estoque" },
    { id: "embalagem", label: "Embalagem" },
    { id: "custo", label: "Custo" },
    { id: "plataforma", label: "Plataforma" }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log("🔁 Atualizando form:", name, value);
    setForm((prev) => ({ ...prev, [name]: value }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    // Serializa os campos JSON antes de enviar
    const dados = {
      ...form,
      variacoes: JSON.stringify(form.variacoes || []),
      quantidades: JSON.stringify(form.quantidades || []),
      url_imagem: JSON.stringify(form.url_imagem || []),
      tabela_precos: JSON.stringify(form.tabela_precos || {}), // Pode ser um objeto
      imagens_plataforma: JSON.stringify(form.imagens_plataforma || []),
      imagens_variacoes: JSON.stringify(form.imagens_variacoes || []),
      material_produto: JSON.stringify(form.material_produto || [])
    };

    try {
      if (produtoEdicao) {
        await axios.put(`${API_URL}/produtos/${produtoEdicao.id}`, dados);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/produtos`, dados);
        toast.success('Produto criado com sucesso!');
      }
      navigate('/produtos');
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setErro(err?.response?.data?.detail || 'Erro ao salvar');
    }
  };


  const renderCampos = () => {
    switch (abaAtual) {
      case "produto":
        return (
          <>
            <CampoNumSetas label="Código (SKU)" name="sku" value={form.sku || ""} onChange={handleChange} obrigatorio placeholder="300" />
            <CampoCodigoBarras label="Código de Barras (EAN-13)" name="codigo_barras" value={form.codigo_barras || ""} onChange={handleChange} obrigatorio />
            <CampoTextarea label="Descrição" name="descricao" value={form.descricao || ""} onChange={handleChange} colSpan obrigatorio placeholder="PAINEL RIPADO VERSATIL" />
            <CampoDropdownEditavel label="Unidade" name="unidade" value={form.unidade || ""} onChange={handleChange} tipo="unidade" usuario={usuario} />
            <CampoDropdownEditavel label="Situação" name="situacao" value={form.situacao || "Ativo"} onChange={handleChange} tipo="situacao" usuario={usuario} obrigatorio />
            <CampoNumSetas label="Peso Produto (g)" name="peso_produto" value={form.peso_produto || ""} onChange={handleChange} placeholder="3000" />
            <CampoDropdownEditavel label="Tipo do Produto" name="tipo_produto" value={form.tipo_produto || ""} onChange={handleChange} tipo="tipo_produto" usuario={usuario} />
            <CampoDropdownEditavelMulti label="Variações" name="variacoes" value={form.variacoes || []} onChange={handleChange} tipo="variacoes" usuario={usuario} />
            <CampoDropdownEditavelMulti label="Quantidades" name="quantidades" value={form.quantidades || [1]} onChange={handleChange} tipo="quantidades" usuario={usuario} obrigatorio />
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
            <CampoNumSimples label="Classificação Fiscal" name="classificacao_fiscal" value={form.classificacao_fiscal || ""} onChange={handleChange} min={8} max={8} placeholder="0000.00.00"
              formatos={[{ tam: 8, regex: /(\d{4})(\d{2})(\d{2})/, mascara: '$1.$2.$3' }]}
            />
            <CampoDropdownEditavel label="Origem" name="origem" value={form.origem || ""} onChange={handleChange} tipo="origem" usuario={usuario} />
            <CampoPorcentagem label="Valor IPI Fixo" name="valor_ipi" value={form.valor_ipi || 0} onChange={handleChange} />
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
              API_URL={API_URL} // Passa API_URL para CampoPrecosDinamico
            />
          </>
        );
      case "estoque":
        return (
          <>
            <CampoNumSetas label="Estoque" name="estoque" value={form.estoque || ""} onChange={handleChange} placeholder="Ex: 123" />
            <CampoDropdownEditavel label="Localização" name="localizacao" value={form.localizacao || ""} onChange={handleChange} tipo="localizacao" usuario={usuario} />
          </>
        );
      case "embalagem":
        return (
          <>
            <CampoDropdownEditavel label="Tipo de Embalagem" name="tipo_embalagem" value={form.tipo_embalagem || ""} onChange={handleChange} tipo="tipo_embalagem" usuario={usuario} colSpan />
            <CampoNumSetas label="Peso Embalagem (g)" name="peso_embalagem" value={form.peso_embalagem || ""} onChange={handleChange} />
            <CampoNumSetas label="Unidades por Caixa" name="unidade_caixa" value={form.unidade_caixa || ""} onChange={handleChange} />
            <CampoMedidas
              label="Medidas Embalagem"
              nomeLargura="largura_embalagem"
              nomeAltura="altura_embalagem"
              nomeComprimento="comprimento_embalagem"
              nomeDiametro="diametro_embalagem"
              largura={form.largura_embalagem || ""}
              altura={form.altura_embalagem || ""}
              comprimento={form.comprimento_embalagem || ""}
              diametro={form.diametro_embalagem || ""}
              onChange={handleChange}
              placeholderLargura="cm" placeholderAltura="cm" placeholderComprimento="cm" placeholderDiametro="cm"
            />
          </>
        );
      case "custo":
        return (
          <>
            <CampoValorMonetario label="Custo Produto" name="custo_produto" value={form.custo_produto} onChange={handleChange} />
            <CampoNumSetas label="Dias para Preparação" name="dias_preparacao" value={form.dias_preparacao} onChange={handleChange} />
            <CampoDropdownDb
              label="Fornecedor"
              name="id_fornecedor"
              value={form.id_fornecedor}
              onChange={handleChange}
              url={`${API_URL}/cadastros_dropdown`} // USO DA VARIÁVEL DE AMBIENTE AQUI
              filtro={{ tipo_cadastro: ["Fornecedor"] }} // Ajustado para array
              campoValor="id"
              campoLabel="nome_razao"
              colSpan
            />
          </>
        );
      case "plataforma":
        return (
          <>
            <CampoTextsimples label="Marca" name="marca" value={form.marca || ""} onChange={handleChange} placeholder="Ex: Samsung" />
            <CampoNumSetas label="Garantia" name="garantia" value={form.garantia || ""} onChange={handleChange} placeholder="Meses" />
            <CampoTextsimples label="Slug" name="slug" value={form.slug || ""} onChange={handleChange} placeholder="exemplo-de-slug" />
            <CampoTextlong label="Descrição Plataforma" name="descricao_plataforma" value={form.descricao_plataforma || ""} onChange={handleChange} placeholder="Descreva os detalhes da plataforma" colSpan />
            <CampoURLs label="Imagens Plataforma" name="imagens_plataforma" value={form.imagens_plataforma || []} onChange={handleChange} placeholder="URLs separadas por vírgula" colSpan />
            <CampoURLs label="Imagens Variações" name="imagens_variacoes" value={form.imagens_variacoes || []} onChange={handleChange} placeholder="URLs das variações" colSpan />
            <CampoMedidas label="Medidas Produto" nomeLargura="largura_produto" nomeAltura="altura_produto" nomeComprimento="comprimento_produto" nomeDiametro="diametro_produto" largura={form.largura_produto || ""} altura={form.altura_produto || ""} comprimento={form.comprimento_produto || ""} diametro={form.diametro_produto || ""} onChange={handleChange} placeholderLargura="cm" placeholderAltura="cm" placeholderComprimento="cm" placeholderDiametro="cm" />
            <CampoDropdownEditavelMulti label="Material Produto" name="material_produto" value={form.material_produto || []} onChange={handleChange} tipo="material_produto" usuario={usuario} placeholder="Selecione ou digite materiais" />
            <CampoDropdownEditavel label="Fabricante" name="fabricante" value={form.fabricante || ""} onChange={handleChange} tipo="fabricante" usuario={usuario} placeholder="Selecione ou digite o fabricante" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pb-28">
      <h1 className="text-3xl font-bold mb-6">
        {produtoEdicao ? 'Editar Produto' : 'Novo Produto'}
      </h1>

      <div className="flex gap-2 border-b mb-6 overflow-x-auto">
        {abas.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtual(aba.id)}
            className={`px-4 py-2 font-medium rounded-t transition-all duration-200 ${abaAtual === aba.id ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      <form id="form-principal" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderCampos()}
      </form>

      <div className="col-span-2 flex justify-end gap-4 mt-6 mb-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium"
        >
          Voltar
        </button>
        <ButtonComPermissao
          permissoes={["admin"]}
          type="submit"
          form="form-principal"
          className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold"
        >
          Salvar
        </ButtonComPermissao>

      </div>

      <ModalErro mensagem={erro} onClose={() => setErro("")} />
    </div>
  );
}