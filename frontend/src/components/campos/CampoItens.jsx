import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import CampoDropdownDb from "@/components/campos/CampoDropdownDb";
import CampoNumSetas from "@/components/campos/CampoNumSetas";
import TabelaItensAdicionados from "@/components/TabelaItensAdicionados";

const faixasDescontoDefinidas = [120, 60, 50, 48, 40, 36, 30, 25, 24, 20, 18, 12, 10, 8, 7, 6, 5, 4, 3, 2];

export default function CampoItens({
    form,
    setForm,
    itens,
    setItens,
    precosDisponiveis,
    API_URL
}) {
    const [editandoIndex, setEditandoIndex] = useState(null);
    const baseUrl = API_URL || import.meta.env.VITE_API_BASE_URL;

    // --- Funções Auxiliares de Cálculo (sem alterações) ---
    const getPriceConfig = (tabelaPrecoId) => {
        if (!precosDisponiveis || !tabelaPrecoId) return null;
        const precoEncontrado = precosDisponiveis.find(p => p.id === tabelaPrecoId);
        return precoEncontrado ? precoEncontrado.config : null;
    };

    const getDescontoAplicado = (quantidade, descontos) => {
        if (!descontos) return 0;
        for (const faixa of faixasDescontoDefinidas) {
            if (quantidade >= faixa && descontos[faixa] && Number(descontos[faixa]) > 0) {
                return parseFloat(descontos[faixa]);
            }
        }
        return 0;
    };

    // VVVVVVVV CORREÇÃO ABAIXO VVVVVVVV
    // Função central que calcula todos os valores de um item.
    // Será usada tanto ao adicionar um novo item quanto para recalcular os itens existentes.
    const calcularValoresItem = (item) => {
        const priceConfig = getPriceConfig(item.tabela_preco_id);
        const quantidade = Number(item.quantidade_itens) || 1;

        // Se a configuração de preço ainda não estiver disponível, retorna o item com valores zerados
        // para evitar exibir dados incorretos ou causar erros.
        if (!priceConfig || typeof priceConfig.valor === 'undefined') {
            return {
                ...item,
                preco_unitario: 0,
                subtotal: item.subtotal || 0, // Mantém o subtotal original se existir
                desconto_item: 0,
                total_com_desconto: 0,
            };
        }

        const precoUnitarioBase = parseFloat(priceConfig.valor);
        const descontoUnitario = getDescontoAplicado(quantidade, priceConfig.descontos);
        const precoUnitarioFinal = precoUnitarioBase - descontoUnitario;

        return {
            ...item,
            preco_unitario: precoUnitarioFinal,
            subtotal: precoUnitarioBase * quantidade,
            desconto_item: descontoUnitario * quantidade,
            total_com_desconto: precoUnitarioFinal * quantidade,
        };
    };

    // useEffect CORRIGIDO: Agora ele recalcula os itens quando as regras de preço são carregadas.
    useEffect(() => {
        // Só executa se tivermos as regras de preço e itens na lista.
        if (precosDisponiveis.length > 0 && Array.isArray(itens)) {

            // 1. Recalcula cada item na lista para garantir que os preços estão atualizados.
            const itensRecalculados = itens.map(calcularValoresItem);

            // 2. Compara a lista antiga com a nova para evitar loops infinitos de renderização.
            //    Só atualiza o estado se houver alguma mudança nos valores calculados.
            if (JSON.stringify(itens) !== JSON.stringify(itensRecalculados)) {
                setItens(itensRecalculados);
            }
        }
    // A dependência de `precosDisponiveis` é crucial. O efeito roda quando os preços chegam da API.
    }, [precosDisponiveis, itens, setItens]);
    
    // useEffect para atualizar o TOTAL GERAL do formulário (sem alterações na lógica)
    useEffect(() => {
        if (Array.isArray(itens)) {
            const novoTotalGeral = itens.reduce((acc, item) => acc + (item.total_com_desconto || 0), 0);
            
            setForm((prev) => ({
                ...prev,
                lista_itens: itens,
                total: novoTotalGeral,
            }));
        }
    }, [itens, setForm]);
    // ^^^^^^^^ CORREÇÃO ACIMA ^^^^^^^^

    const handleChange = (e) => {
        const { name, value, label, item } = e.target;
        setForm((prev) => {
            const novoForm = { ...prev, [name]: value };
            if (label !== undefined) {
                if (name === "produto_selecionado") {
                    novoForm.produto_selecionado_nome = label;
                    novoForm.produto_selecionado_sku = item?.sku || "";
                    novoForm.tabela_preco_selecionada = "";
                    novoForm.tabela_preco_selecionada_nome = "";
                } else {
                    novoForm[`${name}_nome`] = label;
                }
            }
            return novoForm;
        });
    };

    const limparFormularioItem = () => {
        setForm((prevForm) => ({
            ...prevForm,
            produto_selecionado: "",
            produto_selecionado_nome: "",
            produto_selecionado_sku: "",
            quantidade_itens: 1,
            tabela_preco_selecionada: "",
            tabela_preco_selecionada_nome: "",
        }));
    };

    const handleAdicionarOuEditarItem = () => {
        if (!form.produto_selecionado || !form.tabela_preco_selecionada) {
            return toast.error("Selecione um produto e uma tabela de preço.");
        }
        const quantidade = Number(form.quantidade_itens) || 1;
        if (quantidade <= 0) {
            return toast.error("A quantidade deve ser maior que zero.");
        }

        const itemBase = {
            produto_id: form.produto_selecionado,
            sku: form.produto_selecionado_sku || "",
            produto: form.produto_selecionado_nome || "Produto",
            quantidade_itens: quantidade,
            tabela_preco_id: form.tabela_preco_selecionada,
            tabela_preco: form.tabela_preco_selecionada_nome || "",
        };

        // Usa a mesma função de cálculo para garantir consistência.
        const novoItemCalculado = calcularValoresItem(itemBase);
        
        if (!novoItemCalculado.preco_unitario && novoItemCalculado.total_com_desconto === 0) {
            const priceConfig = getPriceConfig(itemBase.tabela_preco_id);
            if (!priceConfig) return toast.error("Preço do produto não encontrado. Verifique o cadastro do produto.");
        }

        setItens(prev => {
            const novosItens = [...prev];
            if (editandoIndex !== null) {
                novosItens[editandoIndex] = novoItemCalculado;
            } else {
                novosItens.push(novoItemCalculado);
            }
            return novosItens;
        });

        limparFormularioItem();
        setEditandoIndex(null);
        toast.success(editandoIndex !== null ? "Item atualizado!" : "Item adicionado!");
    };

    const handleEditarItem = (index) => {
        const item = itens[index];
        setForm(prev => ({
            ...prev,
            produto_selecionado: item.produto_id || "",
            produto_selecionado_nome: item.produto || "",
            produto_selecionado_sku: item.sku || "",
            quantidade_itens: item.quantidade_itens || 1,
            tabela_preco_selecionada: item.tabela_preco_id || "",
            tabela_preco_selecionada_nome: item.tabela_preco || "",
        }));
        setEditandoIndex(index);
    };

    const handleExcluirItem = (index) => {
        setItens(prev => prev.filter((_, i) => i !== index));
        toast.success("Item removido!");
    };
    
    return (
        <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <CampoDropdownDb
                label="Produto"
                name="produto_selecionado"
                value={form.produto_selecionado || ""}
                onChange={handleChange}
                url={`${baseUrl}/produtos_dropdown`}
                campoValor="id"
                campoLabel="descricao"
                campoImagem="url_imagem"
                passarItemCompleto
                colSpan
            />
            <CampoNumSetas
                label="Quantidade de Itens"
                name="quantidade_itens"
                value={form.quantidade_itens || 1}
                onChange={handleChange}
                min={1}
            />
            <CampoDropdownDb
                label="Tabela de Preço"
                name="tabela_preco_selecionada"
                value={form.tabela_preco_selecionada || ""}
                onChange={handleChange}
                url={`${baseUrl}/tabela_precos_por_produto?produto_id=${form.produto_selecionado || 0}`}
                campoValor="id"
                campoLabel="nome"
                disabled={!form.produto_selecionado}
                key={form.produto_selecionado} 
            />
            <div className="col-span-2 flex justify-end">
                <button
                    type="button"
                    onClick={handleAdicionarOuEditarItem}
                    className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold"
                >
                    {editandoIndex !== null ? "Salvar Alterações" : "Adicionar Item"}
                </button>
            </div>
            {itens.length > 0 && (
                <TabelaItensAdicionados itens={itens} onEditar={handleEditarItem} onExcluir={handleExcluirItem} />
            )}
        </div>
    );
}