import { useState, useEffect } from "react";
import { ddiList } from "@/utils/ddiList";

export default function CampoTelefone({
  label,
  name,             // Ex: "celular" ou "telefone"
  ddiName,           // Ex: "ddi_celular"
  ddiValue,          // Ex: "55"
  value,             // Ex: "5545999861237"
  onChange,
  obrigatorio = false,
  max = 11,
  placeholder = "",
  formatos = []
}) {
  // Separar DDI e número ao montar o componente
  const getNumero = (valor) => valor?.replace(/^\d{2}/, '') || '';
  const [numero, setNumero] = useState(getNumero(value));
  const [ddi, setDdi] = useState(() => {
    const valorInicial = ddiValue || value?.slice(0, 2) || '55';
    return valorInicial.replace(/\D/g, '') || '55';
  });
  

  // Atualiza o form com o DDI + número limpo
  const atualizarForm = (ddiAtual, numeroAtual) => {
    const ddiLimpo = ddiAtual.replace(/\D/g, '');
    const numLimpo = numeroAtual.replace(/\D/g, '').slice(0, max);
    const combinado = `${ddiLimpo}${numLimpo}`;
    onChange({ target: { name, value: combinado } });
  };

  // Lida com a mudança no número
  const handleNumeroChange = (e) => {
    const entrada = e.target.value;
    const apenasNumeros = entrada.replace(/\D/g, '').slice(0, max);
    setNumero(apenasNumeros);
    atualizarForm(ddi, apenasNumeros);
  };

  // Lida com a mudança no DDI
  const handleDdiChange = (e) => {
    const valor = e.target.value.replace(/\D/g, '');
    setDdi(valor);
    atualizarForm(valor, numero);
  };

  // Formata o valor para exibição
  const getValorFormatado = () => {
    if (!numero) return '';
    const formato = formatos.find(f => numero.length === f.tam);
    return formato ? numero.replace(formato.regex, formato.mascara) : numero;
  };

  useEffect(() => {
    // Atualiza número e DDI se `value` vier de edição
    if (value?.length >= 10) {
      const limpo = value.replace(/\D/g, '');
      const novoDdi = limpo.slice(0, 2);
      const novoNumero = limpo.slice(2);
      setDdi(novoDdi);
      setNumero(novoNumero);
    }
  }, [value]);

  return (
    <div>
      <label className="block mb-1 font-medium text-gray-700">
        {label}
        {obrigatorio && <span className="text-red-600">*</span>}
      </label>
      <div className="flex gap-2">
        <select
          name={ddiName}
          value={`+${ddi}`}
          onChange={handleDdiChange}
          className="w-24 border border-gray-300 p-2 rounded"
        >
          {ddiList.map(({ code, flag }, i) => (
            <option key={i} value={code}>{flag} {code}</option>
          ))}
        </select>
        <input
          name={name}
          placeholder={placeholder}
          value={getValorFormatado()}
          onChange={handleNumeroChange}
          className="w-full border border-gray-300 p-2 rounded"
          inputMode="numeric"
        />
      </div>
    </div>
  );
}
