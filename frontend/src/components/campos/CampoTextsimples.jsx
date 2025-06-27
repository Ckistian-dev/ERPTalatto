// components/campos/CampoTextoSimples.jsx
export default function CampoTextsimples({ label, name, value, onChange, colSpan = false, obrigatorio = false, placeholder = ""}) {
    return (
      <div className={colSpan ? "col-span-2" : ""}>
        <label className="block mb-1 font-medium text-gray-700">
          {label}
          {obrigatorio && <span className="text-red-600">*</span>}
        </label>
        <input
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full border border-gray-300 p-2 rounded"
        />
      </div>
    );
  }