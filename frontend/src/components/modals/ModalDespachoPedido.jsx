import { useEffect, useState, useRef } from 'react';
import { X, Truck, XCircle } from 'lucide-react';
import { FaTruck } from 'react-icons/fa';
import axios from 'axios';

// Define a URL da API a partir das variáveis de ambiente do Vite
const API_URL = import.meta.env.VITE_API_BASE_URL;

export default function ModalDespachoPedido({ pedido: pedidoInicial = null, usuario, onClose, onConfirmar }) {
    const [codigoNF, setCodigoNF] = useState('');
    const [pedido, setPedido] = useState(null);
    const [volumesLidos, setVolumesLidos] = useState([]);
    const [inputVolume, setInputVolume] = useState('');
    const [mensagemErro, setMensagemErro] = useState('');
    const [endereco, setEndereco] = useState({});
    const codigosEsperadosMapRef = useRef({});
    const refInputNF = useRef(null);
    const refInputVolume = useRef(null);


    // Gera código de barras
    const gerarCodigoBarras = (idPedido, volume) => {
        const idStr = String(idPedido).padStart(6, '0');
        const volStr = String(volume).padStart(5, '0');
        const base = idStr + volStr;
        const soma = base.split('').reduce((acc, d) => acc + parseInt(d), 0);
        const dv = soma % 10;
        return base + dv;
    };

    useEffect(() => {
        // Se o pedidoInicial já vem com número de NF, foca no campo de volume.
        // Caso contrário, foca no campo de NF.
        const temNF = pedidoInicial?.numero_nf;
        setMensagemErro(''); // Limpa mensagens de erro ao abrir/resetar o modal

        // Pequeno delay para garantir que os refs estejam conectados ao DOM
        const timer = setTimeout(() => {
            if (!temNF && refInputNF.current) {
                refInputNF.current.focus();
            } else if (temNF && refInputVolume.current) {
                refInputVolume.current.focus();
            }
        }, 50);

        return () => clearTimeout(timer);
    }, [pedidoInicial]);


    // Sincroniza com pedido inicial (selecionado manualmente na tabela principal)
    useEffect(() => {
        if (!pedidoInicial) {
            // Se o pedido inicial for nulo, reseta todos os estados
            setPedido(null);
            setCodigoNF('');
            setVolumesLidos([]);
            setInputVolume('');
            setMensagemErro('');
            setEndereco({});
            codigosEsperadosMapRef.current = {};
            return;
        }

        setPedido(pedidoInicial);
        setCodigoNF(pedidoInicial.numero_nf || '');
        setVolumesLidos([]); // Sempre zera volumes lidos para o novo pedido

        const enderecoParsed = typeof pedidoInicial.endereco_expedicao === 'string'
            ? JSON.parse(pedidoInicial.endereco_expedicao || '{}')
            : pedidoInicial.endereco_expedicao || {};
        setEndereco(enderecoParsed);

        let itens = pedidoInicial.lista_itens;
        if (typeof itens === 'string') {
            try { itens = JSON.parse(itens); } catch { itens = []; }
        }

        const codigosMap = {};
        let volumeGlobal = 1;

        if (Array.isArray(itens)) { // Garante que itens é um array
            for (const item of itens) {
                const qtd = Number(item.quantidade_itens || 0);
                for (let i = 0; i < qtd; i++) {
                    const codigo = gerarCodigoBarras(pedidoInicial.id, volumeGlobal);
                    codigosMap[codigo] = (codigosMap[codigo] || 0) + 1; // Conta a quantidade de vezes que este código deve ser lido
                    volumeGlobal++;
                }
            }
        }
        codigosEsperadosMapRef.current = codigosMap;
        setMensagemErro(''); // Limpa qualquer erro antigo
    }, [pedidoInicial]); // Dependência para re-executar quando pedidoInicial muda

    // Busca pedido pela NF digitada
    const carregarPedido = async (nf) => {
        setMensagemErro(''); // Limpa erro ao tentar carregar um novo pedido
        if (!nf) {
            setMensagemErro("Número da NF não pode ser vazio.");
            return;
        }

        try {
            // USO DA VARIÁVEL DE AMBIENTE AQUI
            const res = await axios.get(`${API_URL}/pedidos/paginado`, {
                params: {
                    filtro_rapido_coluna: "numero_nf",
                    filtro_rapido_texto: nf,
                    page: 1,
                    limit: 1
                }
            });

            const encontrado = res.data.resultados?.[0];
            if (!encontrado) {
                setMensagemErro("Nenhum pedido encontrado com esse número de NF.");
                setPedido(null); // Limpa o pedido se não encontrado
                return;
            }

            // Define o pedido encontrado e reinicia estados relacionados a ele
            setPedido(encontrado);
            setCodigoNF(encontrado.numero_nf); // Garante que o códigoNF é o do pedido encontrado
            setVolumesLidos([]); // Zera volumes lidos para o novo pedido
            setInputVolume(''); // Limpa o input de volume

            const enderecoParsed = typeof encontrado.endereco_expedicao === 'string'
                ? JSON.parse(encontrado.endereco_expedicao || '{}')
                : encontrado.endereco_expedicao;
            setEndereco(enderecoParsed);

            // Calcula os códigos de barras esperados para o novo pedido
            let itens = encontrado.lista_itens;
            if (typeof itens === 'string') {
                try { itens = JSON.parse(itens); } catch { itens = []; }
            }
            if (!Array.isArray(itens)) { // fallback
                itens = [];
            }

            const codigosMap = {};
            let volumeGlobal = 1;

            for (const item of itens) {
                const qtd = Number(item.quantidade_itens || 0);
                for (let i = 0; i < qtd; i++) {
                    const codigo = gerarCodigoBarras(encontrado.id, volumeGlobal);
                    codigosMap[codigo] = (codigosMap[codigo] || 0) + 1; // Conta a quantidade de vezes que este código deve ser lido
                    volumeGlobal++;
                }
            }

            codigosEsperadosMapRef.current = codigosMap;
            setMensagemErro(''); // Limpa qualquer erro anterior

            // Foca no input de volume após carregar o pedido
            setTimeout(() => {
                refInputVolume.current?.focus();
            }, 50);

        } catch (e) {
            console.error("Erro ao buscar pedido:", e);
            setMensagemErro("Erro ao buscar pedido pela NF. Verifique sua conexão ou o servidor.");
        }
    };

    const handleVolumeInput = (e) => {
        const valor = e.target.value.trim();
        setMensagemErro(''); // Limpa a mensagem de erro ao começar a digitar

        if (e.key === 'Enter') {
            e.preventDefault();

            if (!valor) {
                setMensagemErro('Código de barras do volume não pode ser vazio.');
                return;
            }

            if (!pedido) {
                setMensagemErro('Primeiro, carregue um pedido digitando o número da NF-e.');
                setInputVolume('');
                return;
            }

            // Verifica se o código lido é esperado para o pedido atual
            const esperadoCount = codigosEsperadosMapRef.current[valor];
            const lidoCount = volumesLidos.filter(v => v === valor).length;

            if (esperadoCount === undefined) { // Código nunca foi gerado para este pedido
                setMensagemErro('Código de barras não confere com nenhum volume do pedido.');
            } else if (lidoCount >= esperadoCount) { // Código já foi lido o número de vezes esperado
                setMensagemErro(`Todos os volumes com o código ${valor} já foram lidos (${esperadoCount}/${esperadoCount}).`);
            } else {
                setVolumesLidos(prev => [...prev, valor]);
                toast.success(`Volume ${valor} lido com sucesso!`);
            }
            setInputVolume(''); // Sempre limpa o input após Enter
        }
    };


    const confirmarDespacho = () => {
        if (!pedido?.id) {
            setMensagemErro("Selecione um pedido válido antes de despachar.");
            return;
        }
        if (!codigoNF) {
            setMensagemErro("O número da NF é obrigatório para despachar.");
            return;
        }

        // Verifica se todos os volumes esperados foram lidos
        const totalVolumesEsperados = Object.values(codigosEsperadosMapRef.current).reduce((sum, count) => sum + count, 0);
        if (volumesLidos.length !== totalVolumesEsperados) {
            setMensagemErro(`Ainda faltam volumes para ler. Lidos: ${volumesLidos.length} / Esperados: ${totalVolumesEsperados}`);
            return;
        }

        const agora = new Date().toISOString();

        onConfirmar({
            numero_nf: codigoNF, // NF digitada/carregada
            codigos_volumes: volumesLidos,
            data_finalizacao: agora,
            ordem_finalizacao: agora,
            situacao_pedido: 'Despachado', // Define a situação para 'Despachado'
            usuario_expedicao: usuario?.nome || 'Desconhecido'
        });
        onClose(); // Fecha o modal após confirmar
    };


    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-red-600">
                    <X />
                </button>

                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                    <Truck /> Expedir Pedido {pedido?.id ? `#${pedido.id} - ${pedido?.cliente_nome}` : ''}
                </h2>
                {pedido && (
                    <div className="mb-4 text-sm text-gray-700">
                        <p><strong>Cliente:</strong> {pedido.cliente_nome}</p>
                        <p><strong>Vendedor:</strong> {pedido.vendedor_nome}</p>
                        <p><strong>Total de Itens:</strong> {pedido.lista_itens ? JSON.parse(pedido.lista_itens).length : 0}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="font-semibold text-gray-700">Número da NF-e:</label>
                        <input
                            ref={refInputNF}
                            type="text"
                            className="border p-2 rounded w-full mt-1 focus:ring-indigo-500 focus:border-indigo-500"
                            value={codigoNF}
                            onChange={(e) => {
                                setCodigoNF(e.target.value);
                                setMensagemErro(''); // Limpa erro ao digitar
                                if (pedido && e.target.value !== pedido.numero_nf) { // Se o número da NF mudou e não é o do pedido carregado, desassocia o pedido
                                    setPedido(null);
                                    setVolumesLidos([]);
                                    codigosEsperadosMapRef.current = {};
                                    setEndereco({});
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (codigoNF) {
                                        carregarPedido(codigoNF);
                                    } else {
                                        setMensagemErro("Digite o número da NF-e para carregar o pedido.");
                                    }
                                }
                            }}
                            placeholder="Digite a NF-e e pressione Enter"
                            disabled={!!mensagemErro && !pedido} // Desabilita se houver erro e nenhum pedido carregado
                        />
                        {pedido && <p className="text-xs text-green-600 mt-1">Pedido #{pedido.id} carregado.</p>}
                    </div>

                    <div>
                        <label className="font-semibold text-gray-700">Escanear Volumes:</label>
                        <input
                            ref={refInputVolume}
                            type="text"
                            className="border p-2 rounded w-full mt-1 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Escaneie o código de barras..."
                            value={inputVolume}
                            onChange={(e) => setInputVolume(e.target.value)}
                            onKeyDown={handleVolumeInput}
                            disabled={!pedido || !!mensagemErro} // Desabilita se não houver pedido ou se houver erro
                        />
                        <div className="mt-2 text-sm text-gray-600 h-32 overflow-y-auto border rounded p-2 space-y-1 bg-gray-50">
                            {volumesLidos.length > 0 ? (
                                volumesLidos.map((v, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white px-2 py-1 rounded shadow-sm">
                                        <span className="truncate">Volume: {v}</span>
                                        <button
                                            onClick={() => {
                                                setVolumesLidos(prev => prev.filter((_, idx) => idx !== i));
                                                setMensagemErro(''); // Limpa erro se remover um volume
                                            }}
                                            className="text-red-500 hover:text-red-700 p-1 rounded-full"
                                            title="Remover volume"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400">Nenhum volume escaneado.</p>
                            )}
                        </div>
                        {pedido && (
                            <p className="text-xs text-gray-600 mt-1">
                                Volumes Lidos: {volumesLidos.length} de {Object.values(codigosEsperadosMapRef.current).reduce((sum, count) => sum + count, 0)} esperados.
                            </p>
                        )}
                    </div>
                </div>

                {mensagemErro && (
                    <div className="mt-4 text-sm text-red-600 border border-red-300 rounded p-3 flex justify-between items-start gap-4 bg-red-50">
                        <span className="flex-1">{mensagemErro}</span>
                        <button
                            onClick={() => setMensagemErro('')}
                            className="text-red-500 hover:text-red-700 p-1 rounded-full"
                            title="Fechar erro"
                        >
                            <XCircle size={18} />
                        </button>
                    </div>
                )}

                <div className="mt-6 border-t pt-4 flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="md:w-1/2">
                        <h3 className="font-semibold mb-2 text-gray-800">Endereço de Expedição:</h3>
                        {pedido && endereco && (Object.keys(endereco).length > 0) ? (
                            <p className="text-sm text-gray-700">
                                Rua {endereco?.rua || 'N/D'}, Nº {endereco?.numero || 'N/D'}, Nível {endereco?.nivel || 'N/D'}, Cor {endereco?.cor || 'N/D'}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-500">Aguardando carregamento da NF-e para exibir o endereço...</p>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end w-full md:w-auto">
                        <button
                            onClick={confirmarDespacho}
                            disabled={!pedido || volumesLidos.length === 0 || volumesLidos.length !== Object.values(codigosEsperadosMapRef.current).reduce((sum, count) => sum + count, 0)}
                            className={`px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-colors
                                ${!pedido || volumesLidos.length === 0 || volumesLidos.length !== Object.values(codigosEsperadosMapRef.current).reduce((sum, count) => sum + count, 0)
                                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 text-white'}
                                `}
                        >
                            <FaTruck /> Despachar Pedido
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}