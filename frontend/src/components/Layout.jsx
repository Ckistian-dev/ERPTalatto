import { useEffect, useState } from 'react'
import {
  FaHome,
  FaUserFriends,
  FaBoxOpen,
  FaFileInvoiceDollar,
  FaWarehouse,
  FaMoneyBill,
  FaFileAlt,
  FaBars,
  FaClipboardList
} from 'react-icons/fa'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { verificarPermissao } from '@/utils/verificarPermissao'

export default function LayoutDashboard() {
  const [usuarioNome, setUsuarioNome] = useState('')
  const [menuAberto, setMenuAberto] = useState('')
  const [sidebarAberta, setSidebarAberta] = useState(true)
  const navigate = useNavigate()
  const { usuario } = useAuth()

  useEffect(() => {
    const nome = localStorage.getItem('nome') || 'Usuário'
    setUsuarioNome(nome)
  }, [])

  const toggleMenu = (menu) => {
    setMenuAberto((prev) => (prev === menu ? '' : menu))
  }

  const toggleSidebar = () => {
    setSidebarAberta(!sidebarAberta)
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className={`${sidebarAberta ? 'w-64' : 'w-20'} bg-gray-800 text-white p-4 space-y-4 transition-[width] duration-300 overflow-hidden`}>
        <div className={`flex items-center ${sidebarAberta ? 'justify-between' : 'justify-center'}`}>
          {sidebarAberta && (
            <h2 className="text-2xl font-bold truncate overflow-hidden whitespace-nowrap mb-10 transition-opacity duration-200">
              ERP Talatto
            </h2>
          )}
          <button onClick={toggleSidebar} className="text-white mt-3 mb-12 mr-2 ml-4">
            <FaBars size={20} />
          </button>
        </div>

        <nav className="space-y-2">
          {verificarPermissao(usuario, ['admin', 'vendedor', 'financeiro', 'visitante']) && (
            <SidebarItem icone={<FaHome />} titulo="Dashboard" aberto={menuAberto === 'dashboard'} toggle={() => toggleMenu('dashboard')} submenu={[]} sidebarAberta={sidebarAberta} links={["/dashboard"]} />
          )}
          {verificarPermissao(usuario, ['admin', 'vendedor', 'visitante']) && (
            <SidebarItem icone={<FaUserFriends />} titulo="Cadastros" aberto={menuAberto === 'geral'} toggle={() => toggleMenu('geral')} submenu={["Cadastro Geral", "Cadastro Produtos"]} sidebarAberta={sidebarAberta} links={["/cadastros/novo", "/produtos/novo"]} />
          )}
          {verificarPermissao(usuario, ['admin', 'vendedor', 'financeiro', 'visitante']) && (
            <SidebarItem icone={<FaBoxOpen />} titulo="Listagem" aberto={menuAberto === 'listagem'} toggle={() => toggleMenu('listagem')} submenu={["Cadastros", "Produtos"]} sidebarAberta={sidebarAberta} links={["/cadastros", "/produtos"]} />
          )}
          {verificarPermissao(usuario, ['admin', 'vendedor', 'visitante']) && (
            <SidebarItem icone={<FaFileInvoiceDollar />} titulo="Orçamentos" aberto={menuAberto === 'orcamentos'} toggle={() => toggleMenu('orcamentos')} submenu={["Novo Orçamento", "Histórico"]} sidebarAberta={sidebarAberta} links={["/orcamentos/novo", "/orcamentos"]} />
          )}
          {verificarPermissao(usuario, ['admin', 'vendedor', 'visitante']) && (
            <SidebarItem icone={<FaClipboardList />} titulo="Pedidos" aberto={menuAberto === 'pedidos'} toggle={() => toggleMenu('pedidos')} submenu={["Novo Pedido", "Aprovação", "Programação", "Produção", "Embalagem", "Faturamento", "Expedição", "Histórico"]} sidebarAberta={sidebarAberta} links={["/pedidos/novo", "/pedidos/aprovacao", "/pedidos/programacao", "/pedidos/producao", "/pedidos/embalagem", "/pedidos/faturamento", "/pedidos/expedicao", "/pedidos"]} />
          )}
          {verificarPermissao(usuario, ['admin', 'estoquista', 'visitante']) && (
            <SidebarItem icone={<FaWarehouse />} titulo="Estoque" aberto={menuAberto === 'estoque'} toggle={() => toggleMenu('estoque')} submenu={["Entrada", "Saída", "Posição Atual"]} sidebarAberta={sidebarAberta} links={["/estoque/entrada", "/estoque/saida", "/estoque"]} />
          )}
          {verificarPermissao(usuario, ['admin', 'financeiro', 'visitante']) && (
            <SidebarItem icone={<FaMoneyBill />} titulo="Financeiro" aberto={menuAberto === 'financeiro'} toggle={() => toggleMenu('financeiro')} submenu={["Criar Conta", "Contas a Pagar", "Contas a Receber"]} sidebarAberta={sidebarAberta} links={["/financeiro/criar", "/financeiro/pagar", "/financeiro/receber"]} />
          )}
          {verificarPermissao(usuario, ['admin', 'fiscal', 'visitante']) && (
            <SidebarItem icone={<FaFileAlt />} titulo="Notas Fiscais" aberto={menuAberto === 'notas'} toggle={() => toggleMenu('notas')} submenu={["Consultar NF-e"]} sidebarAberta={sidebarAberta} links={["/notas"]} />
          )}
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col bg-gray-100">
        <header className="bg-white shadow p-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Painel ERP</h1>
            <p className="text-sm text-gray-500">
              Bem-vindo, <span className="font-semibold text-teal-600">{usuarioNome}</span>
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.clear()
              navigate('/login')
            }}
            className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Sair
          </button>
        </header>

        <main className="p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarItem({ icone, titulo, submenu, aberto, toggle, sidebarAberta, links }) {
  const isLinkSimples = submenu.length === 0 && links.length === 1

  return (
    <div>
      {isLinkSimples ? (
        <Link
          to={links[0]}
          className="flex items-center gap-2 w-full hover:bg-gray-700 px-4 py-2 rounded truncate overflow-hidden whitespace-nowrap"
        >
          {icone}
          {sidebarAberta && <span>{titulo}</span>}
        </Link>
      ) : (
        <>
          <button
            onClick={toggle}
            className="flex items-center gap-2 w-full hover:bg-gray-700 px-4 py-2 rounded truncate overflow-hidden whitespace-nowrap"
          >
            {icone}
            {sidebarAberta && <span>{titulo}</span>}
          </button>

          {aberto && sidebarAberta && submenu.length > 0 && (
            <div className="ml-8 mt-1 space-y-1 truncate overflow-hidden whitespace-nowrap">
              {submenu.map((item, index) => (
                <Link
                  to={links[index] || '#'}
                  key={index}
                  className="block text-sm hover:bg-gray-700 px-2 py-1 rounded"
                >
                  {item}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}