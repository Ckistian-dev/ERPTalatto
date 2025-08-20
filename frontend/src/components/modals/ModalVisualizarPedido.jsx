import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import { FaFilePdf, FaBuilding } from 'react-icons/fa';
import html2pdf from 'html2pdf.js';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_BASE_URL;

// --- DADOS DAS EMPRESAS PARA SELEÇÃO ---
const empresasDisponiveis = [
    {
        id: 'industria',
        nome: 'Talatto Industria e Comercio LTDA',
        cnpj: '29.987.353/0001-09',
        endereco: 'R. Alberto Dalcanale, 3103 - Jd. Anapolis, Toledo - PR',
        telefone: '(45) 2033-7000',
        logo: 'https://i.ibb.co/gLDXc5n8/image.png'
    },
    {
        id: 'varejo',
        nome: 'Talatto Varejo LTDA',
        cnpj: '47.515.765/0001-28',
        endereco: 'R. Alberto Dalcanale, 3103 - Jd. Anapolis, Toledo - PR',
        telefone: '(45) 2033-7000',
        logo: 'https://i.ibb.co/gLDXc5n8/image.png'
    },
    {
        id: 'distribuidora',
        nome: 'Tlt Distribuidora LTDA',
        cnpj: '60.276.408/0001-12',
        endereco: 'R. Alberto Dalcanale, 3103 - Jd. Anapolis, Toledo - PR',
        telefone: '(45) 2033-7000',
        logo: 'https://i.ibb.co/gLDXc5n8/image.png'
    }
];

const pedidoVazio = {
    id: '',
    data_emissao: '',
    data_validade: '',
    cliente_nome: '',
    vendedor_nome: '',
    origem_venda: '',
    situacao_pedido: '',
    tipo_frete: '',
    transportadora_nome: '',
    valor_frete: 0,
    prazo_entrega_dias: '',
    total: 0,
    desconto_total: 0,
    total_com_desconto: 0,
    observacao: '',
    lista_itens: '[]',
    formas_pagamento: '[]',
};

// =================================================================================
// LÓGICA DE CÁLCULO
// =================================================================================
const faixasDescontoDefinidas = [120, 60, 50, 48, 40, 36, 30, 25, 24, 20, 18, 12, 10, 8, 7, 6, 5, 4, 3, 2];

