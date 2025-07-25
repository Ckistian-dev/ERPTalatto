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
  `ie` varchar(30) DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=108 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cadastros`
--

LOCK TABLES `cadastros` WRITE;
/*!40000 ALTER TABLE `cadastros` DISABLE KEYS */;
INSERT INTO `cadastros` VALUES (105,'TALATTO VAREJO LTDA','','Pessoa Jurídica','Vendedor','','554530554363','sperotto@sperotto.com.br','47515765000128','','RUA VALMIR ZANETTI','11','','JARDIM GISELA','85905120','TOLEDO','PR','4127700','Brasil','1058','9','Sul','Ativo','2025-07-18 10:44:18','2025-07-18 10:44:18'),(106,'Cristian Gabriel Kist','','Pessoa Física','Cliente','','5545999861237','cris.talatto@gmail.com','11482977907','','Avenida Paulista','1200','Casa','Bela Vista','1310930','São Paulo','SP','3550308','Brasil','1058','9','Sudeste','Ativo','2025-07-18 10:45:36','2025-07-18 10:45:36'),(107,'RODONAVES TRANSPORTES E ENCOMENDAS LTDA','','Pessoa Jurídica','Transportadora','','554530554363','mkt@relacionamento.rodonaves.com.br','44914992000995','','Praça João Pessoa','75','','Centro','13480788','Limeira','SP','3526902','Brasil','1058','9','Sudeste','Ativo','2025-07-18 10:47:06','2025-07-18 10:47:06');
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
  `data_baixa` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Data de baixa da conta',
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
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contas`
--

