import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ModalErro from '@/components/modals/ModalErro'

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function Login() {
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [erro, setErro] = useState(null)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro(null);

        try {
            // USO DA VARIÁVEL DE AMBIENTE AQUI
            const response = await axios.post(`${API_URL}/auth/login`, {
                email,
                senha,
            });

            // Salva o token e nome
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('nome', response.data.nome);

            // Configura o interceptor do Axios para adicionar o token em todas as requisições futuras
            axios.interceptors.request.use(config => {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            }, error => {
                // Lidar com erros de requisição
                return Promise.reject(error);
            });

            navigate('/dashboard');

        } catch (err) {
            // Se houver uma resposta do servidor com detalhes de erro
            if (err.response && err.response.data && err.response.data.detail) {
                setErro(err.response.data.detail);
            } else {
                setErro('Erro ao fazer login. Verifique sua conexão ou credenciais.');
            }
            console.error("Erro no login:", err);
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
                            />

                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                        >
                            Autenticar
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