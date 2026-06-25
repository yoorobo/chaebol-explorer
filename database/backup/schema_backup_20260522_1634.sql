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
