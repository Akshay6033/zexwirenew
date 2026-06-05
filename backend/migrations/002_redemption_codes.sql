CREATE TABLE IF NOT EXISTS `master_redemption_code` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code_name` varchar(100) NOT NULL,
  `package_ids` text NOT NULL,
  `usage_limit` int(11) NOT NULL DEFAULT 1,
  `redeemed_count` int(11) NOT NULL DEFAULT 0,
  `expiry_date` date DEFAULT NULL,
  `target_audience` enum('new_users','all_users') NOT NULL DEFAULT 'all_users',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_redemption_code_name` (`code_name`),
  KEY `idx_redemption_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `master_redemption_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `packages_granted` text NOT NULL,
  `redeemed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_redemption_user_code` (`code_id`, `user_id`),
  KEY `idx_redemption_log_code` (`code_id`),
  KEY `idx_redemption_log_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
