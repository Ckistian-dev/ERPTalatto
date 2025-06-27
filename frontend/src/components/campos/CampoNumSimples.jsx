export default function CampoNumSimples({
    label,
    name,
    value, // <- esse é o valor LIMPO (apenas números), vindo do estado form
    onChange,
    obrigatorio = false,
    colSpan,
    min = 0,
    max = 99999999,
    placeholder = "",
    formatos = [] // Ex: [{ tam: 11, regex, mascara }]
  }) {
    const handleInput = (e) => {
      let apenasNumeros = e.target.value.replace(/\D/g, '');
      apenasNumeros = apenasNumeros.slice(0, max);
  
      // Atualiza o estado com o valor limpo (sem formatação)
      onChange({
        target: {
          name,
          value: apenasNumeros
        }
      });
    };
  
    // Aplica máscara apenas para exibir no input
    const getValorFormatado = () => {
      if (!value) return '';
      const formato = formatos.find(f => value.length <= f.tam);
      return formato ? value.replace(formato.regex, formato.mascara) : value;
    };
  
    return (
      <div className={colSpan ? "col-span-2" : ""}>
        <label className="block mb-1 font-medium text-gray-700">
          {label}
          {obrigatorio && <span className="text-red-600">*</span>}
        </label>
        <input
          type="text"
          name={name}
          placeholder={placeholder}
          value={getValorFormatado()} // exibe formatado
          onChange={handleInput}      // salva limpo
          className="w-full border border-gray-300 p-2 rounded"
          inputMode="numeric"
        />
      </div>
    );
  }
  