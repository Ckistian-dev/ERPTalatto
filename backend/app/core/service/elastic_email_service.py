import httpx
import logging
import base64
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.core.db import models

logger = logging.getLogger(__name__)

class ElasticEmailService:
    def __init__(self, db: Session, id_empresa: int):
        self.db = db
        self.id_empresa = id_empresa
        self.base_url = "https://api.elasticemail.com/v4"
        
        self.config = self.db.query(models.ElasticEmailConfiguracao).filter(
            models.ElasticEmailConfiguracao.id_empresa == self.id_empresa
        ).first()

    async def send_invoice_email(self, pedido: models.Pedido, pdf_b64: str, xml_str: str):
        """
        Envia o e-mail para o cliente com a DANFE e o XML anexados.
        """
        if not self.config or not self.config.ativo or not self.config.api_key:
            logger.info(f"Elastic Email não configurado ou inativo para empresa {self.id_empresa}")
            return None

        if not pedido.cliente or not pedido.cliente.email:
            logger.warning(f"Pedido {pedido.id} sem e-mail de cliente. Abortando envio.")
            return None

        # 1. Preparação de Variáveis (Placeholders)
        placeholders = {
            "{cliente_nome}": pedido.cliente.nome_razao,
            "{pedido_id}": str(pedido.id),
            "{valor_total}": f"R$ {pedido.total:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.'),
            "{empresa_nome}": self.config.from_name or "Nossa Loja"
        }

        subject = self.config.subject or "Sua Nota Fiscal - Pedido #{pedido_id}"
        body = self.config.body_html or "<p>Olá {cliente_nome},<br>Sua nota fiscal do pedido #{pedido_id} já está disponível em anexo.</p>"

        for key, val in placeholders.items():
            subject = subject.replace(key, val)
            body = body.replace(key, val)

        # Converte as quebras de linha (\n ou \r\n) em tags <br> para garantir 
        # que a formatação do campo de texto seja mantida no corpo HTML do e-mail.
        body = body.replace("\r\n", "<br>").replace("\n", "<br>")

        # 2. Montagem do Payload conforme documentação v4
        payload = {
            "Recipients": [
                {
                    "Email": pedido.cliente.email,
                    "Fields": {
                        "name": pedido.cliente.nome_razao
                    }
                }
            ],
            "Content": {
                "Body": [
                    {
                        "ContentType": "HTML",
                        "Content": body,
                        "Charset": "utf-8"
                    }
                ],
                "From": f"{self.config.from_name} <{self.config.from_email}>",
                "Subject": subject,
                "Attachments": [
                    {
                        "BinaryContent": pdf_b64,
                        "Name": f"DANFE_Pedido_{pedido.id}.pdf",
                        "ContentType": "application/pdf"
                    },
                    {
                        "BinaryContent": base64.b64encode(xml_str.encode('utf-8')).decode('utf-8'),
                        "Name": f"NFe_Pedido_{pedido.id}.xml",
                        "ContentType": "application/xml"
                    }
                ]
            }
        }

        headers = {
            "X-ElasticEmail-ApiKey": self.config.api_key,
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient() as client:
                logger.info(f"Enviando e-mail de NFe para {pedido.cliente.email} via Elastic Email...")
                resp = await client.post(f"{self.base_url}/emails", json=payload, headers=headers, timeout=30.0)
                
                if resp.status_code in [200, 201, 202]:
                    data = resp.json()
                    logger.info(f"E-mail enviado com sucesso! TransactionID: {data.get('TransactionID')}")
                    return {"success": True, "message": "E-mail com a nota fiscal enviado com sucesso!", "transaction_id": data.get('TransactionID')}
                else:
                    logger.error(f"Erro na API Elastic Email: {resp.status_code} - {resp.text}")
                    return {"success": False, "message": f"Erro na API Elastic Email: {resp.status_code}", "error": resp.text}

        except Exception as e:
            logger.exception(f"Falha fatal ao enviar e-mail: {str(e)}")
            return {"success": False, "message": f"Falha ao enviar e-mail: {str(e)}", "error": str(e)}
