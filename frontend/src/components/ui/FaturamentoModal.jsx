// src/components/ui/FaturamentoModal.jsx

import React, { Fragment, useMemo, useState, useEffect } from 'react';
import { Transition, Dialog } from '@headlessui/react';
import { X, Loader2, DollarSign, AlertTriangle, Building, User, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api/axiosConfig';

const FaturamentoModal = ({
  isOpen,
  onClose,
  pedido,    // Objeto do pedido selecionado (deve conter os itens)
  onConfirm, // Função que envia o comando para o backend
}) => {
  // Estado local apenas para loading do botão
  const [isSaving, setIsSaving] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const [produtosMap, setProdutosMap] = useState({});
  const [regrasTributarias, setRegrasTributarias] = useState([]);
  const [selectedRegraId, setSelectedRegraId] = useState("");

  // Helper para parsear valores numéricos de forma robusta
  const parseCurrency = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleanValue = value.replace(',', '.');
      const parsed = parseFloat(cleanValue);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  // Reset ao fechar
  useEffect(() => {
    if (!isOpen) setSelectedRegraId("");
  }, [isOpen]);

  // Lógica de Sugestão Automática de Regra Tributária
  useEffect(() => {
    if (!isOpen) return;
    if (!empresa || !pedido || !pedido.cliente || regrasTributarias.length === 0) return;

    // Aguarda carregamento dos produtos para considerar o Tipo do Item na decisão
    if (pedido.itens && pedido.itens.length > 0 && Object.keys(produtosMap).length === 0) {
      return;
    }

    // 1. Normaliza dados da Empresa (Regime)
    // Garante conversão para string para evitar erros
    const crtEmpresa = empresa.crt ? String(empresa.crt).toLowerCase() : '';
    let regimeEmitente = '';
    // Ajuste para bater com os valores do Enum no backend (que são strings com espaços)
    // Agora suporta tanto o ID (1, 2...) quanto o Name (simples_nacional...)
    if (crtEmpresa === '1' || crtEmpresa === 'simples_nacional') regimeEmitente = 'Simples Nacional';
    else if (crtEmpresa === '2' || crtEmpresa === 'simples_excesso') regimeEmitente = 'Simples Nacional';
    else if (crtEmpresa === '3' || crtEmpresa === 'lucro_presumido') regimeEmitente = 'Lucro Presumido';
    else if (crtEmpresa === '4' || crtEmpresa === 'lucro_real') regimeEmitente = 'Lucro Real';

    // 2. Normaliza dados do Destino (UF)
    const ufOrigem = empresa.estado;
    const ufDestino = pedido.cliente.estado;
    let localizacaoDestino = '';
    
    if (ufOrigem && ufDestino) {
        localizacaoDestino = (ufOrigem === ufDestino) ? 'Interna' : 'Interestadual';
    }

    // 3. Normaliza Tipo de Cliente
    let tipoCliente = '';
    const tipoPessoa = pedido.cliente.tipo_pessoa ? String(pedido.cliente.tipo_pessoa).toLowerCase() : 'fisica';
    let indIE = String(pedido.cliente.indicador_ie || ''); // '1', '2', '9'
    
    // Tratamento para valores nulos convertidos em string
    if (indIE === 'null' || indIE === 'undefined') indIE = '';

    if (tipoPessoa === 'fisica') {
        tipoCliente = 'PF';
    } else if (tipoPessoa.includes('juridica')) {
        if (indIE === '1') tipoCliente = 'PJ_Contribuinte';
        else if (indIE === '2') tipoCliente = 'PJ_Isento';
        else tipoCliente = 'PJ_NaoContribuinte'; // Default para 9, 0 ou vazio
    }
    
    // 4. Determina Tipo de Operação (Considerando Tipo do Item)
    let tipoOperacaoAlvo = pedido.tipo_operacao;
    
    if (!tipoOperacaoAlvo) tipoOperacaoAlvo = 'Venda de Mercadoria';

    // 5. Filtra as regras compatíveis
    const regrasCandidatas = regrasTributarias.filter(regra => {
        if (!regra.situacao) return false; // Ignora inativas

        // Helper para comparação segura (case insensitive)
        const match = (field, valRegra, valCalculado) => {
            if (!valRegra) return true; // Se a regra não especifica, aceita qualquer um
            // Normaliza com trim() para evitar erros de espaço
            const vRegra = String(valRegra).trim().toLowerCase();
            const vCalc = String(valCalculado).trim().toLowerCase();
            const isMatch = vRegra === vCalc;
            
            return isMatch;
        };

        // Verifica Regime (com flexibilidade para CRT 3 - Regime Normal)
        const vRegraRegime = String(regra.regime_emitente || '').trim().toLowerCase();
        const vCalcRegime = String(regimeEmitente).trim().toLowerCase();
        let regimeOk = false;

        if (!vRegraRegime) regimeOk = true;
        else if (vRegraRegime === vCalcRegime) regimeOk = true;

        if (!regimeOk) {
            // Chama match para logar o erro se falhar
            if (!match('Regime', regra.regime_emitente, regimeEmitente)) return false;
        }

        // Verifica Operação
        let operacaoOk = match('Operacao', regra.tipo_operacao, tipoOperacaoAlvo);
        if (!operacaoOk) return false;

        // Verifica Localização
        if (!match('Localizacao', regra.localizacao_destino, localizacaoDestino)) return false;

        // Verifica Tipo Cliente
        let clienteOk = match('TipoCliente', regra.tipo_cliente, tipoCliente);
        // Fallback: Se for 'PF' mas não achou, tenta 'PJ_NaoContribuinte'
        if (!clienteOk && String(tipoCliente).toLowerCase() === 'pf') {
            if (match('TipoCliente', regra.tipo_cliente, 'PJ_NaoContribuinte')) clienteOk = true;
        }
        if (!clienteOk) return false;

        return true;
    });

    // 6. Ordena por prioridade (maior primeiro)
    regrasCandidatas.sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0));

    // 7. Seleciona a melhor regra se houver candidatas
    if (regrasCandidatas.length > 0) {
        const melhorRegra = regrasCandidatas[0];
        // Atualiza apenas se estiver vazio (primeira carga) para não sobrescrever escolha manual
        setSelectedRegraId(prev => (!prev ? String(melhorRegra.id) : prev));
    }
  }, [isOpen, empresa, pedido, regrasTributarias, produtosMap]);

  // Busca dados da empresa (Emitente) via generic
  useEffect(() => {
    if (isOpen) {
      api.get('/generic/empresas')
        .then((response) => {
          if (response.data.items && response.data.items.length > 0) {
            setEmpresa(response.data.items[0]);
          }
        })
        .catch((err) => toast.error("Erro ao buscar dados da empresa."));
    }

    // Busca Regras Tributárias
    if (isOpen) {
      // Aumenta o limite para garantir que todas as regras sejam carregadas (evita paginação default de 10)
      api.get('/generic/tributacoes', { params: { limit: 100 } })
        .then((response) => {
          setRegrasTributarias(response.data.items || []);
        })
        .catch((err) => toast.error("Erro ao buscar regras tributárias."));
    }
  }, [isOpen]);

  // Busca dados dos produtos (Preço) pois no pedido só tem ID e Qtd
  useEffect(() => {
    if (isOpen && pedido && pedido.itens && Array.isArray(pedido.itens)) {
      const fetchProdutos = async () => {
        const ids = new Set();
        pedido.itens.forEach(item => {
          const pid = item.id_produto || item.produto_id;
          if (pid) ids.add(pid);
        });

        const novosProdutos = {};
        await Promise.all(Array.from(ids).map(async (id) => {
          try {
            const res = await api.get(`/generic/produtos/${id}`);
            novosProdutos[id] = res.data;
          } catch (e) {
            toast.error(`Erro ao buscar produto ${id}`);
          }
        }));
        setProdutosMap(novosProdutos);
      };
      fetchProdutos();
    }
  }, [isOpen, pedido]);

  // Calcula o total visualmente caso o pedido não tenha o campo 'total' atualizado
  const totalCalculado = useMemo(() => {
    if (!pedido || !pedido.itens) return 0;
    return pedido.itens.reduce((acc, item) => {
      const qtd = Number(item.quantidade) || 0;
      const produtoId = item.id_produto || item.produto_id;
      const produtoInfo = produtosMap[produtoId];
      
      let preco = parseCurrency(item.valor_unitario);
      if (preco === null) preco = parseCurrency(item.preco_unitario) || parseCurrency(item.preco);
      if (preco === null && produtoInfo) preco = Number(produtoInfo.preco);
      if (preco === null) preco = 0;

      return acc + (qtd * preco);
    }, 0);
  }, [pedido, produtosMap]);

  // Helpers de Formatação para Exibição
  const formatCRT = (crt) => {
    if (!crt) return 'NÃO INFORMADO';
    const val = String(crt);
    if (val === '1') return 'SIMPLES NACIONAL';
    if (val === '2') return 'SIMPLES NACIONAL (EXCESSO)';
    if (val === '3') return 'LUCRO PRESUMIDO';
    if (val === '4') return 'LUCRO REAL';
    return val.toUpperCase();
  };

  const formatIndicadorIE = (ind) => {
    const map = {
      '1': 'Contribuinte ICMS',
      '2': 'Isento',
      '9': 'Não Contribuinte',
      '0': 'Não se aplica'
    };
    return map[String(ind)] || 'Indefinido';
  };

  const handleConfirm = async () => {
    if (!pedido.volumes_quantidade || Number(pedido.volumes_quantidade) <= 0) {
      toast.error("A quantidade de volumes é obrigatória para faturar. Verifique a aba Frete.");
      return;
    }

    if (!selectedRegraId) {
      toast.error("Por favor, selecione uma regra tributária antes de emitir a nota.");
      return;
    }

    setIsSaving(true);
    try {
      // Envia apenas o comando de mudança de status e confirmação
      // Prepara os itens com os dados básicos para o backend processar
      const itensPayload = pedido.itens.map(item => {
        const produtoId = item.id_produto || item.produto_id;
        const produtoInfo = produtosMap[produtoId];
        
        let preco = parseCurrency(item.valor_unitario);
        if (preco === null) preco = parseCurrency(item.preco_unitario) || parseCurrency(item.preco);
        if (preco === null && produtoInfo) preco = Number(produtoInfo.preco);
        if (preco === null) preco = 0;

        const qtd = Number(item.quantidade) || 0;
        
        return {
          ...item,
          preco_unitario: preco,
          total_bruto: preco * qtd,
          // Outros campos serão preenchidos pelo backend com base na regra
        };
      });

      await onConfirm({ // Envia para o GenericList chamar o endpoint correto
        id_regra_tributaria: selectedRegraId ? parseInt(selectedRegraId) : null,
        itens: itensPayload,
        total_nota: totalCalculado,
        data_vencimento: new Date().toISOString().split('T')[0] // Hoje como default
      });
      setIsSaving(false);
      onClose();
    } catch (error) {
      toast.error(error.message || "Erro ao processar faturamento.");
      setIsSaving(false); // Só para o loading se der erro, para permitir tentar de novo
    }
  };

  if (!isOpen || !pedido) return null;

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                
                {/* Botão Fechar X */}
                <button
                  type="button"
                  className="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                  onClick={onClose}
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  
                  {/* Título */}
                  <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-gray-900 mb-6 flex items-center">
                    <DollarSign className="w-6 h-6 mr-2 text-green-600" />
                    Conferência de Faturamento
                  </Dialog.Title>

                  {/* Resumo Emitente vs Destinatário */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    {/* Emitente */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <div className="flex items-center mb-2 text-blue-800 font-semibold">
                        <Building className="w-4 h-4 mr-2" />
                        Emitente
                      </div>
                      <p className="text-sm font-bold text-gray-800">{empresa?.razao || 'Carregando...'}</p>
                      <p className="text-xs text-gray-600">{empresa?.cnpj || ''}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {empresa?.cidade} - {empresa?.estado}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatCRT(empresa?.crt)}
                      </p>
                    </div>

                    {/* Destinatário */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center mb-2 text-gray-700 font-semibold">
                        <User className="w-4 h-4 mr-2" />
                        Destinatário
                      </div>
                      <p className="text-sm font-bold text-gray-800">{pedido.cliente_nome || pedido.cliente?.nome_razao || 'Consumidor Final'}</p>
                      <p className="text-xs text-gray-600">{pedido.cliente_cpf_cnpj || pedido.cliente?.cpf_cnpj || ''}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {pedido.cliente?.cidade} - {pedido.cliente?.estado}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {pedido.cliente?.tipo_pessoa === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'} - {formatIndicadorIE(pedido.cliente?.indicador_ie)}
                      </p>
                    </div>
                  </div>

                  {/* Seleção de Regra Tributária */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-blue-600" />
                      Regra Tributária para Emissão <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={selectedRegraId}
                      onChange={(e) => setSelectedRegraId(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    >
                      <option value="">Selecione uma Regra</option>
                      {regrasTributarias.map((regra) => (
                        <option key={regra.id} value={regra.id}>
                          {regra.descricao} {regra.cfop ? `(CFOP ${regra.cfop})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Selecione a regra que define os impostos (ICMS, IPI, PIS, COFINS) para esta nota.</p>
                  </div>

                  {/* Tabela de Itens Simplificada */}
                  <h4 className="text-lg font-semibold text-gray-800 mb-1">Itens para Nota Fiscal</h4>
                  <div className="overflow-x-auto border rounded-lg mb-4">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qtd</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Unit.</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pedido.itens && pedido.itens.map((item, idx) => {
                          const quantidade = Number(item.quantidade) || 1;
                          
                          // Busca informações do produto no mapa carregado
                          const produtoId = item.id_produto || item.produto_id;
                          const produtoInfo = produtosMap[produtoId];
                          
                          let valorUnitarioBase = parseCurrency(item.valor_unitario);
                          if (valorUnitarioBase === null) valorUnitarioBase = parseCurrency(item.preco_unitario) || parseCurrency(item.preco);
                          if (valorUnitarioBase === null && produtoInfo) valorUnitarioBase = Number(produtoInfo.preco);
                          if (valorUnitarioBase === null) valorUnitarioBase = 0;
                          
                          const totalItem = quantidade * valorUnitarioBase;
                          
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {produtoInfo ? produtoInfo.descricao : (item.descricao || "Carregando...")}
                                <span className="block text-xs text-gray-400">{produtoInfo ? produtoInfo.sku : (item.sku || "")}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-center font-medium">{quantidade}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-500">
                                {valorUnitarioBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-gray-800">
                                {totalItem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Alerta sobre Impostos */}
                  <div className="mt-4 flex items-start p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                    <p className="text-sm text-yellow-800">
                      <strong>Atenção:</strong> O cálculo de impostos é manual e deve ser conferido com cuidado.
                      Ao confirmar, a NFe será emitida e o financeiro gerado.
                      Observe com atenção todos os campos e dados antes de confirmar.
                    </p>
                  </div>

                </div>

                {/* Botões do Rodapé */}
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    disabled={isSaving || !selectedRegraId}
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:cursor-not-allowed"
                    onClick={handleConfirm}
                  >
                    {isSaving ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
                    ) : (
                      "Confirmar Faturamento"
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default FaturamentoModal;