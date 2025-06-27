import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import CampoValorMonetario from '@/components/campos/CampoValorMonetario';
import CampoNumSetas from '@/components/campos/CampoNumSetas';
import { X, Plus } from 'lucide-react'

export default function CampoPagamentoContas({ form, setForm}) {
    const { usuario } = useAuth(); // Usando o mock definido acima ou o hook real
    // Inicializa formasPagamento a partir do form.formas_pagamento ou com um item padrão
    const [formasPagamento, setFormasPagamento] = useState(
        form.formas_pagamento && form.formas_pagamento.length > 0
            ? form.formas_pagamento
            : [{ tipo: "", valor_pix: 0, valor_boleto: 0, valor_dinheiro: 0, parcelas: 0, valor_parcela: 0 }]
    );

    useEffect(() => {
        // Se o form.formas_pagamento mudar externamente (ex: ao carregar dados para edição),
        // atualiza o estado interno de CampoPagamento.
        if (form.formas_pagamento && JSON.stringify(form.formas_pagamento) !== JSON.stringify(formasPagamento)) {
            setFormasPagamento(form.formas_pagamento.length > 0 ? form.formas_pagamento : [{ tipo: "", valor_pix: 0, valor_boleto: 0, valor_dinheiro: 0, parcelas: 0, valor_parcela: 0 }]);
        }
    }, [form.formas_pagamento]);


    const adicionarFormaPagamento = () => {
        setFormasPagamento((prev) => [...prev, { tipo: "", valor_pix: 0, valor_boleto: 0, valor_dinheiro: 0, parcelas: 0, valor_parcela: 0 }]);
    };

    const removerFormaPagamento = (index) => {
        setFormasPagamento((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFormaChange = (index, field, value) => {
        setFormasPagamento((prev) =>
            prev.map((forma, i) => {
                if (i === index) {
                    const novaForma = { ...forma, [field]: value };
                    if (field === "tipo") {
                        return {
                            tipo: value,
                            valor_pix: 0,
                            valor_boleto: 0,
                            valor_dinheiro: 0,
                            parcelas: 0,
                            valor_parcela: 0
                        };
                    }
                    return novaForma;
                }
                return forma;
            })
        );
    };

    const parseValorMonetario = (valor) => {
        // Se já for um número, retorna diretamente (ou 0 se for NaN)
        if (typeof valor === 'number') {
            const resultado = isNaN(valor) ? 0 : valor;
            return resultado;
        }

        // Se for uma string, tenta processá-la
        if (typeof valor === 'string' && valor.trim() !== '') {
            // Remove pontos de milhar e substitui vírgula decimal por ponto
            const valorLimpo = valor.trim().replace(/\./g, '').replace(',', '.');
            const valorNumerico = parseFloat(valorLimpo);
            const resultado = isNaN(valorNumerico) ? 0 : valorNumerico;
            return resultado;
        }

        // Para null, undefined, string vazia, ou outros tipos, retorna 0
        return 0;
    };


    // Calculo do Valor Total Bruto
    const valorTotalBruto = useMemo(() => {
        return formasPagamento.reduce((total, forma) => {
            let valorDaForma = 0;
            if (forma.tipo === "Pix") {
                valorDaForma = parseValorMonetario(forma.valor_pix);
            } else if (forma.tipo === "Boleto") {
                valorDaForma = parseValorMonetario(forma.valor_boleto);
            } else if (forma.tipo === "Dinheiro") {
                valorDaForma = parseValorMonetario(forma.valor_dinheiro);
            } else if (forma.tipo === "Parcelamento") {
                const parcelas = parseInt(forma.parcelas, 10) || 1;
                const valorParcela = parseValorMonetario(forma.valor_parcela);
                valorDaForma = parcelas * valorParcela;
            }
            return total + valorDaForma;
        }, 0);
    }, [formasPagamento]);

    useEffect(() => {
        setForm((prevForm) => ({
            ...prevForm,
            formas_pagamento: formasPagamento,
        }));
    }, [formasPagamento, setForm]);


    return (
        <div className="col-span-2 flex flex-col gap-4 p-2">
            {formasPagamento.map((forma, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 items-end rounded-md border p-4 relative">
                    <CampoDropdownEditavel
                        label="Tipo de Pagamento"
                        name={`tipo_pagamento_${index}`}
                        value={forma.tipo}
                        onChange={(e) => handleFormaChange(index, "tipo", e.target.value)}
                        tipo="condicao_pagamento_options"
                        usuario={usuario}
                        obrigatorio
                        placeholder="Selecione o Tipo"
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
                                label="Nº Parcelas"
                                name={`parcelas_${index}`}
                                value={forma.parcelas || 1}
                                onChange={(e) => handleFormaChange(index, "parcelas", parseInt(e.target.value, 10) || 1)}
                                min={1}
                            />
                            <CampoValorMonetario
                                label="Valor da Parcela"
                                name={`valor_parcela_${index}`}
                                value={forma.valor_parcela || ""}
                                onChange={(e) => handleFormaChange(index, "valor_parcela", e.target.value)}
                            />
                        </>
                    )}
                    {formasPagamento.length > 1 && (
                        <div className="absolute top-2 right-2">
                            <button
                                type="button"
                                onClick={() => removerFormaPagamento(index)}
                                className="absolute top-0 right-0 text-red-500 hover:text-red-700 font-medium py-1 px-2 flex items-center gap-1"
                                title="Remover forma de pagamento"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    )}
                </div>
            ))}

            <button
                type="button"
                onClick={adicionarFormaPagamento}
                className="self-start bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2"
            >
                <Plus size={20} />
                Adicionar Forma de Pagamento
            </button>

            {/* Totais */}
            <div className="grid grid-cols-1 gap-4 mt-6 pt-4 border-t">
                <CampoValorMonetario
                    label="Valor Total"
                    name="valor_total"
                    value={valorTotalBruto}
                    disabled
                />
            </div>
        </div>
    );
}