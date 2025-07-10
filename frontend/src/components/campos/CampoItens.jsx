import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import CampoDropdownDb from "@/components/campos/CampoDropdownDb";
import CampoNumSetas from "@/components/campos/CampoNumSetas";
import TabelaItensAdicionados from "@/components/TabelaItensAdicionados";

// Remova esta linha se API_URL já for definida no componente pai e passada via props
// const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CampoItens({
    form,
    setForm,
    itens,
    setItens,
    precosDisponiveis,
    // Adicione API_URL como uma prop aqui
    API_URL // <-- Adicione esta prop
}) {
    const [editandoIndex, setEditandoIndex] = useState(null);

    // Certifique-se de que a API_URL está disponível aqui.
    // Se o componente pai não passar, pode ser definida aqui, mas a prop é mais flexível.
    const baseUrl = API_URL || import.meta.env.VITE_API_BASE_URL;


    const handleChange = (e) => {
        const { name, value, label, formatado } = e.target;

        setForm((prev) => {
            const novoForm = { ...prev };

            if (formatado !== undefined) {
                novoForm[name] = value;
            } else {
                novoForm[name] = value;
            }

            if (label !== undefined) {
                if (name === "produto_selecionado") novoForm.produto_selecionado_nome = label;
                if (name === "variacao_selecionada") novoForm.variacao_selecionada_nome = label;
                if (name === "tabela_preco_selecionada") novoForm.tabela_preco_selecionada_nome = label;
                if (name === "cliente") novoForm.cliente_nome = label; // Embora 'cliente' não seja deste CampoItens, mantive a lógica
                if (name === "vendedor") novoForm.vendedor_nome = label; // Idem
            }

            return novoForm;
        });
    };

    const calcularTotal = (lista) => {
        // Recalcula o total de cada item e o total geral
        const itensComTotaisAtualizados = lista.map(item => {
            const precoUnitario = getPrecoUnitario(item.produto_id, item.variacao_id, item.tabela_preco_id);
            const subtotal = precoUnitario * (Number(item.quantidade_itens) || 0);
            return {
                ...item,
                preco_unitario: precoUnitario, // Adicionado para manter no item
                subtotal: subtotal,
                total_com_desconto: subtotal // Se não há desconto por item, é o subtotal
            };
        });

        return itensComTotaisAtualizados.reduce((acc, item) => acc + (item.total_com_desconto || 0), 0);
    };

    const getPrecoUnitario = (produtoId, variacaoId, tabelaPrecoId) => {
        // A variação não é usada, pois o modelo de dados atual do backend não a suporta nos preços.
        if (!precosDisponiveis || precosDisponiveis.length === 0 || !tabelaPrecoId) {
            return 0;
        }

        // A busca agora se concentra apenas em encontrar a tabela de preço correta,
        // pois a lista `precosDisponiveis` já pertence ao produto selecionado.
        // 'tabelaPrecoId' aqui é o nome da tabela (ex: "Varejo"), que o backend define como 'id'.
        const precoEncontrado = precosDisponiveis.find(p => p.id === tabelaPrecoId);

        return precoEncontrado ? parseFloat(precoEncontrado.valor) : 0;
    };


    const limparFormulario = () => {
        setForm((prevForm) => ({
            ...prevForm,
            produto_selecionado: "",
            produto_selecionado_nome: "",
            variacao_selecionada: "",
            variacao_selecionada_nome: "",
            quantidade_itens: 1,
            tabela_preco_selecionada: "",
            tabela_preco_selecionada_nome: "",
            subtotal: "", // Não precisa mais de subtotal aqui
        }));
    };

    const handleAdicionarOuEditarItem = () => {
        if (!form.produto_selecionado) {
            toast.error("Selecione um produto antes de adicionar.");
            return;
        }
        if (!form.tabela_preco_selecionada) {
            toast.error("Selecione uma tabela de preço para o item.");
            return;
        }

        const quantidade = Number(form.quantidade_itens) || 1;
        if (quantidade <= 0) {
            toast.error("A quantidade deve ser maior que zero.");
            return;
        }

        const precoUnitario = getPrecoUnitario(form.produto_selecionado, form.variacao_selecionada, form.tabela_preco_selecionada);
        if (precoUnitario <= 0) {
            toast.error("Preço unitário do produto não encontrado ou é zero.");
            return;
        }
        const subtotal = precoUnitario * quantidade;

        const novoItem = {
            produto_id: form.produto_selecionado,
            produto: form.produto_selecionado_nome || "Produto",
            variacao_id: form.variacao_selecionada,
            variacao: form.variacao_selecionada_nome || "",
            quantidade_itens: quantidade,
            tabela_preco_id: form.tabela_preco_selecionada,
            tabela_preco: form.tabela_preco_selecionada_nome || "",
            preco_unitario: precoUnitario, // Adicionado
            subtotal: subtotal,
            desconto_item: 0, // Pode ser adicionado um campo para isso se necessário
            total_com_desconto: subtotal, // Por enquanto, é igual ao subtotal
        };

        setItens(prev => {
            let novosItens = [...prev];

            if (editandoIndex !== null) {
                novosItens[editandoIndex] = novoItem;
            } else {
                novosItens.push(novoItem);
            }
            // Recalcular e atualizar o total no form pai
            const novoTotalGeral = calcularTotal(novosItens);
            setForm(prevForm => ({
                ...prevForm,
                lista_itens: novosItens, // Atualiza os itens no form principal
                total: novoTotalGeral, // Atualiza o total
                // Manter desconto_total e total_com_desconto para serem calculados no handleSubmit do pai
                // ou em um useEffect separado no pai.
            }));
            return novosItens;
        });

        limparFormulario();
        setEditandoIndex(null);

        if (editandoIndex !== null) {
            toast.success("Item editado!");
        } else {
            toast.success("Item adicionado!");
        }
    };

    const handleEditarItem = (index) => {
        const item = itens[index];

        setForm(prev => ({
            ...prev,
            produto_selecionado: item.produto_id || "",
            produto_selecionado_nome: item.produto || "",
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
        setItens(novosItens); // Atualiza o estado `itens` localmente

        // Recalcular e atualizar o total no form pai
        const novoTotalGeral = calcularTotal(novosItens);
        setForm(prevForm => ({
            ...prevForm,
            lista_itens: novosItens, // Atualiza os itens no form principal
            total: novoTotalGeral, // Atualiza o total
            desconto_total: prevForm.desconto_total, // Mantém, será recalculado no pai
            total_com_desconto: prevForm.total_com_desconto, // Mantém, será recalculado no pai
        }));

        toast.success("Item removido!");
    };

    // UseEffect para recalcular o total quando 'itens' muda e atualizar o form pai
    useEffect(() => {
        if (Array.isArray(itens)) {
            const novoTotalGeral = calcularTotal(itens);
            setForm((prev) => ({
                ...prev,
                lista_itens: itens, // Garante que lista_itens no form principal está sincronizada
                total: novoTotalGeral,
                // Os campos desconto_total e total_com_desconto são geralmente manipulados
                // no nível do componente pai, pois dependem do total geral e de outros fatores.
            }));
        }
    }, [itens, setForm, precosDisponiveis]); // Depende de itens e precosDisponiveis

    return (
        <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <CampoDropdownDb
                label="Produto"
                name="produto_selecionado"
                value={form.produto_selecionado || ""}
                onChange={handleChange}
                // USO DA VARIÁVEL DE AMBIENTE AQUI
                url={`${baseUrl}/produtos_dropdown`}
                filtro={{ situacao: "Ativo" }} // Exemplo: filtra apenas produtos ativos
                campoValor="id"
                campoLabel="descricao"
                campoImagem="url_imagem" // Certifique-se que o backend retorna `url_imagem`
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
                // USO DA VARIÁVEL DE AMBIENTE AQUI - Filtrar variações por produto selecionado
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
                // USO DA VARIÁVEL DE AMBIENTE AQUI - Filtrar tabelas de preço por produto
                url={`${baseUrl}/tabela_precos_por_produto?produto_id=${form.produto_selecionado || 0}`}
                campoValor="id"
                campoLabel="nome" // Assumindo que a tabela de preços tem um 'nome'
                disabled={!form.produto_selecionado}
            />

            {/* Botão Adicionar */}
            <div className="col-span-2 flex justify-end">
                <button
                    type="button"
                    onClick={handleAdicionarOuEditarItem}
                    className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold"
                >
                    {editandoIndex !== null ? "Salvar Alterações" : "Adicionar Item"}
                </button>
            </div>

            {/* Tabela de Itens */}
            {itens.length > 0 && (
                <TabelaItensAdicionados itens={itens} onEditar={handleEditarItem} onExcluir={handleExcluirItem} />
            )}
        </div>
    );
}