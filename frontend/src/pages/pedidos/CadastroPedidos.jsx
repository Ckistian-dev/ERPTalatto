import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";
import { FaCalculator } from 'react-icons/fa';
import axios from "axios";

import CampoDropdownEditavel from "@/components/campos/CampoDropdownEditavel";
import CampoDropdownDb from "@/components/campos/CampoDropdownDb";
import CampoValorMonetario from "@/components/campos/CampoValorMonetario";
import CampoData from "@/components/campos/CampoData";
import CampoItens from "@/components/campos/CampoItens";
import CampoNumSetas from "@/components/campos/CampoNumSetas";
import ModalErro from "@/components/modals/ModalErro";
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import CampoPagamento from "@/components/campos/CampoPagamento";
import CampoTextlong from "@/components/campos/CampoTextlong";
import CampoImportarOrcamento from "@/components/campos/CampoImportarOrcamento";
import ModalCotacaoIntelipost from "@/components/modals/ModalCotacaoIntelipost";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CadastroPedido({ modo = "novo" }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { usuario } = useAuth();

    const [erro, setErro] = useState("");
    const [abaAtual, setAbaAtual] = useState("dados_iniciais");
    const [precosDisponiveis, setPrecosDisponiveis] = useState([]);
    const [itens, setItens] = useState([]);
    const [modalCotacaoAberto, setModalCotacaoAberto] = useState(false);

    // ATUALIZADO: Adicionado prazo_entrega_dias
    const [form, setForm] = useState({
        data_emissao: '',
        data_validade: '',
        cliente: '',
        cliente_nome: '',
        vendedor: '',
        vendedor_nome: '',
        origem_venda: '',
        tipo_frete: 'Contratação do Frete por conta do Remente (CIF)',
        transportadora: '',
        transportadora_nome: '',
        valor_frete: 0,
        prazo_entrega_dias: null, // <-- NOVO CAMPO
        total: 0,
        desconto_total: 0,
        total_com_desconto: 0,
        lista_itens: [],
        formas_pagamento: [],
        observacao: '',
        situacao_pedido: "Aguardando Aprovação",
        importar_orcamento: '',
        produto_selecionado: null,
        quantidade_itens: 1,
        tabela_preco_selecionada: null,
    });

    useEffect(() => {
        if (modo === "editar" && location.state?.pedido) {
            const pedido = location.state.pedido;
            const parsedItens = typeof pedido.lista_itens === 'string' ? JSON.parse(pedido.lista_itens || "[]") : pedido.lista_itens || [];
            const parsedPagamentos = typeof pedido.formas_pagamento === 'string' ? JSON.parse(pedido.formas_pagamento || "[]") : pedido.formas_pagamento || [];

            setItens(parsedItens);
            setForm({
                ...pedido,
                cliente: Number(pedido.cliente_id) || '',
                vendedor: Number(pedido.vendedor_id) || '',
                transportadora: Number(pedido.transportadora_id) || '',
                lista_itens: parsedItens,
                formas_pagamento: parsedPagamentos,
            });
        }
    }, [modo, location]);

    useEffect(() => {
        const fetchAllPrices = async () => {
            const productIdsToFetch = new Set();
            itens.forEach(item => {
                if (item.produto_id) productIdsToFetch.add(item.produto_id);
            });
            if (form.produto_selecionado) {
                productIdsToFetch.add(form.produto_selecionado);
            }

            if (productIdsToFetch.size === 0) {
                setPrecosDisponiveis([]);
                return;
            }

            try {
                const pricePromises = Array.from(productIdsToFetch).map(id =>
                    axios.get(`${API_URL}/tabela_precos_por_produto?produto_id=${id}`)
                );
                const responses = await Promise.all(pricePromises);
                const allPriceConfigs = responses.flatMap(res => res.data || []);
                setPrecosDisponiveis(allPriceConfigs);
            } catch (error) {
                console.error("Erro ao buscar preços dos produtos:", error);
                toast.error("Não foi possível carregar as configurações de preço.");
            }
        };
        fetchAllPrices();
    }, [itens, form.produto_selecionado]);

    useEffect(() => {
        const totalProdutos = Number(form.total) || 0;
        const valorFrete = Number(form.valor_frete) || 0;
        const descontoTotal = Number(form.desconto_total) || 0;
        const novoTotalComDesconto = totalProdutos + valorFrete - descontoTotal;

        if (form.total_com_desconto.toFixed(2) !== novoTotalComDesconto.toFixed(2)) {
            setForm(prev => ({
                ...prev,
                total_com_desconto: novoTotalComDesconto
            }));
        }
    }, [form.total, form.valor_frete, form.desconto_total]);

    const handleChange = (e) => {
        const { name, value, label } = e.target;
        setForm((prev) => {
            const novoForm = { ...prev };
            novoForm[name] = value;

            if (name === 'cliente' && label) novoForm.cliente_nome = label;
            else if (name === 'vendedor' && label) novoForm.vendedor_nome = label;
            else if (name === 'transportadora' && label) novoForm.transportadora_nome = label;

            return novoForm;
        });
    };

    const validarFormulario = () => {
        const erros = [];
        if (!form.cliente) erros.push("Cliente é obrigatório.");
        if (!form.vendedor) erros.push("Vendedor é obrigatório.");
        if (form.tipo_frete && form.tipo_frete !== 'Sem Frete' && !form.transportadora) erros.push("Transportadora é obrigatória.");
        if (!itens || itens.length === 0) erros.push("Adicione pelo menos um item ao pedido.");
        return erros;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const erros = validarFormulario();
        if (erros.length > 0) {
            setErro(erros.join("\n"));
            return;
        }

        const payload = {
            ...form,
            lista_itens: itens,
            formas_pagamento: form.formas_pagamento || [],
            cliente_id: form.cliente,
            vendedor_id: form.vendedor,
            transportadora_id: form.transportadora,
        };

        delete payload.cliente;
        delete payload.vendedor;
        delete payload.transportadora;
        delete payload.importar_orcamento;
        delete payload.produto_selecionado;
        delete payload.produto_selecionado_nome;
        delete payload.produto_selecionado_sku;
        delete payload.quantidade_itens;
        delete payload.tabela_preco_selecionada;
        delete payload.tabela_preco_selecionada_nome;

        try {
            if (modo === "editar" && form.id) {
                await axios.put(`${API_URL}/pedidos/${form.id}`, payload);
                toast.success("Pedido atualizado com sucesso!");
            } else {
                await axios.post(`${API_URL}/pedidos`, payload);
                toast.success("Pedido criado com sucesso!");
            }
            navigate("/pedidos");
        } catch (err) {
            const errorMsg = err?.response?.data?.detail || "Erro ao salvar o pedido.";
            setErro(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg, null, 2));
            toast.error("Falha ao salvar. Verifique os erros.");
        }
    };

    const handleFreteSelecionado = (dadosFrete) => {
        setForm(prev => ({
            ...prev,
            transportadora: dadosFrete.transportadora_id || '',
            transportadora_nome: dadosFrete.transportadora_nome || '',
            valor_frete: dadosFrete.valor_frete || 0,
            prazo_entrega_dias: dadosFrete.prazo_entrega_dias || null,
        }));
        toast.info("Dados do frete atualizados no formulário.");
    };

    const abas = [
        { id: "dados_iniciais", label: "Dados Iniciais" },
        { id: "itens", label: "Itens" },
        { id: "dados_frete", label: "Dados do Frete" },
        { id: "condicoes_pagamento", label: "Pagamento" },
        { id: "dados_adicionais", label: "Adicionais" },
    ];

    const renderCampos = () => {
        switch (abaAtual) {
            case "dados_iniciais":
                return (
                    <>
                        <CampoImportarOrcamento
                            label="Importar de um Orçamento"
                            value={form.importar_orcamento || ""}
                            onChange={(e) => {
                                const orc = e.target.orcamento;
                                if (!orc) return;

                                const listaItens = typeof orc.lista_itens === "string" ? JSON.parse(orc.lista_itens || "[]") : orc.lista_itens || [];
                                const formasPagamento = typeof orc.formas_pagamento === "string" ? JSON.parse(orc.formas_pagamento || "[]") : orc.formas_pagamento || [];

                                // ATUALIZADO: Inclui prazo_entrega_dias na importação
                                setForm(prev => ({
                                    ...prev,
                                    importar_orcamento: orc.id,
                                    cliente: orc.cliente_id,
                                    cliente_nome: orc.cliente_nome,
                                    vendedor: orc.vendedor_id,
                                    vendedor_nome: orc.vendedor_nome,
                                    origem_venda: orc.origem_venda,
                                    tipo_frete: orc.tipo_frete,
                                    transportadora: orc.transportadora_id,
                                    transportadora_nome: orc.transportadora_nome,
                                    valor_frete: orc.valor_frete,
                                    prazo_entrega_dias: orc.prazo_entrega_dias, // <-- CAMPO IMPORTADO
                                    observacao: orc.observacao,
                                    formas_pagamento: formasPagamento,
                                    desconto_total: orc.desconto_total,
                                    total_com_desconto: orc.total_com_desconto,
                                }));

                                setItens(listaItens);
                                toast.success(`Orçamento #${orc.id} importado com sucesso!`);
                            }}
                            colSpan
                            API_URL={API_URL}
                        />
                        <CampoData label="Data de Emissão" name="data_emissao" value={form.data_emissao || ""} onChange={handleChange} hoje obrigatorio />
                        <CampoData label="Data de Validade" name="data_validade" value={form.data_validade || ""} onChange={handleChange} hojeMaisDias={7} />
                        <CampoDropdownDb label="Cliente" name="cliente" value={form.cliente || ""} onChange={handleChange} url={`${API_URL}/cadastros_dropdown`} filtro={{ tipo_cadastro: ["Cliente"] }} campoValor="id" campoLabel="nome_razao" obrigatorio />
                        <CampoDropdownDb label="Vendedor" name="vendedor" value={form.vendedor || ""} onChange={handleChange} url={`${API_URL}/cadastros_dropdown`} filtro={{ tipo_cadastro: ["Vendedor"] }} campoValor="id" campoLabel="nome_razao" obrigatorio />
                        <CampoDropdownEditavel label="Origem da Venda" name="origem_venda" value={form.origem_venda || ""} onChange={handleChange} tipo="origem_venda" usuario={usuario} />
                        <CampoDropdownEditavel label="Situação do Pedido" name="situacao_pedido" value={form.situacao_pedido || "Aguardando Aprovação"} onChange={handleChange} tipo="situacao_pedido" usuario={usuario} />
                    </>
                );
            case "itens":
                return <CampoItens form={form} setForm={setForm} itens={itens} setItens={setItens} precosDisponiveis={precosDisponiveis} API_URL={API_URL} />;
            case "dados_frete":
                return (
                    <>
                        <CampoDropdownEditavel
                            label="Tipo de Frete"
                            name="tipo_frete"
                            value={form.tipo_frete || ""}
                            onChange={handleChange}
                            tipo="tipo_frete"
                            usuario={usuario}
                        />
                        <CampoValorMonetario
                            label="Valor do Frete"
                            name="valor_frete"
                            value={form.valor_frete || 0}
                            onChange={handleChange}
                            placeholder="0,00"
                        />
                        <CampoNumSetas
                            label="Prazo de Entrega (dias)"
                            name="prazo_entrega_dias"
                            value={form.prazo_entrega_dias || ""}
                            onChange={handleChange}
                            placeholder="Número de Dias"
                        />
                        <CampoDropdownDb
                            label="Transportadora"
                            name="transportadora"
                            value={form.transportadora || ""}
                            onChange={handleChange}
                            url={`${API_URL}/cadastros_dropdown`}
                            filtro={{ tipo_cadastro: ["Transportadora"] }}
                            campoValor="id"
                            campoLabel="nome_razao"
                            disabled={form.tipo_frete === 'Sem Frete'}
                        />
                        <div className="col-span-2">
                            <h3 className="font-medium text-gray-700 mb-2">Cotação Automática</h3>
                            <ButtonComPermissao
                                type="button"
                                onClick={() => setModalCotacaoAberto(true)}
                                disabled={!itens.length}
                                className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                permissoes={["admin"]}
                            >
                                <FaCalculator className="text-white" />
                                Calcular Frete (Intelipost)
                            </ButtonComPermissao>
                            {(!itens.length) && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Adicione itens para habilitar a cotação.
                                </p>
                            )}
                        </div>
                    </>
                );
            case "condicoes_pagamento":
                return <CampoPagamento form={form} setForm={setForm} tipo={"venda"} />;
            case "dados_adicionais":
                return <CampoTextlong label="Observações" name="observacao" value={form.observacao || ""} onChange={handleChange} placeholder="Descreva os detalhes do Pedido" colSpan />;
            default:
                return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6 pb-28">
            <h1 className="text-3xl font-bold mb-6">
                {modo === "editar" ? `Editar Pedido: #${form.id || ''}` : "Novo Pedido"}
            </h1>
            <div className="flex gap-2 border-b mb-6 overflow-x-auto">
                {abas.map((aba) => (
                    <button
                        key={aba.id}
                        onClick={() => setAbaAtual(aba.id)}
                        className={`px-4 py-2 font-medium rounded-t transition-all duration-200 whitespace-nowrap ${abaAtual === aba.id ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                        {aba.label}
                    </button>
                ))}
            </div>
            <form id="form-pedido" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderCampos()}
            </form>
            <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={() => navigate(-1)} className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium">
                    Voltar
                </button>
                <ButtonComPermissao permissoes={["admin", "editor"]} type="submit" form="form-pedido" className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold">
                    {modo === 'editar' ? 'Salvar Alterações' : 'Criar Pedido'}
                </ButtonComPermissao>
            </div>
            <ModalErro mensagem={erro} onClose={() => setErro("")} />
            <ModalCotacaoIntelipost
                isOpen={modalCotacaoAberto}
                onClose={() => setModalCotacaoAberto(false)}
                onSelectFrete={handleFreteSelecionado}
                itens={itens}
                clienteId={form.cliente}
            />
        </div>
    );
}