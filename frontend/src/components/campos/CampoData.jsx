import { useEffect } from "react";

// Função auxiliar para formatar objeto Date ou string YYYY-MM-DD para DD/MM/YYYY
function formatarDataParaDDMMYYYY(dataInput) {
  if (!dataInput) return "";

  let dataObj;
  // Se a entrada for uma string no formato YYYY-MM-DD
  if (typeof dataInput === 'string' && dataInput.includes('-')) {
    const partes = dataInput.split('-');
    if (partes.length === 3 && partes[0].length === 4 && partes[1].length === 2 && partes[2].length === 2) {
      // Valida se as partes parecem corretas antes de tentar converter para DD/MM/YYYY
      // Não cria um novo Date object aqui para evitar problemas de fuso horário na formatação simples
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataInput; // Retorna a string original se não for YYYY-MM-DD válido
  }
  // Se a entrada for um objeto Date
  else if (dataInput instanceof Date && !isNaN(dataInput)) {
    dataObj = dataInput;
  }
  // Se já estiver no formato DD/MM/YYYY (ou outra string que não seja Date nem YYYY-MM-DD)
  else if (typeof dataInput === 'string') {
    // Se já for DD/MM/YYYY, retorna como está
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataInput)) {
        return dataInput;
    }
    // Caso contrário, retorna a string como está ou uma string vazia se não for um formato reconhecível
    return ""; // Ou dataInput, dependendo do comportamento desejado para strings não reconhecidas
  }
  else {
    return ""; // Tipo de entrada não suportado ou data inválida
  }

  const dia = String(dataObj.getDate()).padStart(2, '0');
  const mes = String(dataObj.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexado
  const ano = dataObj.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// Função auxiliar para formatar string DD/MM/YYYY para YYYY-MM-DD
function formatarDataParaYYYYMMDD(dataStrDDMMYYYY) {
  if (!dataStrDDMMYYYY || typeof dataStrDDMMYYYY !== 'string') {
    // Se o valor já for YYYY-MM-DD (pode acontecer se o estado inicial for assim), retorna ele mesmo.
    if (typeof dataStrDDMMYYYY === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataStrDDMMYYYY)) {
        // Verifica se é uma data válida antes de retornar
        const d = new Date(dataStrDDMMYYYY);
        if (d instanceof Date && !isNaN(d) && dataStrDDMMYYYY === d.toISOString().split('T')[0]) {
            return dataStrDDMMYYYY;
        }
    }
    return "";
  }

  if (dataStrDDMMYYYY.includes('/')) {
    const partes = dataStrDDMMYYYY.split('/');
    if (partes.length === 3) {
      const dia = partes[0];
      const mes = partes[1];
      const ano = partes[2];
      // Validação básica do formato e dos componentes da data
      if (ano.length === 4 && dia.length >= 1 && dia.length <= 2 && mes.length >= 1 && mes.length <= 2) {
          const diaInt = parseInt(dia, 10);
          const mesInt = parseInt(mes, 10);
          const anoInt = parseInt(ano, 10);

          // Cria um objeto Date para validar (mês é 0-indexado)
          const dateObj = new Date(anoInt, mesInt - 1, diaInt);
          if (
            dateObj.getFullYear() === anoInt &&
            dateObj.getMonth() === mesInt - 1 &&
            dateObj.getDate() === diaInt
          ) {
            return `${String(anoInt).padStart(4, '0')}-${String(mesInt).padStart(2, '0')}-${String(diaInt).padStart(2, '0')}`;
          }
      }
    }
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dataStrDDMMYYYY)) { // Se já estiver em YYYY-MM-DD
      const d = new Date(dataStrDDMMYYYY);
      if (d instanceof Date && !isNaN(d) && dataStrDDMMYYYY === d.toISOString().split('T')[0]) {
          return dataStrDDMMYYYY;
      }
  }
  return ""; // Retorna string vazia se o formato de entrada não for DD/MM/YYYY válido
}


export default function CampoData({
  label,
  name,
  value, // Espera-se que 'value' (vindo do pai) esteja em "DD/MM/YYYY" ou vazio
  onChange,
  obrigatorio = false,
  colSpan,
  placeholder = "", // Placeholder tem utilidade limitada em input type="date"
  hoje = false,
  hojeMaisDias = 0
}) {
  useEffect(() => {
    // Define a data inicial se 'hoje' ou 'hojeMaisDias' for true e o campo estiver vazio
    if ((hoje || hojeMaisDias > 0) && !value) {
      const dataAtual = new Date();
      if (hojeMaisDias > 0) {
        dataAtual.setDate(dataAtual.getDate() + hojeMaisDias);
      }
      const dataFormatadaDDMMYYYY = formatarDataParaDDMMYYYY(dataAtual);
      onChange({
        target: {
          name,
          value: dataFormatadaDDMMYYYY // Propaga no formato DD/MM/YYYY
        }
      });
    }
  }, [hoje, hojeMaisDias, value, name, onChange]);

  const handleChange = (e) => {
    const valorInputYYYYMMDD = e.target.value; // Valor do input é YYYY-MM-DD
    if (valorInputYYYYMMDD) {
        const dataFormatadaDDMMYYYY = formatarDataParaDDMMYYYY(valorInputYYYYMMDD);
        onChange({
          target: {
            name,
            value: dataFormatadaDDMMYYYY, // Propaga no formato DD/MM/YYYY
          },
        });
    } else {
        // Se o campo for limpo, propaga uma string vazia
        onChange({
            target: {
                name,
                value: "",
            }
        });
    }
  };

  // Converte o 'value' (que se espera estar em DD/MM/YYYY) para YYYY-MM-DD para o input
  const valorParaInput = formatarDataParaYYYYMMDD(value);

  return (
    <div className={colSpan ? "col-span-2" : ""}> {/* Mantida a lógica original de colSpan */}
      <label className="block mb-1 font-medium text-gray-700">
        {label}
        {obrigatorio && <span className="text-red-600">*</span>}
      </label>
      <input
        type="date"
        name={name}
        value={valorParaInput || ""} // Usa o valor convertido para YYYY-MM-DD
        onChange={handleChange}
        // placeholder={placeholder} // Placeholder não é muito eficaz em type="date"
        className="w-full border border-gray-300 p-2 rounded"
      />
    </div>
  );
}