import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FiEdit } from 'react-icons/fi';
import { FaFileCsv, FaFileImport, FaUserPlus, FaTable, FaFilter } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import React from 'react';
import { toast } from 'react-toastify';

import ModalErro from '@/components/modals/ModalErro';
import ModalFiltroColunas from '@/components/modals/ModalFiltroColunas';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import ModalEditarTabela from '@/components/modals/ModalEditarTabela';
import { useAuth } from '@/context/AuthContext';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ListaUsuarios() {
    const navigate = useNavigate();
    const { usuario: usuarioLogado } = useAuth();

    // Estados principais
    const [usuarios, setUsuarios] = useState([]);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
    const [acaoPendente, setAcaoPendente] = useState(null);
    const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

    // Estados de importação de CSV
    const [conflitos, setConflitos] = useState([]);
    const [mostrarModalConflitos, setMostrarModalConflitos] = useState(false);
    const [confirmarLinhas, setConfirmarLinhas] = useState({});
    const [novosUsuarios, setNovosUsuarios] = useState([]);
    
    // Estados de erro
    const [mensagemErro, setMensagemErro] = useState(null);

    // Estados para a paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 15;
    const [loading, setLoading] = useState(false);
    const [totalPaginas, setTotalPaginas] = useState(1);

    // Customização da tabela
    const [mostrarFiltroColunas, setMostrarFiltroColunas] = useState(false);
    const [colunasVisiveis, setColunasVisiveis] = useState([]);
    const [todasColunas, setTodasColunas] = useState([]);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [filtrosSelecionados, setFiltrosSelecionados] = useState([]);
    const [mostrarEditarTabela, setMostrarEditarTabela] = useState(false);
    const [filtroRapidoColuna, setFiltroRapidoColuna] = useState('nome');
    const [filtroRapidoTexto, setFiltroRapidoTexto] = useState('');
    const [opcoesDropdown, setOpcoesDropdown] = useState({});
    const [ordenacaoColuna, setOrdenacaoColuna] = useState('id');
    const [ordenacaoAscendente, setOrdenacaoAscendente] = useState(true);

    const buscarUsuarios = useCallback(async () => {
        setLoading(true);
        setUsuarioSelecionado(null); // Limpa a seleção ao recarregar
        try {
            const filtrosStr = filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`).join(';');
            const params = {
                page: paginaAtual,
                limit: itensPorPagina,
                filtro_rapido_coluna: filtroRapidoColuna,
                filtro_rapido_texto: filtroRapidoTexto,
                filtros: filtrosStr || undefined,
                data_inicio: dataInicio || undefined,
                data_fim: dataFim || undefined,
                ordenar_por: ordenacaoColuna,
                ordenar_direcao: ordenacaoAscendente ? 'asc' : 'desc'
            };
            const res = await axios.get(`${API_URL}/api/usuarios/paginado`, { params });
            setUsuarios(res.data.resultados);
            setTotalPaginas(Math.ceil(res.data.total / itensPorPagina) || 1);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            setMensagemErro("Falha ao carregar a lista de usuários.");
        } finally {
            setLoading(false);
        }
    }, [paginaAtual, itensPorPagina, filtrosSelecionados, filtroRapidoColuna, filtroRapidoTexto, dataInicio, dataFim, ordenacaoColuna, ordenacaoAscendente]);

    useEffect(() => {
        if (!usuarioLogado) return;
        const ordemPadrao = ["id", "nome", "email", "perfil", "ativo", "criado_em"];
        setTodasColunas(ordemPadrao);
        const colunasSalvas = usuarioLogado.colunas_visiveis_usuarios; // IMPORTANTE: Seu objeto de usuário logado precisa ter essa propriedade
        const colunasIniciais = colunasSalvas?.length ? colunasSalvas : ordemPadrao;
        setColunasVisiveis(colunasIniciais);
        if (!colunasIniciais.includes(filtroRapidoColuna)) {
            setFiltroRapidoColuna(colunasIniciais[0] || 'nome');
        }
    }, [usuarioLogado]);

    useEffect(() => {
        if (colunasVisiveis.length > 0) {
            buscarUsuarios();
        }
    }, [colunasVisiveis, buscarUsuarios]);

    const exportarCSV = async () => { /* ... (código adaptado) ... */ };
    const importarCSV = async (event) => { /* ... (código adaptado) ... */ };
    const handleConfirmarImportacao = async () => { /* ... (código adaptado) ... */ };

    const handleAplicarFiltros = ({ filtros, data_inicio, data_fim }) => {
        setFiltrosSelecionados(filtros || []);
        setDataInicio(data_inicio || '');
        setDataFim(data_fim || '');
        setPaginaAtual(1);
        setMostrarFiltroColunas(false);
    };

    const colunasDropdownEditavel = { 'perfil': 'perfil', 'ativo': 'ativo' };

    const handleEditar = () => {
        if (!usuarioSelecionado) return toast.warn('Você deve selecionar um usuário primeiro!');
        setAcaoPendente('editar');
        setMostrarConfirmacao(true);
    };

    const confirmarAcao = () => {
        if (acaoPendente === 'editar' && usuarioSelecionado) {
            // ATENÇÃO: Verifique se sua rota de edição é '/usuario/editar' ou '/usuario/editar'
            navigate('/usuario/editar', { state: { usuario: usuarioSelecionado } });
        }
        setMostrarConfirmacao(false);
        setAcaoPendente(null);
    };

    useEffect(() => {
        const tipo = colunasDropdownEditavel[filtroRapidoColuna];
        if (tipo && !opcoesDropdown[filtroRapidoColuna]) {
            if (tipo === 'ativo') {
                 setOpcoesDropdown(prev => ({ ...prev, [filtroRapidoColuna]: [{id: 'true', valor: 'Sim'}, {id: 'false', valor: 'Não'}] }));
            } else {
                axios.get(`${API_URL}/opcoes/${tipo}`)
                    .then(res => setOpcoesDropdown(prev => ({ ...prev, [filtroRapidoColuna]: res.data })))
                    .catch(() => console.warn("Erro ao buscar opções para", filtroRapidoColuna));
            }
        }
    }, [filtroRapidoColuna]);

    return (
        <div className="p-6">
            <div className="w-auto overflow-auto">
                {/* Barra de ações e filtros */}
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/usuario/novo" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaUserPlus /> Novo
                        </Link>
                        <ButtonComPermissao permissoes={["admin"]}>
                            <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 cursor-pointer">
                                <FaFileImport /> Importar CSV
                                <input type="file" accept=".csv" onChange={importarCSV} className="hidden" />
                            </label>
                        </ButtonComPermissao>
                        <ButtonComPermissao type="button" onClick={exportarCSV} permissoes={["admin"]} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaFileCsv /> Exportar CSV
                        </ButtonComPermissao>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex gap-2 items-center">
                            <select value={filtroRapidoColuna} onChange={(e) => { setFiltroRapidoColuna(e.target.value); setFiltroRapidoTexto(""); setPaginaAtual(1); }} className="border p-2 rounded text-sm w-48">
                                {colunasVisiveis.map((col) => ( <option key={col} value={col}>{col.replace(/_/g, ' ').toUpperCase()}</option> ))}
                            </select>
                            <div className="w-64">
                                {colunasDropdownEditavel[filtroRapidoColuna] ? (
                                    <select value={filtroRapidoTexto} onChange={(e) => { setFiltroRapidoTexto(e.target.value); setPaginaAtual(1); }} className="w-full border p-2 rounded text-sm">
                                        <option value="">Selecione</option>
                                        {(opcoesDropdown[filtroRapidoColuna] || []).map((op) => ( <option key={op.id} value={op.valor}>{op.valor}</option> ))}
                                    </select>
                                ) : (
                                    <input type="text" placeholder="Pesquisar..." value={filtroRapidoTexto} onChange={(e) => { setFiltroRapidoTexto(e.target.value); setPaginaAtual(1); }} className="w-full border p-2 rounded text-sm" />
                                )}
                            </div>
                        </div>
                        <button onClick={() => setMostrarFiltroColunas(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaFilter /> Filtro Avançado
                        </button>
                        <button onClick={() => setMostrarEditarTabela(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaTable /> Editar Tabela
                        </button>
                        <ButtonComPermissao type="button" onClick={handleEditar} permissoes={["admin"]} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FiEdit /> Editar
                        </ButtonComPermissao>
                    </div>
                </div>

                {mostrarConfirmacao && (
                     <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-200 animate-fade-in">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Confirmar Edição</h2>
                            <p className="text-gray-600 mb-6">Deseja realmente editar o usuário <span className="font-bold text-gray-900">{usuarioSelecionado?.nome}</span>?</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setMostrarConfirmacao(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-full font-medium shadow">Cancelar</button>
                                <button onClick={confirmarAcao} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-medium shadow">Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <div className="max-w-screen-lg">
                        <table className="bg-white border border-gray-300 table-auto whitespace-nowrap w-full">
                            <thead>
                                <tr>
                                    {colunasVisiveis.map((coluna) => (<th key={coluna} className="p-2 border whitespace-nowrap">{coluna === 'id' ? '#' : coluna.replace(/_/g, ' ').toUpperCase()}</th>))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? ( <tr><td colSpan={colunasVisiveis.length} className="text-center p-4">Carregando...</td></tr> ) : 
                                usuarios.length === 0 ? ( <tr><td colSpan={colunasVisiveis.length}><div className="flex items-center pl-[63vh] h-[63vh]"><span className="text-gray-500 text-lg">Nenhum usuário encontrado.</span></div></td></tr> ) : 
                                (<>
                                    {usuarios.map((user) => (
                                        <tr key={user.id} onClick={() => setUsuarioSelecionado(user)} className={`cursor-pointer ${usuarioSelecionado?.id === user.id ? 'bg-gray-100' : ''}`}>
                                            {colunasVisiveis.map((coluna) => (
                                                <td key={coluna} className="p-2 border whitespace-nowrap text-sm min-w-64 text-center">
                                                    {typeof user[coluna] === 'boolean' ? (user[coluna] ? 'Sim' : 'Não') : user[coluna]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {usuarios.length < itensPorPagina && Array.from({ length: itensPorPagina - usuarios.length }).map((_, idx) => (
                                        <tr key={`espaco-${idx}`} className="opacity-0 pointer-events-none select-none">
                                            {colunasVisiveis.map((_, i) => (<td key={i} className="p-2 whitespace-nowrap">&nbsp;</td>))}
                                        </tr>
                                    ))}
                                </>)}
                            </tbody>
                        </table>
                    </div>
                </div>

                {!loading && (
                    <div className="flex justify-start items-start gap-4 mt-4">
                        <button onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))} disabled={paginaAtual === 1} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Anterior</button>
                        <span>Página {paginaAtual} de {totalPaginas}</span>
                        <button onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))} disabled={paginaAtual >= totalPaginas} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Próxima</button>
                    </div>
                )}
            </div>

            {/* Modais (Erro, Conflitos, Filtro, Edição de Tabela) */}
            <ModalErro mensagem={mensagemErro} onClose={() => setMensagemErro(null)} />
            {mostrarFiltroColunas && <ModalFiltroColunas colunas={todasColunas} colunasDropdown={colunasDropdownEditavel} onClose={() => setMostrarFiltroColunas(false)} onAplicar={handleAplicarFiltros} API_URL={API_URL} />}
            {mostrarEditarTabela && <ModalEditarTabela colunas={todasColunas} selecionadas={colunasVisiveis} exemplos={[...usuarios].slice(-10).reverse()} onClose={() => setMostrarEditarTabela(false)} onSalvar={({ colunas, ordenacao }) => { /* Lógica de salvar... */ }} />}
            
            {/* Modal de Conflitos de Importação */}
            {mostrarModalConflitos && (
                 <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto border border-red-200 animate-fade-in">
                        <div className="mb-4 text-red-600 text-center">{/* ... Título e ícone ... */}</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border border-gray-300 mb-4">{/* ... Tabela de conflitos ... */}</table>
                        </div>
                        <div className="flex justify-end gap-4 mt-4">
                            <button onClick={() => setMostrarModalConflitos(false)} className="px-4 py-2 rounded bg-gray-400 hover:bg-gray-500 text-white">Cancelar</button>
                            <button onClick={handleConfirmarImportacao} className="px-6 py-2 rounded bg-teal-600 hover:bg-teal-700 text-white">Confirmar Selecionados</button>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
}