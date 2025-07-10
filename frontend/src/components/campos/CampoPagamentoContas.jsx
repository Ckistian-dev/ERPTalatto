import React, { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import CampoValorMonetario from '@/components/campos/CampoValorMonetario';
import CampoNumSetas from '@/components/campos/CampoNumSetas';
import { X, Plus } from 'lucide-react';

export default function CampoPagamentoContas({ form, setForm }) {
    const { usuario } = useAuth();
    
    // Lê diretamente das props. Se estiver vazio, cria um item padrão para exibição.
    const formasPagamento = form.formas_pagamento?.length > 0 
        ? form.formas_pagamento 
        : [{ tipo: "", valor_pix: 0, valor_boleto: 0, valor_dinheiro: 0, parcelas: 1, valor_parcela: 0 }];

    const handleFormaChange = (index, field, value) => {
        const novasFormas = formasPagamento.map((forma, i) => {
            if (i === index) {
                if (field === "tipo") {
                    return { tipo: value, valor_pix: 0, valor_boleto: 0, valor_dinheiro: 0, parcelas: 1, valor_parcela: 0 };
                }
                return { ...forma, [field]: value };
            }
            return forma;
        });
        
        setForm(prevForm => ({
            ...prevForm,
            formas_pagamento: novasFormas
        }));
    };

    const adicionarFormaPagamento = () => {
        const novasFormas = [
            ...(form.formas_pagamento || []),
            { tipo: "", valor_pix: 0, valor_boleto: 0, valor_dinheiro: 0, parcelas: 1, valor_parcela: 0 }
        ];
        setForm(prevForm => ({
            ...prevForm,
            formas_pagamento: novasFormas
        }));
    };

    const removerFormaPagamento = (index) => {
        const novasFormas = form.formas_pagamento.filter((_, i) => i !== index);
        setForm(prevForm => ({
            ...prevForm,
            formas_pagamento: novasFormas
        }));
    };

    const parseValorMonetario = (valor) => {
        if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
        if (typeof valor === 'string' && valor.trim() !== '') {
            const valorLimpo = valor.trim().replace(/\./g, '').replace(',', '.');
            const valorNumerico = parseFloat(valorLimpo);
            return isNaN(valorNumerico) ? 0 : valorNumerico;
        }
        return 0;
    };

    const valorTotalBruto = useMemo(() => {
        return (form.formas_pagamento || []).reduce((total, forma) => {
            let valorDaForma = 0;
            if (forma.tipo === "Pix") valorDaForma = parseValorMonetario(forma.valor_pix);
            else if (forma.tipo === "Boleto") valorDaForma = parseValorMonetario(forma.valor_boleto);
            else if (forma.tipo === "Dinheiro") valorDaForma = parseValorMonetario(forma.valor_dinheiro);
            else if (forma.tipo === "Parcelamento") {
                const parcelas = parseInt(forma.parcelas, 10) || 1;
                const valorParcela = parseValorMonetario(forma.valor_parcela);
                valorDaForma = parcelas * valorParcela;
            }
            return total + valorDaForma;
        }, 0);
    }, [form.formas_pagamento]);

    return (
        <div className="col-span-2 flex flex-col gap-4 p-2">
            {formasPagamento.map((forma, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 items-end rounded-md border p-4 relative">
                    <CampoDropdownEditavel
                        label="Tipo de Pagamento"
                        value={forma.tipo}
                        onChange={(e) => handleFormaChange(index, "tipo", e.target.value)}
                        tipo="condicao_pagamento_options"
                        usuario={usuario}
                        obrigatorio
                        placeholder="Selecione o Tipo"
                    />

                    {forma.tipo === "Pix" && <CampoValorMonetario label="Valor Pix" value={forma.valor_pix || ""} onChange={(e) => handleFormaChange(index, "valor_pix", e.target.value)} />}
                    {forma.tipo === "Boleto" && <CampoValorMonetario label="Valor Boleto" value={forma.valor_boleto || ""} onChange={(e) => handleFormaChange(index, "valor_boleto", e.target.value)} />}
                    {forma.tipo === "Dinheiro" && <CampoValorMonetario label="Valor Dinheiro" value={forma.valor_dinheiro || ""} onChange={(e) => handleFormaChange(index, "valor_dinheiro", e.target.value)} />}

                    {forma.tipo === "Parcelamento" && (
                        <>
                            <CampoNumSetas label="Nº Parcelas" value={forma.parcelas || 1} onChange={(e) => handleFormaChange(index, "parcelas", parseInt(e.target.value, 10) || 1)} min={1} />
                            <CampoValorMonetario label="Valor da Parcela" value={forma.valor_parcela || ""} onChange={(e) => handleFormaChange(index, "valor_parcela", e.target.value)} />
                        </>
                    )}
                    
                    {(form.formas_pagamento?.length > 1 || (form.formas_pagamento?.length === 1 && forma.tipo !== "")) && (
                         <button
                            type="button"
                            onClick={() => removerFormaPagamento(index)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                            title="Remover forma de pagamento"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            ))}

            <button
                type="button"
                onClick={adicionarFormaPagamento}
                className="self-start bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2 mt-2"
            >
                <Plus size={20} /> Adicionar Forma de Pagamento
            </button>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 pt-4 border-t items-end">
                <CampoValorMonetario label="Valor Total da Conta" name="valor_total" value={valorTotalBruto} disabled />
            </div>
        </div>
    );
}