LOCK TABLES `contas` WRITE;
/*!40000 ALTER TABLE `contas` DISABLE KEYS */;
INSERT INTO `contas` VALUES (1,'A Receber','Em Aberto','Teste',4356436,1,'Cristian Gabriel Kist','05/06/2025','12/06/2025','','Investimento','Sicoob','','Pix',34535.45,'2025-06-05 11:31:19','2025-06-05 11:31:19'),(2,'A Receber','Em Aberto','Teste',4356436,1,'Cristian Gabriel Kist','05/06/2025','12/06/2025','','Investimento','Sicoob','','Parcelamento 1/4',34535.55,'2025-06-05 11:31:19','2025-06-05 11:31:19'),(3,'A Receber','Em Aberto','Teste',4356436,1,'Cristian Gabriel Kist','05/06/2025','12/07/2025','','Investimento','Sicoob','','Parcelamento 2/4',34535.55,'2025-06-05 11:31:19','2025-06-05 11:31:19'),(4,'A Receber','Em Aberto','Teste',4356436,1,'Cristian Gabriel Kist','05/06/2025','12/08/2025','','Investimento','Sicoob','','Parcelamento 3/4',34535.55,'2025-06-05 11:31:19','2025-06-05 11:31:19'),(5,'A Receber','Em Aberto','Teste',4356436,1,'Cristian Gabriel Kist','05/06/2025','12/09/2025','','Investimento','Sicoob','','Parcelamento 4/4',34535.55,'2025-06-05 11:31:19','2025-06-05 11:31:19'),(8,'A Pagar','Em Aberto','Teste 2',52544345,1,'Cristian Gabriel Kist','23/06/2025','30/06/2025','','Investimento','Sicoob','','Pix',1324.34,'2025-06-23 08:59:13','2025-06-23 08:59:13'),(9,'A Pagar','Em Aberto','Teste 2',52544345,1,'Cristian Gabriel Kist','23/06/2025','30/06/2025','','Investimento','Sicoob','','Parcelamento 1/2',2342.44,'2025-06-23 08:59:13','2025-06-23 08:59:13'),(10,'A Pagar','Em Aberto','Teste 2',52544345,1,'Cristian Gabriel Kist','23/06/2025','30/07/2025','','Investimento','Sicoob','','Parcelamento 2/2',2342.44,'2025-06-23 08:59:13','2025-06-23 08:59:13'),(11,'A Pagar','Em Aberto','Prestação de Serviços Cristian',4365464,1,'Cristian Gabriel Kist','25/06/2025','05/07/2025','','Salários Administrativo','Sicoob','Cristian é lindo','Pix',10.00,'2025-06-25 14:52:24','2025-06-25 14:52:24'),(12,'A Pagar','Em Aberto','Prestação de Serviços Cristian',4365464,1,'Cristian Gabriel Kist','25/06/2025','05/07/2025','','Salários Administrativo','Sicoob','Cristian é lindo','Parcelamento 1/2',100.00,'2025-06-25 14:52:24','2025-06-25 14:52:24'),(13,'A Pagar','Em Aberto','Prestação de Serviços Cristian',4365464,1,'Cristian Gabriel Kist','25/06/2025','05/08/2025','','Salários Administrativo','Sicoob','Cristian é lindo','Parcelamento 2/2',100.00,'2025-06-25 14:52:24','2025-06-25 14:52:24'),(14,'A Receber','Em Aberto','Compra de Bobina',543534535,5,'45.998.909 RODRIGO DE FREITAS PELLI','15/07/2025','22/07/2025','15/07/2025','09.01 - Materiais de Fabricação','Sicredi','','Pix',400.00,'2025-07-15 09:42:53','2025-07-15 09:42:53'),(15,'a receber','Pendente','Recebimento referente ao pedido 1005',1005,106,'Cristian Gabriel Kist','18/07/2025','18/07/2025',NULL,'Receita de Vendas','Caixa Principal','Pedido de Venda #1005','Pix',200.00,'2025-07-21 10:14:01','2025-07-21 10:14:01'),(16,'a receber','Pendente','Recebimento referente ao pedido 1005',1005,106,'Cristian Gabriel Kist','18/07/2025','18/07/2025',NULL,'Receita de Vendas','Caixa Principal','Pedido de Venda #1005','Parcelamento 1/2',100.00,'2025-07-21 10:14:01','2025-07-21 10:14:01'),(17,'a receber','Pendente','Recebimento referente ao pedido 1005',1005,106,'Cristian Gabriel Kist','18/07/2025','18/08/2025',NULL,'Receita de Vendas','Caixa Principal','Pedido de Venda #1005','Parcelamento 2/2',100.00,'2025-07-21 10:14:01','2025-07-21 10:14:01'),(18,'A Receber','Pendente','Recebimento referente ao pedido 1006',1006,106,'Cristian Gabriel Kist','21/07/2025','21/07/2025',NULL,'Receita de Vendas','Caixa Principal','Pedido de Venda #1006','Boleto',200.00,'2025-07-21 10:16:00','2025-07-21 10:16:00'),(19,'A Receber','Pendente','Recebimento referente ao pedido 1006',1006,106,'Cristian Gabriel Kist','21/07/2025','21/07/2025',NULL,'Receita de Vendas','Caixa Principal','Pedido de Venda #1006','Parcelamento 1/2',100.00,'2025-07-21 10:16:00','2025-07-21 10:16:00'),(20,'A Receber','Pendente','Recebimento referente ao pedido 1006',1006,106,'Cristian Gabriel Kist','21/07/2025','21/08/2025',NULL,'Receita de Vendas','Caixa Principal','Pedido de Venda #1006','Parcelamento 2/2',100.00,'2025-07-21 10:16:00','2025-07-21 10:16:00'),(21,'A Receber','Pendente','Recebimento referente ao pedido 1005',1005,106,'Cristian Gabriel Kist','18/07/2025','18/07/2025',NULL,'Receita de Vendas','Caixa Principal','Pedido de Venda #1005','Pix',200.00,'2025-07-21 10:18:17','2025-07-21 10:18:17'),(22,'A Receber','Pendente','Recebimento referente ao pedido 1005',1005,106,'Cristian Gabriel Kist','18/07/2025','18/07/2025',NULL,'Receita de Vendas','Caixa Principal','Pedido de Venda #1005','Parcelamento 1/2',100.00,'2025-07-21 10:18:17','2025-07-21 10:18:17'),(23,'A Receber','Pendente','Recebimento referente ao pedido 1005',1005,106,'Cristian Gabriel Kist','18/07/2025','18/08/2025',NULL,'Receita de Vendas','Caixa Principal','Pedido de Venda #1005','Parcelamento 2/2',100.00,'2025-07-21 10:18:17','2025-07-21 10:18:17'),(24,'A Receber','Pendente','Recebimento referente ao pedido 1005',1005,106,'Cristian Gabriel Kist','18/07/2025','18/07/2025',NULL,'Receita de Vendas','Caixa Principal','Pedido de Venda #1005','Pix',200.00,'2025-07-22 08:55:13','2025-07-22 08:55:13'),(25,'A Receber','Pendente','Recebimento referente ao pedido 1005',1005,106,'Cristian Gabriel Kist','18/07/2025','18/07/2025',NULL,'Receita de Vendas','Caixa Principal','Pedido de Venda #1005','Parcelamento 1/2',100.00,'2025-07-22 08:55:13','2025-07-22 08:55:13'),(26,'A Receber','Pendente','Recebimento referente ao pedido 1005',1005,106,'Cristian Gabriel Kist','18/07/2025','18/08/2025',NULL,'Receita de Vendas','Caixa Principal','Pedido de Venda #1005','Parcelamento 2/2',100.00,'2025-07-22 08:55:13','2025-07-22 08:55:13'),(27,'A Pagar','Em Aberto','teste',4354636,106,'Cristian Gabriel Kist','24/07/2025','31/07/2025','','09.01 - Materiais de Fabricação','Sicoob','','Dinheiro',4636.34,'2025-07-24 10:50:12','2025-07-24 10:50:12');
/*!40000 ALTER TABLE `contas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `embalagem`
--

DROP TABLE IF EXISTS `embalagem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `embalagem` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `regras` json NOT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modificado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nome` (`nome`),
  KEY `idx_nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `embalagem`
--

LOCK TABLES `embalagem` WRITE;
/*!40000 ALTER TABLE `embalagem` DISABLE KEYS */;
INSERT INTO `embalagem` VALUES (1,'Ripados','Volumes Inteiros + Parciais','[{\"id_regra\": \"4cce8488-bd5f-436b-8088-518d9f9f4e3a\", \"prioridade\": 0, \"formula_peso\": [{\"tipo\": \"variavel\", \"valor\": \"QTD_RESTANTE\"}, {\"tipo\": \"operador\", \"valor\": \"*\"}, {\"tipo\": \"variavel\", \"valor\": \"PESO_PROPORCIONAL\"}, {\"tipo\": \"operador\", \"valor\": \"/\"}, {\"tipo\": \"variavel\", \"valor\": \"QTD_POR_EMBALAGEM\"}], \"valor_gatilho\": null, \"formula_altura\": [{\"tipo\": \"variavel\", \"valor\": \"QTD_RESTANTE\"}, {\"tipo\": \"operador\", \"valor\": \"*\"}, {\"tipo\": \"variavel\", \"valor\": \"ALTURA_BASE\"}, {\"tipo\": \"operador\", \"valor\": \"/\"}, {\"tipo\": \"variavel\", \"valor\": \"QTD_POR_EMBALAGEM\"}], \"formula_largura\": [{\"tipo\": \"variavel\", \"valor\": \"LARGURA_BASE\"}], \"condicao_gatilho\": \"SEMPRE\", \"formula_comprimento\": [{\"tipo\": \"variavel\", \"valor\": \"COMPRIMENTO_BASE\"}]}]','2025-07-22 13:03:18','2025-07-22 13:03:18');
/*!40000 ALTER TABLE `embalagem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estoque`
--

DROP TABLE IF EXISTS `estoque`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estoque` (
  `id_produto` int NOT NULL,
  `lote` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `deposito` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rua` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero` int NOT NULL,
  `nivel` int NOT NULL,
  `cor` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `situacao_estoque` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantidade` decimal(10,2) NOT NULL,
  `data_ultima_modificacao` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_produto`,`lote`,`deposito`,`rua`,`numero`,`nivel`,`cor`,`situacao_estoque`),
  CONSTRAINT `estoque_ibfk_1` FOREIGN KEY (`id_produto`) REFERENCES `produtos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estoque`
--

LOCK TABLES `estoque` WRITE;
/*!40000 ALTER TABLE `estoque` DISABLE KEYS */;
INSERT INTO `estoque` VALUES (204,'CO223','Talatto Painéis','C',2533,2,'Verde','Disponível',14.00,'2025-07-23 09:42:07'),(204,'CO223','Talatto Painéis','C',2533,2,'Verde','Reservado',1.00,'2025-07-23 09:42:07'),(204,'CO225','Talatto Painéis','A',3103,1,'Azul','Disponível',8.00,'2025-07-23 10:24:40'),(204,'CO225','Talatto Painéis','A',3103,1,'Azul','Reservado',2.00,'2025-07-23 10:24:40');
/*!40000 ALTER TABLE `estoque` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `info_empresa`
--

DROP TABLE IF EXISTS `info_empresa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `info_empresa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cnpj` varchar(14) DEFAULT NULL,
  `razao_social` varchar(255) DEFAULT NULL,
  `nome_fantasia` varchar(255) DEFAULT NULL,
  `ie` varchar(20) DEFAULT NULL,
  `im` varchar(20) DEFAULT NULL,
  `logradouro` varchar(255) DEFAULT NULL,
  `numero` varchar(20) DEFAULT NULL,
  `complemento` varchar(255) DEFAULT NULL,
  `bairro` varchar(100) DEFAULT NULL,
  `codigo_municipio_ibge` varchar(10) DEFAULT NULL,
  `cidade` varchar(100) DEFAULT NULL,
  `uf` varchar(2) DEFAULT NULL,
  `cep` varchar(8) DEFAULT NULL,
  `cnae` varchar(10) DEFAULT NULL,
  `crt` int DEFAULT NULL,
  `emissao_em_producao` tinyint(1) DEFAULT '0',
  `pynfe_uf` varchar(2) DEFAULT NULL,
  `resp_tec_cnpj` varchar(14) DEFAULT NULL,
  `resp_tec_contato` varchar(255) DEFAULT NULL,
  `resp_tec_email` varchar(255) DEFAULT NULL,
  `resp_tec_fone` varchar(20) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `info_empresa`
--

LOCK TABLES `info_empresa` WRITE;
/*!40000 ALTER TABLE `info_empresa` DISABLE KEYS */;
INSERT INTO `info_empresa` VALUES (1,'29987353000109','TALATTO INDUSTRIA E COMERCIO LTDA','TALATTO INDUSTRIA E COMERCIO LTDA','9088814603','986272','R ALBERTO DALCANALE','3103','AO LADO DA TWR TRANSPORTADORA','JARDIM ANAPOLIS','4127700','TOLEDO','PR','85905415','2229399',1,0,'PR','12345678000199','Seu Nome ou Empresa de Software','seu_email@desenvolvedor.com','11999999999','2025-07-18 12:56:47','2025-07-18 12:56:47');
/*!40000 ALTER TABLE `info_empresa` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=179 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opcoes`
--

LOCK TABLES `opcoes` WRITE;
/*!40000 ALTER TABLE `opcoes` DISABLE KEYS */;
INSERT INTO `opcoes` VALUES (19,'tipo_pessoa','Pessoa Física'),(20,'tipo_pessoa','Pessoa Jurídica'),(22,'tipo_cadastro','Transportadora'),(23,'tipo_cadastro','Cliente'),(25,'situacao','Ativo'),(26,'situacao','Inativo'),(27,'tipo_produto','Matéria Prima'),(28,'tipo_produto','Mercadoria de Revenda'),(29,'tipo_produto','Produto Acabado'),(30,'tipo_produto','Produto Semi Acabado'),(31,'grupo','Ripado'),(32,'grupo','Brises'),(33,'grupo','Cabeceiras'),(34,'subgrupo1','Versátil'),(35,'subgrupo1','Mdf'),(36,'subgrupo1','Compacto'),(40,'variacoes','Amêndoa'),(41,'variacoes','Areia'),(42,'variacoes','Branco'),(43,'variacoes','Carvalho'),(44,'variacoes','Cru'),(45,'variacoes','Freijo'),(46,'variacoes','Gianduia'),(47,'variacoes','Imbuia'),(48,'variacoes','Marmorizado'),(49,'variacoes','Peroba'),(50,'variacoes','Preto'),(51,'quantidades','1'),(52,'quantidades','2'),(53,'quantidades','3'),(54,'quantidades','4'),(55,'quantidades','5'),(56,'quantidades','6'),(57,'quantidades','7'),(58,'quantidades','8'),(60,'subgrupo2','Horizontal'),(66,'tipo_cadastro','Fornecedor'),(67,'tipos_precos','Mercado Livre'),(68,'tipos_precos','Venda Direta'),(69,'tipos_precos','Revendedor'),(70,'unidade','UN'),(71,'grupo','PDI'),(72,'subgrupo1','Kids'),(73,'subgrupo2','Teatro'),(74,'origem','Nacional'),(75,'origem','Estrangeira'),(76,'localizacao','Talatto Varejo'),(77,'situacao_orcamento','Orçamento'),(78,'situacao_orcamento','Analisar'),(79,'situacao_orcamento','Produzir'),(80,'situacao_orcamento','Concluído'),(81,'origem_venda','Instagram'),(82,'origem_venda','Recorrente'),(83,'origem_venda','Mercado Livre'),(84,'origem_venda','Venda Direta'),(85,'tipo_cadastro','Vendedor'),(86,'grupo','Painél'),(87,'subgrupo2','Vertical'),(88,'subgrupo3','Redondo'),(89,'subgrupo4','110 cm'),(90,'subgrupo4','274 cm'),(91,'subgrupo4','135 cm'),(92,'subgrupo2','Easy'),(93,'subgrupo4','270 cm'),(94,'grupo','Cantoneira'),(95,'subgrupo1','Easy'),(96,'subgrupo2','270 cm'),(97,'tipo_frete','Contratação do Frete por conta do Remente (CIF)'),(98,'tipo_frete','Contratação do Frete por conta do Destinatário (FOB)'),(99,'tipo_frete','Contratação do Frete por conta de Terceiros'),(100,'tipo_frete','Transporte próprio com conta do Remetente'),(101,'tipo_frete','Transporte próprio com conta do Destinatário'),(102,'tipo_frete','Sem Ocorrência de Transporte'),(104,'condicao_pagamento','Parcelamento'),(105,'condicao_pagamento','Boleto'),(106,'condicao_pagamento','Pix'),(107,'condicao_pagamento','Dinheiro'),(108,'situacao_orcamento','SAC'),(109,'situacao_orcamento','Devolução'),(111,'situacao_pedido','Aguardando Aprovação'),(112,'situacao_pedido','Programação'),(113,'situacao_pedido','Reprovado'),(116,'situacao_pedido','Produção'),(117,'situacao_pedido','Embalagem'),(118,'situacao_pedido','Faturamento'),(119,'situacao_pedido','Expedição'),(120,'ruas','A'),(121,'ruas','B'),(122,'ruas','C'),(123,'cores','Azul'),(124,'cores','Vermelho'),(125,'cores','Verde'),(126,'cores','Amarelo'),(127,'indicador_ie','Contribuinte ICMS'),(128,'indicador_ie','Contribuinte Isento de IE'),(129,'indicador_ie','Não Contribuinte'),(134,'tipo_conta_options','A Receber'),(135,'tipo_conta_options','A Pagar'),(136,'situacao_contas','Em Aberto'),(137,'situacao_contas','Baixada'),(138,'condicao_pagamento_options','Parcelamento'),(139,'condicao_pagamento_options','Pix'),(140,'condicao_pagamento_options','Boleto'),(141,'condicao_pagamento_options','Dinheiro'),(142,'situacao_contas_options','Em Aberto'),(143,'situacao_contas_options','Baixado'),(144,'plano_contas_options','Investimento'),(145,'caixa_options','Sicoob'),(147,'situacao_contas_options','Atrasado'),(148,'plano_contas_options','Salários Administrativo'),(149,'tipo_embalagem','Embalagem Padrão Ripados'),(150,'situacao_estoque','Disponível'),(152,'deposito','Talatto Painéis'),(155,'rua','A'),(156,'rua','B'),(157,'rua','C'),(158,'cor','Vermelho'),(159,'cor','Azul'),(160,'cor','Verde'),(161,'plano_contas_options','09.01 - Materiais de Fabricação'),(162,'caixa_options','Sicredi'),(163,'situacao_estoque','Livre'),(164,'situacao_estoque','Pré Reserva'),(165,'situacao_estoque','Em Programação'),(166,'situacao_estoque','Em Produção'),(167,'situacao_estoque','Reservado'),(168,'situacao_estoque','Separado'),(169,'situacao_estoque','Encaixotado'),(170,'situacao_estoque','Liberado'),(172,'rua','D'),(173,'tipo_cliente','Nenhuma'),(174,'grupo','Perfil'),(175,'subgrupo1','Madeira Plástica'),(176,'situacao_pedido','Orçamento'),(177,'uf','PR'),(178,'perfil','Admin');
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
  `situacao_pedido` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Em Aberto',
  `data_emissao` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data_validade` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cliente_id` int DEFAULT NULL,
  `cliente_nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vendedor_id` int DEFAULT NULL,
  `vendedor_nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origem_venda` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_frete` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transportadora_id` int DEFAULT NULL,
  `transportadora_nome` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valor_frete` decimal(10,2) DEFAULT '0.00',
  `total` decimal(10,2) DEFAULT '0.00',
  `desconto_total` decimal(10,2) DEFAULT '0.00',
  `total_com_desconto` decimal(10,2) DEFAULT '0.00',
  `lista_itens` longtext COLLATE utf8mb4_unicode_ci,
  `formas_pagamento` longtext COLLATE utf8mb4_unicode_ci,
  `endereco_expedicao` text COLLATE utf8mb4_unicode_ci,
  `observacao` text COLLATE utf8mb4_unicode_ci,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `data_finalizacao` datetime DEFAULT NULL,
  `ordem_finalizacao` decimal(10,2) DEFAULT NULL,
  `hora_expedicao` time DEFAULT NULL,
  `usuario_expedicao` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `natureza_operacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_nf` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serie_nfe` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_nf` date DEFAULT NULL,
  `nfe_chave` varchar(44) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfe_status` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfe_recibo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfe_protocolo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfe_data_autorizacao` datetime DEFAULT NULL,
  `nfe_rejeicao_motivo` text COLLATE utf8mb4_unicode_ci,
  `nfe_xml_path` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nfe_danfe_path` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nfe_chave` (`nfe_chave`),
  KEY `idx_cliente_id` (`cliente_id`),
  KEY `idx_data_emissao` (`data_emissao`),
  KEY `idx_nfe_chave` (`nfe_chave`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orcamentos`
