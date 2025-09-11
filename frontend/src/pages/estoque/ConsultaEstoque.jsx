import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext'

// --- Início dos Componentes Mock/Substitutos ---

const API_URL = import.meta.env.VITE_API_BASE_URL;

// Mock de componentes de UI que eram importados de outros arquivos
const ModalPlaceholder = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
            </div>
            <div>{children}</div>
        </div>
    </div>
);

const ModalErro = ({ mensagem, onClose }) => !mensagem ? null : <ModalPlaceholder title="Ocorreu um Erro" onClose={onClose}><p className="text-red-600">{mensagem}</p></ModalPlaceholder>;
const ModalFiltroColunas = ({ onClose, onAplicar }) => <ModalPlaceholder title="Filtro Avançado" onClose={onClose}><div className="text-center"><p className="text-gray-600 mb-4">Interface de filtro avançado.</p><button onClick={() => onAplicar({})} className="bg-blue-500 text-white px-4 py-2 rounded">Aplicar</button></div></ModalPlaceholder>;
const ModalEditarTabela = ({ onClose, onSalvar }) => <ModalPlaceholder title="Editar Tabela" onClose={onClose}><div className="text-center"><p className="text-gray-600 mb-4">Interface para customizar colunas.</p><button onClick={() => onSalvar({colunas: [], ordenacao: {}})} className="bg-blue-500 text-white px-4 py-2 rounded">Salvar</button></div></ModalPlaceholder>;

// Mock do ButtonComPermissao
const ButtonComPermissao = ({ children, ...props }) => <button {...props}>{children}</button>;

