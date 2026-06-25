-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: chaebol_db
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ai_analysis_cache`
--

DROP TABLE IF EXISTS `ai_analysis_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_analysis_cache` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_company_id` bigint NOT NULL,
  `data_year` smallint NOT NULL,
  `model_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'amazon.nova-lite-v1:0',
  `input_tokens` int DEFAULT NULL,
  `output_tokens` int DEFAULT NULL,
  `wedge_analysis` text COLLATE utf8mb4_unicode_ci,
  `minority_risk` text COLLATE utf8mb4_unicode_ci,
  `regulations` text COLLATE utf8mb4_unicode_ci,
  `raw_response` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ai_cache` (`target_company_id`,`data_year`,`model_id`),
  KEY `idx_group` (`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_analysis_cache`
--

LOCK TABLES `ai_analysis_cache` WRITE;
/*!40000 ALTER TABLE `ai_analysis_cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_analysis_cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `api_sync_logs`
--

DROP TABLE IF EXISTS `api_sync_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_sync_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `api_source` enum('dart','kftc','manual') COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `group_id` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_params` text COLLATE utf8mb4_unicode_ci,
  `status` enum('success','fail','partial') COLLATE utf8mb4_unicode_ci NOT NULL,
  `records_inserted` int DEFAULT '0',
  `records_updated` int DEFAULT '0',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `response_code` smallint DEFAULT NULL,
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_source` (`api_source`),
  KEY `idx_group` (`group_id`),
  KEY `idx_started` (`started_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_sync_logs`
--

LOCK TABLES `api_sync_logs` WRITE;
/*!40000 ALTER TABLE `api_sync_logs` DISABLE KEYS */;
INSERT INTO `api_sync_logs` VALUES (1,'dart','majorstock + company',NULL,'{\"bsns_year\":\"2025\"}','success',0,0,NULL,NULL,'2026-05-22 15:46:21','2026-05-22 15:46:45'),(2,'dart','majorstock + company',NULL,'{\"bsns_year\":\"2025\"}','success',0,0,NULL,NULL,'2026-05-22 16:04:14','2026-05-22 16:04:26');
/*!40000 ALTER TABLE `api_sync_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chaebol_groups`
--

DROP TABLE IF EXISTS `chaebol_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chaebol_groups` (
  `id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kftc_group_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_ko` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `designation_year` smallint DEFAULT NULL,
  `data_year` smallint NOT NULL,
  `data_source` enum('mock','dart','kftc','manual') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mock',
  `synced_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chaebol_groups`
--

LOCK TABLES `chaebol_groups` WRITE;
/*!40000 ALTER TABLE `chaebol_groups` DISABLE KEYS */;
INSERT INTO `chaebol_groups` VALUES ('cj',NULL,'CJ그룹','CJ Group','이재현',NULL,2023,'mock',NULL,'2026-05-22 16:10:51','2026-05-22 16:10:51'),('doosan',NULL,'두산그룹','Doosan Group','박정원',NULL,2023,'mock',NULL,'2026-05-22 16:10:51','2026-05-22 16:10:51'),('gs',NULL,'GS그룹','GS Group','허태수',NULL,2023,'mock',NULL,'2026-05-22 16:10:51','2026-05-22 16:10:51'),('hanjin',NULL,'한진그룹','Hanjin Group','조원태',NULL,2023,'mock',NULL,'2026-05-22 16:10:51','2026-05-22 16:10:51'),('hanwha',NULL,'한화그룹','Hanwha Group','김승연',NULL,2023,'mock',NULL,'2026-05-22 16:07:53','2026-05-22 16:07:53'),('hd_hyundai',NULL,'HD현대그룹','HD Hyundai Group','정기선',NULL,2023,'mock',NULL,'2026-05-22 16:10:51','2026-05-22 16:10:51'),('hyosung',NULL,'효성그룹','Hyosung Group','조현준',NULL,2023,'mock',NULL,'2026-05-22 16:10:51','2026-05-22 16:10:51'),('hyundai',NULL,'현대자동차그룹','Hyundai Motor Group','정의선',NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),('kakao',NULL,'카카오그룹','Kakao Group','김범수',NULL,2023,'mock',NULL,'2026-05-22 16:10:51','2026-05-22 16:10:51'),('kolon',NULL,'코오롱그룹','Kolon Group','이웅열',NULL,2023,'mock',NULL,'2026-05-22 16:10:51','2026-05-22 16:10:51'),('kt',NULL,'KT그룹','KT Group','김영섭',NULL,2023,'mock',NULL,'2026-05-22 16:10:51','2026-05-22 16:10:51'),('lg',NULL,'LG그룹','LG Group','구광모',NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),('lotte',NULL,'롯데그룹','Lotte Group','신동빈',NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),('ls',NULL,'LS그룹','LS Group','구자은',NULL,2023,'mock',NULL,'2026-05-22 16:10:51','2026-05-22 16:10:51'),('naver',NULL,'네이버그룹','Naver Group','이해진',NULL,2023,'mock',NULL,'2026-05-22 16:10:51','2026-05-22 16:10:51'),('posco',NULL,'POSCO그룹','POSCO Group','장인화',NULL,2023,'mock',NULL,'2026-05-22 16:07:53','2026-05-22 16:07:53'),('samsung',NULL,'삼성그룹','Samsung Group','이재용',NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),('shinsegae',NULL,'신세계그룹','Shinsegae Group','이명희',NULL,2023,'mock',NULL,'2026-05-22 16:10:51','2026-05-22 16:10:51'),('sk',NULL,'SK그룹','SK Group','최태원',NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22');
/*!40000 ALTER TABLE `chaebol_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dart_corp_code` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `corp_reg_no` varchar(13) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `biz_reg_no` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name_ko` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name_en` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `node_type` enum('individual','holding_like','financial','affiliate','cash_cow','foundation') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_listed` tinyint(1) NOT NULL DEFAULT '0',
  `stock_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stock_market` enum('KOSPI','KOSDAQ','KONEX') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_assets` bigint DEFAULT NULL,
  `fiscal_year` smallint DEFAULT NULL,
  `industry_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description_ko` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `data_source` enum('mock','dart','kftc','manual') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mock',
  `synced_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dart_corp_code` (`dart_corp_code`),
  KEY `idx_group` (`group_id`),
  KEY `idx_dart_code` (`dart_corp_code`),
  KEY `idx_stock_code` (`stock_code`),
  CONSTRAINT `fk_company_group` FOREIGN KEY (`group_id`) REFERENCES `chaebol_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=96 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES (1,'samsung',NULL,NULL,NULL,'이재용 일가',NULL,'individual',0,NULL,NULL,0,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(2,'samsung',NULL,NULL,NULL,'제일모직',NULL,'holding_like',1,'028260',NULL,5000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(3,'samsung',NULL,NULL,NULL,'삼성생명',NULL,'financial',1,'032830',NULL,200000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(4,'samsung',NULL,NULL,NULL,'삼성물산',NULL,'affiliate',1,'028260',NULL,8000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(5,'samsung',NULL,NULL,NULL,'삼성전자',NULL,'cash_cow',1,'005930',NULL,300000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(6,'samsung',NULL,NULL,NULL,'삼성화재',NULL,'financial',1,'000810',NULL,20000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(7,'samsung',NULL,NULL,NULL,'삼성SDI',NULL,'affiliate',1,'006400',NULL,15000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(8,'samsung',NULL,NULL,NULL,'삼성복지재단',NULL,'foundation',0,NULL,NULL,0,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(9,'hyundai',NULL,NULL,NULL,'정의선 일가',NULL,'individual',0,NULL,NULL,0,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(10,'hyundai',NULL,NULL,NULL,'현대자동차',NULL,'cash_cow',1,'005380',NULL,200000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(11,'hyundai',NULL,NULL,NULL,'기아',NULL,'cash_cow',1,'000270',NULL,50000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(12,'hyundai',NULL,NULL,NULL,'현대모비스',NULL,'holding_like',1,'012330',NULL,40000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(13,'hyundai',NULL,NULL,NULL,'현대글로비스',NULL,'affiliate',1,'086280',NULL,5000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(14,'hyundai',NULL,NULL,NULL,'현대위아',NULL,'affiliate',1,'011210',NULL,3000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(15,'hyundai',NULL,NULL,NULL,'현대제철',NULL,'affiliate',1,'004020',NULL,12000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(16,'hyundai',NULL,NULL,NULL,'현대건설',NULL,'affiliate',1,'000720',NULL,8000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(17,'lg',NULL,NULL,NULL,'구광모 일가',NULL,'individual',0,NULL,NULL,0,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(18,'lg',NULL,NULL,NULL,'(주)LG',NULL,'holding_like',1,'003550',NULL,12000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(19,'lg',NULL,NULL,NULL,'LG전자',NULL,'cash_cow',1,'066570',NULL,35000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(20,'lg',NULL,NULL,NULL,'LG화학',NULL,'cash_cow',1,'051910',NULL,40000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(21,'lg',NULL,NULL,NULL,'LG유플러스',NULL,'affiliate',1,'032640',NULL,10000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(22,'lg',NULL,NULL,NULL,'LG에너지솔루션',NULL,'cash_cow',1,'373220',NULL,60000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(23,'lg',NULL,NULL,NULL,'LG디스플레이',NULL,'affiliate',1,'034220',NULL,15000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(24,'lg',NULL,NULL,NULL,'LG복지재단',NULL,'foundation',0,NULL,NULL,0,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(25,'sk',NULL,NULL,NULL,'최태원 일가',NULL,'individual',0,NULL,NULL,0,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(26,'sk',NULL,NULL,NULL,'SK(주)',NULL,'holding_like',1,'034730',NULL,20000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(27,'sk',NULL,NULL,NULL,'SK하이닉스',NULL,'cash_cow',1,'000660',NULL,80000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(28,'sk',NULL,NULL,NULL,'SK이노베이션',NULL,'cash_cow',1,'096770',NULL,25000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(29,'sk',NULL,NULL,NULL,'SK텔레콤',NULL,'affiliate',1,'017670',NULL,20000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(30,'sk',NULL,NULL,NULL,'SK네트웍스',NULL,'affiliate',1,'001740',NULL,4000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(31,'sk',NULL,NULL,NULL,'SK온',NULL,'affiliate',0,NULL,NULL,10000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(32,'sk',NULL,NULL,NULL,'SK스퀘어',NULL,'holding_like',1,'402340',NULL,8000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(33,'lotte',NULL,NULL,NULL,'신동빈 일가',NULL,'individual',0,NULL,NULL,0,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(34,'lotte',NULL,NULL,NULL,'롯데지주',NULL,'holding_like',1,'004990',NULL,8000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(35,'lotte',NULL,NULL,NULL,'롯데쇼핑',NULL,'cash_cow',1,'023530',NULL,15000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(36,'lotte',NULL,NULL,NULL,'롯데케미칼',NULL,'cash_cow',1,'011170',NULL,12000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(37,'lotte',NULL,NULL,NULL,'롯데웰푸드',NULL,'affiliate',1,'280360',NULL,3000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(38,'lotte',NULL,NULL,NULL,'롯데호텔',NULL,'affiliate',0,NULL,NULL,5000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(39,'lotte',NULL,NULL,NULL,'롯데건설',NULL,'affiliate',0,NULL,NULL,4000000000000,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(40,'lotte',NULL,NULL,NULL,'롯데장학재단',NULL,'foundation',0,NULL,NULL,0,NULL,NULL,NULL,NULL,1,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(41,'samsung','00126380','1301110006246',NULL,'삼성전자(주)','SAMSUNG ELECTRONICS CO,.LTD','affiliate',1,'005930','KOSPI',NULL,NULL,'264',NULL,'대표자: 전영현, 노태문 | 결산: 12월',1,'dart','2026-05-22 16:04:13','2026-05-22 15:33:44','2026-05-22 16:04:13'),(42,'samsung','00149655','1101110015762',NULL,'삼성물산(주)','SAMSUNG C&T CORPORATION','affiliate',1,'028260','KOSPI',NULL,NULL,'467',NULL,'대표자: 오세철, 이재언, 송규종 | 결산: 12월',1,'dart','2026-05-22 16:04:14','2026-05-22 15:33:45','2026-05-22 16:04:14'),(43,'hyundai','00164779','1344110001387',NULL,'에스케이하이닉스(주)','SK hynix Inc.','affiliate',1,'000660','KOSPI',NULL,NULL,'2612',NULL,'대표자: 곽노정 | 결산: 12월',1,'dart','2026-05-22 16:04:23','2026-05-22 15:33:46','2026-05-22 16:04:23'),(45,'samsung','00126256','1101110005953',NULL,'삼성생명보험(주)','Samsung Life Insurance co., Ltd','affiliate',1,'032830','KOSPI',NULL,NULL,'65110',NULL,'대표자: 홍원학 | 결산: 12월',1,'dart','2026-05-22 16:04:14','2026-05-22 15:46:23','2026-05-22 16:04:14'),(47,'samsung','00139214','1101110005078',NULL,'삼성화재해상보험(주)','SAMSUNG FIRE & MARINE INSURANCE CO.,LTD','affiliate',1,'000810','KOSPI',NULL,NULL,'65121',NULL,'대표자: 이문화 | 결산: 12월',1,'dart','2026-05-22 16:04:15','2026-05-22 15:46:25','2026-05-22 16:04:15'),(48,'samsung','00126362','1101110394174',NULL,'삼성SDI(주)','SAMSUNG SDI CO.,LTD','affiliate',1,'006400','KOSPI',NULL,NULL,'28202',NULL,'대표자: 최주선 | 결산: 12월',1,'dart','2026-05-22 16:04:15','2026-05-22 15:46:27','2026-05-22 16:04:15'),(49,'hyundai','00164742','1101110085450',NULL,'현대자동차(주)','HYUNDAI MOTOR CO','affiliate',1,'005380','KOSPI',NULL,NULL,'30121',NULL,'대표자: 정의선, 무뇨스 바르셀로 호세 안토니오, 최영일(각자 대표이사) | 결산: 12월',1,'dart','2026-05-22 16:04:16','2026-05-22 15:46:28','2026-05-22 16:04:16'),(50,'hyundai','00106641','1101110037998',NULL,'기아(주)','KIA CORPORATION','affiliate',1,'000270','KOSPI',NULL,NULL,'30121',NULL,'대표자: 송호성 | 결산: 12월',1,'dart','2026-05-22 16:04:16','2026-05-22 15:46:29','2026-05-22 16:04:16'),(51,'hyundai','00164788','1101110215536',NULL,'현대모비스(주)','HYUNDAI MOBIS CO.,LTD','affiliate',1,'012330','KOSPI',NULL,NULL,'303',NULL,'대표자: 정의선, 이규석 | 결산: 12월',1,'dart','2026-05-22 16:04:17','2026-05-22 15:46:30','2026-05-22 16:04:17'),(52,'hyundai','00360595','1101112177388',NULL,'현대글로비스(주)','HYUNDAI GLOVIS Co., LTD.','affiliate',1,'086280','KOSPI',NULL,NULL,'5299',NULL,'대표자: 이규복 | 결산: 12월',1,'dart','2026-05-22 16:04:17','2026-05-22 15:46:31','2026-05-22 16:04:17'),(53,'hyundai','00145880','1201110001743',NULL,'현대제철(주)','HYUNDAI STEEL COMPANY','affiliate',1,'004020','KOSPI',NULL,NULL,'2411',NULL,'대표자: 이보룡 | 결산: 12월',1,'dart','2026-05-22 16:04:18','2026-05-22 15:46:32','2026-05-22 16:04:18'),(54,'hyundai','00164478','1101110007909',NULL,'현대건설(주)','HYUNDAI ENGINEERING & CONSTRUCTION CO.,LTD','affiliate',1,'000720','KOSPI',NULL,NULL,'41221',NULL,'대표자: 이한우 | 결산: 12월',1,'dart','2026-05-22 16:04:18','2026-05-22 15:46:33','2026-05-22 16:04:18'),(55,'hyundai','00106623','1942110000125',NULL,'현대위아(주)','HYUNDAI WIA','affiliate',1,'011210','KOSPI',NULL,NULL,'303',NULL,'대표자: 권오성 | 결산: 12월',1,'dart','2026-05-22 16:04:19','2026-05-22 15:46:34','2026-05-22 16:04:19'),(56,'lg','00120021','1101110003543',NULL,'(주)LG','LG Corp.','affiliate',1,'003550','KOSPI',NULL,NULL,'64992',NULL,'대표자: 구광모, 권봉석 | 결산: 12월',1,'dart','2026-05-22 16:04:19','2026-05-22 15:46:34','2026-05-22 16:04:19'),(57,'lg','00401731','1101112487050',NULL,'LG전자(주)','LG ELECTRONICS INC.','affiliate',1,'066570','KOSPI',NULL,NULL,'264',NULL,'대표자: 류재철 | 결산: 12월',1,'dart','2026-05-22 16:04:20','2026-05-22 15:46:35','2026-05-22 16:04:20'),(58,'lg','00356361','1101112207995',NULL,'(주)LG화학','LG CHEM LTD','affiliate',1,'051910','KOSPI',NULL,NULL,'20111',NULL,'대표자: 김동춘 | 결산: 12월',1,'dart','2026-05-22 16:04:20','2026-05-22 15:46:36','2026-05-22 16:04:20'),(59,'lg','00231363','1101111296676',NULL,'(주)LG유플러스','LG Uplus Corp','affiliate',1,'032640','KOSPI',NULL,NULL,'61220',NULL,'대표자: 홍범식 | 결산: 12월',1,'dart','2026-05-22 16:04:21','2026-05-22 15:46:37','2026-05-22 16:04:21'),(60,'lg','01515323','1101117701356',NULL,'(주)엘지에너지솔루션','LG ENERGY SOLUTION, LTD.','affiliate',1,'373220','KOSPI',NULL,NULL,'28202',NULL,'대표자: 김동명 | 결산: 12월',1,'dart','2026-05-22 16:04:21','2026-05-22 15:46:38','2026-05-22 16:04:21'),(61,'lg','00105873','1101110393134',NULL,'엘지디스플레이(주)','LG Display Co., Ltd.','affiliate',1,'034220','KOSPI',NULL,NULL,'2621',NULL,'대표자: 정철동 | 결산: 12월',1,'dart','2026-05-22 16:04:22','2026-05-22 15:46:38','2026-05-22 16:04:22'),(62,'sk','00181712','1101110769583',NULL,'SK(주)','SK Inc.','affiliate',1,'034730','KOSPI',NULL,NULL,'64992',NULL,'대표자: 최태원, 장용호 | 결산: 12월',1,'dart','2026-05-22 16:04:22','2026-05-22 15:46:39','2026-05-22 16:04:22'),(64,'sk','00631518','1101113710385',NULL,'SK이노베이션(주)','SK Innovation Co., Ltd.','affiliate',1,'096770','KOSPI',NULL,NULL,'192',NULL,'대표자: 추형욱, 장용호 | 결산: 12월',1,'dart','2026-05-22 16:04:23','2026-05-22 15:46:41','2026-05-22 16:04:23'),(65,'sk','00159023','1101110371346',NULL,'SK텔레콤(주)','SK TELECOM CO.,LTD','affiliate',1,'017670','KOSPI',NULL,NULL,'61220',NULL,'대표자: 정재헌 | 결산: 12월',1,'dart','2026-05-22 16:04:24','2026-05-22 15:46:42','2026-05-22 16:04:24'),(66,'sk','01596425','1101118077821',NULL,'에스케이스퀘어 주식회사','SK Square Co., Ltd.','affiliate',1,'402340','KOSPI',NULL,NULL,'64992',NULL,'대표자: 김정규 | 결산: 12월',1,'dart','2026-05-22 16:04:24','2026-05-22 15:46:42','2026-05-22 16:04:24'),(67,'lotte','00120562','1101110076300',NULL,'롯데지주(주)','Lotte Corporation','affiliate',1,'004990','KOSPI',NULL,NULL,'64992',NULL,'대표자: 신동빈, 고정욱, 노준형 | 결산: 12월',1,'dart','2026-05-22 16:04:24','2026-05-22 15:46:43','2026-05-22 16:04:24'),(68,'lotte','00120526','1101110000086',NULL,'롯데쇼핑(주)','LOTTE SHOPPING CO.,LTD.','affiliate',1,'023530','KOSPI',NULL,NULL,'47111',NULL,'대표자: 신동빈, 정현석, 차우철, 임재철 | 결산: 12월',1,'dart','2026-05-22 16:04:25','2026-05-22 15:46:44','2026-05-22 16:04:25'),(69,'lotte','00165413','1101110193196',NULL,'롯데케미칼(주)','LOTTE CHEMICAL CORPORATION','affiliate',1,'011170','KOSPI',NULL,NULL,'20111',NULL,'대표자: 신동빈, 이영준, 주우현 | 결산: 12월',1,'dart','2026-05-22 16:04:25','2026-05-22 15:46:44','2026-05-22 16:04:25');
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dart_raw_staging`
--

DROP TABLE IF EXISTS `dart_raw_staging`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dart_raw_staging` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `dart_corp_code` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `receipt_no` varchar(14) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `report_date` date DEFAULT NULL,
  `section_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `raw_xml` longtext COLLATE utf8mb4_unicode_ci,
  `raw_json` longtext COLLATE utf8mb4_unicode_ci,
  `is_processed` tinyint(1) NOT NULL DEFAULT '0',
  `processed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_corp_code` (`dart_corp_code`),
  KEY `idx_processed` (`is_processed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dart_raw_staging`
--

LOCK TABLES `dart_raw_staging` WRITE;
/*!40000 ALTER TABLE `dart_raw_staging` DISABLE KEYS */;
/*!40000 ALTER TABLE `dart_raw_staging` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shareholdings`
--

DROP TABLE IF EXISTS `shareholdings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shareholdings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_company_id` bigint NOT NULL,
  `target_company_id` bigint NOT NULL,
  `ownership_pct` decimal(8,4) NOT NULL,
  `voting_pct` decimal(8,4) DEFAULT NULL,
  `shares_held` bigint DEFAULT NULL,
  `edge_type` enum('direct_ownership','subsidiary_ownership','circular_loop','foundation_ownership','control') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_circular` tinyint(1) NOT NULL DEFAULT '0',
  `report_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `report_date` date DEFAULT NULL,
  `data_year` smallint NOT NULL,
  `data_source` enum('mock','dart','kftc','manual') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'mock',
  `synced_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shareholding` (`source_company_id`,`target_company_id`,`data_year`),
  KEY `idx_group` (`group_id`),
  KEY `idx_target` (`target_company_id`),
  KEY `idx_circular` (`is_circular`),
  CONSTRAINT `fk_sh_group` FOREIGN KEY (`group_id`) REFERENCES `chaebol_groups` (`id`),
  CONSTRAINT `fk_sh_source` FOREIGN KEY (`source_company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_sh_target` FOREIGN KEY (`target_company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shareholdings`
--

LOCK TABLES `shareholdings` WRITE;
/*!40000 ALTER TABLE `shareholdings` DISABLE KEYS */;
INSERT INTO `shareholdings` VALUES (1,'samsung',1,2,42.1700,NULL,NULL,'direct_ownership',0,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(2,'samsung',1,5,4.7400,NULL,NULL,'direct_ownership',0,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(3,'samsung',1,8,100.0000,NULL,NULL,'control',0,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(4,'samsung',2,3,19.3000,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(5,'samsung',2,4,5.0000,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(6,'samsung',2,6,15.2000,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(7,'samsung',3,5,7.2100,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(8,'samsung',4,5,4.0600,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(9,'samsung',6,5,1.2600,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(10,'samsung',5,2,1.2000,NULL,NULL,'circular_loop',1,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(11,'samsung',5,7,20.4000,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(12,'samsung',7,2,0.8000,NULL,NULL,'circular_loop',1,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(13,'samsung',8,5,0.4500,NULL,NULL,'foundation_ownership',0,NULL,NULL,2015,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(16,'hyundai',9,13,23.2900,NULL,NULL,'direct_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(17,'hyundai',9,12,0.3200,NULL,NULL,'direct_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(18,'hyundai',12,10,21.4300,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(19,'hyundai',12,11,16.9600,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(20,'hyundai',10,11,33.8800,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(21,'hyundai',10,12,19.7300,NULL,NULL,'circular_loop',1,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(22,'hyundai',11,12,16.8800,NULL,NULL,'circular_loop',1,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(23,'hyundai',10,15,33.9800,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(24,'hyundai',10,14,38.6500,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(25,'hyundai',10,16,31.4700,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(26,'hyundai',13,12,0.6700,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(31,'lg',17,18,15.9500,NULL,NULL,'direct_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(32,'lg',17,24,100.0000,NULL,NULL,'control',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(33,'lg',18,19,33.6700,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(34,'lg',18,20,33.4900,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(35,'lg',18,21,36.0500,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(36,'lg',18,23,37.9100,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(37,'lg',20,22,80.0200,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(38,'lg',24,18,2.7800,NULL,NULL,'foundation_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(46,'sk',25,26,18.4500,NULL,NULL,'direct_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(47,'sk',26,32,40.0600,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(48,'sk',26,28,36.2200,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(49,'sk',26,30,39.1300,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(50,'sk',32,27,20.0700,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(51,'sk',32,29,30.0100,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(52,'sk',28,31,100.0000,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(53,'sk',29,32,8.3400,NULL,NULL,'circular_loop',1,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(61,'lotte',33,34,10.4700,NULL,NULL,'direct_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(62,'lotte',33,40,100.0000,NULL,NULL,'control',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(63,'lotte',34,35,43.3200,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(64,'lotte',34,36,53.5500,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(65,'lotte',34,37,50.3100,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(66,'lotte',34,38,82.7600,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(67,'lotte',34,39,76.4000,NULL,NULL,'subsidiary_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(68,'lotte',35,34,3.2500,NULL,NULL,'circular_loop',1,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22'),(69,'lotte',40,34,1.8200,NULL,NULL,'foundation_ownership',0,NULL,NULL,2023,'mock',NULL,'2026-05-22 15:05:22','2026-05-22 15:05:22');
/*!40000 ALTER TABLE `shareholdings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_circular_loops`
--

DROP TABLE IF EXISTS `v_circular_loops`;
/*!50001 DROP VIEW IF EXISTS `v_circular_loops`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_circular_loops` AS SELECT 
 1 AS `group_name`,
 1 AS `source_company`,
 1 AS `target_company`,
 1 AS `ownership_pct`,
 1 AS `data_year`,
 1 AS `data_source`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_group_wedge_summary`
--

DROP TABLE IF EXISTS `v_group_wedge_summary`;
/*!50001 DROP VIEW IF EXISTS `v_group_wedge_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_group_wedge_summary` AS SELECT 
 1 AS `group_id`,
 1 AS `group_name`,
 1 AS `owner_name`,
 1 AS `data_year`,
 1 AS `target_company`,
 1 AS `stock_code`,
 1 AS `direct_ownership_pct`,
 1 AS `total_voting_pct`,
 1 AS `wedge_multiplier`,
 1 AS `calculated_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `wedge_cache`
--

DROP TABLE IF EXISTS `wedge_cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wedge_cache` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_company_id` bigint NOT NULL,
  `data_year` smallint NOT NULL,
  `direct_ownership_pct` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `total_voting_pct` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `indirect_ownership_pct` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `wedge_multiplier` decimal(8,2) DEFAULT NULL,
  `calc_detail_json` longtext COLLATE utf8mb4_unicode_ci,
  `calculated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wedge` (`target_company_id`,`data_year`),
  KEY `idx_group` (`group_id`),
  CONSTRAINT `fk_wedge_target` FOREIGN KEY (`target_company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wedge_cache`
--

LOCK TABLES `wedge_cache` WRITE;
/*!40000 ALTER TABLE `wedge_cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `wedge_cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `v_circular_loops`
--

/*!50001 DROP VIEW IF EXISTS `v_circular_loops`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_circular_loops` AS select `g`.`name_ko` AS `group_name`,`src`.`name_ko` AS `source_company`,`tgt`.`name_ko` AS `target_company`,`s`.`ownership_pct` AS `ownership_pct`,`s`.`data_year` AS `data_year`,`s`.`data_source` AS `data_source` from (((`shareholdings` `s` join `companies` `src` on((`src`.`id` = `s`.`source_company_id`))) join `companies` `tgt` on((`tgt`.`id` = `s`.`target_company_id`))) join `chaebol_groups` `g` on((`g`.`id` = `s`.`group_id`))) where (`s`.`is_circular` = 1) order by `g`.`name_ko`,`s`.`ownership_pct` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_group_wedge_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_group_wedge_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_group_wedge_summary` AS select `g`.`id` AS `group_id`,`g`.`name_ko` AS `group_name`,`g`.`owner_name` AS `owner_name`,`g`.`data_year` AS `data_year`,`c`.`name_ko` AS `target_company`,`c`.`stock_code` AS `stock_code`,`w`.`direct_ownership_pct` AS `direct_ownership_pct`,`w`.`total_voting_pct` AS `total_voting_pct`,`w`.`wedge_multiplier` AS `wedge_multiplier`,`w`.`calculated_at` AS `calculated_at` from ((`wedge_cache` `w` join `companies` `c` on((`c`.`id` = `w`.`target_company_id`))) join `chaebol_groups` `g` on((`g`.`id` = `w`.`group_id`))) order by `g`.`id`,`w`.`wedge_multiplier` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-22 16:34:02
