import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Archive, UserCheck } from 'lucide-react';

// Define a URL base da sua API a partir das variáveis de ambiente
const API_URL = import.meta.env.VITE_API_BASE_URL;

// Cores para os gráficos de pizza e barras
const CORES_GRAFICOS = ['#0d9488', '#0284c7', '#f59e0b', '#ef4444', '#6366f1'];

export default function Dashboard() {
  // Estados para armazenar os dados dos gráficos
  const [faturamentoMensal, setFaturamentoMensal] = useState([]);
  const [vendasPorVendedor, setVendasPorVendedor] = useState([]);
  const [situacaoFinanceira, setSituacaoFinanceira] = useState([]);
  const [topProdutosEstoque, setTopProdutosEstoque] = useState([]);
  const [indicadores, setIndicadores] = useState({ totalFaturado: 0, ticketMedio: 0, contasAPagar: 0, contasAReceber: 0 });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Função para buscar todos os dados do dashboard de uma vez
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Realiza todas as chamadas à API em paralelo para mais eficiência
        const [
          resFaturamento,
          resVendasVendedor,
          resFinanceiro,
          resEstoque,
          resIndicadores
        ] = await Promise.all([
          // Você precisará criar estes endpoints no seu backend
          axios.get(`${API_URL}/dashboard/faturamento-mensal`),
          axios.get(`${API_URL}/dashboard/vendas-por-vendedor`),
          axios.get(`${API_URL}/dashboard/situacao-financeira`),
          axios.get(`${API_URL}/dashboard/top-produtos-estoque`),
          axios.get(`${API_URL}/dashboard/indicadores-gerais`)
        ]);

        // Atualiza os estados com os dados recebidos da API
        setFaturamentoMensal(resFaturamento.data);
        setVendasPorVendedor(resVendasVendedor.data);
        setSituacaoFinanceira(resFinanceiro.data);
        setTopProdutosEstoque(resEstoque.data);
        setIndicadores(resIndicadores.data);

      } catch (err) {
        console.error("Erro ao buscar dados do dashboard:", err);
        setError("Não foi possível carregar os dados do dashboard. Verifique a API.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="p-6 text-center">Carregando dados...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">{error}</div>;
  }

  return (
    <main className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Geral</h1>

      {/* Seção de Indicadores Principais (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-5 flex items-center gap-4">
          <div className="bg-teal-100 p-3 rounded-full">
            <DollarSign className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Faturamento Total (Últimos 30d)</p>
            <p className="text-2xl font-bold">R$ {indicadores.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-5 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <UserCheck className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Ticket Médio</p>
            <p className="text-2xl font-bold">R$ {indicadores.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-5 flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-full">
            <TrendingDown className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Contas a Pagar (Em Aberto)</p>
            <p className="text-2xl font-bold">R$ {indicadores.contasAPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-5 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Contas a Receber (Em Aberto)</p>
            <p className="text-2xl font-bold">R$ {indicadores.contasAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Seção de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Gráfico de Faturamento Mensal */}
        <div className="bg-white shadow rounded-lg p-4 col-span-1 lg:col-span-2 xl:col-span-2">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Evolução do Faturamento</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={faturamentoMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="mes" tick={{ fill: '#6b7280' }} />
              <YAxis tickFormatter={(valor) => `R$${(valor / 1000)}k`} tick={{ fill: '#6b7280' }}/>
              <Tooltip formatter={(valor) => [`R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Faturamento']} />
              <Legend />
              <Line type="monotone" dataKey="faturamento" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Situação Financeira */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Financeiro (Contas em Aberto)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={situacaoFinanceira} dataKey="valor" nameKey="tipo" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {situacaoFinanceira.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES_GRAFICOS[index % CORES_GRAFICOS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(valor) => `R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Vendas por Vendedor */}
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Vendas por Vendedor</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vendasPorVendedor} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis type="number" tick={{ fill: '#6b7280' }} />
              <YAxis dataKey="vendedor" type="category" tick={{ fill: '#6b7280', width: 60 }} />
              <Tooltip formatter={(valor) => [valor, 'Vendas']} />
              <Bar dataKey="totalVendas" fill="#0284c7" radius={[0, 4, 4, 0]}>
                 {vendasPorVendedor.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES_GRAFICOS[index % CORES_GRAFICOS.length]}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Gráfico de Estoque de Produtos */}
        <div className="bg-white shadow rounded-lg p-4 col-span-1 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Top 5 Produtos em Estoque</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProdutosEstoque}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="produto" tick={{ fill: '#6b7280' }} />
              <YAxis tick={{ fill: '#6b7280' }} />
              <Tooltip formatter={(valor) => [valor, 'Quantidade']} />
              <Bar dataKey="estoque" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
      </div>
    </main>
  )
}