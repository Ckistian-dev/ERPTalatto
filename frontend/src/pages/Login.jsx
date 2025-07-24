import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ModalErro from '@/components/modals/ModalErro';

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function Login() {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // 1. NOVO ESTADO PARA CONTROLE DE CARREGAMENTO
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro(null);
        setIsLoading(true); // 2. ATIVA O CARREGAMENTO

        try {
            const response = await axios.post(`${API_URL}/auth/login`, {
                email,
                senha,
            });

            const token = response.data.access_token;

            localStorage.setItem('token', token);
            localStorage.setItem('nome', response.data.nome);

            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            navigate('/dashboard');

        } catch (err) {
            if (err.response && err.response.data && err.response.data.detail) {
                setErro(err.response.data.detail);
            } else {
                setErro('Erro ao fazer login. Verifique sua conexão ou credenciais.');
            }
            console.error("Erro no login:", err);
        } finally {
            setIsLoading(false); // 3. DESATIVA O CARREGAMENTO (SEMPRE, COM SUCESSO OU ERRO)
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen w-full">
            {/* Imagem do lado esquerdo */}
            <div className="hidden md:flex w-5/6">
                <img
                    src="https://i.postimg.cc/dtNm93Vt/Whats-App-Image-2023-10-13-at-15-36-15-jpeg.jpg"
                    alt="Fundo"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Formulário do lado direito */}
            <div className="w-full md:w-1/2 flex items-center justify-center bg-white px-6">
                <div className="w-full max-w-md">
                    {/* Logo e título */}
                    <div className="text-center mb-10">
                        <img
                            src="https://images.tcdn.com.br/img/img_prod/1125306/1721666454_vec.svg"
                            alt="Logo ERP Talatto"
                            className="h-12 mx-auto mb-4"
                        />
                        <p className="text-sm text-gray-500">ERP | Gestão Empresarial</p>
                    </div>

                    {/* Formulário de login */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="text-sm text-gray-600">Email</label>
                            <input
                                type="email"
                                placeholder="Digite seu email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                                required
                                disabled={isLoading} // Desabilita o input durante o carregamento
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-600">Senha</label>
                            <input
                                type="password"
                                placeholder="Digite sua senha"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                                required
                                disabled={isLoading} // Desabilita o input durante o carregamento
                            />
                        </div>

                        {/* 4. BOTÃO COM LÓGICA DE CARREGAMENTO */}
                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center disabled:bg-blue-400 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    {/* Ícone de Spinner SVG com animação do Tailwind */}
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Autenticando...
                                </>
                            ) : (
                                'Autenticar'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-10">
                        Desenvolvido por{" "}
                        <a
                            href="https://ckistian-dev.github.io/CkistianProgramandoSolucoes/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-700 font-semibold hover:underline"
                        >
                            Ckistian Programando Soluções
                        </a>
                    </p>
                </div>
            </div>

            <ModalErro mensagem={erro} onClose={() => {
                setErro(null)
            }} />

        </div>
    )
}
