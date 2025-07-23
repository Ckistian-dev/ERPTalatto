import React, { useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import CampoValorMonetario from '@/components/campos/CampoValorMonetario';
import CampoNumSetas from '@/components/campos/CampoNumSetas';
import { X, Plus } from 'lucide-react';

export default function CampoPagamento({ form, setForm, tipo }) {
    const { usuario } = useAuth();
    const formasPagamento = form.formas_pagamento || [];

    // Função auxiliar para garantir que estamos sempre trabalhando com números
    const normalizeValor = (valor) => {
        if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
        if (typeof valor === 'string' && valor.trim() !== '') {
            const valorLimpo = valor.trim().replace(/\./g, '').replace(',', '.');
            const parsed = parseFloat(valorLimpo);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    // CORREÇÃO: Lógica de cálculo centralizada e simplificada no useEffect principal
    useEffect(() => {
        const totalProdutos = normalizeValor(form.total);
        const valorFrete = normalizeValor(form.valor_frete);
        const totalBruto = totalProdutos + valorFrete; // Total antes de descontos
        const totalDaNota = normalizeValor(form.total_com_desconto);
        
        // 1. CALCULA O DESCONTO AUTOMATICAMENTE
        // O desconto é a diferença entre o total bruto e o total final da nota.
        const descontoCalculado = totalBruto - totalDaNota;

        // 2. CALCULA O VALOR RESTANTE PARA PARCELAMENTO
        let totalPagoNaEntrada = 0;
        formasPagamento.forEach(f => {
            if (f.tipo !== 'Parcelamento') {
                totalPagoNaEntrada += normalizeValor(f.valor_pix) + normalizeValor(f.valor_boleto) + normalizeValor(f.valor_dinheiro);
            }
        });

        const valorAParcelar = totalDaNota - totalPagoNaEntrada;

        // 3. ATUALIZA O ESTADO DO FORMULÁRIO (SE NECESSÁRIO)
        
        // Prepara um objeto para guardar apenas as atualizações necessárias
        const updates = {};
        
        // Atualiza o valor do desconto no formulário
        if (normalizeValor(form.desconto_total).toFixed(2) !== normalizeValor(descontoCalculado).toFixed(2)) {
            updates.desconto_total = descontoCalculado >= 0 ? descontoCalculado : 0;
        }

        // Atualiza o valor das parcelas
        const novasFormas = formasPagamento.map(f => {
            if (f.tipo === 'Parcelamento') {
                const numParcelas = parseInt(f.parcelas, 10) || 1;
                const novoValorParcela = (valorAParcelar > 0 && numParcelas > 0) ? valorAParcelar / numParcelas : 0;
                
                if (normalizeValor(f.valor_parcela).toFixed(2) !== normalizeValor(novoValorParcela).toFixed(2)) {
                    return { ...f, valor_parcela: novoValorParcela };
                }
            }
            return f;
        });

        if (JSON.stringify(formasPagamento) !== JSON.stringify(novasFormas)) {
            updates.formas_pagamento = novasFormas;
        }

        // Aplica as atualizações no formulário de uma só vez para evitar re-renderizações excessivas
        if (Object.keys(updates).length > 0) {
            setForm(prev => ({ ...prev, ...updates }));
        }

    }, [
        form.total,
        form.valor_frete,
        form.total_com_desconto,
        form.formas_pagamento,
        setForm
    ]);

    const handleFormaChange = (index, field, value) => {
        const novasFormas = formasPagamento.map((forma, i) => {
            if (i === index) {
                if (field === "tipo") {
                    // Reseta os valores ao trocar o tipo para evitar inconsistências
                    return { tipo: value, valor_pix: 0, valor_boleto: 0, valor_dinheiro: 0, parcelas: 1, valor_parcela: 0 };
                }
                return { ...forma, [field]: value };
            }
            return forma;
        });
        setForm(prev => ({ ...prev, formas_pagamento: novasFormas }));
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

    // handleChange genérico passado pelo componente pai
    const handleChange = (e) => {
        setForm(prev => ({...prev, [e.target.name]: e.target.value}))
    }

    return (
        <div className="col-span-2 flex flex-col gap-4">
            {formasPagamento.map((forma, index) => {
                // Para evitar re-cálculos desnecessários no render
                const valorParcela = forma.tipo === "Parcelamento" ? forma.valor_parcela : 0;

                return (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 items-end rounded-md border p-4 relative">
                        <CampoDropdownEditavel
                            label="Tipo de Pagamento"
                            name={`tipo_pagamento_${index}`}
                            value={forma.tipo}
                            onChange={(e) => handleFormaChange(index, "tipo", e.target.value)}
                            tipo={tipo === "venda" ? "condicao_pagamento_venda_options" : "condicao_pagamento_options"}
                            usuario={usuario}
                            obrigatorio
                        />
                        {forma.tipo === "Pix" && <CampoValorMonetario label="Valor Pix" value={forma.valor_pix || ""} onChange={(e) => handleFormaChange(index, "valor_pix", e.target.value)} />}
                        {forma.tipo === "Boleto" && <CampoValorMonetario label="Valor Boleto" value={forma.valor_boleto || ""} onChange={(e) => handleFormaChange(index, "valor_boleto", e.target.value)} />}
                        {forma.tipo === "Dinheiro" && <CampoValorMonetario label="Valor Dinheiro" value={forma.valor_dinheiro || ""} onChange={(e) => handleFormaChange(index, "valor_dinheiro", e.target.value)} />}
                        {forma.tipo === "Parcelamento" && (
                            <>
                                <CampoNumSetas label="Nº Parcelas" value={forma.parcelas || 1} onChange={(e) => handleFormaChange(index, "parcelas", parseInt(e.target.value, 10) || 1)} min={1} />
                                <CampoValorMonetario label="Valor da Parcela" value={valorParcela} disabled />
                            </>
                        )}
                        {formasPagamento.length > 1 && (
                            <div className="absolute top-2 right-2">
                                <button type="button" onClick={() => removerFormaPagamento(index)} className="text-red-500 hover:text-red-700" title="Remover">
                                    <X size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
            <button
                type="button"
                onClick={adicionarFormaPagamento}
                className="self-start bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2 mt-2"
            >
                <Plus size={20} />Adicionar Forma de Pagamento
            </button>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 pt-4 border-t items-end">
                <CampoValorMonetario label="Total Produtos" name="total" value={form.total || 0} disabled />
                <CampoValorMonetario label="Total Frete" name="valor_frete" value={form.valor_frete || 0} onChange={handleChange} />
                {/* O campo de desconto agora é apenas para exibição, pois é calculado automaticamente */}
                <CampoValorMonetario label="Total de Descontos" name="desconto_total" value={form.desconto_total || 0} disabled />
                <CampoValorMonetario 
                    label="Total da Nota" 
                    name="total_com_desconto" 
                    value={form.total_com_desconto || 0} 
                    onChange={handleChange} 
                />
            </div>
        </div>
    );
}