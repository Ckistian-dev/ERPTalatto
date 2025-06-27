import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'

const dadosExemplo = [
  { nome: 'Jan', vendas: 2400 },
  { nome: 'Fev', vendas: 2210 },
  { nome: 'Mar', vendas: 2290 },
  { nome: 'Abr', vendas: 2000 },
  { nome: 'Mai', vendas: 2181 },
  { nome: 'Jun', vendas: 2500 },
  { nome: 'Jul', vendas: 2100 }
]

const dadosFinanceiro = [
  { tipo: 'Contas a Pagar', valor: 15000 },
  { tipo: 'Contas a Receber', valor: 22000 },
]

const dadosEstoques = [
  { nome: 'Produto A', quantidade: 120 },
  { nome: 'Produto B', quantidade: 98 },
  { nome: 'Produto C', quantidade: 75 },
  { nome: 'Produto D', quantidade: 130 },
]

const dadosFaturamento = [
  { mes: 'Jan', faturamento: 10000 },
  { mes: 'Fev', faturamento: 12000 },
  { mes: 'Mar', faturamento: 9000 },
  { mes: 'Abr', faturamento: 15000 },
  { mes: 'Mai', faturamento: 11000 },
  { mes: 'Jun', faturamento: 14000 }
]

const cores = ['#0d9488', '#3b82f6', '#facc15', '#f87171']

export default function Dashboard() {
  return (
    <main className="p-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Gráfico de Vendas Mensais */}
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Vendas Mensais</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dadosExemplo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="vendas" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Produtos Comparativos */}
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Comparativo de Produtos</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dadosExemplo.map((d) => ({ ...d, produtos: d.vendas * 0.6 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="produtos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Linha de Vendas */}
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Evolução de Vendas</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dadosExemplo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="vendas" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Pizza Financeiro */}
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Financeiro</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dadosFinanceiro}
                dataKey="valor"
                nameKey="tipo"
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {dadosFinanceiro.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={cores[index % cores.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Estoque por Produto */}
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Estoque Atual</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dadosEstoques}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantidade" fill="#facc15" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Faturamento Mensal */}
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Faturamento</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dadosFaturamento}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="faturamento" stroke="#f87171" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  )
}
