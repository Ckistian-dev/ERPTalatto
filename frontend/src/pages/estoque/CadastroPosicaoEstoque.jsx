import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

// Importe o CampoDropdownDb, substituindo o ProdutoSearch
import CampoDropdownDb from '@/components/campos/CampoDropdownDb'; 
import CampoNumSetas from '@/components/campos/CampoNumSetas';
import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import CampoTextsimples from '@/components/campos/CampoTextsimples';
import ModalErro from '@/components/modals/ModalErro';
import ButtonComPermissao from '@/components/buttons/ButtonComPermissao';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CadastroPosicaoEstoque({ modo = 'novo' }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { usuario } = useAuth();
    const posicaoEdicao = location.state?.posicao || null;

    const [form, setForm] = useState({
        id_produto: '',
        descricao: '', // Campo para guardar o nome do produto selecionado
        quantidade: '1',
        deposito: '',
        lote: '',
        rua: '',
        numero: '',
        nivel: '',
        cor: '',
        situacao_estoque: 'Disponível',
    });
    const [erro, setErro] = useState('');
    const [abaAtual, setAbaAtual] = useState('produto');

    useEffect(() => {
        if (modo === 'editar' && posicaoEdicao) {
            setForm({
                id_produto: posicaoEdicao.id_produto,
                descricao: posicaoEdicao.descricao,
                lote: posicaoEdicao.lote,
                deposito: posicaoEdicao.deposito,
                rua: posicaoEdicao.rua,
                numero: posicaoEdicao.numero,
                nivel: posicaoEdicao.nivel,
                cor: posicaoEdicao.cor,
                situacao_estoque: posicaoEdicao.situacao_estoque,
                quantidade: posicaoEdicao.quantidade_total || posicaoEdicao.quantidade
            });
        }
    }, [posicaoEdicao, modo]);

    // Lógica de handleChange atualizada para funcionar com CampoDropdownDb
    const handleChange = (e) => {
        const { name, value, label } = e.target;
        setForm(prev => {
            const newState = { ...prev, [name]: value };
            // Se o campo for o dropdown de produto, guarda também a descrição
            if (name === 'id_produto' && label) {
                newState.descricao = label;
            }
            return newState;
        });
    };
    
    // ... (handleSubmit permanece o mesmo)
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modo === 'editar') {
                await axios.put(`${API_URL}/api/estoque/posicao`, form);
                toast.success('Posição de estoque atualizada!');
            } else {
                await axios.post(`${API_URL}/api/estoque/entrada`, form);
                toast.success('Entrada de estoque registrada!');
            }
            navigate('/estoque');
        } catch (err) {
            const errorMsg = err?.response?.data?.detail || 'Ocorreu um erro.';
            setErro(errorMsg); toast.error(errorMsg);
        }
    };

    const abas = [
        { id: 'produto', label: 'Produto e Quantidade' },
        { id: 'localizacao', label: 'Localização no Estoque' },
    ];

    const renderCampos = () => {
        switch (abaAtual) {
            case 'produto':
                return (
                    <>
                        {/* SUBSTITUIÇÃO DO COMPONENTE DE BUSCA */}
                        <CampoDropdownDb
                            label="Produto "
                            name="id_produto" // O nome do campo agora é o ID
                            value={form.id_produto || ""}
                            onChange={handleChange}
                            url={`${API_URL}/produtos_dropdown`}
                            campoValor="id"
                            campoLabel="descricao"
                            obrigatorio
                            disabled={modo === 'editar'}
                        />
                        <CampoNumSetas
                            label={modo === 'editar' ? 'Nova Quantidade ' : 'Quantidade a Adicionar '}
                            name="quantidade"
                            value={form.quantidade}
                            onChange={handleChange}
                            obrigatorio
                        />
                        <CampoDropdownEditavel label="Situação" name="situacao_estoque" value={form.situacao_estoque} onChange={handleChange} tipo="situacao_estoque" usuario={usuario} obrigatorio />
                    </>
                );
            case 'localizacao':
                return (
                    <>
                        <CampoDropdownEditavel label="Depósito" name="deposito" value={form.deposito} onChange={handleChange} tipo="deposito" usuario={usuario} obrigatorio disabled={modo === 'editar'} />
                        <CampoDropdownEditavel label="Rua" name="rua" value={form.rua} onChange={handleChange} tipo="rua" usuario={usuario} obrigatorio disabled={modo === 'editar'} />
                        <CampoDropdownEditavel label="Cor" name="cor" value={form.cor} onChange={handleChange} tipo="cor" usuario={usuario} obrigatorio disabled={modo === 'editar'} />
                        <CampoTextsimples label="Lote" name="lote" value={form.lote} onChange={handleChange} obrigatorio disabled={modo === 'editar'} placeholder="Ex: C0225"/>
                        <CampoNumSetas label="Nível" name="nivel" value={form.nivel} onChange={handleChange} obrigatorio disabled={modo === 'editar'} />
                        <CampoNumSetas label="Número" name="numero" value={form.numero} onChange={handleChange} obrigatorio disabled={modo === 'editar'} />
                    </>
                );
            default: return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-28">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
                {modo === 'editar' ? `Editar Posição: ${form.descricao}` : 'Nova Entrada no Estoque'}
            </h1>
            <div className="flex flex-wrap gap-1 border-b border-gray-300 mb-6">
                {abas.map((aba) => (
                    <button key={aba.id} onClick={() => setAbaAtual(aba.id)} className={`px-4 py-2.5 text-sm font-medium rounded-t-md transition-all ${abaAtual === aba.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {aba.label}
                    </button>
                ))}
            </div>
            <form id="form-estoque" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {renderCampos()}
            </form>
            <div className="flex justify-end gap-3 mt-8 mb-12">
                <button type="button" onClick={() => navigate(-1)} className="w-full sm:w-auto px-5 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium">Voltar</button>
                <ButtonComPermissao permissoes={["admin", "editor"]} type="submit" form="form-estoque" className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold">
                    {modo === 'editar' ? 'Salvar Alterações' : 'Registrar Entrada'}
                </ButtonComPermissao>
            </div>
            <ModalErro mensagem={erro} onClose={() => setErro('')} />
        </div>
    );
}