// Substituições para os ícones usando SVGs embutidos
const FiEdit = (props) => (<svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>);
const FaTable = (props) => (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M464 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zM224 416H64V160h160v256zm224 0H288V160h160v256z"></path></svg>);
const FaFilter = (props) => (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M487.976 0H24.028C2.71 0-8.047 25.866 7.058 40.971L192 225.941V432c0 7.848 3.582 15.167 9.612 19.958l64 48c11.896 8.922 29.582 1.159 29.582-14.518V225.941L504.942 40.971C520.047 25.866 509.29 0 487.976 0z"></path></svg>);
const GrAddCircle = (props) => (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><path fill="none" stroke="#000" strokeWidth="2" d="M12,22 C17.5228475,22 22,17.5228475 22,12 C22,6.4771525 17.5228475,2 12,2 C6.4771525,2 2,6.4771525 2,12 C2,17.5228475 6.4771525,22 12,22 Z M12,8 L12,16 M8,12 L16,12"></path></svg>);
const GrSubtractCircle = (props) => (<svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" {...props}><path fill="none" stroke="#000" strokeWidth="2" d="M12,22 C17.5228475,22 22,17.5228475 22,12 C22,6.4771525 17.5228475,2 12,2 C6.4771525,2 2,6.4771525 2,12 C2,17.5228475 6.4771525,22 12,22 Z M8,12 L16,12"></path></svg>);

// --- Fim dos Componentes Mock ---

export default function ConsultaEstoque() {
    const [posicoes, setPosicoes] = useState([]);
    const [posicaoSelecionada, setPosicaoSelecionada] = useState(null);
    const { usuario } = useAuth();
    const navigate = useNavigate();

    // Estados de controle da tabela
    const [loading, setLoading] = useState(false);
    const [mensagemErro, setMensagemErro] = useState(null);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina] = useState(15);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [mostrarFiltroColunas, setMostrarFiltroColunas] = useState(false);
    const [colunasVisiveis, setColunasVisiveis] = useState([]);
    const [todasColunas, setTodasColunas] = useState([]);
    const [filtrosSelecionados, setFiltrosSelecionados] = useState([]);
    const [mostrarEditarTabela, setMostrarEditarTabela] = useState(false);
    const [filtroRapidoColuna, setFiltroRapidoColuna] = useState('descricao');
    const [filtroRapidoTexto, setFiltroRapidoTexto] = useState('');
    const [ordenacaoColuna, setOrdenacaoColuna] = useState('descricao');
    const [ordenacaoAscendente, setOrdenacaoAscendente] = useState(true);

    const buscarEstoque = async () => {
        setLoading(true);
        try {
            const filtrosStr = filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`).join(';');
            const params = {
                page: paginaAtual,
                limit: itensPorPagina,
                filtro_rapido_coluna: filtroRapidoTexto ? filtroRapidoColuna : undefined,
                filtro_rapido_texto: filtroRapidoTexto || undefined,
                filtros: filtrosStr || undefined,
                ordenar_por: ordenacaoColuna || undefined,
                ordenar_direcao: ordenacaoAscendente ? 'asc' : 'desc'
            };
            const res = await axios.get(`${API_URL}/api/estoque/posicao_paginada`, { params });
            setPosicoes(res.data.resultados);
            setTotalPaginas(Math.ceil(res.data.total / itensPorPagina));
        } catch (error) {
            console.error('Erro ao buscar estoque:', error);
            setMensagemErro("Erro ao buscar dados do estoque.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const ordemPadrao = ["descricao", "lote", "deposito", "rua", "numero", "nivel", "cor", "situacao_estoque", "quantidade_total"];
        setTodasColunas(ordemPadrao);
        const colunasSalvas = usuario.colunas_visiveis_estoque || ordemPadrao;
        setColunasVisiveis(colunasSalvas);
    }, [usuario]);

    useEffect(() => {
        if (colunasVisiveis.length > 0) {
            buscarEstoque();
        }
    }, [colunasVisiveis, paginaAtual, itensPorPagina, filtrosSelecionados, filtroRapidoColuna, filtroRapidoTexto, ordenacaoColuna, ordenacaoAscendente]);

    const handleAplicarFiltros = ({ filtros }) => {
        setFiltrosSelecionados(filtros || []);
        setPaginaAtual(1);
        setMostrarFiltroColunas(false);
    };

    const handleEditar = () => {
        if (!posicaoSelecionada) {
            toast.warn('Você deve selecionar uma posição de estoque primeiro!');
            return;
        }
        navigate('/estoque/editar', { state: { posicao: posicaoSelecionada } });
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Consulta de Estoque</h1>
            <div className="w-auto overflow-auto">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/estoque/entrada" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"><GrAddCircle /> Entrada</Link>
                        <Link to="/estoque/saida" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"><GrSubtractCircle /> Saída</Link>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <div className="flex gap-2 items-center">
                            <select value={filtroRapidoColuna} onChange={(e) => setFiltroRapidoColuna(e.target.value)} className="border p-2 rounded text-sm w-48">
                                {colunasVisiveis.map((col) => (<option key={col} value={col}>{col.replace(/_/g, ' ').toUpperCase()}</option>))}
                            </select>
                            <input type="text" placeholder="Pesquisar..." value={filtroRapidoTexto} onChange={(e) => { setFiltroRapidoTexto(e.target.value); setPaginaAtual(1); }} className="w-full md:w-64 border p-2 rounded text-sm" />
                        </div>
                        <button onClick={() => setMostrarFiltroColunas(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaFilter /> Filtro Avançado</button>
                        <button onClick={() => setMostrarEditarTabela(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded flex items-center gap-2"><FaTable /> Editar Tabela</button>
                        <ButtonComPermissao type="button" onClick={handleEditar} permissoes={["admin", "editor"]} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"><FiEdit /> Editar</ButtonComPermissao>
                    </div>
                </div>

                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="w-full table-auto whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                                {colunasVisiveis.map(col => <th key={col} className="p-3 border-b-2">{col.replace(/_/g, ' ').toUpperCase()}</th>)}
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (
                                <tr><td colSpan={colunasVisiveis.length} className="text-center p-8">Carregando...</td></tr>
                            ) : posicoes.length === 0 ? (
                                <tr><td colSpan={colunasVisiveis.length} className="text-center p-8 text-gray-500">Nenhum item em estoque encontrado.</td></tr>
                            ) : (
                                posicoes.map((pos, i) => (
                                    <tr key={i} onClick={() => setPosicaoSelecionada(pos)} className={`cursor-pointer hover:bg-teal-50 border-b ${JSON.stringify(posicaoSelecionada) === JSON.stringify(pos) ? 'bg-teal-100' : ''}`}>
                                        {colunasVisiveis.map(coluna => <td key={coluna} className="p-3">{pos[coluna]}</td>)}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && totalPaginas > 1 && (
                    <div className="flex justify-end items-center gap-4 mt-4">
                        <button onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))} disabled={paginaAtual === 1} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Anterior</button>
                        <span>Página {paginaAtual} de {totalPaginas}</span>
                        <button onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))} disabled={paginaAtual >= totalPaginas} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Próxima</button>
                    </div>
                )}
            </div>

            <ModalErro mensagem={mensagemErro} onClose={() => setMensagemErro(null)} />
            {mostrarFiltroColunas && <ModalFiltroColunas colunas={todasColunas} onClose={() => setMostrarFiltroColunas(false)} onAplicar={handleAplicarFiltros} API_URL={API_URL} />}
            {mostrarEditarTabela && <ModalEditarTabela colunas={todasColunas} selecionadas={colunasVisiveis} exemplos={[...posicoes].slice(0, 5)} onClose={() => setMostrarEditarTabela(false)} onSalvar={({ colunas, ordenacao }) => { setColunasVisiveis(colunas); if(ordenacao) { setOrdenacaoColuna(ordenacao.coluna); setOrdenacaoAscendente(ordenacao.ascendente); } setMostrarEditarTabela(false); }} />}
        </div>
    );
}
