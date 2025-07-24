import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart, Line
} from 'recharts';
import { DollarSign, Target, Percent, TrendingUp, TrendingDown, Users, Package, RefreshCw, MapPin, UserCheck, UserX } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL;

// Paleta de cores
const COLORS = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#14b8a6', '#6366f1'];

// Helpers de formatação
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(Math.round(value || 0));

// --- COMPONENTES DE UI ---

const KpiCard = ({ icon, title, value, footer }) => (
  <div className="bg-white shadow-lg rounded-xl p-5 flex flex-col justify-between transition-transform transform hover:scale-105">
    <div>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {icon}
          <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
          </div>
        </div>
      </div>
    </div>
    {footer && <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">{footer}</p>}
  </div>
);

const ChartContainer = ({ title, data, children, className = '' }) => (
  <div className={`bg-white shadow-lg rounded-xl p-6 h-full ${className}`}>
    <h2 className="text-xl font-semibold text-gray-700 mb-4">{title}</h2>
    {/* Adicionamos uma verificação: só renderiza o gráfico se houver dados */}
    {data && data.length > 0 ? (
      <ResponsiveContainer width="100%" height={350}>
        {children}
      </ResponsiveContainer>
    ) : (
      <div className="flex items-center justify-center h-[350px] text-gray-400">
        <p>Sem dados para exibir.</p>
      </div>
    )}
  </div>
);


// --- COMPONENTES DAS ABAS ---

const VisaoGeralTab = ({ kpis, vendasData }) => (
  <div className="space-y-8 animate-fade-in">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
      <KpiCard icon={<DollarSign className="w-8 h-8 text-green-500"/>} title="Faturamento" value={formatCurrency(kpis.faturamento30d)} footer="Últimos 30 dias"/>
      <KpiCard icon={<TrendingUp className="w-8 h-8 text-emerald-500"/>} title="Lucro Bruto" value={formatCurrency(kpis.lucratividadeBruta30d)} footer="Últimos 30 dias"/>
      <KpiCard icon={<Target className="w-8 h-8 text-blue-500"/>} title="Ticket Médio" value={formatCurrency(kpis.ticketMedio)} footer="Últimos 30 dias"/>
      <KpiCard icon={<Percent className="w-8 h-8 text-indigo-500"/>} title="Conversão" value={`${(kpis.taxaConversao || 0).toFixed(1)}%`} footer="Orçamentos -> Pedidos"/>
      <KpiCard icon={<Users className="w-8 h-8 text-sky-500"/>} title="Novos Clientes" value={formatNumber(kpis.novosClientes30d)} footer="Últimos 30 dias"/>
      <KpiCard icon={<TrendingDown className="w-8 h-8 text-red-500"/>} title="A Receber Vencido" value={formatCurrency(kpis.contasVencidas)} footer="Total acumulado"/>
    </div>
    
    <ChartContainer title="Evolução de Faturamento vs. Custo (12 Meses)" data={vendasData.evolucaoFaturamentoCusto}>
      <ComposedChart data={vendasData.evolucaoFaturamentoCusto} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="mes" />
        <YAxis tickFormatter={(val) => `R$${val/1000}k`} />
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Legend />
        {/* As chaves agora são minúsculas para combinar com a API */}
        <Area type="monotone" dataKey="faturamento" fill="#8884d8" stroke="#8884d8" fillOpacity={0.2} name="Faturamento" />
        <Line type="monotone" dataKey="custo" stroke="#ff7300" strokeWidth={2} name="Custo" />
      </ComposedChart>
    </ChartContainer>
  </div>
);

const AnaliseVendasTab = ({ vendasData }) => (
    <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard icon={<UserCheck className="w-8 h-8 text-green-600"/>} title="LTV Médio" value={formatCurrency(vendasData.ltv)} footer="Valor médio por cliente"/>
            <KpiCard icon={<UserX className="w-8 h-8 text-red-600"/>} title="Churn Rate (90d)" value={`${(vendasData.churnRate || 0).toFixed(1)}%`} footer="Clientes inativos"/>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartContainer title="Top 5 Vendedores por Faturamento" data={vendasData.topVendedores}>
                <BarChart data={vendasData.topVendedores} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(val) => `R$${val/1000}k`} />
                    <YAxis dataKey="nome" type="category" width={100} tick={{fontSize: 12}}/>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="faturamento" name="Faturamento">
                        {vendasData.topVendedores.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                </BarChart>
            </ChartContainer>
            <ChartContainer title="Faturamento por Estado" data={vendasData.vendasPorEstado}>
                 <BarChart data={vendasData.vendasPorEstado} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="estado" />
                    <YAxis tickFormatter={(val) => `R$${val/1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="faturamento" name="Faturamento" fill="#3b82f6" />
                </BarChart>
            </ChartContainer>
        </div>
    </div>
);


const ProdutosEstoqueTab = ({ produtosData }) => (
  <div className="space-y-8 animate-fade-in">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
       <KpiCard icon={<Package className="w-8 h-8 text-orange-500"/>} title="Valor em Estoque" value={formatCurrency(produtosData.valorTotalEstoque)} footer="Custo total dos produtos"/>
       <KpiCard icon={<RefreshCw className="w-8 h-8 text-cyan-500"/>} title="Giro de Estoque" value={`${(produtosData.giroEstoque90d || 0).toFixed(2)}`} footer="Nos últimos 90 dias"/>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <ChartContainer title="Lucratividade por Categoria" data={produtosData.lucratividadePorCategoria} className="lg:col-span-3">
        <BarChart data={produtosData.lucratividadePorCategoria} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(val) => `R$${val/1000}k`} />
          <YAxis dataKey="categoria" type="category" width={100}/>
          <Tooltip formatter={(value) => formatCurrency(value)}/>
          <Legend />
          <Bar dataKey="lucro" stackId="a" fill="#82ca9d" name="Lucro"/>
          <Bar dataKey="custo" stackId="a" fill="#ffc658" name="Custo"/>
        </BarChart>
      </ChartContainer>
      <ChartContainer title="Pipeline de Pedidos" data={produtosData.pipelinePedidos} className="lg:col-span-2">
        <PieChart>
          <Pie data={produtosData.pipelinePedidos} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} label>
            {produtosData.pipelinePedidos.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(value, name) => [`${value} pedidos`, name]}/>
          <Legend />
        </PieChart>
      </ChartContainer>
    </div>
  </div>
);


export default function DashboardAnaliticoFinal() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpisData, setKpisData] = useState(null);
  const [vendasData, setVendasData] = useState(null);
  const [produtosData, setProdutosData] = useState(null);
  const [activeTab, setActiveTab] = useState('geral');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("🚀 Buscando dados do dashboard...");

        const [kpisRes, vendasRes, produtosRes] = await Promise.all([
          axios.get(`${API_URL}/dashboard/kpis-gerais`),
          axios.get(`${API_URL}/dashboard/analise-vendas`),
          axios.get(`${API_URL}/dashboard/analise-produtos-estoque`),
        ]);

        // ## DEBUG: Logando os dados recebidos da API ##
        console.log("✅ Dados de KPIs:", kpisRes.data);
        console.log("✅ Dados de Análise de Vendas:", vendasRes.data);
        console.log("✅ Dados de Produtos e Estoque:", produtosRes.data);

        setKpisData(kpisRes.data);
        setVendasData(vendasRes.data);
        setProdutosData(produtosRes.data);

      } catch (err) {
        console.error("❌ Erro ao buscar dados do dashboard:", err);
        setError("Não foi possível carregar os dados. Verifique o console para mais detalhes (F12).");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen text-xl font-semibold">Carregando Dashboard... 🚀</div>;
  if (error) return <div className="m-8 p-6 text-center text-red-700 bg-red-100 rounded-lg">{error}</div>;

  const renderTabContent = () => {
    // Garante que os dados existem antes de tentar renderizar a aba
    if (!kpisData || !vendasData || !produtosData) return null;

    switch (activeTab) {
      case 'vendas':
        return <AnaliseVendasTab vendasData={vendasData} />;
      case 'produtos':
        return <ProdutosEstoqueTab produtosData={produtosData} />;
      case 'geral':
      default:
        return <VisaoGeralTab kpis={kpisData} vendasData={vendasData} />;
    }
  };
  
  const activeTabClass = "border-blue-600 text-blue-600";
  const inactiveTabClass = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";

  return (
    <main className="p-4 md:p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">Dashboard de Inteligência de Negócios</h1>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button onClick={() => setActiveTab('geral')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'geral' ? activeTabClass : inactiveTabClass}`}>Visão Geral</button>
          <button onClick={() => setActiveTab('vendas')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'vendas' ? activeTabClass : inactiveTabClass}`}>Análise de Vendas</button>
          <button onClick={() => setActiveTab('produtos')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'produtos' ? activeTabClass : inactiveTabClass}`}>Produtos & Estoque</button>
        </nav>
      </div>
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </main>
  );
}