--

LOCK TABLES `orcamentos` WRITE;
/*!40000 ALTER TABLE `orcamentos` DISABLE KEYS */;
INSERT INTO `orcamentos` VALUES (1,'Orçamento','21/07/2025','28/07/2025',106,'Cristian Gabriel Kist',105,'TALATTO VAREJO LTDA','Instagram','Contratação do Frete por conta de Terceiros',107,'RODONAVES TRANSPORTES E ENCOMENDAS LTDA',78.97,335.66,14.63,400.00,'[{\"produto_id\": 204, \"produto\": \"### PERFIL DE INSTALACAO MADEIRA PLASTICA 270X7X3CM\", \"variacao_id\": \"Am\\u00eandoa\", \"variacao\": \"Am\\u00eandoa\", \"quantidade_itens\": 1, \"tabela_preco_id\": \"Revendedor\", \"tabela_preco\": \"Revendedor\", \"subtotal\": 335.66}]','[{\"tipo\": \"Boleto\", \"valor_pix\": 0.0, \"valor_boleto\": 200.0, \"valor_dinheiro\": 0.0, \"parcelas\": 1, \"valor_parcela\": 0.0}, {\"tipo\": \"Parcelamento\", \"valor_pix\": 0.0, \"valor_boleto\": 0.0, \"valor_dinheiro\": 0.0, \"parcelas\": 2, \"valor_parcela\": 100.0}]',NULL,'','2025-07-21 08:50:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
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
  `total` decimal(10,2) unsigned zerofill NOT NULL DEFAULT '00000000.00',
  `desconto_total` decimal(10,2) DEFAULT NULL,
  `total_com_desconto` decimal(10,2) NOT NULL,
  `lista_itens` json DEFAULT NULL,
  `formas_pagamento` json DEFAULT NULL,
  `observacao` text,
  `programacao` json DEFAULT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `data_finalizacao` varchar(50) DEFAULT NULL,
  `ordem_finalizacao` varchar(50) DEFAULT NULL,
  `endereco_expedicao` varchar(255) DEFAULT NULL,
  `hora_expedicao` varchar(50) DEFAULT NULL,
  `usuario_expedicao` varchar(100) DEFAULT NULL,
  `numero_nf` int DEFAULT NULL COMMENT 'Número da NF-e autorizada',
  `serie_nfe` int DEFAULT NULL COMMENT 'Série da NF-e',
  `data_nf` datetime DEFAULT NULL COMMENT 'Data e hora da autorização da NF-e',
  `nfe_chave` varchar(44) DEFAULT NULL COMMENT 'Chave de acesso da NF-e autorizada',
  `nfe_status` varchar(50) DEFAULT NULL COMMENT 'Status do processo: AGUARDANDO_CONSULTA, AUTORIZADO, etc.',
  `nfe_recibo` varchar(50) DEFAULT NULL COMMENT 'Número do recibo do lote enviado à SEFAZ',
  `nfe_protocolo` varchar(50) DEFAULT NULL COMMENT 'Número do protocolo de autorização da SEFAZ',
  `nfe_data_autorizacao` datetime DEFAULT NULL COMMENT 'Data e hora da autorização',
  `nfe_rejeicao_motivo` text COMMENT 'Motivo completo da rejeição, caso ocorra',
  `nfe_xml_path` varchar(255) DEFAULT NULL COMMENT 'Caminho para o arquivo XML autorizado armazenado',
  `nfe_danfe_path` varchar(255) DEFAULT NULL COMMENT 'Caminho para o arquivo PDF do DANFE armazenado',
  `natureza_operacao` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_nfe_chave` (`nfe_chave`)
) ENGINE=InnoDB AUTO_INCREMENT=1007 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pedidos`
--

LOCK TABLES `pedidos` WRITE;
/*!40000 ALTER TABLE `pedidos` DISABLE KEYS */;
INSERT INTO `pedidos` VALUES (1005,'Embalagem','18/07/2025','25/07/2025',106,'Cristian Gabriel Kist',105,'TALATTO VAREJO LTDA','Instagram','Contratação do Frete por conta de Terceiros',107,'RODONAVES TRANSPORTES E ENCOMENDAS LTDA',79.00,00000000.00,14.66,400.00,'[{\"produto\": \"### PERFIL DE INSTALACAO MADEIRA PLASTICA 270X7X3CM\", \"subtotal\": 335.66, \"variacao\": \"Amêndoa\", \"produto_id\": 204, \"variacao_id\": \"Amêndoa\", \"tabela_preco\": \"Revendedor\", \"tabela_preco_id\": \"Revendedor\", \"quantidade_itens\": 1}]','[{\"tipo\": \"Pix\", \"parcelas\": 1, \"valor_pix\": 200.0, \"valor_boleto\": 0.0, \"valor_parcela\": 0.0, \"valor_dinheiro\": 0.0}, {\"tipo\": \"Parcelamento\", \"parcelas\": 2, \"valor_pix\": 0.0, \"valor_boleto\": 0.0, \"valor_parcela\": 100.0, \"valor_dinheiro\": 0.0}]','','{\"ordens_producao\": [], \"data_programacao\": \"2025-07-23T13:24:40.321Z\", \"retiradas_estoque\": [{\"origem\": {\"cor\": \"Azul\", \"rua\": \"A\", \"lote\": \"CO225\", \"nivel\": \"1\", \"numero\": \"3103\", \"deposito\": \"Talatto Painéis\"}, \"produto_id\": 204, \"quantidade\": 1, \"produto_nome\": \"### PERFIL DE INSTALACAO MADEIRA PLASTICA 270X7X3CM\"}]}','2025-07-18 14:55:17','24/07/2025','1.0',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(1006,'Programação','21/07/2025','28/07/2025',106,'Cristian Gabriel Kist',105,'TALATTO VAREJO LTDA','Instagram','Contratação do Frete por conta de Terceiros',107,'RODONAVES TRANSPORTES E ENCOMENDAS LTDA',78.97,00000000.00,14.63,400.00,'[{\"produto\": \"### PERFIL DE INSTALACAO MADEIRA PLASTICA 270X7X3CM\", \"subtotal\": 335.66, \"variacao\": \"Amêndoa\", \"produto_id\": 204, \"variacao_id\": \"Amêndoa\", \"tabela_preco\": \"Revendedor\", \"tabela_preco_id\": \"Revendedor\", \"quantidade_itens\": 1}]','[{\"tipo\": \"Boleto\", \"parcelas\": 1, \"valor_pix\": 0.0, \"valor_boleto\": 200.0, \"valor_parcela\": 0.0, \"valor_dinheiro\": 0.0}, {\"tipo\": \"Parcelamento\", \"parcelas\": 2, \"valor_pix\": 0.0, \"valor_boleto\": 0.0, \"valor_parcela\": 100.0, \"valor_dinheiro\": 0.0}]','','{\"ordens_producao\": [], \"data_programacao\": \"2025-07-23T13:20:38.738Z\", \"retiradas_estoque\": [{\"origem\": {\"cor\": \"Azul\", \"rua\": \"A\", \"lote\": \"CO225\", \"nivel\": \"1\", \"numero\": \"3103\", \"deposito\": \"Talatto Painéis\"}, \"produto_id\": 204, \"quantidade\": 1, \"produto_nome\": \"### PERFIL DE INSTALACAO MADEIRA PLASTICA 270X7X3CM\"}]}','2025-07-21 11:52:29','24/07/2025','1.0',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
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
  `gtin` varchar(20) DEFAULT NULL,
  `gtin_tributavel` varchar(20) DEFAULT NULL,
  `valor_ipi` varchar(45) DEFAULT NULL,
  `ibpt_aliquota` varchar(45) DEFAULT NULL,
  `tabela_precos` json DEFAULT NULL,
  `id_logica_embalagem` varchar(50) DEFAULT NULL,
  `tipo_embalagem` varchar(50) DEFAULT NULL,
  `peso_embalagem` int DEFAULT NULL,
  `unidade_caixa` int DEFAULT NULL,
  `largura_embalagem` decimal(10,2) DEFAULT NULL,
  `altura_embalagem` decimal(10,2) DEFAULT NULL,
  `comprimento_embalagem` decimal(10,2) DEFAULT NULL,
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
  `permite_estoque_negativo` tinyint DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `id_fornecedor` (`id_fornecedor`)
) ENGINE=InnoDB AUTO_INCREMENT=205 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `produtos`
--

LOCK TABLES `produtos` WRITE;
/*!40000 ALTER TABLE `produtos` DISABLE KEYS */;
INSERT INTO `produtos` VALUES (204,'807','7898735308071','### PERFIL DE INSTALACAO MADEIRA PLASTICA 270X7X3CM','UN','Ativo',300,'Mercadoria de Revenda','[\"Amêndoa\", \"Areia\", \"Branco\", \"Carvalho\", \"Cru\", \"Freijo\", \"Gianduia\", \"Preto\", \"Peroba\", \"Marmorizado\", \"Imbuia\"]','[1]','Perfil','Madeira Plástica',NULL,NULL,NULL,NULL,'[\"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS6wDa9WAfCGiruztnnOCHgwDrIxldd4mPC1Q&s\"]','39259090','Nacional','7898735308071','7898735308071',NULL,NULL,'{\"Revendedor\": 335.66, \"Venda Direta\": 354.67, \"Mercado Livre\": 300.05}','1','Embalagem Padrão Ripados',15000,10,15.00,15.00,272.00,223.56,NULL,1,'',NULL,'','','[]','[]',NULL,NULL,NULL,NULL,'[]',NULL,'2025-07-18 14:02:52',0);
/*!40000 ALTER TABLE `produtos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `regras_tributarias`
--

DROP TABLE IF EXISTS `regras_tributarias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `regras_tributarias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `descricao` varchar(255) NOT NULL,
  `natureza_operacao` varchar(100) NOT NULL,
  `cfop` varchar(4) NOT NULL,
  `ncm` varchar(8) DEFAULT NULL COMMENT 'NCM específico para esta regra (opcional)',
  `tipo_cliente` varchar(1) DEFAULT NULL COMMENT 'F para Física, J para Jurídica (opcional)',
  `uf_origem` varchar(2) NOT NULL,
  `uf_destino` varchar(2) NOT NULL,
  `icms_csosn` varchar(3) DEFAULT NULL,
  `icms_cst` varchar(2) DEFAULT NULL,
  `icms_aliquota` decimal(5,2) DEFAULT '0.00',
  `icms_base_calculo` decimal(5,2) DEFAULT '100.00',
  `pis_cst` varchar(2) DEFAULT NULL,
  `pis_aliquota` decimal(5,2) DEFAULT '0.00',
  `cofins_cst` varchar(2) DEFAULT NULL,
  `cofins_aliquota` decimal(5,2) DEFAULT '0.00',
  `ipi_cst` varchar(2) DEFAULT NULL,
  `ipi_aliquota` decimal(5,2) DEFAULT '0.00',
  `icms_modalidade_st` varchar(2) DEFAULT NULL COMMENT 'Modalidade da BC do ICMS-ST',
  `icms_mva_st` decimal(5,2) DEFAULT NULL COMMENT 'Margem de Valor Adicionado (%) do ICMS-ST',
  `icms_reducao_bc_st` decimal(5,2) DEFAULT NULL COMMENT 'Redução da Base de Cálculo (%) do ICMS-ST',
  `icms_aliquota_st` decimal(5,2) DEFAULT NULL COMMENT 'Alíquota interna do ICMS no estado de destino',
  `icms_fcp_st` decimal(5,2) DEFAULT NULL COMMENT 'Alíquota do Fundo de Combate à Pobreza (%) no ICMS-ST',
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `regras_tributarias`
--

LOCK TABLES `regras_tributarias` WRITE;
/*!40000 ALTER TABLE `regras_tributarias` DISABLE KEYS */;
INSERT INTO `regras_tributarias` VALUES (1,'Venda dentro do PR - Consumidor Final','VENDA','5102',NULL,'F','PR','PR','102',NULL,0.00,100.00,'07',0.00,'07',0.00,'53',0.00,NULL,NULL,NULL,NULL,NULL,1,'2025-07-18 12:56:47','2025-07-18 13:05:51'),(2,'Venda dentro do PR - Revenda','VENDA','5102',NULL,'J','PR','PR','101',NULL,0.00,100.00,'07',0.00,'07',0.00,'53',0.00,NULL,NULL,NULL,NULL,NULL,1,'2025-07-18 12:56:47','2025-07-18 13:05:51'),(3,'Venda para SP - Revenda (ST para Óleo)','VENDA','6403','27101932','J','PR','SP','202',NULL,12.00,100.00,'07',0.00,'07',0.00,'53',0.00,NULL,71.53,NULL,18.00,NULL,1,'2025-07-18 12:56:47','2025-07-18 13:05:51'),(4,'Venda para Fora do Estado - Consumidor Final','VENDA','6108',NULL,'F','PR','**','102',NULL,0.00,100.00,'07',0.00,'07',0.00,'53',0.00,NULL,NULL,NULL,NULL,NULL,1,'2025-07-18 12:56:47','2025-07-18 13:05:51');
/*!40000 ALTER TABLE `regras_tributarias` ENABLE KEYS */;
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
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Cristian Gabriel Kist','cris.talatto@gmail.com','$2b$12$IU0A2RoT7Yy5IaoPxpWM5eUPmp9fS39bTDpJS1XwnBFk/n7Y/wNUS','admin',1,'2025-04-03 10:14:49',NULL),(2,'Visitante','visitante.talatto@gmail.com','$2b$12$.oWrg0LvIQzTQy9OwRzV9.Z99bjPR0q5DQbpYjgEsfU.RrKmWIv4K','visitante',1,'2025-04-08 09:30:41',NULL),(3,'Helder Zibetti','hzibetti@gmail.com','$2b$12$1Pmo/U.Xn2Q7x6GxdslSgO6NX/G0BaQuXXCefhwqOR6qQ1idb2qVC','admin',1,'2025-06-27 17:16:32',NULL),(4,'Teste','teste.talatto@gmail.com','$2b$12$W/lTFlLZifYTADXFtaLPIOGlIjPKi4SnLZwHHX8skqkLopIOsERzi','admin',1,'2025-07-25 09:28:29',NULL);
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

-- Dump completed on 2025-07-25 10:54:50
