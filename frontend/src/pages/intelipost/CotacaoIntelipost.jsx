import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import CampoDropdownDb from "@/components/campos/CampoDropdownDb";
import CampoNumSetas from "@/components/campos/CampoNumSetas";
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CotacaoIntelipost() {
  const [form, setForm] = useState({
    produto_id: null,
    quantidade: 1,
  });
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCalcular = async (e) => {
    e.preventDefault();
    if (!form.produto_id) {
      toast.warn("Por favor, selecione um produto.");
      return;
    }
    if (!form.quantidade || form.quantidade < 1) {
      toast.warn("A quantidade deve ser de no mínimo 1.");
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      // AJUSTE 1: URL corrigida para o endpoint unificado
      const response = await axios.post(`${API_URL}/embalagem/calcular-volumes`, {
        produto_id: parseInt(form.produto_id),
        quantidade: parseInt(form.quantidade),
      });
      setResultado(response.data);
      toast.success("Volumes calculados com sucesso!");
    } catch (err) {
      console.error("Erro ao calcular volumes:", err);
      const errorMsg = err?.response?.data?.detail || "Ocorreu um erro desconhecido.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
        Cotação Intelipost - Teste de Cálculo de Volumes
      </h1>

      <form onSubmit={handleCalcular} className="p-4 border rounded-lg bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <CampoDropdownDb
              label="Produto"
              name="produto_id"
              value={form.produto_id || ""}
              onChange={handleChange}
              // AJUSTE 2: Verifique se este endpoint está correto no seu app principal
              url={`${API_URL}/produtos_dropdown`}
              campoValor="id"
              campoLabel="descricao"
              campoImagem="url_imagem"
            />
          </div>
          <div>
            <CampoNumSetas
              label="Quantidade de Itens"
              name="quantidade"
              value={form.quantidade || 1}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="flex justify-end mt-6">
            <ButtonComPermissao
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold transition-colors disabled:bg-gray-400"
                disabled={loading}
                // AJUSTE 3: 'permissoes' como array é uma prática mais segura
                permissoes={["admin"]}
            >
                {loading ? 'Calculando...' : 'Calcular Volumes'}
            </ButtonComPermissao>
        </div>
      </form>

      {/* AJUSTE 4: Verificação para garantir que 'volumes' existe antes de renderizar */}
      {resultado && resultado.volumes && (
        <div className="mt-8 p-4 border rounded-lg bg-white shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Resultado do Cálculo</h2>
            <div className="flex flex-wrap gap-4 mb-4 text-center border-b pb-4">
                <div>
                    <p className="text-sm text-gray-500">Total de Volumes</p>
                    <p className="text-2xl font-bold text-teal-600">{resultado.total_volumes}</p>
                </div>
                <div className="pl-4 border-l">
                    <p className="text-sm text-gray-500">Peso Total</p>
                    <p className="text-2xl font-bold text-teal-600">{resultado.peso_total_kg.toFixed(3)} kg</p>
                </div>
            </div>

            <div className="space-y-3">
                {resultado.volumes.map((volume, index) => (
                    <div key={index} className="p-3 border rounded-md bg-gray-50 flex flex-wrap items-center gap-x-6 gap-y-2">
                        <span className="font-bold text-lg text-gray-700 w-8">{index + 1}.</span>
                        <div className="flex-1 min-w-[150px]">
                            <p className={`font-semibold ${volume.tipo === 'Volume Completo' ? 'text-blue-600' : 'text-purple-600'}`}>{volume.tipo}</p>
                            <p className="text-sm text-gray-600">{volume.itens} item(s)</p>
                        </div>
                         <div className="flex-1 min-w-[120px]">
                            <p className="text-xs text-gray-500">Peso</p>
                            <p className="font-medium">{volume.peso_kg.toFixed(3)} kg</p>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <p className="text-xs text-gray-500">Dimensões (A x L x C)</p>
                            <p className="font-medium">{volume.altura_cm}cm x {volume.largura_cm}cm x {volume.comprimento_cm}cm</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}