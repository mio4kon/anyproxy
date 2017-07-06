-- MySQL dump 10.13  Distrib 5.7.17, for macos10.12 (x86_64)
--
-- Host: 127.0.0.1    Database: test
-- ------------------------------------------------------
-- Server version	5.7.17

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `mock`
--

DROP TABLE IF EXISTS `mock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mock` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mock_type` varchar(45) NOT NULL,
  `mock_url` varchar(200) NOT NULL,
  `mock_desc` varchar(45) DEFAULT NULL,
  `mock_body` longtext NOT NULL,
  `mock_status_code` int(11) DEFAULT '200',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mock`
--

LOCK TABLES `mock` WRITE;
/*!40000 ALTER TABLE `mock` DISABLE KEYS */;
INSERT INTO `mock` VALUES (1,'success','elenet.me/knight/login/captcha','登录成功','{\"msg\":\"请求成功\",\"code\":200,\"data\":{\"token\":\"PBE_1.0_87d3027a1132d55ae9b548395edbfea548ef278da27c04871534e9ad29777645b2198459583829c9190e383485a02172653c9567028f83d939407e7872571782c7358a342420dcc5d0fcd7bfe8b19cb2870dc6006071d9b068a5b7bf24b768b9121baffadc1abe3cb6afe883596934c994ef2dc9b61a5b873c3abff16996b72386ec2c8dbc71dc7002d8b81842ae842998efab456b2ec2a88186997c7c0f7d95a44ece3ced820ef18b1e7bfd0e8addc2204846bac002e2dc1973a61d07d2ab31bbde6af9b8d22b17ab13d494141bc83c\",\"user\":{\"status\":1,\"reshuffled_identity\":{\"grace_days\":0,\"need_reshuffled\":0},\"dispatchermobile\":\"18976547654,13918700572,15104053651,18521560312,15821649535,18721850637,18516650000\",\"usermobilehmac\":\"24965140bfcac798b5d5314041cdf6d76354c3ea7750b122b20d90dfa33d3a6c\",\"has_passwd\":1,\"name\":\"偾捕明\",\"usertype\":0,\"mobile\":\"18521560311\",\"team_bind_status\":2,\"id\":5303116,\"need_upload_healthcert\":1,\"online\":0}}}',200),(2,'error','elenet.me/knight/login/captcha','登录失败','{\"message\":\"mock数据\",\"code\":12002}',418),(3,'arrive','elenet.me/talaris-svr/webapi/app/orders/status?status=6&status=7&status=100&status=-1','拉单-确认到店','{\"err_code\":\"200\",\"msg\":\"\",\"data\":[{\"status\":6,\"id\":100000001249019838},{\"status\":-1,\"id\":100000001246720958}]}',200),(4,'success','elenet.me/talaris-svr/webapi/app/orders/info?ids=100000001249019838','确认到店拉单获取详情数据','{\"err_code\":\"200\",\"msg\":\"\",\"data\":[{\"status\":6,\"id\":100000001249019838,\"source_name\":\"加价单\",\"ele_order_id\":\"999951497951632951\",\"ele_order_sn_str\":\"123\",\"cooking_time\":319,\"created_at\":1497951681000,\"ele_created_time\":1497951632000,\"comment\":\"用户备注\",\"protected_mobile\":\"9501359931828\",\"total_amount\":62.34,\"payable_amount\":56.78,\"receivable_amount\":61.23,\"payment_type\":1,\"retailer_id\":\"30004335\",\"walle_id\":\"145254489\",\"retailer_name\":\"apollo测试餐厅\",\"retailer_mobile\":\"13262656635\",\"retailer_address\":\"商家地址\",\"retailer_location\":{\"longitude\":121.4754097383,\"latitude\":31.1330939998},\"receiver_name\":\"apollo测试\",\"receiver_mobile\":\"13812345678\",\"receiver_address\":\"测试地址\",\"receiver_location\":{\"longitude\":121.345815,\"latitude\":31.218812},\"business_type\":2,\"expected_finish_time\":1497954092000,\"invoice_title\":\"\",\"arrived_at\":1497952171000,\"tags\":[\"加价单\",\"代购\"],\"taker_id\":5303116,\"ele_order_items\":[{\"categoryId\":1,\"name\":\"红烧大肉\",\"price\":23.34,\"quantity\":3},{\"categoryId\":1,\"name\":\"绿烧大肉\",\"price\":23.54,\"quantity\":1}],\"unsatisfied_reason_code\":\"0\",\"final_status_at\":1497952171000}]}',200),(5,'success','elenet.me/talaris-svr/webapi/app/delivery_order/fetch','确认取餐','{\"err_code\":\"200\",\"msg\":\"\",\"data\":\"\"}',200),(6,'success','elenet.me/talaris-svr/webapi/app/delivery_order/confirm_to_the_shop','确认到店','{\"err_code\":\"200\",\"msg\":\"\",\"data\":\"\"}',200),(7,'fetch','elenet.me/talaris-svr/webapi/app/orders/info?ids=100000001249019838','拉单-取餐','{\"err_code\":\"200\",\"msg\":\"\",\"data\":[{\"status\":7,\"id\":100000001249019838},{\"status\":-1,\"id\":100000001246720958}]}',200),(8,'complete','elenet.me/talaris-svr/webapi/app/orders/status?status=2&status=100','拉单-确认送达','{\"err_code\":\"200\",\"msg\":\"\",\"data\":[{\"status\":2,\"id\":100000001249019838},{\"status\":-1,\"id\":100000001246720958}]}',200),(9,'success','elenet.me/knight/order/violation/disprove_and_hand_over','确认送达','{\"msg\":\"请求成功\",\"code\":200}',200),(10,'success','elenet.me/talaris-svr/webapi/app/orders/status_polling?status=6&status=7&status=2&status=100&status=-1','轮询拉单','{\"err_code\":\"200\",\"msg\":\"\",\"data\":[{\"status\":6,\"id\":100000001249019838},{\"status\":-1,\"id\":100000001246720958}]}',200),(11,'type1','elenet.me/knight/global_config','用户配置-老接口检举确认送达','{\"msg\":\"请求成功\",\"code\":200,\"data\":{\"violation_disprove\":true,\"show_knight_school\":true,\"show_wallet_page\":true,\"unicom_sidebar\":{\"url\":\"https://demo.mall.10010.com:8108/queen/fengniao/fengcard.html?u=QAAAAAAAAAAAAAAA==MTQ3ND\",\"mobile\":\"185****0311\",\"is_show\":true},\"unicom_banner\":{\"url\":\"https://demo.mall.10010.com:8108/queen/fengniao/fengcard.html?u=QAAAAAAAAAAAAAAA==MTQ3ND\",\"is_show\":true,\"title\":\"联通蜂卡－蜂行天下，免费通话！\"},\"grab_order_from_knight\":false}}',200);
/*!40000 ALTER TABLE `mock` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2017-07-06 17:30:21
