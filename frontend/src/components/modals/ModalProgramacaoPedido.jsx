import React, { useState } from 'react'
import { X, ClipboardList } from 'lucide-react'
import CampoData from '@/components/campos/CampoData'
import CampoDecimalSetas from '@/components/campos/CampoDecimalSetas'

export default function ModalProgramacaoPedido({ onClose, onConfirmar }) {
  const [form, setForm] = useState({
    data_finalizacao: '',
    ordem_finalizacao: 1
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const confirmar = () => {
    if (!form.data_finalizacao || form.ordem_finalizacao === '') {
      alert("Preencha todos os campos.")
      return
    }

    onConfirmar({
      ...form,
      situacao_pedido: "Produção"
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-red-500">
          <X size={22} />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <ClipboardList size={22} /> Programar Pedido
        </h2>

        <div className="space-y-5">
          <CampoData
            label="Data de Finalização"
            name="data_finalizacao"
            value={form.data_finalizacao}
            onChange={handleChange}
            obrigatorio
            hojeMaisDias={1}
          />

          <CampoDecimalSetas
            label="Ordem de Finalização"
            name="ordem_finalizacao"
            value={form.ordem_finalizacao}
            onChange={handleChange}
            min={0.1}
            max={999}
            obrigatorio
          />
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">
            Cancelar
          </button>
          <button onClick={confirmar} className="bg-teal-600 text-white px-5 py-2 rounded hover:bg-teal-700">
            Confirmar Programação
          </button>
        </div>
      </div>
    </div>
  )
}
