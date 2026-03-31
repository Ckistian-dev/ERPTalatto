import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, Plus, Trash2 } from 'lucide-react';
import Select from 'react-select';

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const STATE_OPTIONS = ESTADOS_BR.map(uf => ({ value: uf, label: uf }));

export const StateTaxRulesInput = ({ field, value, onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('geral'); // 'geral' ou 'excecoes'
  
  // Estrutura principal dos dados
  const [data, setData] = useState({
    padrao_uf: {},
    excecoes: []
  });

  // Carrega o valor inicial
  useEffect(() => {
    if (value && typeof value === 'object') {
      // Suporte a migração: se não tiver chaves novas, assume vazio ou converte
      setData({
        padrao_uf: value.padrao_uf || (value.excecoes ? {} : value) || {},
        excecoes: Array.isArray(value.excecoes) ? value.excecoes : []
      });
    }
  }, [value]);

  // --- HANDLERS TABELA GERAL ---
  const handleGeneralChange = (uf, key, val) => {
    setData(prev => ({
      ...prev,
      padrao_uf: {
        ...prev.padrao_uf,
        [uf]: {
          ...prev.padrao_uf[uf],
          [key]: val
        }
      }
    }));
  };

  // --- HANDLERS EXCEÇÕES ---
  const addException = () => {
    const newException = {
      id: Date.now().toString(),
      ufs: [],
      id_produto: null,
      cfop: '',
      cst: ''
    };
    setData(prev => ({ ...prev, excecoes: [...prev.excecoes, newException] }));
  };

  const removeException = (index) => {
    const newEx = [...data.excecoes];
    newEx.splice(index, 1);
    setData(prev => ({ ...prev, excecoes: newEx }));
  };

  const updateException = (index, field, val) => {
    const newEx = [...data.excecoes];
    newEx[index] = { ...newEx[index], [field]: val };
    setData(prev => ({ ...prev, excecoes: newEx }));
  };

  const handleSave = () => {
    // Limpeza de dados vazios antes de salvar
    const cleanPadrao = {};
    Object.keys(data.padrao_uf).forEach(uf => {
        const r = data.padrao_uf[uf];
        if (r.aliq_inter || r.aliq_intra || r.fcp || r.ie_st) {
            cleanPadrao[uf] = r;
        }
    });

    onChange({
      target: {
        name: field.name,
        value: {
            padrao_uf: cleanPadrao,
            excecoes: data.excecoes
        }
      }
    });
    setIsOpen(false);
  };

  const rulesCount = Object.keys(data.padrao_uf || {}).length;
  const exceptionsCount = (data.excecoes || []).length;

  return (
    <div className="flex flex-col md:col-span-2">
      <label className="text-sm font-medium text-gray-700 mb-2">
        {field.label || 'Configuração Tributária Avançada'}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Edit2 className="w-4 h-4 mr-2" />
        Configurar Alíquotas e Exceções ({rulesCount} UFs, {exceptionsCount} Exceções)
      </button>

      {error && <span className="mt-1 text-xs text-red-500">{error}</span>}

      {/* --- MODAL --- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Regras de ICMS por Estado</h3>
                <p className="text-sm text-gray-500">Defina alíquotas padrão e crie exceções específicas.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              <button
                type="button"
                onClick={() => setActiveTab('geral')}
                className={`px-6 py-3 text-sm font-medium ${activeTab === 'geral' ? 'border-b-2 border-teal-600 text-teal-700 bg-teal-50' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Alíquotas e IE ST (Padrão)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('excecoes')}
                className={`px-6 py-3 text-sm font-medium ${activeTab === 'excecoes' ? 'border-b-2 border-teal-600 text-teal-700 bg-teal-50' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Exceções e Regras Específicas
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden bg-gray-50 p-4">
              <div className="h-full overflow-y-auto bg-white border border-gray-200 rounded-md shadow-sm">
                
                {/* --- TAB: GERAL --- */}
                {activeTab === 'geral' && (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase w-16">UF</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Aliq. Interestadual (%)</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Aliq. Interna Destino (%)</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Aliq. FCP (%)</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">IE Substituto (ST)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {ESTADOS_BR.map((uf) => {
                        const row = data.padrao_uf[uf] || {};
                        return (
                          <tr key={uf} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-bold text-gray-700 bg-gray-50">{uf}</td>
                            <td className="px-4 py-2">
                              <input type="number" step="0.01" className="w-full px-2 py-1 text-sm border rounded focus:ring-teal-500 focus:border-teal-500"
                                value={row.aliq_inter || ''} onChange={(e) => handleGeneralChange(uf, 'aliq_inter', e.target.value)} placeholder="0.00" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" step="0.01" className="w-full px-2 py-1 text-sm border rounded focus:ring-teal-500 focus:border-teal-500"
                                value={row.aliq_intra || ''} onChange={(e) => handleGeneralChange(uf, 'aliq_intra', e.target.value)} placeholder="0.00" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" step="0.01" className="w-full px-2 py-1 text-sm border rounded focus:ring-teal-500 focus:border-teal-500"
                                value={row.fcp || ''} onChange={(e) => handleGeneralChange(uf, 'fcp', e.target.value)} placeholder="0.00" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="text" className="w-full px-2 py-1 text-sm border rounded focus:ring-teal-500 focus:border-teal-500"
                                value={row.ie_st || ''} onChange={(e) => handleGeneralChange(uf, 'ie_st', e.target.value)} placeholder="Opcional" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* --- TAB: EXCEÇÕES --- */}
                {activeTab === 'excecoes' && (
                  <div className="p-4">
                    <button type="button" onClick={addException} className="mb-4 flex items-center text-sm font-bold text-teal-600 hover:text-teal-800">
                      <Plus className="w-4 h-4 mr-1" /> Adicionar Exceção
                    </button>

                    {data.excecoes.length === 0 ? (
                      <div className="text-center py-10 text-gray-400">Nenhuma exceção configurada.</div>
                    ) : (
                      <div className="space-y-3">
                        {/* Header Exceções */}
                        <div className="grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase px-2">
                          <div className="col-span-4">Destino(s)</div>
                          <div className="col-span-3">Produto</div>
                          <div className="col-span-2">CFOP</div>
                          <div className="col-span-2">Situação Trib. (CST/CSOSN)</div>
                          <div className="col-span-1 text-center">Ações</div>
                        </div>

                        {data.excecoes.map((ex, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-4 items-start bg-white border p-3 rounded-lg shadow-sm">
                            
                            {/* Multiselect Estados */}
                            <div className="col-span-4">
                              <Select
                                isMulti
                                options={STATE_OPTIONS}
                                value={ex.ufs.map(u => ({ value: u, label: u }))}
                                onChange={(opts) => updateException(idx, 'ufs', opts.map(o => o.value))}
                                placeholder="Selecione os estados..."
                                className="text-sm"
                                styles={{ control: base => ({ ...base, minHeight: '38px' }) }}
                              />
                            </div>

                            {/* Produto ID */}
                            <div className="col-span-3">
                                <input 
                                    type="text" 
                                    placeholder="ID do Produto (vazio = todos)"
                                    value={ex.id_produto || ''}
                                    onChange={(e) => updateException(idx, 'id_produto', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
                                />
                                <span className="text-[10px] text-gray-400">Deixe vazio para "Qualquer produto"</span>
                            </div>

                            {/* CFOP */}
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={ex.cfop}
                                onChange={(e) => updateException(idx, 'cfop', e.target.value)}
                                placeholder="Ex: 6.102"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
                              />
                            </div>

                            {/* CST */}
                            <div className="col-span-2">
                              <select
                                value={ex.cst}
                                onChange={(e) => updateException(idx, 'cst', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-teal-500 focus:border-teal-500"
                              >
                                <option value="">Padrão</option>
                                <option value="00">00 - Tributada Integralmente</option>
                                <option value="10">10 - Cobrança ICMS ST</option>
                                <option value="20">20 - Redução de Base</option>
                                <option value="40">40 - Isenta</option>
                                <option value="41">41 - Não Tributada</option>
                                <option value="60">60 - Cobrado ant. por ST</option>
                                <option value="102">102 - Simples c/ Crédito</option>
                                {/* Adicione os outros CSTs aqui */}
                              </select>
                            </div>

                            {/* Ações */}
                            <div className="col-span-1 flex justify-center pt-2">
                              <button type="button" onClick={() => removeException(idx)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};