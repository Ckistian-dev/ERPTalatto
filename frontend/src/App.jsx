// /App.jsx

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from '@/context/AuthContext';
import 'react-toastify/dist/ReactToastify.css';

import PrivateRoute from "./components/PrivateRoute";
import LayoutDashboard from './components/LayoutDashboard'; // Nome do componente de Layout atualizado

// Importe suas páginas
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ListarCadastros from "./pages/ListarCadastros";
import ListarProdutos from "./pages/ListarProdutos";
import CadastroGeral from "./pages/CadastroGeral";
import CadastroProdutos from "./pages/CadastroProdutos";
import CadastroOrcamento from "./pages/CadastroOrcamento";
import CadastroPedidos from "./pages/CadastroPedidos";
import ListarPedidos from "./pages/ListarPedidos";
import ListarOrcamento from "./pages/ListarOrcamento";
import AprovarPedido from "./pages/AprovarPedido";
import ProgramarPedido from "./pages/ProgramarPedido";
import ProduzirPedido from "./pages/ProduzirPedido";
import EmbalarPedido from "./pages/EmbalarPedido";
import FaturarPedido from "./pages/FaturarPedido";
import ExpedirPedido from "./pages/ExpedirPedido";
import CadastroContas from "./pages/financeiro/CadastroContas";
import ListarContas from "./pages/financeiro/ListarContas";
import ConsultaNFE from "./pages/ConsultaNFE";
import ConsultaEstoque from "./pages/estoque/ConsultaEstoque";
import CadastroPosicaoEstoque from "./pages/estoque/CadastroPosicaoEstoque";
import SaidaEstoque from "./pages/estoque/SaidaEstoque";
import InfoEmpresaPage from "./pages/InfoEmpresaPage"; // Nome da página de empresa atualizado
import RegrasTributariasPage from "./pages/RegrasTributariasPage"; // <-- NOVA IMPORTAÇÃO
import RegrasEmbalagem from "./pages/embalagem/RegrasEmbalagem"; // <-- NOVA IMPORTAÇÃO
import ListaLogicasEmbalagem from "./pages/embalagem/ListaLogicasEmbalagem"; // <-- NOVA IMPORTAÇÃO
import CotacaoIntelipost from "./pages/intelipost/CotacaoIntelipost"; // <-- NOVA IMPORTAÇÃO

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><LayoutDashboard /></PrivateRoute>}>
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
            <Route path="/financeiro/editar" element={<PrivateRoute><CadastroContas modo="editar"/></PrivateRoute>} />
            <Route path="/financeiro/receber" element={<PrivateRoute><ListarContas filtro="receber" /></PrivateRoute>} />
            <Route path="/financeiro/pagar" element={<PrivateRoute><ListarContas filtro="pagar" /></PrivateRoute>} />
            <Route path="/notas" element={<PrivateRoute><ConsultaNFE/></PrivateRoute>} />
            <Route path="/estoque" element={<PrivateRoute><ConsultaEstoque /></PrivateRoute>} />
            <Route path="/estoque/entrada" element={<PrivateRoute><CadastroPosicaoEstoque /></PrivateRoute>} />
            <Route path="/estoque/editar" element={<PrivateRoute><CadastroPosicaoEstoque modo="editar" /></PrivateRoute>} />
            <Route path="/estoque/saida" element={<PrivateRoute><SaidaEstoque /></PrivateRoute>} />
            <Route path="/empresa/dados" element={<PrivateRoute><InfoEmpresaPage /></PrivateRoute>} />
            <Route path="/embalagem/novo" element={<PrivateRoute><RegrasEmbalagem /></PrivateRoute>} />
            <Route path="/embalagem/editar" element={<PrivateRoute><RegrasEmbalagem modo="editar"/></PrivateRoute>} />
            <Route path="/embalagem" element={<PrivateRoute><ListaLogicasEmbalagem /></PrivateRoute>} />
            <Route path="/intelipost/cotacao" element={<PrivateRoute><CotacaoIntelipost /></PrivateRoute>} />
            
            {/* --- NOVA ROTA ADICIONADA --- */}
            <Route path="/regras-tributarias" element={<PrivateRoute><RegrasTributariasPage /></PrivateRoute>} />

          </Route>
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App;
