import { useEffect, useState } from 'react';
import axios from 'axios';
import { FiEdit } from 'react-icons/fi';
import { FaFileCsv, FaPlus, FaTable, FaFilter } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import ModalErro from '@/components/modals/ModalErro';
import ModalFiltroColunas from '@/components/modals/ModalFiltroColunas';
import ButtonComPermissao from "@/components/buttons/ButtonComPermissao";
import ModalEditarTabela from '@/components/modals/ModalEditarTabela';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ListaLogicasEmbalagem() {
    const navigate = useNavigate();

    // Estados principais
    const [logicas, setLogicas] = useState([]);
    const [logicaSelecionada, setLogicaSelecionada] = useState(null);
    const [acaoPendente, setAcaoPendente] = useState(null);
    const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
    const [mensagemErro, setMensagemErro] = useState(null);

    // Estados para a paginação
    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 15;
    const [loading, setLoading] = useState(false);
    const [totalPaginas, setTotalPaginas] = useState(1);

    // Customização da tabela e filtros
    const [mostrarFiltroColunas, setMostrarFiltroColunas] = useState(false);
    const [mostrarEditarTabela, setMostrarEditarTabela] = useState(false);
    const [colunasVisiveis, setColunasVisiveis] = useState(['id', 'nome', 'descricao']);
    const [todasColunas] = useState(['id', 'nome', 'descricao', 'criado_em']);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [filtrosSelecionados, setFiltrosSelecionados] = useState([]);
    const [filtroRapidoColuna, setFiltroRapidoColuna] = useState('nome');
    const [filtroRapidoTexto, setFiltroRapidoTexto] = useState('');
    const [ordenacaoColuna, setOrdenacaoColuna] = useState('id');
    const [ordenacaoAscendente, setOrdenacaoAscendente] = useState(true);

    const buscarLogicas = async () => {
        setLoading(true);
        try {
            const filtrosStr = filtrosSelecionados.map(f => `${f.coluna}:${f.texto}`).join(';');
            const params = {
                page: paginaAtual, limit: itensPorPagina,
                filtros: filtrosStr || undefined,
                filtro_rapido_coluna: filtroRapidoTexto ? filtroRapidoColuna : undefined,
                filtro_rapido_texto: filtroRapidoTexto || undefined,
                data_inicio: dataInicio || undefined, data_fim: dataFim || undefined,
                ordenar_por: ordenacaoColuna,
                ordenar_direcao: ordenacaoAscendente ? 'asc' : 'desc'
            };

            const res = await axios.get(`${API_URL}/embalagem/paginado`, { params });
            setLogicas(res.data.resultados);
            setTotalPaginas(Math.ceil(res.data.total / itensPorPagina));
        } catch (error) {
            setMensagemErro("Erro ao buscar lógicas de embalagem");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        buscarLogicas();
    }, [paginaAtual, filtrosSelecionados, filtroRapidoColuna, filtroRapidoTexto, dataInicio, dataFim, ordenacaoColuna, ordenacaoAscendente]);

    const handleEditar = () => {
        if (!logicaSelecionada) {
            toast.warn('Você deve selecionar uma lógica primeiro!');
            return;
        }
        setAcaoPendente('editar');
        setMostrarConfirmacao(true);
    };

    const confirmarAcao = async () => {
        if (!logicaSelecionada || acaoPendente !== 'editar') return;
        setMostrarConfirmacao(false);
        setAcaoPendente(null);
        navigate('/embalagem/editar', { state: { logica: logicaSelecionada } });
    };

    const handleAplicarFiltros = ({ filtros, data_inicio, data_fim }) => {
        setFiltrosSelecionados(filtros || []);
        setDataInicio(data_inicio || '');
        setDataFim(data_fim || '');
        setPaginaAtual(1);
        setMostrarFiltroColunas(false);
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">Lógicas de Embalagem</h1>
            <div className="w-auto overflow-auto">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <div className="flex gap-2 flex-wrap">
                        <Link to="/embalagem/novo" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2">
                            <FaPlus /> Nova Lógica
                        </Link>
                        {/* Funcionalidades avançadas mantidas para consistência de layout */}
                        <ButtonComPermissao type="button" permissoes={["admin"]} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaFileCsv />Exportar</ButtonComPermissao>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex gap-2 items-center">
                            <select value={filtroRapidoColuna} onChange={(e) => setFiltroRapidoColuna(e.target.value)} className="border p-2 rounded text-sm w-48">
                                {colunasVisiveis.map((col) => <option key={col} value={col}>{col.replace(/_/g, ' ').toUpperCase()}</option>)}
                            </select>
                            <input type="text" placeholder="Pesquisar..." value={filtroRapidoTexto} onChange={(e) => { setFiltroRapidoTexto(e.target.value); setPaginaAtual(1); }} className="w-64 border p-2 rounded text-sm" />
                        </div>
                        <button onClick={() => setMostrarFiltroColunas(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded flex items-center gap-2"><FaFilter />Filtro Avançado</button>
                        <button onClick={() => setMostrarEditarTabela(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded flex items-center gap-2"><FaTable />Editar Tabela</button>
                        <ButtonComPermissao type="button" onClick={handleEditar} permissoes={["admin"]} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"><FiEdit />Editar</ButtonComPermissao>
                    </div>
                </div>

                {mostrarConfirmacao && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Confirmar Edição</h2>
                            <p className="text-gray-600 mb-6">Deseja realmente editar a lógica <span className="font-bold text-gray-900">{logicaSelecionada?.nome}</span>?</p>
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setMostrarConfirmacao(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-full font-medium">Cancelar</button>
                                <button onClick={confirmarAcao} className='bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-full font-medium shadow text-white'>Confirmar</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="w-full table-auto whitespace-normal">
                        <thead>
                            <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                                {colunasVisiveis.map(col => <th key={col} className="p-3 border-b-2">{col.replace(/_/g, ' ').toUpperCase()}</th>)}
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (<tr><td colSpan={colunasVisiveis.length} className="text-center p-8">Carregando...</td></tr>)
                            : logicas.length === 0 ? (<tr><td colSpan={colunasVisiveis.length} className="text-center p-8 text-gray-500">Nenhuma lógica encontrada.</td></tr>)
                            : logicas.map(logica => (
                                <tr key={logica.id} onClick={() => setLogicaSelecionada(logica)} className={`cursor-pointer hover:bg-teal-50 border-b ${logicaSelecionada?.id === logica.id ? 'bg-teal-100' : ''}`}>
                                    {colunasVisiveis.map(coluna => <td key={coluna} className="p-3">{logica[coluna]}</td>)}
                                </tr>
                            ))}
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
            
            {/* O código abaixo assume que você possui estes componentes de modal no seu projeto */}
            {mostrarFiltroColunas && (
                <ModalFiltroColunas
                    colunas={todasColunas}
                    onClose={() => setMostrarFiltroColunas(false)}
                    onAplicar={handleAplicarFiltros}
                    API_URL={API_URL}
                />
            )}
            {mostrarEditarTabela && (
                <ModalEditarTabela
                    colunas={todasColunas}
                    selecionadas={colunasVisiveis}
                    onClose={() => setMostrarEditarTabela(false)}
                    onSalvar={({ colunas, ordenacao }) => {
                        setColunasVisiveis(colunas);
                        if (ordenacao?.coluna) {
                            setOrdenacaoColuna(ordenacao.coluna);
                            setOrdenacaoAscendente(ordenacao.ascendente);
                        }
                        setMostrarEditarTabela(false);
                    }}
                />
            )}
        </div>
    );
}