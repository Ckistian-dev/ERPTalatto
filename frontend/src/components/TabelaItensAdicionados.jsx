import { Pencil, Trash2 } from "lucide-react";

// Função auxiliar para formatar valores monetários, evitando repetição de código
const formatarMoeda = (valor) => {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export default function TabelaItensAdicionados({ itens = [], onEditar, onExcluir }) {
  return (
    <div className="col-span-2 w-full max-w-full">
      <h2 className="text-xl font-bold mb-4 text-gray-700">Itens do Pedido</h2>
      <div className="border rounded-lg shadow-sm overflow-x-auto w-full">
        <table className="w-full text-sm text-gray-800">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              {/* VVVVVVVV CABEÇALHOS ATUALIZADOS VVVVVVVV */}
              <th className="px-3 py-3 text-left min-w-[200px]">Produto</th>
              <th className="px-3 py-3 text-center min-w-[50px]">Qtd</th>
              <th className="px-3 py-3 text-right min-w-[110px]">Preço Unit.</th>
              <th className="px-3 py-3 text-right min-w-[110px]">Subtotal</th>
              <th className="px-3 py-3 text-right min-w-[110px]">Desconto</th>
              <th className="px-3 py-3 text-right min-w-[120px] text-base">Total</th>
              <th className="px-3 py-3 text-center min-w-[80px]">Ações</th>
              {/* ^^^^^^^^ CABEÇALHOS ATUALIZADOS ^^^^^^^^ */}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!Array.isArray(itens) || itens.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                  Nenhum item adicionado
                </td>
              </tr>
            ) : (
              itens.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  {/* VVVVVVVV CÉLULAS ATUALIZADAS COM NOVOS DADOS VVVVVVVV */}
                  <td className="px-3 py-3 font-medium">{item.produto || "-"}</td>
                  <td className="px-3 py-3 text-center">{item.quantidade_itens}</td>
                  <td className="px-3 py-3 text-right">{formatarMoeda(item.preco_unitario)}</td>
                  <td className="px-3 py-3 text-right text-gray-500 line-through">{formatarMoeda(item.subtotal)}</td>
                  <td className="px-3 py-3 text-right text-green-600">{formatarMoeda(item.desconto_item)}</td>
                  <td className="px-3 py-3 text-right font-bold text-base">{formatarMoeda(item.total_com_desconto)}</td>
                  {/* ^^^^^^^^ CÉLULAS ATUALIZADAS COM NOVOS DADOS ^^^^^^^^ */}
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditar(index);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExcluir(index);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}