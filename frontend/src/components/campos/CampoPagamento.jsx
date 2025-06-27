import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import CampoDropdownEditavel from "@/components/campos/CampoDropdownEditavel";
import CampoValorMonetario from "@/components/campos/CampoValorMonetario";
import CampoNumSetas from "@/components/campos/CampoNumSetas";

export default function CampoPagamento({ form, setForm, handleChange, tipo }) {
    const { usuario } = useAuth();
    const [formasPagamento, setFormasPagamento] = useState(form.formas_pagamento || [{ tipo: "" }]);

    const adicionarFormaPagamento = () => {
        setFormasPagamento((prev) => [...prev, { tipo: "" }]);
        console.log("formasPagamento mapeado:", formasPagamento.map(limparFormaPagamento));
    };

    const handleFormaChange = (index, field, value) => {
        setFormasPagamento((prev) => {
            const novasFormas = [...prev];
            novasFormas[index] = {
                ...novasFormas[index],
                [field]: field === "valor_parcela" ? Number(value) : value,
            };
            return novasFormas;
        });
    };


    const limparFormaPagamento = (forma) => {
        const limpa = {
            tipo: forma.tipo,
        };

        if (forma.tipo === "Pix") limpa.valor_pix = Number(forma.valor_pix || 0);
        if (forma.tipo === "Boleto") limpa.valor_boleto = Number(forma.valor_boleto || 0);
        if (forma.tipo === "Dinheiro") limpa.valor_dinheiro = Number(forma.valor_dinheiro || 0);
        if (forma.tipo === "Parcelamento") {
            limpa.parcelas = Number(forma.parcelas || 1);

            const totalProdutos = Number(form.total) || 0;
            const valorFrete = Number(form.valor_frete) || 0;
            const totalNota = form.total_com_desconto !== undefined && form.total_com_desconto !== ""
                ? Number(form.total_com_desconto)
                : totalProdutos + valorFrete;

            let valorOutros = 0;
            formasPagamento.forEach((f) => {
                if (f.tipo === "Pix" && f.valor_pix) valorOutros += Number(f.valor_pix);
                if (f.tipo === "Boleto" && f.valor_boleto) valorOutros += Number(f.valor_boleto);
                if (f.tipo === "Dinheiro" && f.valor_dinheiro) valorOutros += Number(f.valor_dinheiro);
            });

            const restante = totalNota - valorOutros;
            const parcelas = limpa.parcelas || 1;

            limpa.valor_parcela = Number((restante / parcelas).toFixed(2));
        }

        return limpa;
    };


    const calcularValorParcela = useMemo(() => {
        const totalProdutos = Number(form.total) || 0;
        const valorFrete = Number(form.valor_frete) || 0;
        const totalNota = form.total_com_desconto !== undefined && form.total_com_desconto !== ""
            ? Number(form.total_com_desconto)
            : totalProdutos + valorFrete;

        let valorOutrosPagamentos = 0;

        formasPagamento.forEach((forma) => {
            if (forma.tipo === "Pix" && forma.valor_pix) valorOutrosPagamentos += Number(forma.valor_pix);
            if (forma.tipo === "Boleto" && forma.valor_boleto) valorOutrosPagamentos += Number(forma.valor_boleto);
            if (forma.tipo === "Dinheiro" && forma.valor_dinheiro) valorOutrosPagamentos += Number(forma.valor_dinheiro);
        });

        const formaParcelamento = formasPagamento.find((f) => f.tipo === "Parcelamento");
        const parcelas = formaParcelamento ? Number(formaParcelamento.parcelas) || 1 : 1;

        const valorRestante = totalNota - valorOutrosPagamentos;

        if (parcelas > 0 && valorRestante > 0) {
            return (valorRestante / parcelas).toFixed(2);
        }

        return "0.00";
    }, [formasPagamento, form.total, form.valor_frete, form.total_com_desconto]);



    useEffect(() => {
        const totalProdutos = Number(form.total) || 0;
        const valorFrete = Number(form.valor_frete) || 0;
        const totalNota = form.total_com_desconto !== undefined && form.total_com_desconto !== ""
            ? Number(form.total_com_desconto)
            : totalProdutos + valorFrete;

        let valorPago = 0;

        formasPagamento.forEach((forma) => {
            if (forma.tipo === "Pix" && forma.valor_pix) valorPago += Number(forma.valor_pix);
            if (forma.tipo === "Boleto" && forma.valor_boleto) valorPago += Number(forma.valor_boleto);
            if (forma.tipo === "Dinheiro" && forma.valor_dinheiro) valorPago += Number(forma.valor_dinheiro);
            if (forma.tipo === "Parcelamento") {
                let valorOutros = 0;
                formasPagamento.forEach((f) => {
                    if (f.tipo === "Pix" && f.valor_pix) valorOutros += Number(f.valor_pix);
                    if (f.tipo === "Boleto" && f.valor_boleto) valorOutros += Number(f.valor_boleto);
                    if (f.tipo === "Dinheiro" && f.valor_dinheiro) valorOutros += Number(f.valor_dinheiro);
                });
                valorPago += totalNota - valorOutros;
            }
        });

        const descontoCalculado = (totalProdutos + valorFrete) - totalNota;

        const formasLimpa = formasPagamento.map(limparFormaPagamento);

        console.log("formas_pagamento final:", formasLimpa);

        setForm((prev) => ({
            ...prev,
            formas_pagamento: formasLimpa,
            desconto_total: descontoCalculado >= 0 ? descontoCalculado.toFixed(2) : "0.00",
        }));
    }, [formasPagamento, form.total, form.valor_frete, form.total_com_desconto]);



    return (
        <div className="col-span-2 flex flex-col gap-6">
            {formasPagamento.map((forma, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end rounded-md">
                    <CampoDropdownEditavel
                        label="Tipo de Pagamento"
                        name={`tipo_${index}`}
                        value={forma.tipo}
                        onChange={(e) => handleFormaChange(index, "tipo", e.target.value)}
                        tipo="condicao_pagamento"
                        usuario={usuario}
                    />

                    {forma.tipo === "Pix" && (
                        <CampoValorMonetario
                            label="Valor Pix"
                            name={`valor_pix_${index}`}
                            value={forma.valor_pix || ""}
                            onChange={(e) => handleFormaChange(index, "valor_pix", e.target.value)}
                        />
                    )}

                    {forma.tipo === "Boleto" && (
                        <CampoValorMonetario
                            label="Valor Boleto"
                            name={`valor_boleto_${index}`}
                            value={forma.valor_boleto || ""}
                            onChange={(e) => handleFormaChange(index, "valor_boleto", e.target.value)}
                        />
                    )}

                    {forma.tipo === "Dinheiro" && (
                        <CampoValorMonetario
                            label="Valor Dinheiro"
                            name={`valor_dinheiro_${index}`}
                            value={forma.valor_dinheiro || ""}
                            onChange={(e) => handleFormaChange(index, "valor_dinheiro", e.target.value)}
                        />
                    )}

                    {forma.tipo === "Parcelamento" && (
                        <>
                            <CampoNumSetas
                                label="Parcelas"
                                name={`parcelas_${index}`}
                                value={forma.parcelas || 1}
                                onChange={(e) => handleFormaChange(index, "parcelas", e.target.value)}
                            />
                            <CampoValorMonetario
                                label="Valor Parcela"
                                name={`valor_parcela_${index}`}
                                value={forma.valor_parcela !== undefined ? forma.valor_parcela : calcularValorParcela}
                                onChange={(e) => handleFormaChange(index, "valor_parcela", e.target.value)}
                            />
                        </>
                    )}
                </div>
            ))}

            <button
                type="button"
                onClick={adicionarFormaPagamento}
                className="self-start bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2 rounded-md"
            >
                Adicionar Forma de Pagamento
            </button>

            {/* Totais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 items-end">
                <CampoValorMonetario
                    label="Total Produtos"
                    name="total"
                    value={form.total || 0.00}
                    onChange={() => { }}
                    disabled
                />
                <CampoValorMonetario
                    label="Total Frete"
                    name="valor_frete"
                    value={form.valor_frete || 0.00}
                    onChange={() => { }}
                    disabled
                />
                <CampoValorMonetario
                    label="Total de Descontos"
                    name="desconto_total"
                    value={form.desconto_total || 0.00}
                    onChange={() => { }}
                    disabled
                />
                <CampoValorMonetario
                    label="Total da Nota"
                    name="total_com_desconto"
                    value={form.total_com_desconto || 0.00}
                    onChange={handleChange}
                    placeholder="0,00"
                />
            </div>
        </div>
    );
}
