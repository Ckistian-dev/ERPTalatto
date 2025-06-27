import React, { useState, useEffect } from 'react'
import { X, Filter, Plus, Trash2 } from 'lucide-react'
import axios from 'axios'

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ModalFiltroColunas({ colunas, colunasDropdown = {}, onClose, onAplicar }) {
  const [filtros, setFiltros] = useState([{ coluna: colunas[0] || '', texto: '' }])
  const [opcoesDropdown, setOpcoesDropdown] = useState({})
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState(() => {
    const hoje = new Date()
    return hoje.toISOString().split('T')[0] // retorna "2025-04-16"
  })

  // Carrega opções quando coluna muda
  useEffect(() => {
    // Usamos um Set para evitar múltiplas chamadas para o mesmo tipo se houver filtros repetidos
    const tiposParaBuscar = new Set();
    filtros.forEach(filtro => {
      const tipo = colunasDropdown[filtro.coluna];
      if (tipo && !opcoesDropdown[tipo]) { // Só busca se o tipo estiver mapeado e ainda não tiver sido carregado
        tiposParaBuscar.add(tipo);
      }
    });

    tiposParaBuscar.forEach(async (tipo) => {
      try {
        // USO DA VARIÁVEL DE AMBIENTE AQUI
        const res = await axios.get(`${API_URL}/opcoes/${tipo}`);
        setOpcoesDropdown(prev => ({ ...prev, [tipo]: res.data }));
      } catch (error) {
        console.error('Erro ao carregar opções de', tipo, error);
        // Opcional: mostrar um toast de erro mais específico se necessário
      }
    });
  }, [filtros, colunasDropdown, opcoesDropdown]); // Dependências

  const adicionarFiltro = () => {
    setFiltros([...filtros, { coluna: colunas[0] || '', texto: '' }])
  }

  const removerFiltro = (index) => {
    const novaLista = [...filtros]
    novaLista.splice(index, 1)
    setFiltros(novaLista)
  }

  const atualizarFiltro = (index, campo, valor) => {
    setFiltros(prev => {
      const novaLista = [...prev];
      if (campo === 'coluna') {
        // Ao mudar a coluna, resetamos o texto para evitar valores incompatíveis
        novaLista[index] = { coluna: valor, texto: '' };
      } else {
        novaLista[index][campo] = valor;
      }
      return novaLista;
    });
  }

  const aplicarFiltros = () => {
    onAplicar({ filtros, data_inicio: dataInicio, data_fim: dataFim })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-red-500">
          <X size={22} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Filter size={22} /> Filtros da Tabela
        </h2>

        {/* Período Fixo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm">De:</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full border p-2 rounded" />
          </div>
          <div>
            <label className="text-sm">Até:</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full border p-2 rounded" />
          </div>
        </div>

        {/* Filtros Dinâmicos */}
        <div className="space-y-4">
          {filtros.map((filtro, index) => {
            const tipoDropdown = colunasDropdown[filtro.coluna]
            const opcoes = tipoDropdown ? opcoesDropdown[tipoDropdown] || [] : [] // Garante que é um array

            return (
              <div key={index} className="border p-4 rounded relative">
                {index > 0 && (
                  <button onClick={() => removerFiltro(index)} className="absolute top-2 right-2 text-red-500">
                    <Trash2 size={18} />
                  </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Coluna */}
                  <div>
                    <label className="text-sm">Coluna:</label>
                    <select
                      value={filtro.coluna}
                      onChange={(e) => {
                        const novaColuna = e.target.value
                        // Chamada para a função auxiliar de atualização
                        atualizarFiltro(index, 'coluna', novaColuna)
                      }}
                      className="w-full border p-2 rounded"
                    >
                      {colunas.map((col) => (
                        <option key={col} value={col}>
                          {col.replace(/_/g, ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Texto ou Dropdown */}
                  <div>
                    <label className="text-sm">Filtro:</label>
                    {tipoDropdown ? (
                      <select
                        value={filtro.texto}
                        onChange={(e) => atualizarFiltro(index, 'texto', e.target.value)}
                        className="w-full border p-2 rounded"
                      >
                        <option value="">Selecione</option>
                        {opcoes.map((op) => (
                          <option key={op.id || op.valor} value={op.valor}>{op.valor}</option> // Chave mais robusta
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={filtro.texto}
                        onChange={(e) => atualizarFiltro(index, 'texto', e.target.value)}
                        className="w-full border p-2 rounded"
                        placeholder="Digite o valor"
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          <button onClick={adicionarFiltro} className="text-teal-700 hover:text-teal-900 font-medium flex items-center gap-2 mt-2">
            <Plus size={16} /> Adicionar outro filtro
          </button>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">
            Cancelar
          </button>
          <button onClick={aplicarFiltros} className="bg-teal-600 text-white px-5 py-2 rounded hover:bg-teal-700">
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  )
}