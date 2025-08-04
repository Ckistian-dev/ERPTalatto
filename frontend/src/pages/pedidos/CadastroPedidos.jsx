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
    const [form, setForm] = useState({
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
        valor_frete: 0,
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

    // useEffect para popular o formulário no modo de edição (sem alterações)
    useEffect(() => {
        if (modo === "editar" && location.state?.pedido) {
            const pedido = location.state.pedido;
            const parsedItens = JSON.parse(pedido.lista_itens || "[]");
            const parsedPagamentos = JSON.parse(pedido.formas_pagamento || "[]");

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

    // VVVVVVVV CORREÇÃO ABAIXO VVVVVVVV
    // useEffect unificado para buscar os preços dos produtos.
    // Ele agora busca os preços tanto para os itens já na lista (no modo de edição)
    // quanto para o novo produto selecionado no formulário.
    useEffect(() => {
        const fetchAllPrices = async () => {
            // 1. Cria um conjunto (Set) para armazenar IDs únicos e evitar buscas repetidas.
            const productIdsToFetch = new Set();

            // 2. Adiciona os IDs dos itens que já estão no pedido.
            itens.forEach(item => {
                if (item.produto_id) productIdsToFetch.add(item.produto_id);
            });

            // 3. Adiciona o ID do produto que está selecionado no formulário de "Adicionar Item".
            if (form.produto_selecionado) {
                productIdsToFetch.add(form.produto_selecionado);
            }

            // Se não houver nenhum ID para buscar, não faz nada.
            if (productIdsToFetch.size === 0) {
                setPrecosDisponiveis([]);
                return;
            }

            try {
                // 4. Cria uma lista de promessas de busca para cada ID.
                const pricePromises = Array.from(productIdsToFetch).map(id =>
                    axios.get(`${API_URL}/tabela_precos_por_produto?produto_id=${id}`)
                );

                // 5. Executa todas as buscas em paralelo.
                const responses = await Promise.all(pricePromises);

                // 6. Junta os resultados de todas as buscas em uma única lista de preços.
                const allPriceConfigs = responses.flatMap(res => res.data || []);

                // 7. Atualiza o estado com todas as regras de preço necessárias.
                setPrecosDisponiveis(allPriceConfigs);

            } catch (error) {
                console.error("Erro ao buscar preços dos produtos:", error);
                toast.error("Não foi possível carregar as configurações de preço.");
            }
        };

        fetchAllPrices();
        // Roda este efeito sempre que a lista de itens mudar (ao carregar um pedido) ou quando um novo produto for selecionado.
    }, [itens, form.produto_selecionado]);
    // ^^^^^^^^ CORREÇÃO ACIMA ^^^^^^^^


    // useEffect para calcular o total da nota (sem alterações)
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

    // O restante do arquivo (handleChange, handleSubmit, renderCampos, etc.) permanece o mesmo.
    const handleChange = (e) => {
        const { name, value, label } = e.target;

        setForm((prev) => {
            const novoForm = { ...prev };
            novoForm[name] = value;

            if (name === 'cliente') {
                if (label) novoForm.cliente_nome = label;
            } else if (name === 'vendedor') {
                if (label) novoForm.vendedor_nome = label;
            } else if (name === 'transportadora') {
                if (label) novoForm.transportadora_nome = label;
            }

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
            console.error("Erro do Backend:", err.response?.data);
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
                                    observacao: orc.observacao,
                                    formas_pagamento: typeof orc.formas_pagamento === "string" ? JSON.parse(orc.formas_pagamento || "[]") : orc.formas_pagamento || [],
                                    desconto_total: orc.desconto_total,
                                    total_com_desconto: orc.total_com_desconto,
                                }));

                                setItens(listaItens);
                            }}
                            colSpan
                            API_URL={API_URL}
                        />
                        <CampoData label="Data de Emissão" name="data_emissao" value={form.data_emissao || ""} onChange={handleChange} hoje obrigatorio />
                        <CampoData label="Data de Validade" name="data_validade" value={form.data_validade || ""} onChange={handleChange} hojeMaisDias={7} obrigatorio />
                        <CampoDropdownDb label="Cliente" name="cliente" value={form.cliente || ""} onChange={handleChange} url={`${API_URL}/cadastros_dropdown`} filtro={{ tipo_cadastro: ["Cliente"] }} campoValor="id" campoLabel="nome_razao" obrigatorio />
                        <CampoDropdownDb label="Vendedor" name="vendedor" value={form.vendedor || ""} onChange={handleChange} url={`${API_URL}/cadastros_dropdown`} filtro={{ tipo_cadastro: ["Vendedor"] }} campoValor="id" campoLabel="nome_razao" obrigatorio />
                        <CampoDropdownEditavel label="Origem da Venda" name="origem_venda" value={form.origem_venda || ""} onChange={handleChange} tipo="origem_venda" usuario={usuario} obrigatorio />
                        <CampoDropdownEditavel label="Situação do Pedido" name="situacao_pedido" value={form.situacao_pedido || "Aguardando Aprovação"} onChange={handleChange} tipo="situacao_pedido" usuario={usuario} />
                    </>
                );
            case "itens":
                return <CampoItens form={form} setForm={setForm} itens={itens} setItens={setItens} precosDisponiveis={precosDisponiveis} API_URL={API_URL} />;
            case "dados_frete":
                return (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-r pr-4">
                        {/* Campos principais */}
                        <CampoDropdownEditavel
                            label="Tipo de Frete"
                            name="tipo_frete"
                            value={form.tipo_frete || ""}
                            onChange={handleChange}
                            tipo="tipo_frete"
                            usuario={usuario}
                            obrigatorio
                        />

                        <CampoValorMonetario
                            label="Valor do Frete"
                            name="valor_frete"
                            value={form.valor_frete || 0}
                            onChange={handleChange}
                            placeholder="0,00"
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
                            obrigatorio={form.tipo_frete !== 'Sem Frete'}
                            disabled={form.tipo_frete === 'Sem Frete'}
                            colSpan
                            className="md:col-span-2"
                        />

                        {/* Cotação automática */}
                        <div className="md:col-span-2">
                            <h3 className="font-medium text-gray-700 mb-2">Cotação Automática</h3>

                            <ButtonComPermissao
                                type="button"
                                onClick={() => setModalCotacaoAberto(true)}
                                disabled={!form.cliente || !itens.length}
                                className={`
                        w-full px-4 py-2 
                        bg-teal-600 hover:bg-teal-700 
                        text-white rounded-lg 
                        font-semibold 
                        flex items-center justify-center gap-2 
                        transition-all duration-200 
                        disabled:bg-gray-300 disabled:cursor-not-allowed
                        shadow-md hover:shadow-lg
                    `}
                                permissoes={["admin"]}
                            >
                                <FaCalculator className="text-white" />
                                Calcular Frete (Intelipost)
                            </ButtonComPermissao>

                            {(!form.cliente || !itens.length) && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Selecione um cliente e adicione itens para habilitar a cotação.
                                </p>
                            )}
                        </div>
                    </div>
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
                        className={`px-4 py-2 font-medium rounded-t transition-all duration-200 ${abaAtual === aba.id ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
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