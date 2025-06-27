export default function CampoMedidas({
  label = "Medidas (cm)",
  nomeLargura = "largura",
  nomeAltura = "altura",
  nomeComprimento = "comprimento",
  nomeDiametro = "diametro",
  largura,
  altura,
  comprimento,
  diametro,
  onChange,
  obrigatorio = false
}) {
  const formatarNumero = (valor) => {
    const raw = valor.replace(/[^\d]/g, "");
    const numero = Number(raw) / 100;
    return numero.toFixed(2);
  };

  const handleChangeFormatado = (e) => {
    const { name, value } = e.target;
    const formatado = formatarNumero(value);
    onChange({ target: { name, value: formatado } });
  };

  return (
    <div className="col-span-2">
      <label className="block mb-1 font-medium text-gray-700">
        {label}
        {obrigatorio && <span className="text-red-600">*</span>}
      </label>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input
          type="text"
          name={nomeLargura}
          value={largura}
          onChange={handleChangeFormatado}
          placeholder="Largura (cm)"
          className="border border-gray-300 px-2 py-1 rounded text-sm"
        />
        <input
          type="text"
          name={nomeAltura}
          value={altura}
          onChange={handleChangeFormatado}
          placeholder="Altura (cm)"
          className="border border-gray-300 px-2 py-1 rounded text-sm"
        />
        <input
          type="text"
          name={nomeComprimento}
          value={comprimento}
          onChange={handleChangeFormatado}
          placeholder="Comprimento (cm)"
          className="border border-gray-300 px-2 py-1 rounded text-sm"
        />
        <input
          type="text"
          name={nomeDiametro}
          value={diametro}
          onChange={handleChangeFormatado}
          placeholder="Diâmetro (cm)"
          className="border border-gray-300 px-2 py-1 rounded text-sm"
        />
      </div>
    </div>
  );
}
