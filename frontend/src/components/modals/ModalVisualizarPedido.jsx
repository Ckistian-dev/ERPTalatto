// ModalVisualizarPedido.jsx
import { X } from 'lucide-react';
import { FaFilePdf } from 'react-icons/fa';
import html2pdf from 'html2pdf.js';

const pedidoVazio = {
    id: '',
    data_emissao: '',
    data_validade: '',
    cliente_nome: '',
    vendedor_nome: '',
    origem_venda: '',
    tipo_frete: '',
    transportadora_nome: '',
    valor_frete: '',
    total: '',
    desconto_total: '',
    total_com_desconto: '',
    observacao: '',
    lista_itens: [],
    formas_pagamento: [],
};

export default function ModalVisualizarPedido({ pedido = pedidoVazio, onClose }) {
    const itens = Array.isArray(pedido.lista_itens)
        ? pedido.lista_itens
        : JSON.parse(pedido.lista_itens || '[]');

    const formasPagamento = typeof pedido.formas_pagamento === 'string'
        ? JSON.parse(pedido.formas_pagamento || '[]')
        : pedido.formas_pagamento || [];

    const gerarPDF = () => {
        const elemento = document.getElementById('conteudo-pedido');

        const botoesParaEsconder = elemento.querySelectorAll('.no-print');
        botoesParaEsconder.forEach(btn => btn.style.display = 'none');

        const options = {
            margin: [10, 10, 10, 10],
            filename: `pedido_${pedido.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, dpi: 300, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const estilosOriginais = elemento.style.cssText;
        elemento.style.fontFamily = '"Arial", "Helvetica Neue", Helvetica, sans-serif';
        elemento.style.color = '#333';
        elemento.style.backgroundColor = '#fff';

        html2pdf()
            .set(options)
            .from(elemento)
            .save()
            .then(() => {
                elemento.style.cssText = estilosOriginais;
                botoesParaEsconder.forEach(btn => btn.style.display = '');
            });
    };



    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative"
                id="conteudo-pedido"
            >
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-gray-500 hover:text-red-500 no-print"
                >
                    <X size={22} />
                </button>

                <h2 className="text-2xl font-bold text-gray-800">
                    Detalhes do Pedido #{pedido.id}
                </h2>

                {/* INFORMAÇÕES GERAIS */}
                <section className="grid grid-cols-1 mt-4">
                    <h3 className="text-lg font-bold text-gray-800">Informações Gerais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 text-gray-600">
                        <Info label="Cliente" value={pedido.cliente_nome} />
                        <Info label="Vendedor" value={pedido.vendedor_nome} />
                        <Info label="Origem da Venda" value={pedido.origem_venda} />
                        <Info label="Situação" value={pedido.situacao_pedido} />
                        <Info label="Data de Emissão" value={pedido.data_emissao} />
                        <Info label="Validade" value={pedido.data_validade} />
                    </div>
                    <div className="grid grid-cols-1 text-gray-600">
                        {pedido.observacao && (
                            <Info label="Observação" value={pedido.observacao} />
                        )}
                    </div>
                </section>

                {/* INFORMAÇÕES DE FRETE */}
                <section className="grid grid-cols-1 mt-4">
                    <h3 className="text-lg font-bold text-gray-800">Informações de Frete</h3>
                    <div className="text-gray-600">
                        <div><strong>Tipo de Frete:</strong> {pedido.tipo_frete || '—'}</div>
                        <div><strong>Transportadora:</strong> {pedido.transportadora_nome || '—'}</div>
                        <div><strong>Valor do Frete:</strong> {formatarValor(pedido.valor_frete)}</div>
                    </div>
                </section>

                {/* ITENS DO PEDIDO */}
                <section className="grid grid-cols-1 mt-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Itens do Pedido</h3>
                    <Table
                        headers={['Produto', 'Variação', 'Qtd', 'Subtotal']}
                        rows={itens.map(item => [
                            item.produto,
                            item.variacao,
                            item.quantidade_itens,
                            formatarValor(item.subtotal),
                        ])}
                    />
                </section>

                {/* FORMAS DE PAGAMENTO */}
                <section className="grid grid-cols-1 mt-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Formas de Pagamento</h3>
                    <Table
                        headers={['Tipo', 'Detalhes']}
                        rows={formasPagamento.map(fp => {
                            let valor = '';
                            if (fp.tipo?.toLowerCase() === 'parcelamento' && fp.parcelas > 0) {
                                const valorParcela = fp.valor_parcela || 0;
                                valor = `${fp.parcelas}x de ${formatarValor(valorParcela)}`;
                            } else if (fp.valor_pix) valor = formatarValor(fp.valor_pix);
                            else if (fp.valor_boleto) valor = formatarValor(fp.valor_boleto);
                            else if (fp.valor_dinheiro) valor = formatarValor(fp.valor_dinheiro);

                            return valor ? [fp.tipo, valor] : null;
                        }).filter(Boolean)}
                    />

                    {/* TOTAIS BONITOS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <CardResumo label="Total Bruto" valor={pedido.total + pedido.valor_frete} />
                        <CardResumo label="Desconto" valor={pedido.desconto_total} />
                        <CardResumo label="Total com Desconto" valor={pedido.total_com_desconto} destaque />
                    </div>
                </section>

                {/* BOTÃO GERAR PDF */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={gerarPDF}
                        className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded flex items-center gap-2 no-print"
                    >
                        <FaFilePdf /> Gerar PDF do Pedido
                    </button>
                </div>
            </div>
        </div>
    );
}

// Info simples
function Info({ label, value }) {
    return (
        <div>
            <strong>{label}:</strong> {value || '—'}
        </div>
    );
}

// Tabela
function Table({ headers = [], rows = [] }) {
    return (
        <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
                <tr>
                    {headers.map((header, idx) => (
                        <th key={idx} className="p-2 border text-left">{header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.length > 0 ? (
                    rows.map((cols, rowIdx) => (
                        <tr key={rowIdx}>
                            {cols.map((col, colIdx) => (
                                <td key={colIdx} className="p-2 border whitespace-nowrap">{col}</td>
                            ))}
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={headers.length} className="p-2 border text-center text-gray-400">
                            Nenhum dado disponível
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}

// Card com destaque
function CardResumo({ label, valor, destaque = false }) {
    return (
        <div className={`p-4 rounded-xl border shadow-sm ${destaque ? 'bg-green-100' : 'bg-gray-50'}`}>
            <div className="text-sm text-gray-600">{label}</div>
            <div className={`text-lg font-semibold ${destaque ? 'text-green-800' : 'text-gray-800'}`}>
                {formatarValor(valor)}
            </div>
        </div>
    );
}

// Formata valor em BRL
function formatarValor(valor) {
    const numero = Number(valor);
    if (isNaN(numero)) return '—';
    return numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
    });
}
