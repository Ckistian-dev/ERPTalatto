// components/ModalErro.jsx
export default function ModalErro({ mensagem, onClose }) {
  if (!mensagem) return null;

  const renderMensagem = () => {
    if (Array.isArray(mensagem)) {
      return mensagem.map((erro, index) => {
        if (typeof erro === "object" && erro.msg) {
          return <div key={index} className="mb-1">{erro.msg}</div>;
        }
        return <div key={index} className="mb-1">{erro}</div>;
      });
    }
    if (typeof mensagem === "object" && mensagem.msg) {
      return <div>{mensagem.msg}</div>;
    }
    return <div>{mensagem}</div>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-200 animate-fade-in">
        
        {/* Ícone de alerta */}
        <div className="mb-4 text-red-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 20.5c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z" />
          </svg>
        </div>

        {/* Mensagem de erro tratada */}
        <div className="text-lg text-gray-800 font-semibold mb-6 whitespace-pre-line max-h-60 overflow-y-auto">
          {renderMensagem()}
        </div>

        {/* Botão OK */}
        <button
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-full shadow"
        >
          OK
        </button>
      </div>
    </div>
  );
}
