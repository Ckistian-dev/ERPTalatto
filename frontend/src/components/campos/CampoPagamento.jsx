import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import CampoValorMonetario from '@/components/campos/CampoValorMonetario';
import CampoNumSetas from '@/components/campos/CampoNumSetas';
import { X, Plus } from 'lucide-react';

export default function CampoPagamento({ form, setForm, handleChange, tipo }) {
    const { usuario } = useAuth();
    const formasPagamento = form.formas_pagamento || [];

    const normalizeValor = (valor) => {
        if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
        if (typeof valor === 'string' && valor.trim() !== '') {
            const valorLimpo = valor.trim().replace(/\./g, '').replace(',', '.');
            const parsed = parseFloat(valorLimpo);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };
    
    const [totalManualFoiEditado, setTotalManualFoiEditado] = useState(
        () => normalizeValor(form.total_com_desconto) > 0 || normalizeValor(form.desconto_total) > 0
    );

    useEffect(() => {
        const totalProdutos = normalizeValor(form.total);
        const valorFrete = normalizeValor(form.valor_frete);
        const manual = normalizeValor(form.total_com_desconto);
        
        const totalNota = totalManualFoiEditado ? manual : totalProdutos + valorFrete;
        
        let pagos = 0;
        formasPagamento.forEach(f => {
            pagos += normalizeValor(f.valor_pix);
            pagos += normalizeValor(f.valor_boleto);
            pagos += normalizeValor(f.valor_dinheiro);
        });

        const parc = formasPagamento.find(f => f.tipo === 'Parcelamento');
        const numParcels = parc ? (parseInt(parc.parcelas, 10) || 1) : 1;

        const restante = totalNota - pagos;
        const valorParc = (restante > 0 && numParcels > 0) ? restante / numParcels : 0;
        
        const descontoCalc = (totalProdutos + valorFrete) - totalNota;

        const updates = {};
        let hasChanges = false;

        const novasFormas = formasPagamento.map(f => {
            if (f.tipo === 'Parcelamento') {
                const valorAntigo = normalizeValor(f.valor_parcela).toFixed(2);
                const valorNovo = normalizeValor(valorParc).toFixed(2);
                if (valorAntigo !== valorNovo) {
                    return { ...f, valor_parcela: valorParc };
                }
            }
            return f;
        });

        if (JSON.stringify(formasPagamento) !== JSON.stringify(novasFormas)) {
            updates.formas_pagamento = novasFormas;
            hasChanges = true;
        }

        if (!totalManualFoiEditado) {
            const descontoAtual = normalizeValor(form.desconto_total);
            const descontoNovo = descontoCalc > 0 ? descontoCalc : 0;
            if (descontoAtual.toFixed(2) !== descontoNovo.toFixed(2)) {
                updates.desconto_total = descontoNovo;
                updates.total_com_desconto = totalProdutos + valorFrete - descontoNovo;
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
            setForm(prev => ({ ...prev, ...updates }));
        }
    }, [form.total, form.valor_frete, form.total_com_desconto, form.formas_pagamento, totalManualFoiEditado, setForm]);


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
        setForm(prev => ({ ...prev, formas_pagamento: novasFormas }));
    };

    const handleTotalManualChange = (e) => {
        if (!totalManualFoiEditado) {
            setTotalManualFoiEditado(true);
        }
        handleChange(e);
    };

    const adicionarFormaPagamento = () => {
        setForm(prev => ({ 
            ...prev, 
            formas_pagamento: [
                ...prev.formas_pagamento, 
                { tipo: "", valor_pix: 0, valor_boleto: 0, valor_dinheiro: 0, parcelas: 1, valor_parcela: 0 }
            ]
        }));
    };

    const removerFormaPagamento = (index) => {
        setForm(prev => ({
            ...prev,
            formas_pagamento: prev.formas_pagamento.filter((_, i) => i !== index)
        }));
    };

    const valorParcelaAtual = useMemo(() => {
        const parcela = formasPagamento.find(f => f.tipo === "Parcelamento");
        return parcela?.valor_parcela || 0;
    }, [formasPagamento]);

    return (
        // LAYOUT RESTAURADO: Voltando para col-span-2 para ocupar as duas colunas do grid pai
        <div className="col-span-2 flex flex-col gap-4">
            {formasPagamento.map((forma, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 items-end rounded-md border p-4 relative">
                    <CampoDropdownEditavel
                        label="Tipo de Pagamento"
                        name={`tipo_pagamento_${index}`}
                        value={forma.tipo}
                        onChange={(e) => handleFormaChange(index, "tipo", e.target.value)}
                        tipo={tipo === "venda" ? "condicao_pagamento_venda_options" : "condicao_pagamento_options"}
                        usuario={usuario}
                        obrigatorio
                        placeholder="Selecione o Tipo"
                    />
                    {forma.tipo === "Pix" && <CampoValorMonetario label="Valor Pix" name={`valor_pix_${index}`} value={forma.valor_pix || ""} onChange={(e) => handleFormaChange(index, "valor_pix", e.target.value)} />}
                    {forma.tipo === "Boleto" && <CampoValorMonetario label="Valor Boleto" name={`valor_boleto_${index}`} value={forma.valor_boleto || ""} onChange={(e) => handleFormaChange(index, "valor_boleto", e.target.value)} />}
                    {forma.tipo === "Dinheiro" && <CampoValorMonetario label="Valor Dinheiro" name={`valor_dinheiro_${index}`} value={forma.valor_dinheiro || ""} onChange={(e) => handleFormaChange(index, "valor_dinheiro", e.target.value)} />}
                    {forma.tipo === "Parcelamento" && (
                        <>
                            <CampoNumSetas label="Nº Parcelas" name={`parcelas_${index}`} value={forma.parcelas || 1} onChange={(e) => handleFormaChange(index, "parcelas", parseInt(e.target.value, 10) || 1)} min={1} />
                            <CampoValorMonetario label="Valor da Parcela" name={`valor_parcela_${index}`} value={valorParcelaAtual} disabled />
                        </>
                    )}
                    {formasPagamento.length > 1 && (
                        <div className="absolute top-2 right-2">
                            <button type="button" onClick={() => removerFormaPagamento(index)} className="text-red-500 hover:text-red-700" title="Remover forma de pagamento">
                                <X size={20} />
                            </button>
                        </div>
                    )}
                </div>
            ))}
            <button
                type="button"
                onClick={adicionarFormaPagamento}
                className="self-start bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2 mt-2"
            >
                <Plus size={20} />Adicionar Forma de Pagamento
            </button>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 pt-4 border-t items-end">
                <CampoValorMonetario label="Total Produtos" name="total" value={form.total || 0} disabled />
                <CampoValorMonetario label="Total Frete" name="valor_frete" value={form.valor_frete || 0} disabled />
                <CampoValorMonetario label="Total de Descontos" name="desconto_total" value={form.desconto_total || 0} disabled />
                <CampoValorMonetario 
                    label="Total da Nota" 
                    name="total_com_desconto" 
                    value={form.total_com_desconto || 0} 
                    onChange={handleTotalManualChange} 
                    placeholder="0,00" 
                />
            </div>
        </div>
    );
}