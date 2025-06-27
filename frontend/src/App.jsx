import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ToastContainer } from 'react-toastify'
import { AuthProvider } from '@/context/AuthContext'
import 'react-toastify/dist/ReactToastify.css'

import PrivateRoute from "./components/PrivateRoute"
import Layout from './components/Layout'

import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import ListarCadastros from "./pages/ListarCadastros"
import ListarProdutos from "./pages/ListarProdutos"
import CadastroGeral from "./pages/CadastroGeral"
import CadastroProdutos from "./pages/CadastroProdutos"
import CadastroOrcamento from "./pages/CadastroOrcamento"
import CadastroPedidos from "./pages/CadastroPedidos"
import ListarPedidos from "./pages/ListarPedidos"
import ListarOrcamento from "./pages/ListarOrcamento"
import AprovarPedido from "./pages/AprovarPedido"
import ProgramarPedido from "./pages/ProgramarPedido"
import ProduzirPedido from "./pages/ProduzirPedido"
import EmbalarPedido from "./pages/EmbalarPedido"
import FaturarPedido from "./pages/FaturarPedido"
import ExpedirPedido from "./pages/ExpedirPedido"
import CadastroContas from "./pages/CadastroContas"
import ListarContas from "./pages/ListarContas"

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/cadastros" element={<PrivateRoute><ListarCadastros /></PrivateRoute>} />
            <Route path="/cadastros/novo" element={<PrivateRoute><CadastroGeral /></PrivateRoute>} />
            <Route path="/cadastros/editar" element={<PrivateRoute><CadastroGeral modo="editar" /></PrivateRoute>} />
            <Route path="/produtos" element={<PrivateRoute><ListarProdutos /></PrivateRoute>} />
            <Route path="/produtos/novo" element={<PrivateRoute><CadastroProdutos /></PrivateRoute>} />
            <Route path="/produtos/editar" element={<PrivateRoute><CadastroProdutos modo="editar" /></PrivateRoute>} />
            <Route path="/orcamentos" element={<PrivateRoute><ListarOrcamento /></PrivateRoute>} />
            <Route path="/orcamentos/novo" element={<PrivateRoute><CadastroOrcamento /></PrivateRoute>} />
            <Route path="/orcamentos/editar" element={<PrivateRoute><CadastroOrcamento modo="editar" /></PrivateRoute>} />
            <Route path="/pedidos" element={<PrivateRoute><ListarPedidos/></PrivateRoute>} />
            <Route path="/pedidos/novo" element={<PrivateRoute><CadastroPedidos/></PrivateRoute>} />
            <Route path="/pedidos/editar" element={<PrivateRoute><CadastroPedidos modo="editar"/></PrivateRoute>} />
            <Route path="/pedidos/aprovacao" element={<PrivateRoute><AprovarPedido/></PrivateRoute>} />
            <Route path="/pedidos/programacao" element={<PrivateRoute><ProgramarPedido/></PrivateRoute>} />
            <Route path="/pedidos/producao" element={<PrivateRoute><ProduzirPedido/></PrivateRoute>} />
            <Route path="/pedidos/embalagem" element={<PrivateRoute><EmbalarPedido/></PrivateRoute>} /> 
            <Route path="/pedidos/faturamento" element={<PrivateRoute><FaturarPedido/></PrivateRoute>} />
            <Route path="/pedidos/expedicao" element={<PrivateRoute><ExpedirPedido/></PrivateRoute>} />
            <Route path="/financeiro/criar" element={<PrivateRoute><CadastroContas/></PrivateRoute>} />
            <Route path="/financeiro/receber" element={<PrivateRoute><ListarContas filtro="receber" /></PrivateRoute>} />
            <Route path="/financeiro/pagar" element={<PrivateRoute><ListarContas filtro="pagar" /></PrivateRoute>} />
          </Route>
        </Routes>

        {/* 🔔 Container de notificações visível em toda a aplicação */}
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
