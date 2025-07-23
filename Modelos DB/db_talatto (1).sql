CREATE DATABASE  IF NOT EXISTS `erp_talatto` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `erp_talatto`;
-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: erp_talatto
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cadastros`
--

DROP TABLE IF EXISTS `cadastros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cadastros` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome_razao` varchar(100) NOT NULL,
  `fantasia` varchar(100) DEFAULT NULL,
  `tipo_pessoa` varchar(20) NOT NULL,
  `tipo_cadastro` varchar(20) NOT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `celular` varchar(20) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `cpf_cnpj` varchar(20) DEFAULT NULL,
  `rg_ie` varchar(30) DEFAULT NULL,
  `logradouro` varchar(100) NOT NULL,
  `numero` varchar(20) NOT NULL,
  `complemento` varchar(60) DEFAULT NULL,
  `bairro` varchar(60) NOT NULL,
  `cep` varchar(10) NOT NULL,
  `cidade` varchar(60) NOT NULL,
  `estado` varchar(2) NOT NULL,
  `codigo_ibge_cidade` varchar(7) DEFAULT NULL,
  `pais` varchar(50) DEFAULT 'Brasil',
  `codigo_pais` varchar(4) DEFAULT '1058',
  `indicador_ie` varchar(1) DEFAULT '9',
  `regiao` varchar(20) DEFAULT NULL,
  `situacao` varchar(20) NOT NULL DEFAULT 'Ativo',
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cpf_cnpj` (`cpf_cnpj`),
  KEY `idx_nome_razao` (`nome_razao`),
  KEY `idx_tipo_cadastro` (`tipo_cadastro`),
  KEY `idx_situacao` (`situacao`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cadastros`
--

