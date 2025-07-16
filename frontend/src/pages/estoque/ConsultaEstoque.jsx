import { useEffect, useState } from 'react';
import axios from 'axios';
import { FiEdit } from 'react-icons/fi';
import { FaTable, FaFilter } from 'react-icons/fa';
import { GrAddCircle, GrSubtractCircle } from 'react-icons/gr';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import ModalErro from '@/components/modals/ModalErro';
import ModalFiltroColunas from '@/components/modals/ModalFiltroColunas';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import ModalEditarTabela from '@/components/modals/ModalEditarTabela';
import { useAuth } from '@/context/AuthContext';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ConsultaEstoque() {
    const [posicoes, setPosicoes] = useState([]);
    const [posicaoSelecionada, setPosicaoSelecionada] = useState(null);
    const { usuario } = useAuth();
    const navigate = useNavigate();

    // Estados de controle da tabela
    const [loading, setLoading] = useState(false);
    const [mensagemErro, setMensagemErro] = useState(null);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(15);
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
                filtro_rapido_coluna: filtroRapidoColuna,
                filtro_rapido_texto: filtroRapidoTexto,
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
    }, [colunasVisiveis, paginaAtual, filtrosSelecionados, filtroRapidoTexto, ordenacaoColuna, ordenacaoAscendente]);

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

                <div className="overflow-x-auto">
                    <div className="max-w-screen-lg"> {/* Adicionado para compatibilidade com seu layout */}
                        <table className="bg-white border border-gray-300 table-auto whitespace-nowrap w-full">
                            <thead>
                                <tr>
                                    {colunasVisiveis.map((coluna) => (<th key={coluna} className="p-2 border whitespace-nowrap text-center min-w-36">{coluna.replace(/_/g, ' ').toUpperCase()}</th>))}
                                </tr>
                            </thead>
                            <tbody>
                                {posicoes.length === 0 ? (
                                    <tr>
                                        {/* [ALTERAÇÃO] Layout para quando a tabela está vazia */}
                                        <td colSpan={colunasVisiveis.length}>
                                            <div className="flex items-center pl-[63vh] h-[63vh]">
                                                <span className="text-gray-500 text-lg">Nenhum item em estoque encontrado.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {posicoes.map((pos, i) => (
                                            <tr key={i} onClick={() => setPosicaoSelecionada(pos)} className={`cursor-pointer ${JSON.stringify(posicaoSelecionada) === JSON.stringify(pos) ? 'bg-teal-100' : 'hover:bg-gray-50'}`}>
                                                {colunasVisiveis.map((coluna) => (<td key={coluna} className="p-2 border whitespace-nowrap text-center">{pos[coluna]}</td>))}
                                            </tr>
                                        ))}

                                        {/* [ALTERAÇÃO] Lógica para preencher o espaço vazio da tabela */}
                                        {posicoes.length < itensPorPagina &&
                                            Array.from({ length: itensPorPagina - posicoes.length }).map((_, idx) => (
                                                <tr key={`espaco-${idx}`} className="opacity-0 pointer-events-none select-none">
                                                    {colunasVisiveis.map((_, i) => (
                                                        <td key={i} className="p-2 whitespace-nowrap">&nbsp;</td>
                                                    ))}
                                                </tr>
                                            ))
                                        }
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {!loading && (
                    <div className="flex justify-start items-center gap-4 mt-4">
                        <button onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))} disabled={paginaAtual === 1} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Anterior</button>
                        <span>Página {paginaAtual} de {totalPaginas}</span>
                        <button onClick={() => setPaginaAtual(p => Math.min(p + 1, totalPaginas))} disabled={paginaAtual >= totalPaginas} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50">Próxima</button>
                    </div>
                )}
            </div>
            
            <ModalErro mensagem={mensagemErro} onClose={() => setMensagemErro(null)} />
            {mostrarFiltroColunas && <ModalFiltroColunas colunas={todasColunas} onClose={() => setMostrarFiltroColunas(false)} onAplicar={handleAplicarFiltros} API_URL={API_URL} />}
            {mostrarEditarTabela && <ModalEditarTabela colunas={todasColunas} selecionadas={colunasVisiveis} exemplos={[...posicoes].slice(0, 5)} onClose={() => setMostrarEditarTabela(false)} onSalvar={({ colunas, ordenacao }) => { setColunasVisiveis(colunas); setOrdenacaoColuna(ordenacao.coluna); setOrdenacaoAscendente(ordenacao.ascendente); setMostrarEditarTabela(false); }} />}
        </div>
    );
}
