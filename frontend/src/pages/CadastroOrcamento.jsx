import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

import CampoDropdownEditavel from "@/components/campos/CampoDropdownEditavel";
import CampoDropdownDb from "@/components/campos/CampoDropdownDb";
import CampoValorMonetario from "@/components/campos/CampoValorMonetario";
import CampoData from "@/components/campos/CampoData";
import CampoItens from "@/components/campos/CampoItens";
import ModalErro from "@/components/modals/ModalErro";
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import CampoPagamento from "@/components/campos/CampoPagamento";
import CampoTextlong from "@/components/campos/CampoTextlong";

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CadastroOrcamento({ modo = "novo" }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { usuario } = useAuth();

    const [erro, setErro] = useState("");
    const [abaAtual, setAbaAtual] = useState("dados_iniciais");
    const [variacoesDisponiveis, setVariacoesDisponiveis] = useState([]);
    const [quantidadesDisponiveis, setQuantidadesDisponiveis] = useState([]);
    const [precosDisponiveis, setPrecosDisponiveis] = useState([]);
    const [itens, setItens] = useState([]);
    const [form, setForm] = useState({});

    useEffect(() => {
        if (modo === "editar" && location.state?.orcamento) {
            const orcamento = location.state.orcamento;

            setForm({
                ...orcamento,
                // Garantir que IDs sejam numéricos se vierem como string
                cliente: Number(orcamento.cliente_id) || '',
                vendedor: Number(orcamento.vendedor_id) || '',
                transportadora: Number(orcamento.transportadora_id) || '',
                lista_itens: JSON.parse(orcamento.lista_itens || "[]"),
                formas_pagamento: JSON.parse(orcamento.formas_pagamento || "[]")
            });

            setItens(JSON.parse(orcamento.lista_itens || "[]"));
        } else if (modo === "novo") {
            // Inicializar form para modo "novo" se necessário, para evitar undefineds iniciais
            setForm({
                data_emissao: '',
                data_validade: '',
                cliente: '',
                cliente_nome: '',
                vendedor: '',
                vendedor_nome: '',
                origem_venda: '',
                tipo_frete: '',
                transportadora: '',
                transportadora_nome: '',
                valor_frete: 0.00,
                total: 0.00,
                desconto_total: 0.00,
                total_com_desconto: 0.00,
                lista_itens: [],
                formas_pagamento: [],
                observacao: '',
                situacao_orcamento: "Orçamento",
            });
        }
    }, [modo, location]);


    const abas = [
        { id: "dados_iniciais", label: "Dados Iniciais" },
        { id: "itens", label: "Itens" },
        { id: "dados_frete", label: "Dados do Frete" },
        { id: "condicoes_pagamento", label: "Condições de Pagamento" },
        { id: "dados_adicionais", label: "Dados Adicionais" },
    ];

    const handleChange = (e) => {
        const { name, value, label, formatado } = e.target;
        setForm((prev) => {
            const novoForm = { ...prev, [name]: formatado !== undefined ? value : value };
            if (label !== undefined) {
                if (name === "produto_selecionado") novoForm.produto_selecionado_nome = label;
                if (name === "variacao_selecionada") novoForm.variacao_selecionada_nome = label;
                if (name === "tabela_preco_selecionada") novoForm.tabela_preco_selecionada_nome = label;
                if (name === "cliente") novoForm.cliente_nome = label;
                if (name === "vendedor") novoForm.vendedor_nome = label;
                if (name === "transportadora") novoForm.transportadora_nome = label;
            }
            return novoForm;
        });
    };

    const validarFormulario = () => {
        const erros = [];
        if (!form.data_emissao) erros.push("Data de emissão é obrigatória.");
        if (!form.data_validade) erros.push("Data de validade é obrigatória.");
        // A validação de cliente, vendedor e transportadora deve ser feita pelos IDs, não apenas pelo nome.
        // Se o CampoDropdownDb retorna 0 para "Não selecionado", verifique isso.
        if (!form.cliente || form.cliente === 0) erros.push("Cliente é obrigatório.");
        if (!form.cliente_nome) erros.push("Nome do cliente é obrigatório.");
        if (!form.vendedor || form.vendedor === 0) erros.push("Vendedor é obrigatório.");
        if (!form.vendedor_nome) erros.push("Nome do vendedor é obrigatório.");
        if (!form.origem_venda) erros.push("Origem da venda é obrigatória.");
        if (!form.tipo_frete) erros.push("Tipo de frete é obrigatório.");
        if (!form.transportadora || form.transportadora === 0) erros.push("Transportadora é obrigatória.");
        if (!itens || itens.length === 0) erros.push("Adicione pelo menos um item ao orçamento.");
        if (!form.formas_pagamento || form.formas_pagamento.length === 0) erros.push("Informe as condições de pagamento.");
        return erros;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const erros = validarFormulario();
        if (erros.length > 0) {
            setErro(erros.join("\n"));  
            return;
        }

        // Calcular total e total_com_desconto com base nos itens e frete
        const totalItens = itens.reduce((acc, item) => acc + (Number(item.total_com_desconto) || 0), 0);
        const valorFrete = Number(form.valor_frete || 0);
        const descontoTotal = Number(form.desconto_total || 0);
        
        const totalGeral = totalItens + valorFrete;
        const totalComDescontoFinal = totalGeral - descontoTotal;


        const payload = {
            data_emissao: form.data_emissao,
            data_validade: form.data_validade,
            cliente: form.cliente,
            cliente_nome: form.cliente_nome,
            vendedor: form.vendedor,
            vendedor_nome: form.vendedor_nome,
            origem_venda: form.origem_venda,
            tipo_frete: form.tipo_frete,
            transportadora: form.transportadora,
            transportadora_nome: form.transportadora_nome,
            valor_frete: valorFrete,
            total: totalItens, // Total dos itens (antes do frete e desconto global)
            desconto_total: descontoTotal, // Desconto global
            total_com_desconto: totalComDescontoFinal, // Total final após todos os cálculos
            lista_itens: itens,
            formas_pagamento: form.formas_pagamento,
            observacao: form.observacao || "",
            situacao_orcamento: form.situacao_orcamento || "Orçamento",
        };

        try {
            if (modo === "editar" && form.id) {
                // USO DA VARIÁVEL DE AMBIENTE AQUI
                await axios.put(`${API_URL}/orcamentos/${form.id}`, payload);
                toast.success("Orçamento atualizado com sucesso!");
            } else {
                // USO DA VARIÁVEL DE AMBIENTE AQUI
                await axios.post(`${API_URL}/orcamentos`, payload);
                toast.success("Orçamento criado com sucesso!");
            }
            navigate("/orcamentos");
        } catch (err) {
            console.error("Erro ao salvar orçamento:", err);
            setErro(err?.response?.data?.detail || "Erro ao salvar orçamento");
        }
    };

    useEffect(() => {
        if (form.produto_selecionado) {
            // USO DA VARIÁVEL DE AMBIENTE AQUI
            axios.get(`${API_URL}/variacoes_por_produto?produto_id=${form.produto_selecionado}`)
                .then(res => setVariacoesDisponiveis(res.data))
                .catch(() => setVariacoesDisponiveis([]));

            // USO DA VARIÁVEL DE AMBIENTE AQUI
            axios.get(`${API_URL}/quantidades_por_produto?produto_id=${form.produto_selecionado}`)
                .then(res => setQuantidadesDisponiveis(res.data))
                .catch(() => setQuantidadesDisponiveis([]));
        } else {
            setVariacoesDisponiveis([]);
            setQuantidadesDisponiveis([]);
        }
    }, [form.produto_selecionado]);

    useEffect(() => {
        if (form.produto_selecionado) {
            // USO DA VARIÁVEL DE AMBIENTE AQUI
            axios.get(`${API_URL}/tabela_precos_por_produto?produto_id=${form.produto_selecionado}`)
                .then(res => setPrecosDisponiveis(res.data))
                .catch(() => toast.error("Erro ao carregar tabela de preços"));
        } else {
            setPrecosDisponiveis([]);
        }
    }, [form.produto_selecionado]);

    const renderCampos = () => {
        switch (abaAtual) {
            case "dados_iniciais":
                return (
                    <>
                        <CampoDropdownEditavel label="Situação do Orçamento" name="situacao_orcamento" value={form.situacao_orcamento || "Orçamento"} onChange={handleChange} tipo="situacao_orcamento" usuario={usuario} />
                        <CampoData label="Data de Emissão" name="data_emissao" value={form.data_emissao || ""} onChange={handleChange} hoje />
                        <CampoData label="Data de Validade" name="data_validade" value={form.data_validade || ""} onChange={handleChange} hojeMaisDias={7} />
                        <CampoDropdownDb label="Cliente" name="cliente" value={form.cliente || ""} onChange={handleChange} url={`${API_URL}/cadastros_dropdown`} filtro={{ tipo_cadastro: ["Cliente"] }} campoValor="id" campoLabel="nome_razao" obrigatorio /> {/* Adicionado obrigatorio */}
                        <CampoDropdownDb label="Vendedor" name="vendedor" value={form.vendedor || ""} onChange={handleChange} url={`${API_URL}/cadastros_dropdown`} filtro={{ tipo_cadastro: ["Vendedor"] }} campoValor="id" campoLabel="nome_razao" obrigatorio /> {/* Adicionado obrigatorio */}
                        <CampoDropdownEditavel label="Origem da Venda" name="origem_venda" value={form.origem_venda || ""} onChange={handleChange} tipo="origem_venda" usuario={usuario} obrigatorio /> {/* Adicionado obrigatorio */}
                    </>
                );
            case "itens":
                return <CampoItens
                    form={form}
                    setForm={setForm}
                    itens={itens}
                    setItens={setItens}
                    precosDisponiveis={precosDisponiveis}
                    variacoesDisponiveis={variacoesDisponiveis}
                    // CampoItens provavelmente precisa de API_URL para buscar produtos
                    API_URL={API_URL} 
                />;

            case "dados_frete":
                return (
                    <>
                        <CampoDropdownEditavel label="Tipo de Frete" name="tipo_frete" value={form.tipo_frete || ""} onChange={handleChange} tipo="tipo_frete" usuario={usuario} obrigatorio /> {/* Adicionado obrigatorio */}
                        <CampoDropdownDb label="Transportadora" name="transportadora" value={form.transportadora || ""} onChange={handleChange} url={`${API_URL}/cadastros_dropdown`} filtro={{ tipo_cadastro: ["Transportadora"] }} campoValor="id" campoLabel="nome_razao" obrigatorio /> {/* Adicionado obrigatorio */}
                        <CampoValorMonetario label="Valor do Frete" name="valor_frete" value={form.valor_frete || 0.00} onChange={handleChange} placeholder="0,00" />
                    </>
                );
            case "condicoes_pagamento":
                return <CampoPagamento form={form} setForm={setForm} handleChange={handleChange} />;
            case "dados_adicionais":
                return <CampoTextlong label="Observações" name="observacao" value={form.observacao || ""} onChange={handleChange} placeholder="Descreva os detalhes do Orçamento" colSpan />;
            default:
                return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 pb-28">
            <h1 className="text-3xl font-bold mb-6">
                {modo === "editar" ? `Editar Orçamento: ${form.id || ''}` : "Novo Orçamento"} {/* Adicionado ID para edição */}
            </h1>
            <div className="flex gap-2 border-b mb-6 overflow-x-auto">
                {abas.map((aba) => (
                    <button
                        key={aba.id}
                        onClick={() => setAbaAtual(aba.id)}
                        className={`px-4 py-2 font-medium rounded-t transition-all duration-200 ${abaAtual === aba.id ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                        {aba.label}
                    </button>
                ))}
            </div>
            <form id="form-orcamento" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderCampos()}
            </form>
            <div className="col-span-2 flex justify-end gap-4 mt-6 mb-12">
                <button type="button" onClick={() => navigate(-1)} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium">
                    Voltar
                </button>
                <ButtonComPermissao permissoes={["admin"]} type="submit" form="form-orcamento" className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold">
                    Salvar
                </ButtonComPermissao>
            </div>
            <ModalErro mensagem={erro} onClose={() => setErro("")} />
        </div>
    );
}