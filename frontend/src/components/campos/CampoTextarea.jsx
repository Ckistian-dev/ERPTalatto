export default function CampoTextarea({ label, name, value, onChange, colSpan = false, obrigatorio = false, placeholder = "" }) {
  return (
    <div className={`${colSpan ? "col-span-2" : ""} w-full`}>
      <label className="block mb-1 font-medium text-gray-700">
        {label}
        {obrigatorio && <span className="text-red-600">*</span>}
      </label>
      <textarea
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={255}
        className="w-full border border-gray-300 p-2 rounded resize-y min-h-[80px]"
      />
    </div>
  );
}
