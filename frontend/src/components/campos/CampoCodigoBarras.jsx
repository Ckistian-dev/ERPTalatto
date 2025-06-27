import { useEffect, useState } from "react";

export default function CampoCodigoBarras({
  label = "Código de Barras (EAN-13)",
  name = "codigo_barras",
  value = "",
  onChange,
  obrigatorio = false,
  prefixo = "7898735", // 7 dígitos fixos (exemplo)
}) {
  const [parteVariavel, setParteVariavel] = useState("");
  const [codigoFinal, setCodigoFinal] = useState(value || "");
  const [digito, setDigito] = useState("");

  // Função para calcular dígito verificador EAN-13
  const calcularDigito = (codigo12) => {
    const nums = codigo12.split("").map(Number);
    const soma = nums.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
    const resto = soma % 10;
    return resto === 0 ? 0 : 10 - resto;
  };

  useEffect(() => {
    if (/^\d{5}$/.test(parteVariavel)) {
      const base = prefixo + parteVariavel;
      const dv = calcularDigito(base);
      const final = base + dv;
      setDigito(dv);
      setCodigoFinal(final);
      onChange({ target: { name, value: final } });
    } else {
      setDigito("");
      setCodigoFinal("");
      onChange({ target: { name, value: "" } });
    }
  }, [parteVariavel]);

  // ✅ PREENCHE a parte variável ao carregar valor completo
  useEffect(() => {
    if (value && value.length === 13 && value.startsWith(prefixo)) {
      const parte = value.slice(prefixo.length, 12); // Extrai os 5 dígitos do meio
      setParteVariavel(parte);
    }
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 5); // Apenas 5 dígitos
    setParteVariavel(val);
  };

  return (
    <div>
      <label className="block mb-1 font-medium text-gray-700">
        {label}
        {obrigatorio && <span className="text-red-600">*</span>}
      </label>

      <div className="flex h-10">
        <input
          type="text"
          value={prefixo}
          readOnly
          className="w-[70px] border border-gray-300 px-2 py-1 rounded-l bg-gray-100 text-sm text-gray-500"
        />
        <input
          type="text"
          value={parteVariavel}
          onChange={handleChange}
          className="w-[80px] border-t border-b border-gray-300 px-2 py-1 text-sm"
          placeholder="00000"
        />
        <input
          type="text"
          value={digito}
          readOnly
          className="w-[40px] border border-gray-300 bg-gray-100 px-2 py-1 rounded-r text-sm text-gray-500 text-center"
          placeholder="0"
        />
        <input
          type="text"
          value={codigoFinal}
          readOnly
          className="ml-3 flex-1 border border-gray-300 px-2 py-1 rounded bg-gray-50 text-sm text-gray-700"
          placeholder="Código final"
        />
      </div>
    </div>
  );
}
