import { useState, useEffect, useRef } from "react";

export default function CampoValorMonetario({
  label = "Valor",
  name,
  value = "",
  onChange,
  obrigatorio = false,
  colSpan = false,
  placeholder = "R$ 0,00",
  disabled = false,
}) {
  const [interno, setInterno] = useState("0");
  const inputRef = useRef(null);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setInterno(String(Math.round(parseFloat(value || 0) * 100)));
    }
  }, [value]);

  const formatarValor = (val) => {
    const numero = Number(val) / 100;
    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    const key = e.key;
    const selection = window.getSelection();
    const input = inputRef.current;

    // Detectar se o campo está totalmente ou parcialmente selecionado
    const tudoSelecionado = input.selectionStart !== input.selectionEnd;

    if (key === "Backspace" || key === "Delete") {
      e.preventDefault();
      setInterno((prev) => {
        if (tudoSelecionado || prev.length <= 1) {
          atualizarCampo("0"); // 🔥 Limpa tudo se algo estiver selecionado ou tiver 1 dígito
          return "0";
        } else {
          const novo = prev.slice(0, -1) || "0";
          atualizarCampo(novo);
          return novo;
        }
      });
    } else if (/\d/.test(key)) {
      e.preventDefault();
      setInterno((prev) => {
        const novo = (prev + key).replace(/^0+/, "") || "0";
        atualizarCampo(novo);
        return novo;
      });
    } else {
      e.preventDefault(); // Bloqueia qualquer outra tecla
    }
  };

  const atualizarCampo = (valorInterno) => {
    const valorNumerico = Number(valorInterno) / 100;
    const valorFormatado = formatarValor(valorInterno);

    onChange({
      target: {
        name,
        value: valorNumerico,
        formatado: valorFormatado,
      },
    });
  };

  return (
    <div className={`${colSpan ? "col-span-2" : ""} relative`}>
      <label className="block mb-1 font-medium text-gray-700">
        {label}
        {obrigatorio && <span className="text-red-600">*</span>}
      </label>
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={formatarValor(interno)}
        onKeyDown={handleKeyDown}
        onChange={() => { }} // Bloqueia onChange normal
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full h-10 border border-gray-300 px-3 py-2 rounded text-sm text-right 
          ${disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white text-gray-900"}`}
      />
    </div>
  );
}
