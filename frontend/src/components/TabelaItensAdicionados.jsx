import { Pencil, Trash2 } from "lucide-react";

export default function TabelaItensAdicionados({ itens = [], onEditar, onExcluir }) {
  return (
    <div className="col-span-2 w-full max-w-full">
      <h2 className="text-xl font-bold mb-4 text-gray-700">Itens Adicionados</h2>
      <div className="border rounded-lg shadow-sm overflow-x-auto w-full">
        <table className="w-full text-xs text-gray-700">
          <thead className="bg-gray-100 text-gray-700 uppercase">
            <tr>
              <th className="px-2 py-2 text-left min-w-[100px]">Produto</th>
              <th className="px-2 py-2 text-left min-w-[100px]">Tabela de Preço</th>
              <th className="px-2 py-2 text-center min-w-[60px]">Qtd</th>
              <th className="px-2 py-2 text-right min-w-[80px]">Subtotal</th>
              <th className="px-2 py-2 text-center min-w-[70px]">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white">
          {!Array.isArray(itens) || itens.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-gray-400">
                  Nenhum item adicionado
                </td>
              </tr>
            ) : (
              itens.map((item, index) => (
                <tr key={index} className="border-t hover:bg-gray-50 transition">
                  <td className="px-2 py-2">{item.produto || "-"}</td>
                  <td className="px-2 py-2">{item.tabela_preco || "-"}</td>
                  <td className="px-2 py-2 text-center">{item.quantidade_itens}</td>
                  <td className="px-2 py-2 text-right">
                    {Number(item.subtotal || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditar(index);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-md"
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
                        className="bg-red-600 hover:bg-red-700 text-white p-1 rounded-md"
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
