-- Support ticket tables (legacy master_support / master_replay_message)

CREATE TABLE IF NOT EXISTS `master_support` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cname` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `mobile` varchar(50) DEFAULT NULL,
  `countryCode` varchar(50) DEFAULT NULL,
  `subject` varchar(500) DEFAULT NULL,
  `description` text,
  `chatting_date_time` varchar(50) DEFAULT NULL,
  `chatting_create_date` date DEFAULT NULL,
  `query` int(11) DEFAULT 7,
  `user_id` int(11) DEFAULT 0,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `close_chat_user` tinyint(1) NOT NULL DEFAULT 0,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_support_user` (`user_id`),
  KEY `idx_support_status` (`status`, `active`),
  KEY `idx_support_date` (`chatting_create_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `master_replay_message` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `support_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL DEFAULT 0,
  `admin_subadmin_id` int(11) NOT NULL DEFAULT 0,
  `subject` varchar(500) DEFAULT NULL,
  `description` text,
  `chatting_date_time` varchar(50) DEFAULT NULL,
  `selectfile` text,
  `view_flag` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_replay_support` (`support_id`),
  KEY `idx_replay_unread` (`support_id`, `view_flag`, `user_id`, `active`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
