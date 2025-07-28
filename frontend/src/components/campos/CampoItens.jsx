import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import CampoDropdownDb from "@/components/campos/CampoDropdownDb";
import CampoNumSetas from "@/components/campos/CampoNumSetas";
import TabelaItensAdicionados from "@/components/TabelaItensAdicionados";

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

    const handleChange = (e) => {
        // Assumimos que o componente CampoDropdownDb pode passar o objeto completo 
        // do item selecionado no evento, como `e.target.item`.
        const { name, value, label, formatado, item } = e.target;
        setForm((prev) => {
            const novoForm = { ...prev };
            if (formatado !== undefined) {
                novoForm[name] = value;
            } else {
                novoForm[name] = value;
            }
            if (label !== undefined) {
                if (name === "produto_selecionado") {
                    novoForm.produto_selecionado_nome = label;
                    novoForm.produto_selecionado_sku = item?.sku || ""; // MODIFICAÇÃO: Adicionando o SKU ao form
                }
                if (name === "variacao_selecionada") novoForm.variacao_selecionada_nome = label;
                if (name === "tabela_preco_selecionada") novoForm.tabela_preco_selecionada_nome = label;
                if (name === "cliente") novoForm.cliente_nome = label;
                if (name === "vendedor") novoForm.vendedor_nome = label;
            }
            return novoForm;
        });
    };

    const getPrecoUnitario = (tabelaPrecoId) => {
        if (!precosDisponiveis || precosDisponiveis.length === 0 || !tabelaPrecoId) {
            return 0;
        }
        const precoEncontrado = precosDisponiveis.find(p => p.id === tabelaPrecoId);
        return precoEncontrado ? parseFloat(precoEncontrado.valor) : 0;
    };

    const calcularTotal = (lista) => {
        const itensComTotaisAtualizados = lista.map(item => {
            const precoUnitario = getPrecoUnitario(item.tabela_preco_id);
            const subtotal = precoUnitario * (Number(item.quantidade_itens) || 0);
            return {
                ...item,
                preco_unitario: precoUnitario,
                subtotal: subtotal,
                total_com_desconto: subtotal
            };
        });
        return itensComTotaisAtualizados.reduce((acc, item) => acc + (item.total_com_desconto || 0), 0);
    };

    const limparFormulario = () => {
        setForm((prevForm) => ({
            ...prevForm,
            produto_selecionado: "",
            produto_selecionado_nome: "",
            produto_selecionado_sku: "", // MODIFICAÇÃO: Limpar SKU
            variacao_selecionada: "",
            variacao_selecionada_nome: "",
            quantidade_itens: 1,
            tabela_preco_selecionada: "",
            tabela_preco_selecionada_nome: "",
        }));
    };

    const handleAdicionarOuEditarItem = () => {
        if (!form.produto_selecionado) {
            return toast.error("Selecione um produto antes de adicionar.");
        }
        if (!form.tabela_preco_selecionada) {
            return toast.error("Selecione uma tabela de preço para o item.");
        }
        const quantidade = Number(form.quantidade_itens) || 1;
        if (quantidade <= 0) {
            return toast.error("A quantidade deve ser maior que zero.");
        }

        const precoUnitario = getPrecoUnitario(form.tabela_preco_selecionada);
        if (precoUnitario <= 0) {
            return toast.error("Preço unitário do produto não encontrado ou é zero.");
        }
        const subtotal = precoUnitario * quantidade;

        const novoItem = {
            produto_id: form.produto_selecionado,
            sku: form.produto_selecionado_sku || "", // MODIFICAÇÃO: Adicionando SKU ao item
            produto: form.produto_selecionado_nome || "Produto",
            variacao_id: form.variacao_selecionada,
            variacao: form.variacao_selecionada_nome || "",
            quantidade_itens: quantidade,
            tabela_preco_id: form.tabela_preco_selecionada,
            tabela_preco: form.tabela_preco_selecionada_nome || "",
            preco_unitario: precoUnitario,
            subtotal: subtotal,
            desconto_item: 0,
            total_com_desconto: subtotal,
        };

        setItens(prev => {
            let novosItens = [...prev];
            if (editandoIndex !== null) {
                novosItens[editandoIndex] = novoItem;
            } else {
                novosItens.push(novoItem);
            }
            return novosItens;
        });

        limparFormulario();
        setEditandoIndex(null);

        toast.success(editandoIndex !== null ? "Item editado!" : "Item adicionado!");
    };

    const handleEditarItem = (index) => {
        const item = itens[index];
        setForm(prev => ({
            ...prev,
            produto_selecionado: item.produto_id || "",
            produto_selecionado_nome: item.produto || "",
            produto_selecionado_sku: item.sku || "", // MODIFICAÇÃO: Preenchendo o SKU para edição
            variacao_selecionada: item.variacao_id || "",
            variacao_selecionada_nome: item.variacao || "",
            quantidade_itens: item.quantidade_itens || 1,
            tabela_preco_selecionada: item.tabela_preco_id || "",
            tabela_preco_selecionada_nome: item.tabela_preco || "",
        }));
        setEditandoIndex(index);
    };

    const handleExcluirItem = (index) => {
        const novosItens = itens.filter((_, i) => i !== index);
        setItens(novosItens);
        toast.success("Item removido!");
    };

    useEffect(() => {
        if (Array.isArray(itens)) {
            const novoTotalGeral = calcularTotal(itens);
            setForm((prev) => ({
                ...prev,
                lista_itens: itens,
                total: novoTotalGeral,
            }));
        }
    }, [itens, setForm, precosDisponiveis]);

    return (
        <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <CampoDropdownDb
                label="Produto"
                name="produto_selecionado"
                value={form.produto_selecionado || ""}
                onChange={handleChange}
                url={`${baseUrl}/produtos_dropdown`}
                filtro={{ situacao: "Ativo" }}
                campoValor="id"
                campoLabel="descricao"
                campoImagem="url_imagem"
                // Garanta que este componente passe o objeto inteiro no 'onChange',
                // por exemplo: onChange({ target: { ..., item: itemCompleto } })
            />
            <CampoNumSetas
                label="Quantidade de Itens"
                name="quantidade_itens"
                value={form.quantidade_itens || 1}
                onChange={handleChange}
            />
            <CampoDropdownDb
                label="Variação"
                name="variacao_selecionada"
                value={form.variacao_selecionada || ""}
                onChange={handleChange}
                url={`${baseUrl}/variacoes_por_produto?produto_id=${form.produto_selecionado || 0}`}
                campoValor="id"
                campoLabel="descricao"
                disabled={!form.produto_selecionado}
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
                // O componente TabelaItensAdicionados agora receberá itens com a propriedade 'sku'.
                // Você precisará ajustar este componente para exibir essa nova coluna.
                <TabelaItensAdicionados itens={itens} onEditar={handleEditarItem} onExcluir={handleExcluirItem} />
            )}
        </div>
    );
}