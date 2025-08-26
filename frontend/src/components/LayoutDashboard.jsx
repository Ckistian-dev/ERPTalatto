// /components/LayoutDashboard.jsx

import { useEffect, useState } from 'react';
import {
  FaHome, FaUserFriends, FaBoxOpen, FaFileInvoiceDollar, FaWarehouse, FaMoneyBill, FaFileAlt, FaBars, FaClipboardList,
  FaBuilding, FaTruck, FaStore, FaGavel // <-- NOVO ÍCONE
} from 'react-icons/fa';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { verificarPermissao } from '@/utils/verificarPermissao';

export default function LayoutDashboard() {
  const [usuarioNome, setUsuarioNome] = useState('');
  const [menuAberto, setMenuAberto] = useState('');
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const nome = localStorage.getItem('nome') || 'Usuário';
    setUsuarioNome(nome);
  }, []);

  useEffect(() => {
    const menus = {
      '/dashboard': 'dashboard',
      '/cadastros': 'listagem',
      '/cadastros/novo': 'geral',
      '/produtos': 'listagem',
      '/embalagem': 'listagem',
      '/usuarios': 'listagem',
      '/embalagem/novo': 'geral',
      '/usuario/novo': 'geral',
      '/produtos/novo': 'geral',
      '/orcamentos': 'orcamentos',
      '/pedidos': 'pedidos',
      '/estoque': 'estoque',
      '/financeiro': 'financeiro',
      '/notas': 'notas',
      '/empresa': 'empresa',
      '/intelipost': 'intelipost',
      '/integracoes': 'integracoes'
    };

    let melhorCorrespondecia = '';
    let menuAtivo = '';
    for (const path in menus) {
      if (location.pathname.startsWith(path) && path.length > melhorCorrespondecia.length) {
        melhorCorrespondecia = path;
        menuAtivo = menus[path];
      }
    }
    if (menuAtivo) {
      setMenuAberto(menuAtivo);
    }
  }, [location.pathname]);

  const toggleMenu = (menu) => {
    setMenuAberto((prev) => (prev === menu ? '' : menu));
  };

  const toggleSidebar = () => {
    setSidebarAberta(!sidebarAberta);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`${sidebarAberta ? 'w-64' : 'w-20'} bg-gray-800 text-gray-300 p-4 space-y-4 transition-[width] duration-300 overflow-y-auto`}>
        <div className={`flex items-center ${sidebarAberta ? 'justify-between' : 'justify-center'} mb-10`}>
          {sidebarAberta && (
            <h2 className="text-2xl font-bold text-white truncate overflow-hidden whitespace-nowrap transition-opacity duration-200">
              ERP Talatto
            </h2>
          )}
          <button onClick={toggleSidebar} className="text-white p-2 rounded-md hover:bg-gray-700">
            <FaBars size={20} />
          </button>
        </div>

        <nav className="space-y-2">
          <SidebarItem icone={<FaHome />} titulo="Dashboard" aberto={menuAberto === 'dashboard'} toggle={() => toggleMenu('dashboard')} submenu={[]} sidebarAberta={sidebarAberta} links={["/dashboard"]} location={location} exact />
          {verificarPermissao(usuario, ['admin', 'vendedor', 'visitante']) && (
            <SidebarItem icone={<FaUserFriends />} titulo="Cadastros" aberto={menuAberto === 'geral'} toggle={() => toggleMenu('geral')} submenu={["Geral", "Produtos", "Usuários", "Embalagem"]} sidebarAberta={sidebarAberta} links={["/cadastros/novo", "/produtos/novo", "/usuario/novo", "/embalagem/novo"]} location={location} />
          )}
          {verificarPermissao(usuario, ['admin', 'vendedor', 'financeiro', 'visitante']) && (
            <SidebarItem icone={<FaBoxOpen />} titulo="Listagem" aberto={menuAberto === 'listagem'} toggle={() => toggleMenu('listagem')} submenu={["Cadastros", "Produtos", "Usuários", "Embalagens"]} sidebarAberta={sidebarAberta} links={["/cadastros", "/produtos", "/usuarios", "/embalagem"]} location={location} exclude={['/cadastros/novo', '/produtos/novo', "/usuario/novo", '/embalagem/novo']} />
          )}
          {verificarPermissao(usuario, ['admin', 'vendedor', 'visitante']) && (
            <SidebarItem icone={<FaFileInvoiceDollar />} titulo="Orçamentos" aberto={menuAberto === 'orcamentos'} toggle={() => toggleMenu('orcamentos')} submenu={["Novo Orçamento", "Histórico"]} sidebarAberta={sidebarAberta} links={["/orcamentos/novo", "/orcamentos"]} location={location} />
          )}
          {verificarPermissao(usuario, ['admin', 'vendedor', 'visitante']) && (
            <SidebarItem icone={<FaClipboardList />} titulo="Pedidos" aberto={menuAberto === 'pedidos'} toggle={() => toggleMenu('pedidos')} submenu={["Novo Pedido", "Aprovação", "Programação", "Produção", "Embalagem", "Faturamento", "Expedição", "Histórico"]} sidebarAberta={sidebarAberta} links={["/pedidos/novo", "/pedidos/aprovacao", "/pedidos/programacao", "/pedidos/producao", "/pedidos/embalagem", "/pedidos/faturamento", "/pedidos/expedicao", "/pedidos"]} location={location} />
          )}
          {verificarPermissao(usuario, ['admin', 'estoquista', 'visitante']) && (
            <SidebarItem icone={<FaWarehouse />} titulo="Estoque" aberto={menuAberto === 'estoque'} toggle={() => toggleMenu('estoque')} submenu={["Entrada", "Saída", "Histórico"]} sidebarAberta={sidebarAberta} links={["/estoque/entrada", "/estoque/saida", "/estoque"]} location={location} />
          )}
          {verificarPermissao(usuario, ['admin', 'financeiro', 'visitante']) && (
            <SidebarItem icone={<FaMoneyBill />} titulo="Financeiro" aberto={menuAberto === 'financeiro'} toggle={() => toggleMenu('financeiro')} submenu={["Criar Conta", "Contas a Pagar", "Contas a Receber"]} sidebarAberta={sidebarAberta} links={["/financeiro/criar", "/financeiro/pagar", "/financeiro/receber"]} location={location} />
          )}

          {/* --- MENU DE NOTAS FISCAIS ATUALIZADO --- */}
          {verificarPermissao(usuario, ['admin', 'fiscal', 'visitante']) && (
            <SidebarItem
              icone={<FaFileAlt />}
              titulo="Notas Fiscais"
              aberto={menuAberto === 'notas'}
              toggle={() => toggleMenu('notas')}
              submenu={["Consultar NF-e"]}
              sidebarAberta={sidebarAberta}
              links={["/notas"]}
              location={location}
            />
          )}

          <div className="pt-4 mt-4 border-t border-gray-700"></div>
          {verificarPermissao(usuario, ['admin']) && (
            <SidebarItem icone={<FaStore />} titulo="Integrações" aberto={menuAberto === 'integracoes'} toggle={() => toggleMenu('integracoes')} submenu={["Sebrae", "Mercado Livre", "Tray", "Intelipost"]} sidebarAberta={sidebarAberta} links={["/integracoes/sebrae", "/integracoes/mercadolivre", "/integracoes/tray", "/integracoes/intelipost"]} location={location} />
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow p-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Painel ERP</h1>
            <p className="text-sm text-gray-500">
              Bem-vindo, <span className="font-semibold text-teal-600">{usuarioNome}</span>
            </p>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
            Sair
          </button>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}


function SidebarItem({ icone, titulo, submenu, aberto, toggle, sidebarAberta, links, location, exact = false, exclude = [] }) {
  const isLinkSimples = submenu.length === 0;

  const isAtivo = links.some(link => {
    if (exact) {
      return location.pathname === link;
    }
    if (location.pathname.startsWith(link)) {
      if (exclude.some(excludePath => location.pathname.startsWith(excludePath))) {
        return false;
      }
      return true;
    }
    return false;
  });

  const classeAtivo = isAtivo ? 'bg-teal-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white';

  return (
    <div>
      {isLinkSimples ? (
        <Link to={links[0]} className={`flex items-center gap-4 w-full px-4 py-2.5 rounded-md truncate overflow-hidden whitespace-nowrap transition-colors duration-200 ${classeAtivo}`}>
          {icone}
          {sidebarAberta && <span className="font-medium">{titulo}</span>}
        </Link>
      ) : (
        <>
          <button onClick={toggle} className={`flex items-center justify-between text-left w-full px-4 py-2.5 rounded-md truncate overflow-hidden whitespace-nowrap transition-colors duration-200 ${classeAtivo}`}>
            <div className="flex items-center gap-4">
              {icone}
              {sidebarAberta && <span className="font-medium">{titulo}</span>}
            </div>
          </button>
          {aberto && sidebarAberta && submenu.length > 0 && (
            <div className="pl-12 pr-4 py-1 space-y-1 truncate overflow-hidden whitespace-nowrap">
              {submenu.map((item, index) => {
                const isSubItemAtivo = location.pathname === links[index];
                const classeSubItemAtivo = isSubItemAtivo ? 'text-white font-semibold' : 'text-gray-400 hover:text-white';
                return (
                  <Link to={links[index] || '#'} key={index} className={`block text-sm py-1.5 px-2 rounded-md transition-colors duration-200 ${classeSubItemAtivo}`}>
                    {item}
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
