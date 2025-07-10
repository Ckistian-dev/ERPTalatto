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

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CadastroOrcamento({ modo = "novo" }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { usuario } = useAuth();

    const [erro, setErro] = useState("");
    const [abaAtual, setAbaAtual] = useState("dados_iniciais");
    const [precosDisponiveis, setPrecosDisponiveis] = useState([]);
    const [itens, setItens] = useState([]);
    const [form, setForm] = useState({
        situacao_orcamento: "Orçamento",
        lista_itens: [],
        formas_pagamento: [],
        valor_frete: 0,
        desconto_total: 0,
        total_com_desconto: 0,
        total: 0,
    });

    // Efeito para carregar os dados iniciais do orçamento em modo de edição
    useEffect(() => {
        if (modo === "editar" && location.state?.orcamento) {
            const orcamento = location.state.orcamento;
            const parsedItens = JSON.parse(orcamento.lista_itens || "[]");

            // Calcula o total dos produtos imediatamente ao carregar os itens.
            const totalItensCalculado = parsedItens.reduce(
                (acc, item) => acc + (Number(item.total_com_desconto) || 0), 0
            );

            setItens(parsedItens);

            // Define o formulário com TUDO de uma só vez, incluindo o total calculado.
            setForm({
                ...orcamento,
                total: totalItensCalculado,
                cliente: Number(orcamento.cliente_id) || '',
                vendedor: Number(orcamento.vendedor_id) || '',
                transportadora: Number(orcamento.transportadora_id) || '',
                lista_itens: parsedItens,
                formas_pagamento: JSON.parse(orcamento.formas_pagamento || "[]")
            });
        }
    }, [modo, location]);

    // Efeito para buscar os preços dos itens já existentes no orçamento (modo edição)
    useEffect(() => {
        if (itens.length === 0) return;

        const fetchPrecosParaItensExistentes = async () => {
            const produtoIds = [...new Set(itens.map(item => item.produto_id).filter(id => id))];
            if (produtoIds.length === 0) return;

            try {
                const promessasDePrecos = produtoIds.map(id =>
                    axios.get(`${API_URL}/tabela_precos_por_produto?produto_id=${id}`)
                );
                const respostas = await Promise.all(promessasDePrecos);
                const todosOsPrecos = respostas.flatMap(res => res.data || []);
                setPrecosDisponiveis(prev => {
                    const precosAtuais = new Map(prev.map(p => [`${p.produto_id}-${p.id}`, p]));
                    todosOsPrecos.forEach(p => precosAtuais.set(`${p.produto_id}-${p.id}`, p));
                    return Array.from(precosAtuais.values());
                });
            } catch (error) {
                toast.error("Não foi possível carregar os preços dos itens do orçamento.");
            }
        };

        fetchPrecosParaItensExistentes();
    }, [itens]);
    
    // Este efeito atualiza o total bruto sempre que o usuário altera a lista de itens.
    useEffect(() => {
        const totalItens = itens.reduce((acc, item) => acc + (Number(item.total_com_desconto) || 0), 0);
        setForm(prevForm => {
            if (Number(prevForm.total) !== totalItens) {
                return { ...prevForm, total: totalItens };
            }
            return prevForm;
        });
    }, [itens]);

    const handleChange = (e) => {
        const { name, value, label } = e.target;
        setForm((prev) => {
            const novoForm = { ...prev, [name]: value };
            if (label !== undefined) {
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
        if (!form.cliente) erros.push("Cliente é obrigatório.");
        if (!form.vendedor) erros.push("Vendedor é obrigatório.");
        if (!form.origem_venda) erros.push("Origem da venda é obrigatória.");
        if (!form.tipo_frete) erros.push("Tipo de frete é obrigatório.");
        if (form.tipo_frete !== 'Sem Frete' && !form.transportadora) erros.push("Transportadora é obrigatória.");
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

        const payload = { ...form, lista_itens: itens };
        
        try {
            if (modo === "editar" && form.id) {
                await axios.put(`${API_URL}/orcamentos/${form.id}`, payload);
                toast.success("Orçamento atualizado com sucesso!");
            } else {
                await axios.post(`${API_URL}/orcamentos`, payload);
                toast.success("Orçamento criado com sucesso!");
            }
            navigate("/orcamentos");
        } catch (err) {
            const errorMsg = err?.response?.data?.detail || "Erro ao salvar o orçamento.";
            setErro(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
            toast.error("Falha ao salvar. Verifique os erros.");
        }
    };

    const abas = [
        { id: "dados_iniciais", label: "Dados Iniciais" },
        { id: "itens", label: "Itens" },
        { id: "dados_frete", label: "Dados do Frete" },
        { id: "condicoes_pagamento", label: "Condições de Pagamento" },
        { id: "dados_adicionais", label: "Dados Adicionais" },
    ];

    const renderCampos = () => {
        switch (abaAtual) {
            case "dados_iniciais":
                return (
                    <>
                        <CampoDropdownEditavel label="Situação do Orçamento" name="situacao_orcamento" value={form.situacao_orcamento || "Orçamento"} onChange={handleChange} tipo="situacao_orcamento" usuario={usuario} />
                        <CampoData label="Data de Emissão" name="data_emissao" value={form.data_emissao || ""} onChange={handleChange} hoje />
                        <CampoData label="Data de Validade" name="data_validade" value={form.data_validade || ""} onChange={handleChange} hojeMaisDias={7} />
                        <CampoDropdownDb label="Cliente" name="cliente" value={form.cliente || ""} onChange={handleChange} url={`${API_URL}/cadastros_dropdown`} filtro={{ tipo_cadastro: ["Cliente"] }} campoValor="id" campoLabel="nome_razao" obrigatorio />
                        <CampoDropdownDb label="Vendedor" name="vendedor" value={form.vendedor || ""} onChange={handleChange} url={`${API_URL}/cadastros_dropdown`} filtro={{ tipo_cadastro: ["Vendedor"] }} campoValor="id" campoLabel="nome_razao" obrigatorio />
                        <CampoDropdownEditavel label="Origem da Venda" name="origem_venda" value={form.origem_venda || ""} onChange={handleChange} tipo="origem_venda" usuario={usuario} obrigatorio />
                    </>
                );
            case "itens":
                return <CampoItens form={form} setForm={setForm} itens={itens} setItens={setItens} precosDisponiveis={precosDisponiveis} API_URL={API_URL} />;
            case "dados_frete":
                return (
                    <>
                        <CampoDropdownEditavel label="Tipo de Frete" name="tipo_frete" value={form.tipo_frete || ""} onChange={handleChange} tipo="tipo_frete" usuario={usuario} obrigatorio />
                        <CampoDropdownDb label="Transportadora" name="transportadora" value={form.transportadora || ""} onChange={handleChange} url={`${API_URL}/cadastros_dropdown`} filtro={{ tipo_cadastro: ["Transportadora"] }} campoValor="id" campoLabel="nome_razao" disabled={form.tipo_frete === 'Sem Frete'} obrigatorio={form.tipo_frete !== 'Sem Frete'} />
                        <CampoValorMonetario label="Valor do Frete" name="valor_frete" value={form.valor_frete || 0} onChange={handleChange} placeholder="0,00" />
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
                {modo === "editar" ? `Editar Orçamento: #${form.id || ''}` : "Novo Orçamento"}
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

            <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={() => navigate(-1)} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium">
                    Voltar
                </button>
                <ButtonComPermissao permissoes={["admin", "editor"]} type="submit" form="form-orcamento" className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold">
                    {modo === 'editar' ? 'Salvar Alterações' : 'Criar Orçamento'}
                </ButtonComPermissao>
            </div>
            <ModalErro mensagem={erro} onClose={() => setErro("")} />
        </div>
    );
}