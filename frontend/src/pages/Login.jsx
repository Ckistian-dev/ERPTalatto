import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalErro from '@/components/modals/ModalErro';

// ✅ PASSO 1: Importe o hook useAuth do seu contexto
import { useAuth } from '@/context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();
    // ✅ PASSO 2: Obtenha a função de login do contexto
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro(null);
        setIsLoading(true);

        try {
            // ✅ PASSO 3: Chame a função de login do contexto
            // Ela cuidará da chamada à API, de salvar o token e de atualizar o estado global.
            await login(email, senha);
            
            // Se o login for bem-sucedido, navegue para o dashboard
            navigate('/dashboard');

        } catch (err) {
            // O erro agora pode ser mais genérico, pois o contexto já lida com a lógica
            setErro('Credenciais inválidas ou erro no servidor.');
            console.error("Erro no login:", err);
        } finally {
            setIsLoading(false);
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
                                disabled={isLoading}
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
                                disabled={isLoading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center disabled:bg-blue-400 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
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
                            href="https://ckistian-programando-solucoes.vercel.app/"
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
