import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

// Componentes
import CampoTextoSimples from '@/components/campos/CampoTextsimples';
import CampoDropdownEditavel from '@/components/campos/CampoDropdownEditavel';
import CampoSenha from '@/components/campos/CampoSenha';
import ModalErro from '@/components/modals/ModalErro';
import ButtonComPermissao from '@/components/buttons/ButtonComPermissao';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function CadastroUsuario({ modo = 'novo' }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { usuario: usuarioLogado } = useAuth();
    const usuarioEdicao = location.state?.usuario || null;

    const [form, setForm] = useState({
        nome: '',
        email: '',
        perfil: 'Vendedor',
        ativo: true,
        senha: '',
        confirmarSenha: '',
    });

    const [erro, setErro] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [abaAtual, setAbaAtual] = useState('dados'); // Estado para controlar a aba ativa

    useEffect(() => {
        if (modo === 'editar' && usuarioEdicao) {
            setForm({
                nome: usuarioEdicao.nome || '',
                email: usuarioEdicao.email || '',
                perfil: usuarioEdicao.perfil ? usuarioEdicao.perfil.charAt(0).toUpperCase() + usuarioEdicao.perfil.slice(1) : 'Vendedor',
                ativo: usuarioEdicao.ativo !== null ? usuarioEdicao.ativo : true,
                senha: '',
                confirmarSenha: '',
            });
        }
    }, [modo, usuarioEdicao]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const validarCampos = () => {
        if (!form.nome.trim()) return 'O nome completo é obrigatório.';
        if (!form.email.trim()) return 'O email é obrigatório.';
        if (!/\S+@\S+\.\S+/.test(form.email)) return 'Formato de email inválido.';
        if (modo === 'novo' && !form.senha) return 'A senha é obrigatória.';
        if (form.senha) {
            if (form.senha.length < 6) return 'A senha deve ter no mínimo 6 caracteres.';
            if (form.senha !== form.confirmarSenha) return 'As senhas não coincidem.';
        }
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const erroValidacao = validarCampos();
        if (erroValidacao) {
            setErro(erroValidacao);
            toast.error(erroValidacao);
            return;
        }
        setErro('');
        setIsLoading(true);

        const dadosParaEnvio = {
            nome: form.nome,
            email: form.email,
            perfil: form.perfil.toLowerCase(),
            ativo: form.ativo,
        };

        if (form.senha) {
            dadosParaEnvio.senha = form.senha;
        }

        try {
            if (modo === 'editar') {
                await axios.put(`${API_URL}/api/usuarios/${usuarioEdicao.id}`, dadosParaEnvio);
                toast.success('Usuário atualizado com sucesso!');
            } else {
                await axios.post(`${API_URL}/api/usuarios`, dadosParaEnvio);
                toast.success('Usuário criado com sucesso!');
            }
            navigate('/usuarios');
        } catch (err) {
            const errorMsg = err?.response?.data?.detail || `Erro ao ${modo === 'editar' ? 'atualizar' : 'criar'} o usuário.`;
            setErro(errorMsg);
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    // Definição das abas
    const abas = [{ id: 'dados', label: 'Dados de Acesso' }];
    const opcoesPerfil = ['Administrador', 'Vendedor', 'Estoque', 'Financeiro', 'Visitante'];

    // Função para renderizar os campos da aba ativa
    const renderCampos = () => {
        switch (abaAtual) {
            case 'dados':
                return (
                    <>
                        <CampoTextoSimples label="Nome Completo" name="nome" value={form.nome} onChange={handleChange} obrigatorio colSpan placeholder="Seu Nome" />
                        <CampoTextoSimples label="Email" name="email" value={form.email} onChange={handleChange} obrigatorio placeholder="email@email.com" />
                        <CampoDropdownEditavel label="Perfil de Acesso" name="perfil" value={form.perfil} onChange={handleChange} usuario={usuarioLogado} tipo="perfil" obrigatorio propOpcoes={opcoesPerfil} />
                        <CampoSenha label={modo === 'editar' ? 'Nova Senha' : 'Senha'} name="senha" value={form.senha} onChange={handleChange} placeholder={modo === 'editar' ? 'Deixe em branco para não alterar' : 'Mínimo de 6 caracteres'} obrigatorio={modo === 'novo'} />
                        <CampoSenha label={modo === 'editar' ? 'Confirmar Nova Senha' : 'Confirmar Senha'} name="confirmarSenha" value={form.confirmarSenha} onChange={handleChange} placeholder="Repita a nova senha" obrigatorio={modo === 'novo'} />
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-28">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800">
                {modo === 'editar' ? `Editar Usuário: ${usuarioEdicao?.nome || ''}` : 'Novo Cadastro de Usuário'}
            </h1>

            <div className="flex flex-wrap gap-1 border-b border-gray-300 mb-6">
                {abas.map((aba) => (
                    <button
                        key={aba.id}
                        onClick={() => setAbaAtual(aba.id)}
                        className={`px-3 py-2 sm:px-4 sm:py-2.5 text-sm sm:text-base font-medium rounded-t-md transition-all duration-200 ease-in-out focus:outline-none
                          ${abaAtual === aba.id ? 'bg-teal-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'}`}
                    >
                        {aba.label}
                    </button>
                ))}
            </div>

            <form id="form-principal" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {renderCampos()}
            </form>

            <div className="flex justify-end gap-3 mt-8 mb-12">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    disabled={isLoading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-medium transition-colors disabled:bg-gray-200"
                >
                    Voltar
                </button>
                <ButtonComPermissao
                    permissoes={["admin"]}
                    type="submit"
                    form="form-principal"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md font-semibold transition-colors disabled:bg-teal-400 flex items-center justify-center gap-2"
                >
                    {isLoading ? (<span>Salvando...</span>) : (modo === 'editar' ? 'Salvar Alterações' : 'Criar Cadastro')}
                </ButtonComPermissao>
            </div>

            <ModalErro mensagem={erro} onClose={() => setErro('')} />
        </div>
    );
}
