# /services/pynfe_service.py

import os
# Importa o _fonte_dados, como no exemplo oficial
from pynfe.entidades.fonte_dados import _fonte_dados
from pynfe.processamento.comunicacao import ComunicacaoSefaz
from pynfe.processamento.serializacao import SerializacaoXML
from pynfe.processamento.assinatura import AssinaturaA1
from pynfe.entidades.notafiscal import NotaFiscal
from brazilfiscalreport import danfe
from lxml import etree
import logging

logger = logging.getLogger(__name__)

class PyNFeService:
    def __init__(self):
        self.uf = os.getenv("PYNFE_UF")
        self.cert_path = os.getenv("PYNFE_CERT_PATH")
        self.cert_pass = os.getenv("PYNFE_CERT_PASSWORD")
        self.homologacao = not (os.getenv("EMISSAO_EM_PRODUCAO", "false").lower() == "true")
        
        if not all([self.uf, self.cert_path, self.cert_pass]):
            raise ValueError("Credenciais do PyNFe não configuradas no ambiente.")
        
        self.comunicacao = ComunicacaoSefaz(self.uf.upper(), self.cert_path, self.cert_pass, self.homologacao)
        self.assinador = AssinaturaA1(self.cert_path, self.cert_pass)
        logger.info(f"Serviço PyNFe inicializado para UF: {self.uf.upper()} em ambiente {'HOMOLOGAÇÃO' if self.homologacao else 'PRODUÇÃO'}.")

    def emitir_nfe_sincrono(self, nfe_object: NotaFiscal):
        """
        Executa o fluxo completo: Serializa, Assina e Envia a NF-e de forma síncrona.
        """
        try:
            # 1. Serialização (LÓGICA CORRETA E FINAL)
            # O construtor recebe o _fonte_dados importado.
            serializador = SerializacaoXML(_fonte_dados, homologacao=self.homologacao)
            # O método exportar recebe os documentos a serem serializados.
            xml_nao_assinado = serializador.exportar(nota_fiscal=[nfe_object,])
            logger.info("NF-e serializada com sucesso.")

            # 2. Assinatura
            xml_assinado = self.assinador.assinar(xml_nao_assinado)
            logger.info("XML assinado com sucesso.")

            # 3. Envio
            retorno_sefaz = self.comunicacao.autorizacao(modelo='nfe', nota_fiscal=xml_assinado)
            
            # 4. Tratamento do Retorno
            if retorno_sefaz[0] == 0: # Sucesso
                xml_autorizado = retorno_sefaz[1]
                logger.info("NF-e autorizada pela SEFAZ.")
                return 'autorizado', xml_autorizado
            else: # Erro
                motivo = retorno_sefaz[1].text if hasattr(retorno_sefaz[1], 'text') else str(retorno_sefaz[1])
                logger.error(f"Erro na autorização da SEFAZ: {motivo}")
                return 'rejeitado', motivo

        except Exception as e:
            logger.exception("Erro fatal no processo de emissão da NF-e.")
            return 'erro_fatal', str(e)

    def gerar_danfe(self, xml_autorizado_etree) -> bytes:
        try:
            xml_string = etree.tostring(xml_autorizado_etree, encoding='unicode')
            return danfe.Danfe(xml_string=xml_string).emitir()
        except Exception as e:
            logger.exception("Falha ao gerar o DANFE.")
            raise e

def get_pynfe_service():
    return PyNFeService()