LOCK TABLES `cadastros` WRITE;
/*!40000 ALTER TABLE `cadastros` DISABLE KEYS */;
INSERT INTO `cadastros` VALUES (1,'Cristian Gabriel Kist','','Pessoa Física','Cliente','554599861237','5545999861237','cris.talatto@gmail.com','11482977907','10.473.770-6','Rua Elisa Rodrighiero Galante','2533','Casa','Jardim Coopagro','85903757','Toledo','PR','4127700','Brasil','1058','','Sul','Ativo','2025-05-30 09:41:34','2025-06-27 14:58:51'),(2,'TALATTO VAREJO LTDA','','Pessoa Jurídica','Fornecedor','','554530554363','sperotto@sperotto.com.br','47515765000128','','Rua Valmir Zanetti','11','','Jardim Gisela','85905120','Toledo','PR','4127700','Brasil','1058','9','Sul','Ativo','2025-05-30 11:19:58','2025-06-27 15:42:26'),(3,'TALATTO INDUSTRIA E COMERCIO LTDA','','Pessoa Jurídica','Transportadora','554530554363','554520337000','adm01@talatto.com.br','29987353000109','','Rua Alberto Dalcanale','3103','','Jardim Anápolis','85905415','Toledo','PR',NULL,'Brasil','1058','9','Sul','Ativo','2025-05-30 11:24:20','2025-06-25 14:40:18'),(4,'tayna kauana dos santos','','Pessoa Física','Cliente','','5545998592776','taynakau5@gmail.com','13070031927','149054294','Rua Heriberto Beutler de Cecco','2431','Casa','Jardim Coopagro','85903755','Toledo','PR',NULL,'Brasil','1058','9','Sul','Inativo','2025-05-31 11:55:04','2025-06-25 14:40:18'),(5,'45.998.909 RODRIGO DE FREITAS PELLI','','Pessoa Jurídica','Cliente','','554599126420','freitaspelli@yahoo.com.br','45998909000119','9109969750','Rua Maria Antonia','325','CASA','Morumbi','85858245','Foz do Iguaçu','PR',NULL,'Brasil','1058','9','Sul','Ativo','2025-06-25 14:32:32','2025-06-25 14:40:18');
/*!40000 ALTER TABLE `cadastros` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contas`
--

DROP TABLE IF EXISTS `contas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo_conta` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tipo da conta (ex: A Pagar, A Receber)',
  `situacao_conta` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Em Aberto' COMMENT 'Situação da conta (ex: Em Aberto, Paga, Vencida, Cancelada)',
  `descricao_conta` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Descrição da conta (ex: Aluguel, Fatura de Internet)',
  `num_conta` int DEFAULT NULL COMMENT 'Número da Conta (ex: número da NF)',
  `id_cliente_fornecedor` int NOT NULL COMMENT 'ID do usuário associado à conta',
  `nome_cliente_fornecedor` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nome do cadastro associado à conta',
  `data_emissao` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Data de emissao da conta',
  `data_vencimento` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Data de vencimento da conta',
  `data_baixa` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Data de baixa da conta',
  `plano_contas` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tipo de plano da conta (ex: Energia, Venda)',
  `caixa_destino_origem` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Caixa/Origem da conta (ex: Sicoob, PagarME)',
  `observacoes_conta` text COLLATE utf8mb4_unicode_ci COMMENT 'Observações adicionais sobre a conta',
  `forma_pagamento` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Forma de Pagamento (ex: Pix, Parcelamento 1/4)',
  `valor_conta` decimal(13,2) NOT NULL COMMENT 'Valor da conta',
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora de criação do registro',
  `atualizado_em` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data e hora da última atualização do registro',
  PRIMARY KEY (`id`),
  KEY `id_cliente_fornecedor` (`id_cliente_fornecedor`),
  CONSTRAINT `contas_ibfk_1` FOREIGN KEY (`id_cliente_fornecedor`) REFERENCES `cadastros` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contas`
--

LOCK TABLES `contas` WRITE;
/*!40000 ALTER TABLE `contas` DISABLE KEYS */;
INSERT INTO `contas` VALUES (1,'A Receber','Em Aberto','Teste',4356436,1,'Cristian Gabriel Kist','05/06/2025','12/06/2025','','Investimento','Sicoob','','Pix',34535.45,'2025-06-05 11:31:19','2025-06-05 11:31:19'),(2,'A Receber','Em Aberto','Teste',4356436,1,'Cristian Gabriel Kist','05/06/2025','12/06/2025','','Investimento','Sicoob','','Parcelamento 1/4',34535.55,'2025-06-05 11:31:19','2025-06-05 11:31:19'),(3,'A Receber','Em Aberto','Teste',4356436,1,'Cristian Gabriel Kist','05/06/2025','12/07/2025','','Investimento','Sicoob','','Parcelamento 2/4',34535.55,'2025-06-05 11:31:19','2025-06-05 11:31:19'),(4,'A Receber','Em Aberto','Teste',4356436,1,'Cristian Gabriel Kist','05/06/2025','12/08/2025','','Investimento','Sicoob','','Parcelamento 3/4',34535.55,'2025-06-05 11:31:19','2025-06-05 11:31:19'),(5,'A Receber','Em Aberto','Teste',4356436,1,'Cristian Gabriel Kist','05/06/2025','12/09/2025','','Investimento','Sicoob','','Parcelamento 4/4',34535.55,'2025-06-05 11:31:19','2025-06-05 11:31:19'),(8,'A Pagar','Em Aberto','Teste 2',52544345,1,'Cristian Gabriel Kist','23/06/2025','30/06/2025','','Investimento','Sicoob','','Pix',1324.34,'2025-06-23 08:59:13','2025-06-23 08:59:13'),(9,'A Pagar','Em Aberto','Teste 2',52544345,1,'Cristian Gabriel Kist','23/06/2025','30/06/2025','','Investimento','Sicoob','','Parcelamento 1/2',2342.44,'2025-06-23 08:59:13','2025-06-23 08:59:13'),(10,'A Pagar','Em Aberto','Teste 2',52544345,1,'Cristian Gabriel Kist','23/06/2025','30/07/2025','','Investimento','Sicoob','','Parcelamento 2/2',2342.44,'2025-06-23 08:59:13','2025-06-23 08:59:13'),(11,'A Pagar','Em Aberto','Prestação de Serviços Cristian',4365464,1,'Cristian Gabriel Kist','25/06/2025','05/07/2025','','Salários Administrativo','Sicoob','Cristian é lindo','Pix',10.00,'2025-06-25 14:52:24','2025-06-25 14:52:24'),(12,'A Pagar','Em Aberto','Prestação de Serviços Cristian',4365464,1,'Cristian Gabriel Kist','25/06/2025','05/07/2025','','Salários Administrativo','Sicoob','Cristian é lindo','Parcelamento 1/2',100.00,'2025-06-25 14:52:24','2025-06-25 14:52:24'),(13,'A Pagar','Em Aberto','Prestação de Serviços Cristian',4365464,1,'Cristian Gabriel Kist','25/06/2025','05/08/2025','','Salários Administrativo','Sicoob','Cristian é lindo','Parcelamento 2/2',100.00,'2025-06-25 14:52:24','2025-06-25 14:52:24');
/*!40000 ALTER TABLE `contas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opcoes`
--

DROP TABLE IF EXISTS `opcoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opcoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo` varchar(50) NOT NULL,
  `valor` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tipo` (`tipo`)
) ENGINE=InnoDB AUTO_INCREMENT=150 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opcoes`
--

LOCK TABLES `opcoes` WRITE;
/*!40000 ALTER TABLE `opcoes` DISABLE KEYS */;
INSERT INTO `opcoes` VALUES (19,'tipo_pessoa','Pessoa Física'),(20,'tipo_pessoa','Pessoa Jurídica'),(22,'tipo_cadastro','Transportadora'),(23,'tipo_cadastro','Cliente'),(25,'situacao','Ativo'),(26,'situacao','Inativo'),(27,'tipo_produto','Matéria Prima'),(28,'tipo_produto','Mercadoria de Revenda'),(29,'tipo_produto','Produto Acabado'),(30,'tipo_produto','Produto Semi Acabado'),(31,'grupo','Ripado'),(32,'grupo','Brises'),(33,'grupo','Cabeceiras'),(34,'subgrupo1','Versátil'),(35,'subgrupo1','Mdf'),(36,'subgrupo1','Compacto'),(40,'variacoes','Amêndoa'),(41,'variacoes','Areia'),(42,'variacoes','Branco'),(43,'variacoes','Carvalho'),(44,'variacoes','Cru'),(45,'variacoes','Freijo'),(46,'variacoes','Gianduia'),(47,'variacoes','Imbuia'),(48,'variacoes','Marmorizado'),(49,'variacoes','Peroba'),(50,'variacoes','Preto'),(51,'quantidades','1'),(52,'quantidades','2'),(53,'quantidades','3'),(54,'quantidades','4'),(55,'quantidades','5'),(56,'quantidades','6'),(57,'quantidades','7'),(58,'quantidades','8'),(60,'subgrupo2','Horizontal'),(66,'tipo_cadastro','Fornecedor'),(67,'tipos_precos','Mercado Livre'),(68,'tipos_precos','Venda Direta'),(69,'tipos_precos','Revendedor'),(70,'unidade','Un'),(71,'grupo','PDI'),(72,'subgrupo1','Kids'),(73,'subgrupo2','Teatro'),(74,'origem','Nacional'),(75,'origem','Estrangeira'),(76,'localizacao','Talatto Varejo'),(77,'situacao_orcamento','Orçamento'),(78,'situacao_orcamento','Analisar'),(79,'situacao_orcamento','Produzir'),(80,'situacao_orcamento','Concluído'),(81,'origem_venda','Instagram'),(82,'origem_venda','Recorrente'),(83,'origem_venda','Mercado Livre'),(84,'origem_venda','Venda Direta'),(85,'tipo_cadastro','Vendedor'),(86,'grupo','Painél'),(87,'subgrupo2','Vertical'),(88,'subgrupo3','Redondo'),(89,'subgrupo4','110 cm'),(90,'subgrupo4','274 cm'),(91,'subgrupo4','135 cm'),(92,'subgrupo2','Easy'),(93,'subgrupo4','270 cm'),(94,'grupo','Cantoneira'),(95,'subgrupo1','Easy'),(96,'subgrupo2','270 cm'),(97,'tipo_frete','Contratação do Frete por conta do Remente (CIF)'),(98,'tipo_frete','Contratação do Frete por conta do Destinatário (FOB)'),(99,'tipo_frete','Contratação do Frete por conta de Terceiros'),(100,'tipo_frete','Transporte próprio com conta do Remetente'),(101,'tipo_frete','Transporte próprio com conta do Destinatário'),(102,'tipo_frete','Sem Ocorrência de Transporte'),(104,'condicao_pagamento','Parcelamento'),(105,'condicao_pagamento','Boleto'),(106,'condicao_pagamento','Pix'),(107,'condicao_pagamento','Dinheiro'),(108,'situacao_orcamento','SAC'),(109,'situacao_orcamento','Devolução'),(111,'situacao_pedido','Aguardando Aprovação'),(112,'situacao_pedido','Programação'),(113,'situacao_pedido','Reprovado'),(116,'situacao_pedido','Produção'),(117,'situacao_pedido','Embalagem'),(118,'situacao_pedido','Faturamento'),(119,'situacao_pedido','Expedição'),(120,'ruas','A'),(121,'ruas','B'),(122,'ruas','C'),(123,'cores','Azul'),(124,'cores','Vermelho'),(125,'cores','Verde'),(126,'cores','Amarelo'),(127,'indicador_ie','Contribuinte ICMS'),(128,'indicador_ie','Contribuinte Isento de IE'),(129,'indicador_ie','Não Contribuinte'),(134,'tipo_conta_options','A Receber'),(135,'tipo_conta_options','A Pagar'),(136,'situacao_contas','Em Aberto'),(137,'situacao_contas','Baixada'),(138,'condicao_pagamento_options','Parcelamento'),(139,'condicao_pagamento_options','Pix'),(140,'condicao_pagamento_options','Boleto'),(141,'condicao_pagamento_options','Dinheiro'),(142,'situacao_contas_options','Em Aberto'),(143,'situacao_contas_options','Baixado'),(144,'plano_contas_options','Investimento'),(145,'caixa_options','Sicoob'),(147,'situacao_contas_options','Atrasado'),(148,'plano_contas_options','Salários Administrativo'),(149,'tipo_embalagem','Embalagem Padrão Ripados');
/*!40000 ALTER TABLE `opcoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orcamentos`
--

DROP TABLE IF EXISTS `orcamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orcamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `situacao_orcamento` varchar(50) DEFAULT 'Orçamento',
  `data_emissao` date DEFAULT NULL,
  `data_validade` date DEFAULT NULL,
  `cliente_id` int DEFAULT NULL,
  `cliente_nome` varchar(255) DEFAULT NULL,
  `vendedor_id` int DEFAULT NULL,
  `vendedor_nome` varchar(255) DEFAULT NULL,
  `origem_venda` varchar(100) DEFAULT NULL,
  `tipo_frete` varchar(50) DEFAULT NULL,
  `transportadora_id` int DEFAULT NULL,
  `transportadora_nome` varchar(255) DEFAULT NULL,
  `valor_frete` decimal(10,2) DEFAULT '0.00',
  `total` decimal(10,2) DEFAULT '0.00',
  `desconto_total` decimal(10,2) DEFAULT '0.00',
  `total_com_desconto` decimal(10,2) DEFAULT '0.00',
  `lista_itens` json DEFAULT NULL,
  `formas_pagamento` json DEFAULT NULL,
  `observacao` text,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orcamentos`
--

LOCK TABLES `orcamentos` WRITE;
/*!40000 ALTER TABLE `orcamentos` DISABLE KEYS */;
INSERT INTO `orcamentos` VALUES (5,'Orçamento','2025-05-19','2025-05-26',5,'ADA CATIA VALADARES',6950,'TALATTO VAREJO LTDA','Instagram','Transporte próprio com conta do Remetente',5358,'PLAV Transportadora LTDA',79.90,2402.64,32.54,2450.00,'[{\"produto\": \"### CANTONEIRA EASY 2700x20X10 mm\", \"subtotal\": 1202.58, \"variacao\": \"Areia\", \"produto_id\": 1, \"variacao_id\": \"Areia\", \"tabela_preco\": \"Venda Direta\", \"tabela_preco_id\": \"Venda Direta\", \"quantidade_itens\": 6}, {\"produto\": \"PAINEL VERSATIL VERTICAL REDONDO 110 cm\", \"subtotal\": 1200.06, \"variacao\": \"Branco\", \"produto_id\": 62, \"variacao_id\": \"Branco\", \"tabela_preco\": \"Venda Direta\", \"tabela_preco_id\": \"Venda Direta\", \"quantidade_itens\": 3}]','[{\"tipo\": \"Pix\", \"parcelas\": null, \"valor_pix\": 1000.0, \"valor_boleto\": null, \"valor_parcela\": null, \"valor_dinheiro\": null}, {\"tipo\": \"Boleto\", \"parcelas\": null, \"valor_pix\": null, \"valor_boleto\": 1000.0, \"valor_parcela\": null, \"valor_dinheiro\": null}, {\"tipo\": \"Parcelamento\", \"parcelas\": 3, \"valor_pix\": null, \"valor_boleto\": null, \"valor_parcela\": 150.0, \"valor_dinheiro\": null}]','','2025-05-19 12:13:56'),(6,'Orçamento','2025-05-30','2025-06-06',1,'Cristian Gabriel Kist',2,'TALATTO VAREJO LTDA','Instagram','Contratação do Frete por conta do Remente (CIF)',3,'TALATTO INDUSTRIA E COMERCIO LTDA',79.90,340.00,19.90,400.00,'[{\"produto\": \"### CANTONEIRA EASY 2700x20X10 mm\", \"subtotal\": 340.0, \"variacao\": \"Amêndoa\", \"produto_id\": 1, \"variacao_id\": \"Amêndoa\", \"tabela_preco\": \"Revendedor\", \"tabela_preco_id\": \"Revendedor\", \"quantidade_itens\": 1}]','[{\"tipo\": \"Pix\", \"parcelas\": null, \"valor_pix\": 200.0, \"valor_boleto\": null, \"valor_parcela\": null, \"valor_dinheiro\": null}, {\"tipo\": \"Parcelamento\", \"parcelas\": 2, \"valor_pix\": null, \"valor_boleto\": null, \"valor_parcela\": 100.0, \"valor_dinheiro\": null}]','','2025-05-30 14:25:50');
/*!40000 ALTER TABLE `orcamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `situacao_pedido` varchar(50) NOT NULL,
  `data_emissao` varchar(50) NOT NULL,
  `data_validade` varchar(50) DEFAULT NULL,
  `cliente_id` int DEFAULT NULL,
  `cliente_nome` varchar(255) DEFAULT NULL,
  `vendedor_id` int DEFAULT NULL,
  `vendedor_nome` varchar(255) DEFAULT NULL,
  `origem_venda` varchar(100) DEFAULT NULL,
  `tipo_frete` varchar(50) DEFAULT NULL,
  `transportadora_id` int DEFAULT NULL,
  `transportadora_nome` varchar(255) DEFAULT NULL,
  `valor_frete` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `desconto_total` decimal(10,2) DEFAULT NULL,
  `total_com_desconto` decimal(10,2) NOT NULL,
  `lista_itens` json DEFAULT NULL,
  `formas_pagamento` json DEFAULT NULL,
  `observacao` text,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `data_finalizacao` varchar(50) DEFAULT NULL,
  `ordem_finalizacao` varchar(50) DEFAULT NULL,
  `endereco_expedicao` varchar(255) DEFAULT NULL,
  `hora_expedicao` varchar(50) DEFAULT NULL,
  `usuario_expedicao` varchar(100) DEFAULT NULL,
  `numero_nf` varchar(50) DEFAULT NULL,
  `data_nf` varchar(50) DEFAULT NULL,
  `tecnospeed_id` varchar(255) DEFAULT NULL,
  `tecnospeed_id_integracao` varchar(255) DEFAULT NULL,
  `tecnospeed_status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
INSERT INTO `pedidos` VALUES (1,'Aguardando Aprovação','2025-05-30','2025-06-06',1,'Cristian Gabriel Kist',2,'TALATTO VAREJO LTDA','Instagram','Contratação do Frete por conta do Remente (CIF)',3,'TALATTO INDUSTRIA E COMERCIO LTDA',79.90,0.00,19.90,400.00,'[{\"produto\": \"### CANTONEIRA EASY 2700x20X10 mm\", \"subtotal\": 340.0, \"variacao\": \"Amêndoa\", \"produto_id\": 1, \"variacao_id\": \"Amêndoa\", \"tabela_preco\": \"Revendedor\", \"tabela_preco_id\": \"Revendedor\", \"quantidade_itens\": 1}]','[{\"tipo\": \"Pix\", \"parcelas\": null, \"valor_pix\": 200.0, \"valor_boleto\": null, \"valor_parcela\": null, \"valor_dinheiro\": null}, {\"tipo\": \"Parcelamento\", \"parcelas\": 2, \"valor_pix\": null, \"valor_boleto\": null, \"valor_parcela\": 100.0, \"valor_dinheiro\": null}]','','2025-06-23 14:51:10',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'685edbe21005870ad78ab959','PEDIDO_1_441e81d0','EM_PROCESSAMENTO');
/*!40000 ALTER TABLE `pedidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `produtos`
--

DROP TABLE IF EXISTS `produtos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `produtos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sku` varchar(50) NOT NULL,
  `codigo_barras` varchar(20) DEFAULT NULL,
  `descricao` text NOT NULL,
  `unidade` varchar(20) DEFAULT NULL,
  `situacao` varchar(20) DEFAULT 'Ativo',
  `peso_produto` int DEFAULT NULL,
  `tipo_produto` varchar(50) DEFAULT NULL,
  `variacoes` json DEFAULT NULL,
  `quantidades` json DEFAULT NULL,
  `grupo` varchar(50) DEFAULT NULL,
  `subgrupo1` varchar(50) DEFAULT NULL,
  `subgrupo2` varchar(50) DEFAULT NULL,
  `subgrupo3` varchar(50) DEFAULT NULL,
  `subgrupo4` varchar(50) DEFAULT NULL,
  `subgrupo5` varchar(50) DEFAULT NULL,
  `url_imagem` json DEFAULT NULL,
  `classificacao_fiscal` varchar(50) DEFAULT NULL,
  `origem` varchar(50) DEFAULT NULL,
  `valor_ipi` decimal(5,2) DEFAULT NULL,
  `gtin` varchar(20) DEFAULT NULL,
  `gtin_tributavel` varchar(20) DEFAULT NULL,
  `tabela_precos` json DEFAULT NULL,
  `estoque` int DEFAULT NULL,
  `localizacao` varchar(100) DEFAULT NULL,
  `tipo_embalagem` varchar(50) DEFAULT NULL,
  `peso_embalagem` int DEFAULT NULL,
  `unidade_caixa` int DEFAULT NULL,
  `largura_embalagem` decimal(10,2) DEFAULT NULL,
  `altura_embalagem` decimal(10,2) DEFAULT NULL,
  `comprimento_embalagem` decimal(10,2) DEFAULT NULL,
  `diametro_embalagem` decimal(10,2) DEFAULT NULL,
  `custo_produto` decimal(10,2) DEFAULT NULL,
  `id_fornecedor` int DEFAULT NULL,
  `dias_preparacao` int DEFAULT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `garantia` int DEFAULT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `descricao_plataforma` text,
  `imagens_plataforma` json DEFAULT NULL,
  `imagens_variacoes` json DEFAULT NULL,
  `largura_produto` decimal(10,2) DEFAULT NULL,
  `altura_produto` decimal(10,2) DEFAULT NULL,
  `comprimento_produto` decimal(10,2) DEFAULT NULL,
  `diametro_produto` decimal(10,2) DEFAULT NULL,
  `material_produto` json DEFAULT NULL,
  `fabricante` varchar(100) DEFAULT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_fornecedor` (`id_fornecedor`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `produtos`
--

LOCK TABLES `produtos` WRITE;
/*!40000 ALTER TABLE `produtos` DISABLE KEYS */;
INSERT INTO `produtos` VALUES (1,'300','7898735345434','### CANTONEIRA EASY 2700x20X10 mm','Un','Ativo',200,'Mercadoria de Revenda','[\"Amêndoa\", \"Areia\", \"Branco\", \"Carvalho\", \"Gianduia\", \"Freijo\", \"Imbuia\", \"Marmorizado\", \"Peroba\", \"Preto\"]','[\"1\"]','Cantoneira','Easy','270 cm',NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/e5e9922e465fb5245e5daa3c9cfadade.png\"]','39259090','Estrangeira',NULL,'','','{\"Revendedor\": 340, \"Venda Direta\": 200.43, \"Mercado Livre\": 135.64}',50,'Talatto Varejo','Rolo / Cilindro',NULL,NULL,0.00,0.00,275.00,4.00,0.00,6961,1,'Talatto Painéis',12,NULL,NULL,'[]','[]',NULL,NULL,NULL,NULL,'[]',NULL,'2025-04-25 12:05:14'),(9,'130',NULL,'### CANTONEIRA EXTERNA 270 cm','Un','Ativo',200,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/9dc5f3cf689be2e6d56cf72528aa04c9.png\"]','39206299','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Rolo / Cilindro',NULL,NULL,0.00,0.00,275.00,4.00,0.00,NULL,1,'Talatto Painéis',12,'painel-ripado-versatil/cantoneira-de-acabamento-em-l-externa-painel-ripado-versatil',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(10,'310',NULL,'### CANTONEIRA INTERNA 270 cm','Un','Ativo',200,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/c2e70e6ced2514b4c64e6ed8511c5af0.png\"]','39206299','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Rolo / Cilindro',NULL,NULL,0.00,0.00,275.00,4.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(11,'116',NULL,'### CANTONEIRA PAINEL DE ALTA RESISTENCIA 270 cm','Un','Ativo',2100,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/6ea8a2a4a603cf6bd965610dc3fa5d3d.jpg\"]','39219090','Estrangeira',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,6.00,4.00,275.00,0.00,0.00,NULL,1,'Talatto Painéis',60,'painel-ripado-area-externa/perfil-de-acabamento-painel-ripado-alta-resistencia',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(12,'404',NULL,'### CANTONEIRA PAINEL RIPADO CANELADO E REDONDO 290 cm','Un','Ativo',300,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/6fd069ad1b766d8822e745ac1b01c604.jpg\"]','39219090','Estrangeira',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Rolo / Cilindro',NULL,NULL,0.00,0.00,290.00,4.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(13,'128',NULL,'### PERFIL ACAB EM U VERSATIL 270 cm','Un','Ativo',200,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/39e022ab23a9f6b298410b5ba4cb67da.jpg\"]','39206299','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Rolo / Cilindro',NULL,NULL,0.00,0.00,275.00,4.00,0.00,NULL,1,'Talatto Painéis',12,'painel-ripado-versatil/perfil-de-acabamento-versatil-em-u',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(14,'134',NULL,'### PERFIL DE ACABAMENTO COMPACTO MDF 274 cm','Un','Ativo',950,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/c2611060c201c0425c92a46270bac654.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,6.00,4.00,275.00,0.00,0.00,NULL,3,'Talatto Painéis',12,'paineis-ripados/perfil-acabamento-compacto-01-unid-270x6cm-larg',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(15,'320',NULL,'### PERFIL DE ACABAMENTO EASY MDF 274 cm','Un','Ativo',950,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/86ea8821212d83f750144262c6dfba35.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,6.00,4.00,275.00,0.00,0.00,NULL,3,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(16,'132',NULL,'### PERFIL DE ACABAMENTO ESTRUTURAL MDF 274 cm','Un','Ativo',1100,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/da0970722655dcfd74dd0f2c935284e5.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,6.00,4.00,275.00,0.00,0.00,NULL,3,'Talatto Painéis',12,'painel-ripado-estrutural/perfil-acabamento-estrutural-01-unid-270x6cm-larg',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(17,'444',NULL,'### PERFIL DE ACABAMENTO SHIPLAP AMERICANO 274 cm','Un','Ativo',950,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/d711a6a6f8b360e3723a945483bbccfd.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,6.00,4.00,275.00,0.00,0.00,NULL,3,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(18,'440',NULL,'### PERFIL DE ACABAMENTO SHIPLAP TRADICIONAL 274 cm','Un','Ativo',950,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/c67f063a25357db563847a631c91836b.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,6.00,4.00,275.00,0.00,0.00,NULL,3,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(19,'232',NULL,'BANQUETA KIDS INDIVIDUAL','Un','Ativo',1200,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/c547de030bfbb6d9a25cbfee18d6caab.png\"]','94039900','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,30.00,7.00,30.00,0.00,0.00,NULL,3,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(20,'395','7898735305186','BASE PVC PARA BRISE','Un','Ativo',50,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/43bb7ef3203deb8f8fcda88fd717d5a4.png\"]','39204900','Nacional',NULL,'7898735305186',NULL,NULL,-10,'Talatto Varejo','Pacote / Caixa',NULL,NULL,34.00,9.00,25.00,0.00,0.00,NULL,1,'Talatto Painéis',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(21,'424',NULL,'BAU - CANTO ALEMAO','Un','Ativo',3950,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/455559dad9aff94ad2c3d8dfd3769f59.png\"]','94039900','Nacional',NULL,NULL,NULL,NULL,33,'Talatto Varejo','Pacote / Caixa',NULL,1,32.00,42.00,32.00,0.00,0.00,NULL,1,NULL,12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(22,'394',NULL,'BRISE MDF 2740x65X40 mm','Un','Ativo',2900,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/69dc217c6bb9457f3e3a73ba0a29586f.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,6.00,4.00,275.00,0.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(23,'120',NULL,'BRISE PVC 290x5X5 cm','Un','Ativo',1400,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/0285dd4990066e50ea1bd5d1a2d71f0b.jpg\"]','39259090','Estrangeira',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,5.00,5.00,290.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'brise/brise-talatto-paineis-01-unid-270x5x5 cm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(24,'105',NULL,'CABECEIRA ESTOFADA 40x30 cm','Un','Ativo',400,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/ef7bb8911156943bd7e36a575ef7cab5.jpg\"]','94017100','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,42.00,4.00,32.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'cabeceira-estofada-blocos-01-unidade-40x30 cm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(25,'103',NULL,'CABECEIRA ESTOFADA 60x20 cm','Un','Ativo',400,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/554b127a9563b12527b8a63af9d95d84.jpg\"]','94017100','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,62.00,4.00,22.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'cabeceira-estofada-01-unidade-60x20 cm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(26,'107',NULL,'CABECEIRA ESTOFADA CERQUINHA 60x20 cm','Un','Ativo',400,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/557674494d773a0abefa5150e8dc0f2c.jpg\"]','94017100','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,62.00,4.00,22.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'cabeceira-estofada-cerquinha-01-unidade-60x20 cm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(27,'122',NULL,'CABECEIRA MICKEY MINNIE','Un','Ativo',2600,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/1b5a42d6e2a26e364a0f9c18a55af3d3.jpg\"]','94017100','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,70.00,4.00,100.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'estofados/cabeceira-estofada-mickeyminnie-01-unid-90x110 cm-larg',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(28,'416','7898735306565','CASINHA INFANTIL DE MDF','Un','Ativo',3800,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/77486af0cf2bb6894bdd49e1f9abc59b.webp\"]','94036000','Nacional',NULL,'7898735306565',NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,1,104.00,5.00,84.00,0.00,0.00,NULL,1,'Talatto Kids',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(29,'418','7898735300730','CHAPA DE FIXACAO','Kit','Ativo',100,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/5d40299d1eade10a13333db294b01e8f.png\"]','73182900','Nacional',NULL,'7898735300730',NULL,NULL,-150,'Talatto Varejo','Pacote / Caixa',NULL,NULL,34.00,9.00,25.00,0.00,0.00,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(30,'230','7898735303069','CONJUNTO MESINHA KIDS','Un','Ativo',6500,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/66fdce96ff9e729a70e4555400a6f81c.png\"]','94039900','Nacional',NULL,'7898735303069',NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,50.00,7.00,50.00,0.00,0.00,NULL,3,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(31,'238','7898735303083','CRIADO COM GAVETA','Un','Ativo',8100,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/3c60aefd8ff4c9dad00ddfdced3514f8.jpg\"]','94039900','Nacional',NULL,'7898735303083','7898735303083',NULL,4,'Talatto Varejo','Pacote / Caixa',NULL,NULL,42.00,57.00,37.00,0.00,85.00,NULL,3,'Talatto Painéis',12,'cabeceiras-estofadas/criado-mudo/criado-mudo-com-gaveta-talatto',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(32,'240','7898735303052','CRIADO SLIM','Un','Ativo',4700,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/b10994a10582e3f6c3de370f440bd194.jpg\"]','94039900','Nacional',NULL,'7898735303052','7898735303052',NULL,10,'Talatto Varejo','Pacote / Caixa',NULL,NULL,32.00,42.00,27.00,0.00,40.00,NULL,3,'Talatto Painéis',12,'cabeceiras-estofadas/criado-mudo/criado-mudo-slim-talatto',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(33,'216','7898735303502','DECK EM PLASTICO 3D','Un','Ativo',5800,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/45ce19bd25cdff135d97ad3137f36a38.jpg\"]','39219090','Estrangeira',NULL,'7898735303502','7898735303502',NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,17.00,4.00,202.00,0.00,0.00,NULL,1,'Talatto Painéis',60,'deck/deck-regua-wpc-madeira-plastica',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(34,'396',NULL,'FRASE APLIQUE','Un','Ativo',500,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/8c66c21243fe6841a845f6ce7355c149.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,34.00,9.00,25.00,0.00,0.00,NULL,1,'Talatto Painéis',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(35,'384','7898735305407','KIT BORBOLETAS EM ACRILICO','Un','Ativo',100,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/5c5e8776b9ed78a2c6b93f597774b18c.jpg\"]','39205100','Nacional',NULL,'7898735305407','7898735305407',NULL,-3,'Talatto Varejo','Pacote / Caixa',NULL,NULL,34.00,9.00,25.00,0.00,0.00,NULL,1,'Talatto Painéis',1,'talatto-kids/kit-borboletas-em-acrilico-rosa-espelhada-14-unid',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(36,'342','7898735303441','KIT DE AMOSTRAS COMPLETO','Un','Ativo',1000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/f420042635e5d0c8fa041a0aaadc8ceb.jpg\"]','39206299','Nacional',NULL,'7898735303441','7898735303441',NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,34.00,9.00,25.00,0.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(37,'343','7898735303885','KIT DE AMOSTRAS DE ENTRADA','Un','Ativo',300,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/7d9d6b6cface7b48fcbd6e2ca92e355b.jpg\"]','39206299','Nacional',NULL,'7898735303885','7898735303885',NULL,-3,'Talatto Varejo','Pacote / Caixa',NULL,NULL,34.00,9.00,25.00,0.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(38,'236',NULL,'MESA KIDS INDIVIDUAL','Un','Ativo',3500,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/6b17f018060975a66d72709d994d24f1.png\"]','94039900','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,30.00,7.00,30.00,0.00,0.00,NULL,3,'Talatto Painéis',12,'talatto-kids/kit-mesa-infantil-ursinho-com-2-bancos',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(39,'436','7898735307395','PAINEL DE PEDRA PU','Un','Ativo',100,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/d7be7f46d8a47c93454a3cd6dea2836f.webp\"]','39259090','Nacional',NULL,'7898735307395',NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,32.00,2.00,62.00,0.00,0.00,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(40,'402',NULL,'PAINEL RIPADO CANELADO 2900 mm','Un','Ativo',2400,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/b85379d9d9453ea75592cf1ee5eced6b.png\"]','39219090','Estrangeira',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,15.00,8.00,292.00,0.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(41,'432',NULL,'PAINEL RIPADO CANELADO 90 cm','Un','Ativo',650,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/808c532726e66198788ee5bf2c1d8fe6.png\"]','39219090','Estrangeira',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,15.00,12.00,92.00,0.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(42,'91',NULL,'PAINEL RIPADO COMPACTO 274X25 cm','Un','Ativo',4300,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/03cd6129ed43bcd48b2f04123eb27f6f.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,25.00,6.00,276.00,0.00,0.00,NULL,3,'Talatto Painéis',12,'painel-ripado-compacto-01-unidade-274x25 cm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(43,'97',NULL,'PAINEL RIPADO COMPACTO 90x25 cm','Un','Ativo',1400,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/1a62f636f379afb43846902389c023f6.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,26.00,1.00,91.00,0.00,0.00,NULL,3,'Talatto Painéis',12,'painel-ripado-compacto-01-unidade-90x25 cm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(44,'434',NULL,'PAINEL RIPADO EASY 270x15 cm','Un','Ativo',1400,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/ccda860634f8b753bac82ddd61852903.jpg\"]','39259090','Estrangeira',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,15.00,8.00,292.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'paineis-ripados/forro-ripado-easy-01-unid-270x15 cm-larg',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(45,'112',NULL,'PAINEL RIPADO EASY 290x15 cm','Un','Ativo',1400,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/b2d29357d9b5fbffe0fd10b194560860.jpg\"]','39219090','Estrangeira',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,15.00,8.00,292.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'paineis-ripados/forro-ripado-easy-01-unid-270x15 cm-larg',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(46,'114',NULL,'PAINEL RIPADO EASY 90x15 cm','Un','Ativo',500,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/11facc7e04178eb6e40913e6727d8a0a.jpg\"]','39219090','Estrangeira',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,15.00,12.00,92.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'painel-ripado-easy/painel-ripado-easy-01-unid-90x15 cm-larg',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(47,'27',NULL,'PAINEL RIPADO ESTRUTURAL 30x270 cm WIDE','Un','Ativo',8100,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/140054fb249cab9ee4c9dec0070c16f8.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,32.00,5.00,272.00,0.00,0.00,NULL,3,'Talatto Painéis',12,'painel-ripado-estrutural-wide-01-uniddade-270x30-5 cm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(48,'45',NULL,'PAINEL RIPADO ESTRUTURAL 90x120 cm WIDE','Un','Ativo',10650,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/c51c8ff977dc89bdaba961d35d174c19.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,92.00,4.00,122.00,0.00,0.00,NULL,3,'Talatto Painéis',12,'painel-ripado-estrutural-wide-01-uniddade-120x90 cm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(49,'1',NULL,'PAINEL RIPADO ESTRUTURAL 90x270 cm WIDE','Un','Ativo',24300,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/a90333c591675b4188e0c4494fc79bf6.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,92.00,5.00,272.00,0.00,0.00,NULL,3,'Talatto Painéis',12,'painel-ripado-estrutural-wide-01-unidade-270x90 cm-',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(50,'41',NULL,'PAINEL RIPADO ESTRUTURAL 90x60 cm WIDE','Un','Ativo',5400,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/44be2bdf7c102c8719a49dcd0438ce34.jpg\"]','44111490','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,92.00,4.00,62.00,0.00,0.00,NULL,3,'Talatto Painéis',12,'painel-ripado-estrutural-wide-01-unidade-60x90 cm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(51,'370',NULL,'PAINEL RIPADO KIDS 57 cm','Un','Ativo',600,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/4ff262b2aeede6b7251b3c3e223164d9.jpg\"]','39206299','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,15.00,15.00,65.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'talatto-kids/painel-ripado-cerquinha-01-unid-57x270 cm-larg',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(52,'400',NULL,'PAINEL RIPADO REDONDO 2900MM','Un','Ativo',2080,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/7f8afccbc0fd2f8db64d87ff16b2dfa2.png\"]','39219090','Estrangeira',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,15.00,8.00,292.00,0.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(53,'430',NULL,'PAINEL RIPADO REDONDO 90 cm','Un','Ativo',650,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/c23a21769e5079147b3c364ef3aea201.png\"]','39219090','Estrangeira',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,15.00,12.00,92.00,0.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(54,'330',NULL,'PAINEL RIPADO VERSATIL MP 110x135 cm','Un','Ativo',600,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/b60a2a06904bfaa3ad68ed7af8dab900.png\"]','39206299','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,15.00,15.00,115.00,0.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(55,'61',NULL,'PAINEL RIPADO VERSATIL MP 110x270 cm','Un','Ativo',1200,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/6c3afe85d143b6dcee1ce7fe044b72a5.png\"]','39206299','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,15.00,15.00,115.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'painel-ripado-versatil/painel-ripado-flexivel-versatil-horizontal-110 cm-x-270 cm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(56,'5',NULL,'PAINEL RIPADO VERSATIL VERTICAL 110 cm','Un','Ativo',1200,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/e4712ffe2c1ee466d23d8f1352bc6773.jpg\"]','39206299','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,13.00,13.00,275.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'painel-ripado-versatil/painel-ripado-flexivel-versatil-270 cm-x-110 cm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(57,'47',NULL,'PAINEL RIPADO VERSATIL VERTICAL 27 cm','Un','Ativo',550,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/c2c487ebe67ff879dfb0cfe07201143b.jpg\"]','39206299','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,34.00,5.00,275.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'painel-ripado-flexivel-versatil/painel-ripado-versatil-270-x-27cm',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(58,'442',NULL,'PAINEL SHIPLAP MDF AMERICANO','Un','Ativo',2000,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/07828eb88ec1947960651faac64338f9.jpg\"]','44111490','Nacional',NULL,NULL,'7898735305827',NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,25.00,6.00,276.00,0.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(59,'398','7898735305827','PAINEL SHIPLAP MDF CRU - 900x50mm','Un','Ativo',2835,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/f3d19ed6ec469545590e1a8ecaac3ce8.jpg\"]','44111490','Nacional',NULL,'7898735305827','7898735305827',NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,7.00,11.00,92.00,0.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(60,'438',NULL,'PAINEL SHIPLAP MDF TRADICIONAL','Un','Ativo',360,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/136e58d93c96ff2423c2091d406daa62.jpg\"]','44111490','Nacional',NULL,NULL,'7898735305827',NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,25.00,6.00,276.00,0.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(61,'109',NULL,'PAINEL VERSATIL MODULAR 90x27 cm','Un','Ativo',100,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/0ebd21b0d27938b7b3dc1417388df313.jpg\"]','39206299','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,34.00,4.00,91.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'painel-ripado-versatil/painel-ripado-flexivel-versatil-01-unid-90x27cm-larg',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(62,'426','7898735324323','PAINEL VERSATIL VERTICAL REDONDO 110 cm','Un','Ativo',1200,'Mercadoria de Revenda','[\"Amêndoa\", \"Areia\", \"Branco\", \"Carvalho\", \"Freijo\", \"Gianduia\", \"Imbuia\", \"Marmorizado\", \"Peroba\", \"Preto\"]','[\"1\"]','Painél','Versátil','Vertical','Redondo','110 cm',NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/ecda2c8ed8617f55a8c6b5a7323f009e.jpg\"]','39206299','Nacional',NULL,NULL,NULL,'{\"Revendedor\": 400.22, \"Venda Direta\": 400.02, \"Mercado Livre\": 402.01}',0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,10.00,10.00,275.00,0.00,0.00,NULL,0,'Talatto Painéis',3,NULL,NULL,'[]','[]',NULL,NULL,NULL,NULL,'[]',NULL,'2025-04-25 12:05:14'),(63,'428',NULL,'PAINEL VERSATIL VERTICAL REDONDO 27 cm','Un','Ativo',550,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/60373e3d656b934a96a5886c04420876.webp\"]','39206299','Nacional',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,34.00,5.00,275.00,0.00,0.00,NULL,0,'Talatto Painéis',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(64,'406',NULL,'PLACA ADESIVA DE PAREDE MARMORE FLEXIVEL 60x30 cm','Un','Ativo',800,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/8944dd6947368e1469be5f034b597d2e.jpg\"]','39199020','Estrangeira',NULL,NULL,NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,32.00,2.00,62.00,0.00,0.00,NULL,1,'Talatto Painéis',12,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(65,'341','7898735305216','RELOGIO','Un','Ativo',200,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/af5f91e8005ce290fb14a2083e1c3d0f.png\"]','44111490','Nacional',NULL,'7898735305216','7898735305216',NULL,-20,'Talatto Varejo','Pacote / Caixa',NULL,NULL,31.00,5.00,28.00,0.00,0.00,NULL,1,'Talatto Painéis',12,'ofertas/relogio-de-parede-talatto-paineis',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(66,'420','7898735300549','SUPORTE MAO AMIGA DE METAL (CASAL)','Un','Ativo',200,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/8c07b3865fc39bfebde6948d3cb25b20.png\"]','83024200','Nacional',NULL,'7898735300549',NULL,NULL,0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,34.00,9.00,25.00,0.00,0.00,NULL,1,'Talatto Painéis',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-04-25 12:05:14'),(67,'340','7898735301799','TEATRO DE FANTOCHES LUDICO','Un','Ativo',14300,'Mercadoria de Revenda','[]','[\"1\"]','PDI','Kids','Teatro',NULL,NULL,NULL,'[\"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/c56dfd4ae5348d22f6c7172c33562363.jpg\", \"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/3903860e0f5e31d46b64b38c01605173.jpg\", \"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/817f483845804fa9854493fb1f07eb96.jpg\", \"https://anexos.tiny.com.br/erp/ODM5MjE3NzA2/118b7ecc3d47b00d7991cf630c991412.jpg\", \"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/08b52ecc4fd5df7d3f641b84ac6a602a.jpg\", \"https://s3.amazonaws.com/tiny-anexos-us/erp/ODM5MjE3NzA2/3fcb6dad04711e40b366d210eabec2fa.jpg\"]','94036000','Nacional',NULL,'7898735301799','7898735301799','{}',0,'Talatto Varejo','Pacote / Caixa',NULL,NULL,90.00,4.00,182.00,0.00,0.00,NULL,3,'Talatto Painéis',12,'talatto-kids/teatro-fantoche-talatto-01-unid-180x90 cm-larg',NULL,'[]','[]',NULL,NULL,NULL,NULL,'[]',NULL,'2025-04-25 12:05:14');
/*!40000 ALTER TABLE `produtos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `perfil` varchar(50) NOT NULL DEFAULT 'vendedor',
  `ativo` tinyint(1) DEFAULT '1',
  `colunas_visiveis_clientes` json DEFAULT NULL,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Cristian Gabriel Kist','cris.talatto@gmail.com','$2b$12$IU0A2RoT7Yy5IaoPxpWM5eUPmp9fS39bTDpJS1XwnBFk/n7Y/wNUS','admin',1,'[\"id\", \"nome_razao\", \"fantasia\", \"cpf_cnpj\", \"rg_ie\", \"tipo_pessoa\", \"tipo_cadastro\", \"celular\", \"telefone\", \"email\", \"cep\", \"logradouro\", \"numero\", \"complemento\", \"bairro\", \"estado\"]','2025-04-03 10:14:49'),(2,'Visitante','visitante.talatto@gmail.com','$2b$12$.oWrg0LvIQzTQy9OwRzV9.Z99bjPR0q5DQbpYjgEsfU.RrKmWIv4K','visitante',1,'[\"id\", \"nome_razao\", \"fantasia\", \"cpf_cnpj\", \"rg_ie\", \"tipo_pessoa\", \"tipo_cadastro\", \"celular\", \"telefone\", \"email\", \"cep\", \"logradouro\", \"numero\", \"complemento\", \"bairro\", \"cidade\", \"estado\"]','2025-04-08 09:30:41');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'erp_talatto'
--

--
-- Dumping routines for database 'erp_talatto'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-06-27 16:48:12
