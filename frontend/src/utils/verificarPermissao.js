export const verificarPermissao = (usuario, permissoesPermitidas = []) => {
    if (!usuario || !usuario.perfil) return false;
    return permissoesPermitidas.includes(usuario.perfil);
};
