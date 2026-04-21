# SQL Database Initialization Script
# This script is run automatically when the MySQL container starts for the first time

-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `etera_health`;
USE `etera_health`;

-- Drop existing tables if they exist (comment out in production after first run)
-- DROP TABLE IF EXISTS engagement;
-- DROP TABLE IF EXISTS posts;
-- DROP TABLE IF EXISTS videos;
-- DROP TABLE IF EXISTS research;
-- DROP TABLE IF EXISTS gallery;
-- DROP TABLE IF EXISTS content;
-- DROP TABLE IF EXISTS contact_messages;
-- DROP TABLE IF EXISTS users;

-- Users/Authentication Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `username` VARCHAR(255) UNIQUE NOT NULL,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('user', 'admin') DEFAULT 'user',
  `status` ENUM('active', 'inactive', 'banned') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` TIMESTAMP NULL,
  INDEX `idx_email` (`email`),
  INDEX `idx_role` (`role`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Posts Table
CREATE TABLE IF NOT EXISTS `posts` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `body` LONGTEXT NOT NULL,
  `author_id` INT,
  `status` ENUM('draft', 'published') DEFAULT 'draft',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `published_at` TIMESTAMP NULL,
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_published_at` (`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Videos Table
CREATE TABLE IF NOT EXISTS `videos` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` LONGTEXT,
  `file_path` VARCHAR(500) NOT NULL,
  `thumbnail` VARCHAR(500),
  `duration` INT,
  `uploaded_by` INT,
  `status` ENUM('draft', 'published') DEFAULT 'draft',
  `views` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_views` (`views`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Research Table
CREATE TABLE IF NOT EXISTS `research` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` LONGTEXT,
  `file_path` VARCHAR(500),
  `file_type` VARCHAR(50),
  `author` VARCHAR(255),
  `published_by` INT,
  `status` ENUM('draft', 'published') DEFAULT 'draft',
  `downloads` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`published_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_downloads` (`downloads`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gallery Table
CREATE TABLE IF NOT EXISTS `gallery` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `image_path` VARCHAR(500) NOT NULL,
  `thumbnail_path` VARCHAR(500),
  `uploaded_by` INT,
  `status` ENUM('draft', 'published') DEFAULT 'draft',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Content Table
CREATE TABLE IF NOT EXISTS `content` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `key` VARCHAR(255) UNIQUE NOT NULL,
  `value` LONGTEXT NOT NULL,
  `description` TEXT,
  `updated_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_key` (`key`),
  INDEX `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contact Messages Table
CREATE TABLE IF NOT EXISTS `contact_messages` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(500) NOT NULL,
  `message` LONGTEXT NOT NULL,
  `status` ENUM('unread', 'read', 'replied') DEFAULT 'unread',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Engagement Table (for likes, comments, shares)
CREATE TABLE IF NOT EXISTS `engagement` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `content_type` ENUM('post', 'video', 'research', 'image') NOT NULL,
  `content_id` INT NOT NULL,
  `engagement_type` ENUM('like', 'comment', 'share', 'view') NOT NULL,
  `value` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_content_type_id` (`content_type`, `content_id`),
  INDEX `idx_engagement_type` (`engagement_type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create default admin user (CHANGE PASSWORD IMMEDIATELY IN PRODUCTION)
INSERT IGNORE INTO `users` (`username`, `email`, `password`, `role`, `status`)
VALUES ('admin', 'admin@etera.health', '$2a$10$YIVVCpxF3tGHq9REHpJzVOlvyN8sLwIe42qTUKvFNBvvtMdVQ76Au', 'admin', 'active');

-- Create sample content
INSERT IGNORE INTO `content` (`key`, `value`, `description`)
VALUES 
  ('site_title', 'ETERA Health Initiative', 'Website title'),
  ('site_description', 'Practical Public Health Training and Community Partnerships', 'Website description'),
  ('welcome_message', 'Welcome to ETERA Health Initiative', 'Home page welcome message');

-- Grant permissions
GRANT ALL PRIVILEGES ON `etera_health`.* TO 'etera_user'@'%';
FLUSH PRIVILEGES;
