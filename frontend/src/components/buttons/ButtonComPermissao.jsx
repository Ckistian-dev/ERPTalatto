import { useAuth } from "@/context/AuthContext";
import { verificarPermissao } from "@/utils/verificarPermissao";
import { useState } from "react";
import ModalErro from "@/components/modals/ModalErro";

export default function ButtonComPermissao({ permissoes = [], children, onClick, className = "", ...props }) {
  const { usuario } = useAuth();
  const permitido = verificarPermissao(usuario, permissoes);
  const [erro, setErro] = useState(null);

  const handleClick = (e) => {
    if (!permitido) {
      e.preventDefault();
      setErro("Você não tem permissão!");
      return;
    }

    if (onClick) onClick(e);
  };

  return (
    <>
      <button
        {...props}
        onClick={handleClick}
        className={`${className}`}
      >
        {children}
      </button>

      <ModalErro mensagem={erro} onClose={() => setErro(null)} />
    </>
  );
}
