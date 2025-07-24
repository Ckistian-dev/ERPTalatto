import React from 'react';
// Importe SEU componente de data.
import CampoData from './campos/CampoData'; 

/**
 * Componente "adaptador" que utiliza seu CampoData existente para criar um
 * seletor de período (De/Até), mantendo uma interface de props consistente
 * que o Dashboard.jsx espera ('value' e 'onChange').
 */
export function DateRangePicker({ value, onChange }) {
  
  const handleDateChange = (field, newDate) => {
    if (!newDate || isNaN(new Date(newDate))) {
      return;
    }

    const newRange = { from: value.from, to: value.to };

    if (field === 'from') {
      newRange.from = new Date(newDate);
    } else {
      newRange.to = new Date(newDate);
    }

    if (newRange.from > newRange.to) {
      field === 'from' ? (newRange.to = newRange.from) : (newRange.from = newRange.to);
    }
    
    onChange(newRange);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-2 border rounded-md bg-white shadow-sm">
      <div className="flex items-center gap-2">
        <label htmlFor="date-from" className="text-sm font-medium text-slate-600">De:</label>
        {/* Assumindo que seu CampoData aceita as props 'id', 'value' e 'onChange' */}
        <CampoData
          id="date-from"
          value={value.from} 
          onChange={(date) => handleDateChange('from', date)}
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="date-to" className="text-sm font-medium text-slate-600">Até:</label>
        <CampoData
          id="date-to"
          value={value.to}
          onChange={(date) => handleDateChange('to', date)}
        />
      </div>
    </div>
  );
}