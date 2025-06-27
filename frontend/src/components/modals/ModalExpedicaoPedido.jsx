// components/modals/ModalExpedicaoPedido.jsx
import { useState } from 'react';
import { X, Truck } from 'lucide-react';
import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import CampoNumSetas from '@/components/campos/CampoNumSetas';

export default function ModalExpedicaoPedido({ onClose, onConfirmar, usuario, onErro }) {
  const [form, setForm] = useState({
    rua: '',
    numero: '',
    nivel: '',
    cor: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const confirmar = () => {
    const obrigatorios = ['rua', 'cor', 'numero', 'nivel'];
    const vazios = obrigatorios.filter((c) => {
      const valor = form[c];
      return typeof valor === 'string'
        ? !valor.trim()
        : valor === null || valor === undefined || valor === '';
    });


    if (vazios.length > 0) {
      onErro?.('Preencha todos os campos obrigatórios.');
      return;
    }

    const agora = new Date().toISOString();
    onConfirmar({
      endereco_expedicao: form,
      hora_expedicao: agora,
      usuario_expedicao: usuario?.nome || 'Desconhecido',
      situacao_pedido: 'Faturamento'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-3xl relative h-full max-h-fit">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-red-500">
          <X size={22} />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Truck size={22} /> Endereço de Expedição (Depósito)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CampoDropdownEditavel
            label="Rua"
            name="rua"
            value={form.rua}
            onChange={handleChange}
            tipo="ruas"
            usuario={usuario}
            obrigatorio
          />
          <CampoDropdownEditavel
            label="Cor"
            name="cor"
            value={form.cor}
            onChange={handleChange}
            tipo="cores"
            usuario={usuario}
            obrigatorio
          />
          <CampoNumSetas
            label="Número"
            name="numero"
            value={form.numero || 0}
            onChange={handleChange}
            obrigatorio
          />
          <CampoNumSetas
            label="Nível"
            name="nivel"
            value={form.nivel || 0}
            onChange={handleChange}
            obrigatorio
          />

        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">
            Cancelar
          </button>
          <button onClick={confirmar} className="bg-teal-600 text-white px-5 py-2 rounded hover:bg-teal-700">
            Confirmar Expedição
          </button>
        </div>
      </div>
    </div>
  );
}
