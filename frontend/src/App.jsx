import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from '@/context/AuthContext';
import 'react-toastify/dist/ReactToastify.css';

import PrivateRoute from "./components/PrivateRoute";
import LayoutDashboard from './components/LayoutDashboard';

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
import InfoEmpresaPage from "./pages/InfoEmpresaPage";
import RegrasTributariasPage from "./pages/RegrasTributariasPage";
import RegrasEmbalagem from "./pages/embalagem/RegrasEmbalagem";
import ListaLogicasEmbalagem from "./pages/embalagem/ListaLogicasEmbalagem";
import CotacaoIntelipost from "./pages/intelipost/CotacaoIntelipost";
import CadastroUsuario from "./pages/usuario/CadastroUsuario";
import ListaUsuarios from "./pages/usuario/ListaUsuarios";
import IntegracaoMercadoLivrePage from './pages/IntegracaoMercadoLivrePage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rota pública para a página de login */}
          <Route path="/login" element={<Login />} />

          {/* Rota pai protegida. Se o usuário não estiver logado, será redirecionado. */}
          {/* Todas as rotas filhas abaixo herdam essa proteção. */}
          <Route path="/" element={<PrivateRoute><LayoutDashboard /></PrivateRoute>}>
            
            {/* As rotas filhas não precisam mais do PrivateRoute */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cadastros" element={<ListarCadastros />} />
            <Route path="/cadastros/novo" element={<CadastroGeral />} />
            <Route path="/cadastros/editar" element={<CadastroGeral modo="editar" />} />
            <Route path="/produtos" element={<ListarProdutos />} />
            <Route path="/produtos/novo" element={<CadastroProdutos />} />
            <Route path="/produtos/editar" element={<CadastroProdutos modo="editar" />} />
            <Route path="/orcamentos" element={<ListarOrcamento />} />
            <Route path="/orcamentos/novo" element={<CadastroOrcamento />} />
            <Route path="/orcamentos/editar" element={<CadastroOrcamento modo="editar" />} />
            <Route path="/pedidos" element={<ListarPedidos />} />
            <Route path="/pedidos/novo" element={<CadastroPedidos />} />
            <Route path="/pedidos/editar" element={<CadastroPedidos modo="editar" />} />
            <Route path="/pedidos/aprovacao" element={<AprovarPedido />} />
            <Route path="/pedidos/programacao" element={<ProgramarPedido />} />
            <Route path="/pedidos/producao" element={<ProduzirPedido />} />
            <Route path="/pedidos/embalagem" element={<EmbalarPedido />} />
            <Route path="/pedidos/faturamento" element={<FaturarPedido />} />
            <Route path="/pedidos/expedicao" element={<ExpedirPedido />} />
            <Route path="/financeiro/criar" element={<CadastroContas />} />
            <Route path="/financeiro/editar" element={<CadastroContas modo="editar" />} />
            <Route path="/financeiro/receber" element={<ListarContas filtro="receber" />} />
            <Route path="/financeiro/pagar" element={<ListarContas filtro="pagar" />} />
            <Route path="/notas" element={<ConsultaNFE />} />
            <Route path="/estoque" element={<ConsultaEstoque />} />
            <Route path="/estoque/entrada" element={<CadastroPosicaoEstoque />} />
            <Route path="/estoque/editar" element={<CadastroPosicaoEstoque modo="editar" />} />
            <Route path="/estoque/saida" element={<SaidaEstoque />} />
            <Route path="/empresa/dados" element={<InfoEmpresaPage />} />
            <Route path="/embalagem/novo" element={<RegrasEmbalagem />} />
            <Route path="/embalagem/editar" element={<RegrasEmbalagem modo="editar" />} />
            <Route path="/embalagem" element={<ListaLogicasEmbalagem />} />
            <Route path="/integracoes/intelipost" element={<CotacaoIntelipost />} />
            <Route path="/regras-tributarias" element={<RegrasTributariasPage />} />
            <Route path="/usuario/novo" element={<CadastroUsuario />} />
            <Route path="/usuario/editar" element={<CadastroUsuario modo="editar"/>} />
            <Route path="/usuario" element={<ListaUsuarios />} />
            <Route path="/integracoes/mercadolivre" element={<IntegracaoMercadoLivrePage />} />

          </Route>
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App;
