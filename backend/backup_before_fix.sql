-- MySQL dump 10.13  Distrib 8.4.11, for Win64 (x86_64)
--
-- Host: localhost    Database: ecom_db
-- ------------------------------------------------------
-- Server version	8.4.11

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
-- Table structure for table `auth_group`
--

DROP TABLE IF EXISTS `auth_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group`
--

LOCK TABLES `auth_group` WRITE;
/*!40000 ALTER TABLE `auth_group` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group_permissions`
--

DROP TABLE IF EXISTS `auth_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group_permissions`
--

LOCK TABLES `auth_group_permissions` WRITE;
/*!40000 ALTER TABLE `auth_group_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_permission`
--

DROP TABLE IF EXISTS `auth_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_permission`
--

LOCK TABLES `auth_permission` WRITE;
/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES (1,'Can add log entry',1,'add_logentry'),(2,'Can change log entry',1,'change_logentry'),(3,'Can delete log entry',1,'delete_logentry'),(4,'Can view log entry',1,'view_logentry'),(5,'Can add permission',2,'add_permission'),(6,'Can change permission',2,'change_permission'),(7,'Can delete permission',2,'delete_permission'),(8,'Can view permission',2,'view_permission'),(9,'Can add group',3,'add_group'),(10,'Can change group',3,'change_group'),(11,'Can delete group',3,'delete_group'),(12,'Can view group',3,'view_group'),(13,'Can add content type',4,'add_contenttype'),(14,'Can change content type',4,'change_contenttype'),(15,'Can delete content type',4,'delete_contenttype'),(16,'Can view content type',4,'view_contenttype'),(17,'Can add session',5,'add_session'),(18,'Can change session',5,'change_session'),(19,'Can delete session',5,'delete_session'),(20,'Can view session',5,'view_session'),(21,'Can add Blacklisted Token',6,'add_blacklistedtoken'),(22,'Can change Blacklisted Token',6,'change_blacklistedtoken'),(23,'Can delete Blacklisted Token',6,'delete_blacklistedtoken'),(24,'Can view Blacklisted Token',6,'view_blacklistedtoken'),(25,'Can add Outstanding Token',7,'add_outstandingtoken'),(26,'Can change Outstanding Token',7,'change_outstandingtoken'),(27,'Can delete Outstanding Token',7,'delete_outstandingtoken'),(28,'Can view Outstanding Token',7,'view_outstandingtoken'),(29,'Can add user',8,'add_user'),(30,'Can change user',8,'change_user'),(31,'Can delete user',8,'delete_user'),(32,'Can view user',8,'view_user'),(33,'Can add login otp challenge',9,'add_loginotpchallenge'),(34,'Can change login otp challenge',9,'change_loginotpchallenge'),(35,'Can delete login otp challenge',9,'delete_loginotpchallenge'),(36,'Can view login otp challenge',9,'view_loginotpchallenge'),(37,'Can add category',10,'add_category'),(38,'Can change category',10,'change_category'),(39,'Can delete category',10,'delete_category'),(40,'Can view category',10,'view_category'),(41,'Can add product',11,'add_product'),(42,'Can change product',11,'change_product'),(43,'Can delete product',11,'delete_product'),(44,'Can view product',11,'view_product'),(45,'Can add order',12,'add_order'),(46,'Can change order',12,'change_order'),(47,'Can delete order',12,'delete_order'),(48,'Can view order',12,'view_order'),(49,'Can add cart item',13,'add_cartitem'),(50,'Can change cart item',13,'change_cartitem'),(51,'Can delete cart item',13,'delete_cartitem'),(52,'Can view cart item',13,'view_cartitem'),(53,'Can add order item',14,'add_orderitem'),(54,'Can change order item',14,'change_orderitem'),(55,'Can delete order item',14,'delete_orderitem'),(56,'Can view order item',14,'view_orderitem'),(57,'Can add wishlist item',15,'add_wishlistitem'),(58,'Can change wishlist item',15,'change_wishlistitem'),(59,'Can delete wishlist item',15,'delete_wishlistitem'),(60,'Can view wishlist item',15,'view_wishlistitem');
/*!40000 ALTER TABLE `auth_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `catalog_category`
--

DROP TABLE IF EXISTS `catalog_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catalog_category` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `slug` varchar(50) NOT NULL,
  `icon` varchar(8) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalog_category`
--

LOCK TABLES `catalog_category` WRITE;
/*!40000 ALTER TABLE `catalog_category` DISABLE KEYS */;
INSERT INTO `catalog_category` VALUES (1,'Electronics','electronics','🎧'),(2,'Fashion','fashion','👕'),(3,'Home & Living','home-living','🛋️'),(4,'Beauty','beauty','💄'),(5,'Sports','sports','🏃'),(6,'Books','books','📚'),(7,'Toys','toys','🧸'),(8,'Grocery','grocery','🛒');
/*!40000 ALTER TABLE `catalog_category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `catalog_product`
--

DROP TABLE IF EXISTS `catalog_product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catalog_product` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `description` longtext NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `stock` int unsigned NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `category_id` bigint DEFAULT NULL,
  `seller_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `catalog_product_category_id_35bf920b_fk_catalog_category_id` (`category_id`),
  KEY `catalog_product_seller_id_5ed88bb1_fk_users_user_id` (`seller_id`),
  KEY `catalog_pro_is_acti_ed6a39_idx` (`is_active`,`created_at` DESC),
  KEY `catalog_pro_price_2d2a4c_idx` (`price`),
  CONSTRAINT `catalog_product_category_id_35bf920b_fk_catalog_category_id` FOREIGN KEY (`category_id`) REFERENCES `catalog_category` (`id`),
  CONSTRAINT `catalog_product_seller_id_5ed88bb1_fk_users_user_id` FOREIGN KEY (`seller_id`) REFERENCES `users_user` (`id`),
  CONSTRAINT `catalog_product_chk_1` CHECK ((`stock` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalog_product`
--

LOCK TABLES `catalog_product` WRITE;
/*!40000 ALTER TABLE `catalog_product` DISABLE KEYS */;
INSERT INTO `catalog_product` VALUES (1,'Wireless Bluetooth Headphones','Premium wireless Bluetooth headphones with high-quality sound, comfortable ear cushions, a built-in microphone, and long battery life. Ideal for music, gaming, and everyday use.',1499.00,20,'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',1,'2026-10-14 10:03:54.888635','2026-10-14 10:03:54.888635',1,3),(2,'Smart Fitness Watch','Stylish smart fitness watch featuring activity tracking, heart rate monitoring, sleep tracking, and smartphone notifications. Its lightweight design makes it ideal for everyday wear, workouts, and fitness enthusiasts.',2499.00,8,'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',1,'2026-10-14 11:43:49.843163','2026-10-14 11:43:49.843163',1,4);
/*!40000 ALTER TABLE `catalog_product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_admin_log`
--

DROP TABLE IF EXISTS `django_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_users_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`),
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_admin_log`
--

LOCK TABLES `django_admin_log` WRITE;
/*!40000 ALTER TABLE `django_admin_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_admin_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_content_type`
--

DROP TABLE IF EXISTS `django_content_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_content_type`
--

LOCK TABLES `django_content_type` WRITE;
/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES (1,'admin','logentry'),(3,'auth','group'),(2,'auth','permission'),(10,'catalog','category'),(11,'catalog','product'),(4,'contenttypes','contenttype'),(5,'sessions','session'),(13,'shop','cartitem'),(12,'shop','order'),(14,'shop','orderitem'),(15,'shop','wishlistitem'),(6,'token_blacklist','blacklistedtoken'),(7,'token_blacklist','outstandingtoken'),(9,'users','loginotpchallenge'),(8,'users','user');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_migrations`
--

DROP TABLE IF EXISTS `django_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_migrations`
--

LOCK TABLES `django_migrations` WRITE;
/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES (1,'contenttypes','0001_initial','2026-10-11 05:25:59.476853'),(2,'contenttypes','0002_remove_content_type_name','2026-10-11 05:25:59.649173'),(3,'auth','0001_initial','2026-10-11 05:26:00.054086'),(4,'auth','0002_alter_permission_name_max_length','2026-10-11 05:26:00.145960'),(5,'auth','0003_alter_user_email_max_length','2026-10-11 05:26:00.152958'),(6,'auth','0004_alter_user_username_opts','2026-10-11 05:26:00.160489'),(7,'auth','0005_alter_user_last_login_null','2026-10-11 05:26:00.169591'),(8,'auth','0006_require_contenttypes_0002','2026-10-11 05:26:00.172612'),(9,'auth','0007_alter_validators_add_error_messages','2026-10-11 05:26:00.182852'),(10,'auth','0008_alter_user_username_max_length','2026-10-11 05:26:00.190074'),(11,'auth','0009_alter_user_last_name_max_length','2026-10-11 05:26:00.198594'),(12,'auth','0010_alter_group_name_max_length','2026-10-11 05:26:00.213137'),(13,'auth','0011_update_proxy_permissions','2026-10-11 05:26:00.223138'),(14,'auth','0012_alter_user_first_name_max_length','2026-10-11 05:26:00.229663'),(15,'users','0001_initial','2026-10-11 05:26:00.593705'),(16,'admin','0001_initial','2026-10-11 05:26:00.756477'),(17,'admin','0002_logentry_remove_auto_add','2026-10-11 05:26:00.764762'),(18,'admin','0003_logentry_add_action_flag_choices','2026-10-11 05:26:00.771764'),(19,'sessions','0001_initial','2026-10-11 05:26:00.812313'),(20,'token_blacklist','0001_initial','2026-10-11 05:26:00.965620'),(21,'token_blacklist','0002_outstandingtoken_jti_hex','2026-10-11 05:26:01.016478'),(22,'token_blacklist','0003_auto_20171017_2007','2026-10-11 05:26:01.027317'),(23,'token_blacklist','0004_auto_20171017_2013','2026-10-11 05:26:01.097492'),(24,'token_blacklist','0005_remove_outstandingtoken_jti','2026-10-11 05:26:01.148661'),(25,'token_blacklist','0006_auto_20171017_2113','2026-10-11 05:26:01.173381'),(26,'token_blacklist','0007_auto_20171017_2214','2026-10-11 05:26:01.380949'),(27,'token_blacklist','0008_migrate_to_bigautofield','2026-10-11 05:26:01.819514'),(28,'token_blacklist','0010_fix_migrate_to_bigautofield','2026-10-11 05:26:01.832094'),(29,'token_blacklist','0011_linearizes_history','2026-10-11 05:26:01.834268'),(30,'token_blacklist','0012_alter_outstandingtoken_user','2026-10-11 05:26:01.843423'),(31,'token_blacklist','0013_alter_blacklistedtoken_options_and_more','2026-10-11 05:26:01.853431'),(32,'users','0002_loginotpchallenge','2026-10-11 15:16:51.233168'),(33,'catalog','0001_initial','2026-10-14 09:39:40.142750'),(34,'catalog','0002_seed_categories','2026-10-14 09:39:40.160612'),(35,'shop','0001_initial','2026-10-14 09:39:40.935197');
/*!40000 ALTER TABLE `django_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_session`
--

DROP TABLE IF EXISTS `django_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_session`
--

LOCK TABLES `django_session` WRITE;
/*!40000 ALTER TABLE `django_session` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_cartitem`
--

DROP TABLE IF EXISTS `shop_cartitem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_cartitem` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `quantity` int unsigned NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `product_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_cart_user_product` (`user_id`,`product_id`),
  KEY `shop_cartitem_product_id_09e4b7dd_fk_catalog_product_id` (`product_id`),
  CONSTRAINT `shop_cartitem_product_id_09e4b7dd_fk_catalog_product_id` FOREIGN KEY (`product_id`) REFERENCES `catalog_product` (`id`),
  CONSTRAINT `shop_cartitem_user_id_5a7eba01_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`),
  CONSTRAINT `shop_cartitem_chk_1` CHECK ((`quantity` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_cartitem`
--

LOCK TABLES `shop_cartitem` WRITE;
/*!40000 ALTER TABLE `shop_cartitem` DISABLE KEYS */;
INSERT INTO `shop_cartitem` VALUES (3,1,'2026-10-14 17:24:57.889252',2,1),(4,2,'2026-10-14 17:25:09.499793',1,1);
/*!40000 ALTER TABLE `shop_cartitem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_coupon`
--

DROP TABLE IF EXISTS `shop_coupon`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_coupon` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(40) NOT NULL,
  `discount_type` varchar(12) NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `minimum_order_value` decimal(12,2) NOT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `usage_limit` int unsigned DEFAULT NULL,
  `usage_count` int unsigned NOT NULL,
  `reserved_count` int unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `seller_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `shop_coupon_code_active_idx` (`code`,`is_active`),
  CONSTRAINT `shop_coupon_chk_1` CHECK ((`usage_limit` >= 0)),
  CONSTRAINT `shop_coupon_chk_2` CHECK ((`usage_count` >= 0)),
  CONSTRAINT `shop_coupon_chk_3` CHECK ((`reserved_count` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_coupon`
--

LOCK TABLES `shop_coupon` WRITE;
/*!40000 ALTER TABLE `shop_coupon` DISABLE KEYS */;
/*!40000 ALTER TABLE `shop_coupon` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_order`
--

DROP TABLE IF EXISTS `shop_order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_order` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `shipping_name` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `address` varchar(300) NOT NULL,
  `city` varchar(100) NOT NULL,
  `postal_code` varchar(20) NOT NULL,
  `payment_method` varchar(20) NOT NULL,
  `total` decimal(12,2) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `user_id` bigint NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL,
  `shipping_fee` decimal(10,2) NOT NULL,
  `coupon_code` varchar(40) NOT NULL,
  `coupon_reserved` tinyint(1) NOT NULL,
  `email` varchar(254) NOT NULL,
  `house_building` varchar(160) NOT NULL,
  `street` varchar(200) NOT NULL,
  `locality` varchar(160) NOT NULL,
  `state` varchar(100) NOT NULL,
  `delivery_instructions` varchar(500) NOT NULL,
  `payment_status` varchar(20) NOT NULL,
  `payment_reference` varchar(120) NOT NULL,
  `razorpay_order_id` varchar(120) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `shop_order_user_id_00aba627_fk_users_user_id` (`user_id`),
  CONSTRAINT `shop_order_user_id_00aba627_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_order`
--

LOCK TABLES `shop_order` WRITE;
/*!40000 ALTER TABLE `shop_order` DISABLE KEYS */;
INSERT INTO `shop_order` VALUES (1,'Syed Sameer','9393939393','xyz','Hyderabad','505050','cod',7495.00,'2026-10-14 10:05:48.554461',1,7495.00,0.00,0.00,'',0,'','','','','','','cod_pending','',''),(2,'Syed Sameer','3939393939','xyz','xsyz','500052','cod',4998.00,'2026-10-14 11:50:47.117715',1,4998.00,0.00,0.00,'',0,'','','','','','','cod_pending','','');
/*!40000 ALTER TABLE `shop_order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_orderitem`
--

DROP TABLE IF EXISTS `shop_orderitem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_orderitem` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `quantity` int unsigned NOT NULL,
  `status` varchar(12) NOT NULL,
  `order_id` bigint NOT NULL,
  `product_id` bigint DEFAULT NULL,
  `seller_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shop_orderitem_order_id_2f1b00cf_fk_shop_order_id` (`order_id`),
  KEY `shop_orderitem_product_id_48153f22_fk_catalog_product_id` (`product_id`),
  KEY `shop_orderitem_seller_id_73042e68_fk_users_user_id` (`seller_id`),
  KEY `shop_orderitem_status_7399b33a` (`status`),
  CONSTRAINT `shop_orderitem_order_id_2f1b00cf_fk_shop_order_id` FOREIGN KEY (`order_id`) REFERENCES `shop_order` (`id`),
  CONSTRAINT `shop_orderitem_product_id_48153f22_fk_catalog_product_id` FOREIGN KEY (`product_id`) REFERENCES `catalog_product` (`id`),
  CONSTRAINT `shop_orderitem_seller_id_73042e68_fk_users_user_id` FOREIGN KEY (`seller_id`) REFERENCES `users_user` (`id`),
  CONSTRAINT `shop_orderitem_chk_1` CHECK ((`quantity` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_orderitem`
--

LOCK TABLES `shop_orderitem` WRITE;
/*!40000 ALTER TABLE `shop_orderitem` DISABLE KEYS */;
INSERT INTO `shop_orderitem` VALUES (1,'Wireless Bluetooth Headphones','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',1499.00,5,'pending',1,1,3),(2,'Smart Fitness Watch','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',2499.00,2,'pending',2,2,4);
/*!40000 ALTER TABLE `shop_orderitem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_sellernotification`
--

DROP TABLE IF EXISTS `shop_sellernotification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_sellernotification` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(160) NOT NULL,
  `message` varchar(500) NOT NULL,
  `is_read` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `order_id` bigint DEFAULT NULL,
  `seller_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_sellernotification`
--

LOCK TABLES `shop_sellernotification` WRITE;
/*!40000 ALTER TABLE `shop_sellernotification` DISABLE KEYS */;
/*!40000 ALTER TABLE `shop_sellernotification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_shippingaddress`
--

DROP TABLE IF EXISTS `shop_shippingaddress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_shippingaddress` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `label` varchar(50) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(254) NOT NULL,
  `house_building` varchar(160) NOT NULL,
  `street` varchar(200) NOT NULL,
  `locality` varchar(160) NOT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `postal_code` varchar(10) NOT NULL,
  `delivery_instructions` varchar(500) NOT NULL,
  `is_default` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_shippingaddress`
--

LOCK TABLES `shop_shippingaddress` WRITE;
/*!40000 ALTER TABLE `shop_shippingaddress` DISABLE KEYS */;
/*!40000 ALTER TABLE `shop_shippingaddress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_wishlistitem`
--

DROP TABLE IF EXISTS `shop_wishlistitem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shop_wishlistitem` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `product_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_wish_user_product` (`user_id`,`product_id`),
  KEY `shop_wishlistitem_product_id_fec7c3f7_fk_catalog_product_id` (`product_id`),
  CONSTRAINT `shop_wishlistitem_product_id_fec7c3f7_fk_catalog_product_id` FOREIGN KEY (`product_id`) REFERENCES `catalog_product` (`id`),
  CONSTRAINT `shop_wishlistitem_user_id_190f012d_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_wishlistitem`
--

LOCK TABLES `shop_wishlistitem` WRITE;
/*!40000 ALTER TABLE `shop_wishlistitem` DISABLE KEYS */;
/*!40000 ALTER TABLE `shop_wishlistitem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_blacklist_blacklistedtoken`
--

DROP TABLE IF EXISTS `token_blacklist_blacklistedtoken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `token_blacklist_blacklistedtoken` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `blacklisted_at` datetime(6) NOT NULL,
  `token_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_id` (`token_id`),
  CONSTRAINT `token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk` FOREIGN KEY (`token_id`) REFERENCES `token_blacklist_outstandingtoken` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_blacklist_blacklistedtoken`
--

LOCK TABLES `token_blacklist_blacklistedtoken` WRITE;
/*!40000 ALTER TABLE `token_blacklist_blacklistedtoken` DISABLE KEYS */;
INSERT INTO `token_blacklist_blacklistedtoken` VALUES (1,'2026-10-11 15:17:40.667381',1),(2,'2026-10-11 15:18:10.980785',2),(3,'2026-10-14 07:47:58.947466',4),(4,'2026-10-14 08:25:09.004386',5),(5,'2026-10-14 09:59:31.838212',7),(6,'2026-10-14 10:04:03.968105',8),(7,'2026-10-14 10:06:11.801286',9),(8,'2026-10-14 11:42:47.420295',10),(9,'2026-10-14 11:44:13.125870',11),(10,'2026-10-14 12:04:55.869777',12),(11,'2026-10-14 12:05:04.969504',13);
/*!40000 ALTER TABLE `token_blacklist_blacklistedtoken` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_blacklist_outstandingtoken`
--

DROP TABLE IF EXISTS `token_blacklist_outstandingtoken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `token_blacklist_outstandingtoken` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `token` longtext NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `expires_at` datetime(6) NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `jti` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq` (`jti`),
  KEY `token_blacklist_outs_user_id_83bc629a_fk_users_use` (`user_id`),
  CONSTRAINT `token_blacklist_outs_user_id_83bc629a_fk_users_use` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_blacklist_outstandingtoken`
--

LOCK TABLES `token_blacklist_outstandingtoken` WRITE;
/*!40000 ALTER TABLE `token_blacklist_outstandingtoken` DISABLE KEYS */;
INSERT INTO `token_blacklist_outstandingtoken` VALUES (1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjMyOTU4OCwiaWF0IjoxNzkxNzI0Nzg4LCJqdGkiOiIyNGEzNGE1YWMzY2Y0YTU2OGIyNjdlZjNjNTk5NzM4MCIsInVzZXJfaWQiOiIxIn0.uQOo9hTZyDk2LB2x0yKUzml9q39cf_8Ex0HGiIuzDXI','2026-10-11 13:19:48.050343','2026-10-18 13:19:48.000000',1,'24a34a5ac3cf4a568b267ef3c5997380'),(2,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjMzNjY2MCwiaWF0IjoxNzkxNzMxODYwLCJqdGkiOiIwNDEwZmM1N2JkZWI0ZjFiOGFiZTAzNmNmZGQyOWRhMCIsInVzZXJfaWQiOiIxIiwicm9sZSI6ImN1c3RvbWVyIn0.Az9vVOF12WBCky06sCBmx6Wc7A8X3hv-15JsjgbB40s','2026-10-11 15:17:40.647115','2026-10-18 15:17:40.000000',1,'0410fc57bdeb4f1b8abe036cfdd29da0'),(3,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjMzNjk5MywiaWF0IjoxNzkxNzMyMTkzLCJqdGkiOiJjNDA0NjZhOTViODI0OTM5Yjc5NmYzYzlmODU3ZTg2MCIsInVzZXJfaWQiOiIyIn0.gX1uE8Rl-WxD3fS4IHFikaVfVden5SAkPCFzg1YAh28','2026-10-11 15:23:13.774638','2026-10-18 15:23:13.000000',2,'c40466a95b824939b796f3c9f857e860'),(4,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjU2ODcwNywiaWF0IjoxNzkxOTYzOTA3LCJqdGkiOiIxMzk0OTgwNDZlYzk0NzMyOTgzYTljN2VjNTA0YjhjNyIsInVzZXJfaWQiOiIyIn0.o0aCyuZXcepZfZar-9chCmlVIWr2qA3ZPMgWqVV4b5s','2026-10-14 07:45:07.657044','2026-10-21 07:45:07.000000',2,'139498046ec94732983a9c7ec504b8c7'),(5,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjU2OTEyMSwiaWF0IjoxNzkxOTY0MzIxLCJqdGkiOiI3NGMxM2RmMTRkYWU0NjAxODE3NWI0YzQyMGQ1MTJkOSIsInVzZXJfaWQiOiIzIn0.Dmlaih9VQYyxPWf1hYMGCgSGge6U5D4BP5ygKMPww-Q','2026-10-14 07:52:01.787132','2026-10-21 07:52:01.000000',3,'74c13df14dae46018175b4c420d512d9'),(6,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjU3MTEwOCwiaWF0IjoxNzkxOTY2MzA4LCJqdGkiOiJkZjY1YjkyZWJkZmU0ZjA1ODgzMWZiZWRmNzE5MmEyZSIsInVzZXJfaWQiOiIzIiwicm9sZSI6InNlbGxlciJ9.bo_OuEndp8ClhOPfbiX1eYOp8qgadsGzJ0ppWpReqmc','2026-10-14 08:25:08.979852','2026-10-21 08:25:08.000000',3,'df65b92ebdfe4f058831fbedf7192a2e'),(7,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjU3NjcxNiwiaWF0IjoxNzkxOTcxOTE2LCJqdGkiOiI5MWEzYmI2MWI2YjY0MmI0YTMzYzNlNTI5MzE4MGExYiIsInVzZXJfaWQiOiIxIn0.hCoMXmKP6-BxmA0F6F983ayiPshm3h8llWjdbDNhoyw','2026-10-14 09:58:36.966429','2026-10-21 09:58:36.000000',1,'91a3bb61b6b642b4a33c3e5293180a1b'),(8,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjU3NjgxNywiaWF0IjoxNzkxOTcyMDE3LCJqdGkiOiJlNzVhMjgyODFhNzE0YWIyYTU4OWJlYjNlZjQ1ODJjYiIsInVzZXJfaWQiOiIzIn0.Zj95Rur3XkUYH1O812GsL-6juKDdmW-5tQ1tNTRyVp0','2026-10-14 10:00:17.610509','2026-10-21 10:00:17.000000',3,'e75a28281a714ab2a589beb3ef4582cb'),(9,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjU3NzA4NSwiaWF0IjoxNzkxOTcyMjg1LCJqdGkiOiI2ZjhmY2M0NjQ1Mjc0MzljOWI1Y2Y3ZDcyZWU1MDQ4ZSIsInVzZXJfaWQiOiIxIn0.joC0Y0pPUB_y59QM5M7Lqp5ob-eHW6TKcRZK2CKhZVU','2026-10-14 10:04:45.342542','2026-10-21 10:04:45.000000',1,'6f8fcc464527439c9b5cf7d72ee5048e'),(10,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjU4MjA0MCwiaWF0IjoxNzkxOTc3MjQwLCJqdGkiOiIwMmNiNzVkZTU4OTQ0ZmFmYTZmYWZjYjEwYjczMmU1NCIsInVzZXJfaWQiOiI0In0.8NROFcVKwUA_NzUo_voPy88gOwwC54GIjGOmzdiMSg8','2026-10-14 11:27:20.322711','2026-10-21 11:27:20.000000',4,'02cb75de58944fafa6fafcb10b732e54'),(11,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjU4Mjk2NywiaWF0IjoxNzkxOTc4MTY3LCJqdGkiOiJmOWE4MzFhM2M1MzY0Mjg4YjZlNmYzYmY0YjEyNmY3MSIsInVzZXJfaWQiOiI0Iiwicm9sZSI6InNlbGxlciJ9._b6lOc-6W0-c0ULnxCMPyQ85Zt63LZ2-x-ce9Pb3jjk','2026-10-14 11:42:47.391793','2026-10-21 11:42:47.000000',4,'f9a831a3c5364288b6e6f3bf4b126f71'),(12,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjU4MzE1OCwiaWF0IjoxNzkxOTc4MzU4LCJqdGkiOiJiN2FkNDM3ZTAxZmM0NzcxYThkMjJmNjRiZDllN2UwYSIsInVzZXJfaWQiOiIxIn0.LaZ5yt3N_Rzj5nBoSs4GHUfmbLEXW4QgQxhBJZTz7h4','2026-10-14 11:45:58.906444','2026-10-21 11:45:58.000000',1,'b7ad437e01fc4771a8d22f64bd9e7e0a'),(13,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjU4NDI5NSwiaWF0IjoxNzkxOTc5NDk1LCJqdGkiOiI1NGQ1YTQ5MjRjMzk0NjE5Yjk5MzczN2Y3YmYzMTIzMCIsInVzZXJfaWQiOiIxIiwicm9sZSI6ImN1c3RvbWVyIn0.vbXlDQMLMk3AzQQ6o6xxHX_Bd3ynEZ_Nel6YTv9m60I','2026-10-14 12:04:55.847511','2026-10-21 12:04:55.000000',1,'54d5a4924c394619b993737f7bf31230'),(14,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc5MjYwMzQxMCwiaWF0IjoxNzkxOTk4NjEwLCJqdGkiOiJkNDA5MmZkYzMyMzU0NDBhYjg2ZjEzMGVlNWYyZjExZiIsInVzZXJfaWQiOiIxIn0.mR2eYVOkYmmNB6KZV0YBmarxj6ETwy2gQo-1PBh23Is','2026-10-14 17:23:30.951374','2026-10-21 17:23:30.000000',1,'d4092fdc3235440ab86f130ee5f2f11f');
/*!40000 ALTER TABLE `token_blacklist_outstandingtoken` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_loginotpchallenge`
--

DROP TABLE IF EXISTS `users_loginotpchallenge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_loginotpchallenge` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `challenge_id` char(32) NOT NULL,
  `code_hash` varchar(128) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `last_sent_at` datetime(6) NOT NULL,
  `attempts` smallint unsigned NOT NULL,
  `resend_count` smallint unsigned NOT NULL,
  `is_used` tinyint(1) NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `challenge_id` (`challenge_id`),
  KEY `users_loginotpchallenge_expires_at_9f60764b` (`expires_at`),
  KEY `users_loginotpchallenge_is_used_fa6a1833` (`is_used`),
  KEY `users_login_user_id_5d2e13_idx` (`user_id`,`is_used`,`expires_at`),
  CONSTRAINT `users_loginotpchallenge_user_id_8d1c5109_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`),
  CONSTRAINT `users_loginotpchallenge_chk_1` CHECK ((`attempts` >= 0)),
  CONSTRAINT `users_loginotpchallenge_chk_2` CHECK ((`resend_count` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_loginotpchallenge`
--

LOCK TABLES `users_loginotpchallenge` WRITE;
/*!40000 ALTER TABLE `users_loginotpchallenge` DISABLE KEYS */;
INSERT INTO `users_loginotpchallenge` VALUES (1,'61ec9a17c203498881ebf3f6c49c34b0','pbkdf2_sha256$1000000$InvNZYIlBYmcM4GyESI3k1$5LpVSakqkrANCZEDfGFgVODdIPqAogfsVl9OqIIL7VE=','2026-10-11 15:22:44.581534','2026-10-11 15:27:43.504776','2026-10-11 15:22:43.504776',0,0,1,2),(2,'7e8428d59f0f484caebebe63336c8b26','pbkdf2_sha256$1000000$8kSYDBiIZGiQ6OEy9QkOiG$mNeZJvCvLPh35uV+PtabyRrpOfRNkiDBk6T/15cxKsk=','2026-10-14 07:44:39.237696','2026-10-14 07:49:38.683114','2026-10-14 07:44:38.683114',0,0,1,2),(3,'e1d5ba4e683d48a28ba895fe7352bf0f','pbkdf2_sha256$1000000$iwKZ1x45Ol7rDz4WB4KsIl$q2eERWAYfzRP4ay53AZeFCYdqlDxz2Z4ljlOF6mDQKs=','2026-10-14 07:51:26.558651','2026-10-14 07:56:26.558651','2026-10-14 07:51:26.558651',0,2,1,3),(4,'e37dfd8077ac4184b4f915008bd5d6c7','pbkdf2_sha256$1000000$MmNuKll8tg7P5vTADwEHrU$RABwyXasKUEj4x7ayvwIKr6Raayy76MGd94IDYYNbDE=','2026-10-14 09:46:39.812211','2026-10-14 09:51:39.812211','2026-10-14 09:46:39.812211',0,1,1,3),(5,'09b7b9cfd4ab452ea49ce0a7657fa438','pbkdf2_sha256$1000000$tiySwYIuyMRKPOv585uE7x$RjLrjQBJjzm1GdhQtFrVZpuKg/LOxM3nhR6M0Mk1Pwo=','2026-10-14 09:48:18.422483','2026-10-14 09:53:17.827031','2026-10-14 09:48:17.827031',0,0,1,1),(6,'4239afe45c2d41a58a7fa319dcc5fedf','pbkdf2_sha256$1000000$2gpOUq6eQYw6csfc6NoGIA$H9w1RAdRjn4uVUlyfxLV/vALcVYrWUg2LkjqudK5eIg=','2026-10-14 09:58:11.853740','2026-10-14 10:03:10.874859','2026-10-14 09:58:10.874859',0,0,1,1),(7,'6a54bb2be4784ba399662d93a81dfb95','pbkdf2_sha256$1000000$Qy98ZW8MMaGarimfwEagoj$SQ2fwJGqWcbL/g4nO1Q4kLx4iESnb7G/KEWyXeK6I1E=','2026-10-14 09:59:47.303623','2026-10-14 10:04:46.739586','2026-10-14 09:59:46.739586',0,0,1,3),(8,'16914381fba7411184907fca379a66df','pbkdf2_sha256$1000000$QTX3vo9Xzey0PuMqzyBLsM$GWBU77UO/UVDkk+D7hg60DY0VuE6tvlhoyrKcFCkGgY=','2026-10-14 10:04:21.296542','2026-10-14 10:09:20.704412','2026-10-14 10:04:20.704412',0,0,1,1),(9,'19067b258de74f04b4f61b31d54279a0','pbkdf2_sha256$1000000$C0ZxBrtTPcTVkA1yi8I9DA$3J6O0YwCw9F5btZpYETE2ilJWJD+3NCOxuOFnuT9XNw=','2026-10-14 10:06:24.617746','2026-10-14 10:11:23.977817','2026-10-14 10:06:23.977817',0,0,1,3),(10,'91dba0a5f2f144618d7b495d9870bacb','pbkdf2_sha256$1000000$oFQdNy16zHZ3YTsDICZtld$/M/uS9Zsi5Pc/J7bmgpEWT1mTfgXyMnnxR3+zp9GHVY=','2026-10-14 11:25:23.057579','2026-10-14 11:30:23.057579','2026-10-14 11:25:23.057579',0,1,0,3),(11,'f2e9bf4b27924e1b843893d25dbaff32','pbkdf2_sha256$1000000$sgI2e4TIKQ3MQUI0h4fFuH$w4WFyDmC9jcZYMqHep8lnVXNkAiwyorWGt/nDHyWgfo=','2026-10-14 11:27:00.420091','2026-10-14 11:31:58.905844','2026-10-14 11:26:58.905844',0,0,1,4),(12,'0ed88bb79c044d74ab526118edf75f62','pbkdf2_sha256$1000000$X1EBv30V0boGIYZj47DqCZ$Q8ra7z3YR2NUT621sM8PRw/RyEqKKy3+/EW+fIhU/mE=','2026-10-14 11:45:29.983517','2026-10-14 11:50:28.361730','2026-10-14 11:45:28.361730',0,0,1,1),(13,'06b6aa0dc14645dd9719a1a6cf33d7f6','pbkdf2_sha256$1000000$eEaXlKZ6R9XpwNHRNBom8n$LOn0tPNUWQIDxw4cSr464Ag8o1hZBLgXfeJA1J3upgc=','2026-10-14 17:23:08.030306','2026-10-14 17:28:07.501778','2026-10-14 17:23:07.501778',0,0,1,1);
/*!40000 ALTER TABLE `users_loginotpchallenge` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_user`
--

DROP TABLE IF EXISTS `users_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_user` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `name` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `role` varchar(10) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `users_user_role_b76f4c51` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_user`
--

LOCK TABLES `users_user` WRITE;
/*!40000 ALTER TABLE `users_user` DISABLE KEYS */;
INSERT INTO `users_user` VALUES (1,'pbkdf2_sha256$1000000$08WWYEzQSIbvj3QGCf5lbi$jNUdhsP2bVcOAdH7PCu2two7XLks5n4pS030KST56G4=','2026-10-14 17:23:30.947364',0,'Syed Sameer','syedsameer8323@gmail.com','customer',1,0,'2026-10-11 13:19:20.557643','2026-10-11 13:19:20.557643'),(2,'pbkdf2_sha256$1000000$tIRQnLzSnGcGJJp90XRB76$tYIxFvkQ9oliELyMFVYzf5ypVFa6f6F1K5xjrP+teR0=','2026-10-14 07:45:07.652939',0,'Sam','syedsameer9349@gmail.com','customer',1,0,'2026-10-11 15:20:25.029545','2026-10-11 15:20:25.029545'),(3,'pbkdf2_sha256$1000000$zJlWJT1eZ55cMTzKzCDjCq$PEMdI+q4D4ncZwOq1kStw1laMt0L9+2oGvKSsVMIwyw=','2026-10-14 10:00:17.607476',0,'Syed Sameer','syedsameer1133@gmail.com','seller',1,0,'2026-10-14 07:48:57.102313','2026-10-14 07:48:57.102313'),(4,'pbkdf2_sha256$1000000$Yoioyz1R5A8qK60fv3zQ8T$HKs/pMxFbacIntEl+xI2goODbBeUh6baiMNe/JF6+18=','2026-10-14 11:27:20.315641',0,'Syed Sameer','syedsajid1121@gmail.com','seller',1,0,'2026-10-14 11:24:04.105322','2026-10-14 11:24:04.105322');
/*!40000 ALTER TABLE `users_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_user_groups`
--

DROP TABLE IF EXISTS `users_user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_user_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_user_groups_user_id_group_id_b88eab82_uniq` (`user_id`,`group_id`),
  KEY `users_user_groups_group_id_9afc8d0e_fk_auth_group_id` (`group_id`),
  CONSTRAINT `users_user_groups_group_id_9afc8d0e_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `users_user_groups_user_id_5f6f5a90_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_user_groups`
--

LOCK TABLES `users_user_groups` WRITE;
/*!40000 ALTER TABLE `users_user_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_user_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_user_user_permissions`
--

DROP TABLE IF EXISTS `users_user_user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_user_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_user_user_permissions_user_id_permission_id_43338c45_uniq` (`user_id`,`permission_id`),
  KEY `users_user_user_perm_permission_id_0b93982e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `users_user_user_perm_permission_id_0b93982e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `users_user_user_permissions_user_id_20aca447_fk_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_user_user_permissions`
--

LOCK TABLES `users_user_user_permissions` WRITE;
/*!40000 ALTER TABLE `users_user_user_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_user_user_permissions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-15 10:17:03
