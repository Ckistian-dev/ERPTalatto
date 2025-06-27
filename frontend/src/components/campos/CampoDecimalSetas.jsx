import { ChevronUp, ChevronDown } from "lucide-react";

export default function CampoDecimalSetas({
  label,
  name,
  value,
  onChange,
  obrigatorio = false,
  colSpan,
  min = 0.1,
  max = 999999,
  step = 0.1,
  placeholder = "",
}) {
  const handleChange = (e) => {
    let val = parseFloat(e.target.value.replace(",", "."));

    if (isNaN(val)) {
      onChange({ target: { name, value: "" } });
    } else if (val >= min && val <= max) {
      val = Math.round(val * 10) / 10;
      onChange({ target: { name, value: val } });
    }
  };

  const alterarValor = (delta) => {
    const atual = parseFloat(value) || 0;
    let novo = Math.round((atual + delta) * 10) / 10;

    if (novo >= min && novo <= max) {
      onChange({ target: { name, value: novo } });
    }
  };

  return (
    <div className={`${colSpan ? "col-span-2" : ""} relative`}>
      <label className="block mb-1 font-medium text-gray-700">
        {label}
        {obrigatorio && <span className="text-red-600">*</span>}
      </label>
      <div className="relative w-full">
        <div className="w-full h-10 border border-gray-300 rounded bg-white flex items-center overflow-hidden">
          <input
            name={name}
            value={value}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
            className="flex-1 h-full px-3 text-sm text-gray-800 focus:outline-none"
          />
          <div className="w-4 h-full flex flex-col items-center justify-center border-l border-gray-300">
            <button
              type="button"
              onClick={() => alterarValor(step)}
              className="h-1/2 w-full flex items-center justify-center hover:bg-gray-200"
            >
              <ChevronUp size={14} className="text-gray-500" />
            </button>
            <button
              type="button"
              onClick={() => alterarValor(-step)}
              className="h-1/2 w-full flex items-center justify-center hover:bg-gray-200"
            >
              <ChevronDown size={14} className="text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}