const getPriceConfig = (tabelaPrecoId, precosDisponiveis) => {
    if (!precosDisponiveis || !tabelaPrecoId) return null;
    const searchTerm = String(tabelaPrecoId).trim().toLowerCase();
    const precoEncontrado = precosDisponiveis.find(p => {
        const idStr = p.id ? String(p.id).trim().toLowerCase() : '';
        const nomeStr = p.nome ? String(p.nome).trim().toLowerCase() : '';
        return idStr === searchTerm || nomeStr === searchTerm;
    });
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

const calcularValoresItem = (item, precosDisponiveis) => {
    const priceConfig = getPriceConfig(item.tabela_preco_id, precosDisponiveis);
    const quantidade = Number(item.quantidade_itens) || 1;
    if (!priceConfig || typeof priceConfig.valor === 'undefined') {
        const subtotalSalvo = Number(item.subtotal) || 0;
        return { ...item, preco_unitario: quantidade > 0 ? subtotalSalvo / quantidade : 0, total_com_desconto: subtotalSalvo };
    }
    const precoUnitarioBase = parseFloat(priceConfig.valor);
    const descontoUnitario = getDescontoAplicado(quantidade, priceConfig.descontos);
    const precoUnitarioFinal = precoUnitarioBase - descontoUnitario;
    return { ...item, preco_unitario: precoUnitarioFinal, total_com_desconto: precoUnitarioFinal * quantidade };
};

// =================================================================================
// COMPONENTES DE VISUALIZAÇÃO
// =================================================================================
function formatarValor(valor) {
    const numero = Number(valor);
    if (isNaN(numero)) return 'R$ 0,00';
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function CabecalhoEmpresa({ empresa }) {
    if (!empresa) return null;
    return (
        <header className="flex justify-between items-start pb-3 border-b">
            <div className="flex-shrink-0">
                <img src={empresa.logo} alt={`Logo ${empresa.nome}`} className="h-16 w-auto" crossOrigin="anonymous" />
            </div>
            <div className="text-right text-[11px] text-gray-600">
                <p className="font-bold text-xs text-gray-800">{empresa.nome}</p>
                <p>CNPJ: {empresa.cnpj}</p>
                <p>{empresa.endereco}</p>
                <p>Telefone: {empresa.telefone}</p>
            </div>
        </header>
    );
}

function DetalhesGerais({ pedido }) {
    return (
        <section className="mt-4 text-xs">
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                <div>
                    <span className="text-gray-500">Cliente:</span>
                    <p className="font-semibold text-gray-800">{pedido.cliente_nome || "Não informado"}</p>
                </div>
                <div>
                    <span className="text-gray-500">Emissão:</span>
                    <p className="font-semibold text-gray-800">{pedido.data_emissao || "Não informada"}</p>
                </div>
                <div>
                    <span className="text-gray-500">Situação:</span>
                    <p className="font-semibold text-gray-800">{pedido.situacao_pedido || "Não informada"}</p>
                </div>
                <div>
                    <span className="text-gray-500">Vendedor:</span>
                    <p className="font-semibold text-gray-800">{pedido.vendedor_nome || "Não informado"}</p>
                </div>
                <div>
                    <span className="text-gray-500">Validade:</span>
                    <p className="font-semibold text-gray-800">{pedido.data_validade || "Não informada"}</p>
                </div>
                <div>
                    <span className="text-gray-500">Prazo Entrega:</span>
                    <p className="font-semibold text-gray-800">{pedido.prazo_entrega_dias ? `${pedido.prazo_entrega_dias} dias úteis` : "Não informado"}</p>
                </div>
            </div>
        </section>
    );
}

function TabelaItens({ itens }) {
    return (
        <div className="mt-5">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Itens do Orçamento</h3>
            <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-xs text-left text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 uppercase">
                        <tr>
                            <th scope="col" className="px-3 py-2">Produto/Serviço</th>
                            <th scope="col" className="px-3 py-2 text-center">Qtd.</th>
                            <th scope="col" className="px-3 py-2 text-right">Valor Unit.</th>
                            <th scope="col" className="px-3 py-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itens && itens.length > 0 ? (
                            itens.map((item, index) => (
                                <tr key={item.produto_id || index} className="bg-white border-b last:border-b-0 hover:bg-gray-50">
                                    <td className="px-3 py-2 font-medium text-gray-900">{item.produto || "Produto não encontrado"}</td>
                                    <td className="px-3 py-2 text-center">{item.quantidade_itens || 0}</td>
                                    <td className="px-3 py-2 text-right">{formatarValor(item.preco_unitario)}</td>
                                    <td className="px-3 py-2 text-right font-semibold">{formatarValor(item.total_com_desconto)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="text-center py-3 text-gray-500">Nenhum item adicionado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TabelaFormasPagamento({ formasPagamento }) {
     return (
        <div className="mt-5">
            <h3 className="text-base font-semibold text-gray-800 mb-2">Formas de Pagamento</h3>
            <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-xs text-left text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 uppercase">
                        <tr>
                            <th scope="col" className="px-3 py-2">Tipo</th>
                            <th scope="col" className="px-3 py-2">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formasPagamento && formasPagamento.length > 0 ? (
                            formasPagamento.map((fp, index) => {
                                let detalhes = '';
                                if (fp.tipo?.toLowerCase() === 'parcelamento' && fp.parcelas > 0) {
                                    detalhes = `${fp.parcelas}x de ${formatarValor(fp.valor_parcela)}`;
                                } else if (fp.valor_pix) detalhes = `PIX: ${formatarValor(fp.valor_pix)}`;
                                else if (fp.valor_boleto) detalhes = `Boleto: ${formatarValor(fp.valor_boleto)}`;
                                else if (fp.valor_dinheiro) detalhes = `Dinheiro: ${formatarValor(fp.valor_dinheiro)}`;
                                return (
                                    <tr key={index} className="bg-white border-b last:border-b-0 hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-900">{fp.tipo || "Não especificado"}</td>
                                        <td className="px-3 py-2">{detalhes || "Não informado"}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="2" className="text-center py-3 text-gray-500">Nenhuma forma de pagamento.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TotaisOrcamento({ pedido, totalItensRecalculado }) {
    const valorFrete = Number(pedido.valor_frete) || 0;
    const descontoGeral = Number(pedido.desconto_total) || 0;
    const totalFinal = totalItensRecalculado + valorFrete - descontoGeral;

    return (
        <div className="flex justify-end mt-6 text-sm px-2">
            <div className="w-full">
                <div className="flex justify-between py-1">
                    <span className="text-gray-600">Total dos Itens:</span>
                    <span className="font-medium text-gray-800">{formatarValor(totalItensRecalculado)}</span>
                </div>
                <div className="flex justify-between py-1">
                    <span className="text-gray-600">Frete ({pedido.tipo_frete || 'N/D'}):</span>
                    <span className="font-medium text-gray-800">{formatarValor(valorFrete)}</span>
                </div>
                {descontoGeral > 0 && (
                    <div className="flex justify-between py-1">
                        <span className="text-gray-600">Desconto Geral:</span>
                        <span className="font-medium text-red-600">(- {formatarValor(descontoGeral)})</span>
                    </div>
                )}
                <div className="flex justify-between py-2 mt-2 border-t-2 border-gray-200">
                    <span className="text-base font-bold text-gray-900">VALOR TOTAL:</span>
                    <span className="text-base font-bold text-green-700">{formatarValor(totalFinal)}</span>
                </div>
            </div>
        </div>
    );
}

function InformacoesAdicionais({ observacao }) {
    return (
        <footer className="mt-5 pt-3 border-t text-xs text-gray-600 space-y-2">
             {observacao && (<div><h4 className="font-semibold text-gray-700 mb-0.5">Observações</h4><p className="whitespace-pre-wrap">{observacao}</p></div>)}
        </footer>
    );
}

// --- COMPONENTE PRINCIPAL ATUALIZADO ---
export default function ModalVisualizarPedido({ pedido = pedidoVazio, onClose }) {
    
    const [view, setView] = useState('selecionar_empresa'); // 'selecionar_empresa' ou 'visualizar_orcamento'
    const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
    const [empresaIdTemporaria, setEmpresaIdTemporaria] = useState('industria');

    const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
    const [precosDisponiveis, setPrecosDisponiveis] = useState([]);
    const [loading, setLoading] = useState(false);

    const itensOriginais = useMemo(() => {
        try {
            return Array.isArray(pedido.lista_itens) ? pedido.lista_itens : JSON.parse(pedido.lista_itens || '[]');
        } catch (e) { return []; }
    }, [pedido.lista_itens]);

    useEffect(() => {
        if (view === 'visualizar_orcamento') {
            const carregarDadosEssenciais = async () => {
                if (!itensOriginais || itensOriginais.length === 0) {
                    setLoading(false);
                    return;
                }
                
                setLoading(true);
                try {
                    const promessaProdutos = axios.get(`${API_URL}/produtos_dropdown`);
                    const promessasPrecos = itensOriginais.map(item =>
                        axios.get(`${API_URL}/tabela_precos_por_produto?produto_id=${item.produto_id}`)
                    );

                    const [produtosRes, ...respostasPrecos] = await Promise.all([
                        promessaProdutos,
                        ...promessasPrecos
                    ]);

                    setProdutosDisponiveis(produtosRes.data);
                    const todasAsTabelas = respostasPrecos.flatMap(res => res.data);
                    const tabelasUnicas = new Map();
                    todasAsTabelas.forEach(tabela => {
                        if (!tabelasUnicas.has(tabela.id)) {
                            tabelasUnicas.set(tabela.id, tabela);
                        }
                    });
                    setPrecosDisponiveis(Array.from(tabelasUnicas.values()));

                } catch (error) {
                    toast.error("Erro ao carregar dados para visualização.");
                } finally {
                    setLoading(false);
                }
            };

            carregarDadosEssenciais();
        }
    }, [view, itensOriginais]);

    const handleContinuar = () => {
        const empresa = empresasDisponiveis.find(e => e.id === empresaIdTemporaria);
        setEmpresaSelecionada(empresa);
        setView('visualizar_orcamento');
    };

    const itensEnriquecidosECalculados = useMemo(() => {
        if (loading) return [];
        if (!itensOriginais) return [];
        return itensOriginais.map(item => {
            const produtoInfo = produtosDisponiveis.find(p => p.id === item.produto_id);
            const itemComNome = { ...item, produto: produtoInfo ? produtoInfo.descricao : item.produto };
            return calcularValoresItem(itemComNome, precosDisponiveis);
        });
    }, [itensOriginais, produtosDisponiveis, precosDisponiveis, loading]);
    
    const totalItensRecalculado = useMemo(() => {
        return itensEnriquecidosECalculados.reduce((acc, item) => acc + (item.total_com_desconto || 0), 0);
    }, [itensEnriquecidosECalculados]);

    const formasPagamento = useMemo(() => {
        try {
            return Array.isArray(pedido.formas_pagamento) ? pedido.formas_pagamento : JSON.parse(pedido.formas_pagamento || '[]');
        } catch (e) { return []; }
    }, [pedido.formas_pagamento]);

    const gerarPDF = () => {
        const elemento = document.getElementById('conteudo-orcamento');
        const botoes = elemento.querySelectorAll('.no-print');
        botoes.forEach(btn => btn.style.visibility = 'hidden');
        const options = {
            margin: [8, 8, 8, 8],
            filename: `orcamento_${pedido.id || 'sem_numero'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, dpi: 300, letterRendering: true, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(options).from(elemento).save().finally(() => {
            botoes.forEach(btn => btn.style.visibility = 'visible');
        });
    };

    if (view === 'selecionar_empresa') {
        return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 text-center">
                    <FaBuilding className="mx-auto text-4xl text-cyan-600 mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Selecionar Emitente</h2>
                    <p className="text-sm text-gray-600 mb-6">Escolha a empresa que emitirá este orçamento.</p>
                    
                    <select
                        value={empresaIdTemporaria}
                        onChange={(e) => setEmpresaIdTemporaria(e.target.value)}
                        className="w-full border p-3 rounded text-sm bg-gray-50 shadow-sm mb-6"
                    >
                        {empresasDisponiveis.map(empresa => (
                            <option key={empresa.id} value={empresa.id}>{empresa.nome}</option>
                        ))}
                    </select>

                    <div className="flex justify-center gap-4">
                        <button onClick={onClose} className="text-gray-600 hover:text-gray-900 font-medium py-2 px-6 rounded-lg">Cancelar</button>
                        <button onClick={handleContinuar} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg">Continuar</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
                <div className="p-4 overflow-y-auto" id="conteudo-orcamento">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <p className="text-gray-500">Carregando dados do orçamento...</p>
                        </div>
                    ) : (
                        <>
                            <CabecalhoEmpresa empresa={empresaSelecionada} />
                            <div className="flex justify-between items-center mt-4">
                                <h2 className="text-xl font-bold text-gray-800">Orçamento #{pedido.id || 'N/A'}</h2>
                            </div>
                            <DetalhesGerais pedido={pedido} />
                            <TabelaItens itens={itensEnriquecidosECalculados} />
                            <TabelaFormasPagamento formasPagamento={formasPagamento} />
                            <TotaisOrcamento pedido={pedido} totalItensRecalculado={totalItensRecalculado} />
                            <InformacoesAdicionais observacao={pedido.observacao} />
                        </>
                    )}
                </div>
                <div className="flex-shrink-0 p-3 bg-gray-50 border-t rounded-b-lg flex justify-between items-center no-print">
                     <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-sm font-medium py-1.5 px-3 rounded-md">Fechar</button>
                    <button onClick={gerarPDF} disabled={loading} className="bg-red-700 hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded-md flex items-center gap-2 transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"><FaFilePdf /> Baixar PDF</button>
                </div>
            </div>
        </div>
    );
}
